import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.services.blockchain_service import blockchain_service

logger = logging.getLogger("fraudlens.api.blockchain")

router = APIRouter(prefix="/blockchain", tags=["Blockchain Fraud Decision Integrity"])


class RecordDecisionRequest(BaseModel):
    transaction_id: str
    risk_score: float
    risk_category: str
    decision: str  # "COMPLETED" or "BLOCKED"
    evidence_data: Optional[Any] = None
    timestamp: Optional[Any] = None
    recorded_by: Optional[str] = None


class SimulateTamperRequest(BaseModel):
    transaction_id: str
    tampered_decision: Optional[str] = None
    tampered_risk_score: Optional[float] = None
    tampered_risk_category: Optional[str] = None


@router.get("/stats", response_model=Dict[str, Any])
async def get_blockchain_stats():
    """
    Returns high-level statistics, network parameters, and health of FraudDecisionLedger.
    """
    try:
        return blockchain_service.get_ledger_stats()
    except Exception as e:
        logger.error(f"Error getting blockchain stats: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch blockchain stats: {str(e)}")


@router.get("/events", response_model=List[Dict[str, Any]])
async def get_blockchain_events(limit: int = Query(50, ge=1, le=200)):
    """
    Returns recent FraudDecisionRecorded events emitted by the smart contract.
    """
    try:
        return blockchain_service.get_events(limit=limit)
    except Exception as e:
        logger.error(f"Error fetching blockchain events: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch blockchain events: {str(e)}")


@router.get("/blocks", response_model=List[Dict[str, Any]])
async def get_blockchain_blocks(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """
    Returns chronological block headers and cryptographic proofs from the ledger.
    """
    try:
        return blockchain_service.get_blocks(limit=limit, offset=offset)
    except Exception as e:
        logger.error(f"Error fetching blockchain blocks: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch blocks: {str(e)}")


class VerifyTransactionRequest(BaseModel):
    transaction_id: str
    current_record: Optional[Dict[str, Any]] = None


@router.get("/verify/{transaction_id}", response_model=Dict[str, Any])
async def verify_transaction_on_chain(transaction_id: str):
    """
    Verifies a transaction's current database state against the FraudDecisionLedger smart contract.
    Recreates the exact audit payload and compares hash to determine:
    - VERIFIED: record and hash match blockchain
    - FAILED: record or hash does not match blockchain
    - NOT_FOUND: no blockchain record exists
    """
    try:
        return blockchain_service.verify_transaction_integrity(transaction_id)
    except Exception as e:
        logger.error(f"Error verifying transaction {transaction_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")


@router.post("/verify", response_model=Dict[str, Any])
async def verify_transaction_on_chain_post(payload: VerifyTransactionRequest):
    """
    POST endpoint to verify a transaction's integrity against the FraudDecisionLedger smart contract.
    Returns VERIFIED, FAILED, or NOT_FOUND with cryptographic proofs.
    """
    try:
        return blockchain_service.verify_transaction_integrity(
            payload.transaction_id,
            current_record=payload.current_record,
        )
    except Exception as e:
        logger.error(f"Error verifying transaction {payload.transaction_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")


@router.get("/record/{transaction_id}", response_model=Dict[str, Any])
async def get_transaction_blockchain_record(transaction_id: str):
    """
    Returns the blockchain audit reference and metadata stored for a specific transaction ID.
    """
    meta = blockchain_service.get_audit_metadata(transaction_id)
    if not meta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No blockchain audit record found for transaction '{transaction_id}'"
        )
    return meta


@router.post("/record", response_model=Dict[str, Any])
async def record_fraud_decision(payload: RecordDecisionRequest):
    """
    Records a finalized fraud decision into FraudDecisionLedger and emits FraudDecisionRecorded.
    Only COMPLETED or BLOCKED decisions are eligible for on-chain anchoring.
    """
    try:
        result = blockchain_service.record_fraud_decision(
            transaction_id=payload.transaction_id,
            risk_score=payload.risk_score,
            risk_category=payload.risk_category,
            decision=payload.decision,
            evidence_data=payload.evidence_data,
            timestamp=payload.timestamp,
            recorded_by=payload.recorded_by,
        )
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("reason", "Could not record decision"))
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recording decision for {payload.transaction_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to record decision on blockchain: {str(e)}")


@router.post("/sync", response_model=Dict[str, Any])
async def sync_database_with_blockchain():
    """
    Scans the database and idempotently anchors all finalized transactions (COMPLETED/BLOCKED)
    into FraudDecisionLedger.
    """
    try:
        return blockchain_service.sync_database_decisions()
    except Exception as e:
        logger.error(f"Error syncing decisions to blockchain: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.post("/simulate-tamper-check", response_model=Dict[str, Any])
async def simulate_tamper_detection(payload: SimulateTamperRequest):
    """
    Simulates a tamper attempt (e.g. modifying BLOCKED to COMPLETED or altering risk score)
    and verifies it against FraudDecisionLedger to demonstrate tamper detection in real-time.
    """
    txn_id = payload.transaction_id
    txn_hash = blockchain_service.compute_transaction_hash(txn_id)

    if txn_hash not in blockchain_service.decisions:
        raise HTTPException(status_code=404, detail=f"Transaction {txn_id} is not recorded on FraudDecisionLedger.")

    original = blockchain_service.decisions[txn_hash]

    simulated_current = {
        "id": txn_id,
        "status": payload.tampered_decision or ("COMPLETED" if original["decision"] == "BLOCKED" else "BLOCKED"),
        "risk_score": payload.tampered_risk_score if payload.tampered_risk_score is not None else original["riskScore"],
        "risk_level": payload.tampered_risk_category or original["riskCategory"],
        "reasons": None,
    }

    result = blockchain_service.verify_decision_integrity(
        transaction_id=txn_id,
        current_record=simulated_current,
    )

    return {
        "simulation": True,
        "tampered_payload": simulated_current,
        "verification_result": result,
    }
