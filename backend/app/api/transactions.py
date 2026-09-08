import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from app.services.fraud_service import fraud_service
from app.core.database import get_supabase

logger = logging.getLogger("fraudlens.api.transactions")

router = APIRouter(prefix="/transactions", tags=["Transactions & Fraud Analysis"])

@router.get("", response_model=List[Dict[str, Any]])
async def get_all_transactions(
    risk_level: Optional[str] = Query(None, description="Filter by risk level: HIGH, MEDIUM, LOW"),
    limit: Optional[int] = Query(None, description="Optional limit on returned transactions"),
):
    """
    Returns screened transactions from Supabase, prioritized by risk_score descending.
    If limit is not specified, returns all unique transactions without truncation.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=503, detail="Database connection unavailable")

    try:
        query = (
            supabase.table("transactions")
            .select("*, users(name, email), accounts(account_number, account_type), beneficiaries(beneficiary_name, account_reference)")
            .order("risk_score", desc=True)
        )
        if risk_level:
            query = query.eq("risk_level", risk_level.upper())
        if limit is not None:
            query = query.limit(limit)
        res = query.execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching transactions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch transactions: {str(e)}")

@router.get("/suspicious", response_model=List[Dict[str, Any]])
async def get_suspicious_attempts(
    limit: Optional[int] = Query(None, description="Optional limit on suspicious attempts")
):
    """
    Returns all flagged suspicious attempts with SHAP explanations for priority investigation.
    If limit is not specified, returns all suspicious attempts without truncation.
    """
    try:
        return fraud_service.get_suspicious_attempts(limit=limit)
    except Exception as e:
        logger.error(f"Error fetching suspicious attempts: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch suspicious attempts: {str(e)}")

@router.get("/{transaction_id}", response_model=Dict[str, Any])
async def get_transaction_by_id(transaction_id: str):
    """
    Returns a single transaction by ID including related user, account, and beneficiary records.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=503, detail="Database connection unavailable")
    try:
        res = (
            supabase.table("transactions")
            .select("*, users(name, email), accounts(account_number, account_type), beneficiaries(beneficiary_name, account_reference)")
            .eq("id", transaction_id)
            .limit(1)
            .execute()
        )
        if not res.data or len(res.data) == 0:
            raise HTTPException(status_code=404, detail="Transaction not found")
        txn = res.data[0]
        try:
            txn = fraud_service.enrich_transaction_shap(txn)
        except Exception as en_err:
            logger.warning(f"Note on enriching transaction SHAP: {en_err}")
        return txn
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching transaction {transaction_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch transaction: {str(e)}")

@router.post("/seed", response_model=Dict[str, Any])
async def seed_sample_transactions():
    """
    Triggers seeding & ML screening of sample_100_transactions.csv into Supabase.
    """
    try:
        result = fraud_service.seed_and_screen_sample_dataset()
        return result
    except Exception as e:
        logger.error(f"Seeding failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Seeding failed: {str(e)}")

class FinalizeDecisionRequest(BaseModel):
    decision: str  # "COMPLETED" or "BLOCKED"
    notes: Optional[str] = None


@router.post("/screen", response_model=Dict[str, Any])
async def screen_transaction(payload: Dict[str, Any]):
    """
    Evaluates an incoming transaction against the trained ML model and SHAP explainer.
    Returns risk_score (0-100), risk_level, decision, and top SHAP explanations.
    If the transaction results in a BLOCKED decision and includes a transaction identifier,
    it automatically anchors the decision to the FraudDecisionLedger smart contract.
    """
    try:
        result = fraud_service.evaluate_features(payload)

        # If transaction has an ID and reached a final BLOCKED decision, anchor it fail-safely
        txn_id = payload.get("id") or payload.get("transaction_id")
        if txn_id and result.get("decision") in ("BLOCKED", "COMPLETED"):
            try:
                fraud_service.finalize_and_anchor_decision(
                    transaction_id=str(txn_id),
                    decision=result["decision"],
                    risk_score=result.get("risk_score"),
                    risk_level=result.get("risk_level"),
                    evidence_data=result.get("reasons"),
                    update_db=False,
                )
            except Exception as anchor_err:
                logger.warning(f"Screening auto-anchoring note for {txn_id} (non-blocking): {anchor_err}")

        return result
    except Exception as e:
        logger.error(f"Screening failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Screening failed: {str(e)}")


@router.post("/{transaction_id}/decision", response_model=Dict[str, Any])
async def record_transaction_decision(transaction_id: str, payload: FinalizeDecisionRequest):
    """
    Records a finalized decision (COMPLETED or BLOCKED) for an existing transaction
    and anchors the audit proof directly onto the FraudDecisionLedger smart contract.
    Preserves all existing banking data and guarantees non-blocking fail-safe execution.
    """
    decision_clean = payload.decision.strip().upper()
    if decision_clean not in {"COMPLETED", "BLOCKED"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid decision '{payload.decision}'. Only COMPLETED or BLOCKED decisions are allowed."
        )

    try:
        res = fraud_service.finalize_and_anchor_decision(
            transaction_id=transaction_id,
            decision=decision_clean,
            update_db=True,
        )
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error finalizing decision for transaction {transaction_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to finalize decision: {str(e)}")
