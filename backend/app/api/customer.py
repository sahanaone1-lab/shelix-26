from typing import List, Optional, Dict, Any
import logging
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from app.core.database import get_supabase
from app.services.fraud_service import fraud_service

logger = logging.getLogger("fraudlens.api.customer")
from app.schemas.database import (
    UserResponse,
    AccountResponse,
    DeviceResponse,
    BeneficiaryResponse,
    TransactionResponse,
)

router = APIRouter(prefix="/customer", tags=["Customer Data"])

# Fallback demo user ID created in seed script
DEFAULT_DEMO_USER_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
DEFAULT_DEMO_EMAIL = "customer@bank.com"

@router.get("/profile", response_model=Dict[str, Any])
async def get_customer_profile(email: Optional[str] = DEFAULT_DEMO_EMAIL):
    """
    Fetch customer profile by email or default demo customer.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable. Please check Supabase configuration."
        )

    try:
        query = supabase.table("users").select("*").eq("email", email).limit(1)
        response = query.execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        raise HTTPException(status_code=404, detail="Customer profile not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")

@router.get("/account", response_model=Dict[str, Any])
async def get_customer_account(user_id: Optional[str] = DEFAULT_DEMO_USER_ID):
    """
    Fetch primary account for the given user_id.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=503, detail="Database service unavailable")

    try:
        response = supabase.table("accounts").select("*").eq("user_id", user_id).limit(1).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        raise HTTPException(status_code=404, detail="Account not found for user")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")

@router.get("/devices", response_model=List[Dict[str, Any]])
async def get_customer_devices(user_id: Optional[str] = DEFAULT_DEMO_USER_ID):
    """
    Fetch registered devices for the user.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=503, detail="Database service unavailable")

    try:
        response = supabase.table("devices").select("*").eq("user_id", user_id).execute()
        return response.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")

@router.get("/beneficiaries", response_model=List[Dict[str, Any]])
async def get_customer_beneficiaries(user_id: Optional[str] = DEFAULT_DEMO_USER_ID):
    """
    Fetch saved beneficiaries for the user.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=503, detail="Database service unavailable")

    try:
        response = supabase.table("beneficiaries").select("*").eq("user_id", user_id).execute()
        return response.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")

@router.get("/transactions", response_model=List[Dict[str, Any]])
async def get_customer_transactions(user_id: Optional[str] = DEFAULT_DEMO_USER_ID, limit: int = 10):
    """
    Fetch recent transactions for the user.
    """
    supabase = get_supabase()
    if not supabase:
        raise HTTPException(status_code=503, detail="Database service unavailable")

    try:
        response = (
            supabase.table("transactions")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")


class CustomerVerificationRequest(BaseModel):
    transaction_id: str
    action: str  # "APPROVE" or "DENY"


@router.post("/verify-transaction", response_model=Dict[str, Any])
async def verify_customer_transaction(payload: CustomerVerificationRequest):
    """
    Simulates customer trusted-device verification for a flagged transaction:
    - APPROVE -> transaction status becomes COMPLETED
    - DENY    -> transaction status becomes BLOCKED
    Automatically creates audit proof and anchors the finalized decision on blockchain.
    """
    action_clean = payload.action.strip().upper()
    if action_clean not in {"APPROVE", "DENY"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action '{payload.action}'. Expected 'APPROVE' or 'DENY'."
        )

    decision = "COMPLETED" if action_clean == "APPROVE" else "BLOCKED"

    try:
        result = fraud_service.finalize_and_anchor_decision(
            transaction_id=payload.transaction_id,
            decision=decision,
            update_db=True,
        )
        return {
            "success": True,
            "action": action_clean,
            "decision": decision,
            "transaction_id": payload.transaction_id,
            "status": decision,
            "blockchain_anchored": result.get("blockchain_anchored", False),
            "blockchain_record": result.get("blockchain_record"),
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error during customer transaction verification: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")
