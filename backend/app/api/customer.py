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


# -------------------------------------------------------------------------
# Customer Dashboard Demo Seed Data & Endpoints (C101, C102, C103)
# Realistic Indian Banking Activity and Expenditure
# -------------------------------------------------------------------------

class InitiateTransactionRequest(BaseModel):
    customer_id: Optional[str] = DEFAULT_DEMO_USER_ID
    beneficiary_name: str
    account_number: Optional[str] = "987654321098"
    category: str = "Shopping"
    amount: float
    description: Optional[str] = "Transfer to beneficiary"


CUSTOMER_SEED_DATABASE = {
    "c101": {
        "customer_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        "code": "C101",
        "name": "Alex Mercer",
        "email": "customer@bank.com",
        "account_number": "HDFC •••• 4128",
        "account_type": "Salary Savings Account",
        "currency": "INR",
        "current_balance": 42500.00,
        "total_income": 85000.00,
        "total_expenditure": 26169.00,
        "monthly_spend": 25520.00,
        "category_breakdown": [
            {"category": "Housing & Rent", "amount": 18000.00, "color": "#10B981"},
            {"category": "Shopping", "amount": 3200.00, "color": "#3B82F6"},
            {"category": "Utilities & Bills", "amount": 2400.00, "color": "#F59E0B"},
            {"category": "Food & Dining", "amount": 1470.00, "color": "#EC4899"},
            {"category": "Entertainment", "amount": 649.00, "color": "#8B5CF6"},
            {"category": "Travel", "amount": 450.00, "color": "#14B8A6"}
        ],
        "transactions": [
            {
                "id": "TXN-IND-8821",
                "date": "2026-09-07 19:30",
                "description": "Swiggy Food Delivery",
                "merchant": "Swiggy India Pvt Ltd",
                "category": "Food & Dining",
                "amount": 850.00,
                "type": "debit",
                "status": "COMPLETED",
                "payment_method": "UPI / swiggy@icici"
            },
            {
                "id": "TXN-IND-8819",
                "date": "2026-09-06 14:15",
                "description": "Amazon India Online Order",
                "merchant": "Amazon Pay India",
                "category": "Shopping",
                "amount": 3200.00,
                "type": "debit",
                "status": "COMPLETED",
                "payment_method": "Debit Card •••• 4128"
            },
            {
                "id": "TXN-IND-8812",
                "date": "2026-09-05 11:20",
                "description": "Tata Power Electricity Bill",
                "merchant": "Tata Power Mumbai",
                "category": "Utilities & Bills",
                "amount": 2400.00,
                "type": "debit",
                "status": "COMPLETED",
                "payment_method": "Auto-debit BBPS"
            },
            {
                "id": "TXN-IND-8805",
                "date": "2026-09-03 09:00",
                "description": "Landlord House Rent Transfer",
                "merchant": "Sunil Varma (Landlord)",
                "category": "Housing & Rent",
                "amount": 18000.00,
                "type": "debit",
                "status": "COMPLETED",
                "payment_method": "IMPS / HDFC-Rent"
            },
            {
                "id": "TXN-IND-8798",
                "date": "2026-09-02 21:10",
                "description": "Uber India Office Cab",
                "merchant": "Uber India Systems",
                "category": "Travel",
                "amount": 450.00,
                "type": "debit",
                "status": "COMPLETED",
                "payment_method": "UPI / uber@axis"
            },
            {
                "id": "TXN-IND-8790",
                "date": "2026-09-01 18:45",
                "description": "Zomato Gourmet Dining",
                "merchant": "Zomato Limited",
                "category": "Food & Dining",
                "amount": 620.00,
                "type": "debit",
                "status": "COMPLETED",
                "payment_method": "UPI / zomato@hdfc"
            },
            {
                "id": "TXN-IND-8785",
                "date": "2026-09-01 10:00",
                "description": "Monthly Salary Credit",
                "merchant": "TechCorp Solutions Pvt Ltd",
                "category": "Salary & Income",
                "amount": 85000.00,
                "type": "credit",
                "status": "COMPLETED",
                "payment_method": "NEFT Direct Credit"
            },
            {
                "id": "TXN-IND-8772",
                "date": "2026-08-31 23:45",
                "description": "Netflix India Premium Mandate",
                "merchant": "Netflix Entertainment",
                "category": "Entertainment",
                "amount": 649.00,
                "type": "debit",
                "status": "PENDING",
                "payment_method": "Recurring UPI Mandate"
            },
            {
                "id": "TXN-IND-8760",
                "date": "2026-08-30 03:14",
                "description": "International Crypto Terminal Attempt",
                "merchant": "ATM Terminal Bucharest",
                "category": "Uncategorized",
                "amount": 66585.24,
                "type": "debit",
                "status": "BLOCKED",
                "payment_method": "International POS"
            }
        ]
    },
    "c102": {
        "customer_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380c102",
        "code": "C102",
        "name": "Sneha Sharma",
        "email": "sneha@bank.com",
        "account_number": "ICICI •••• 6592",
        "account_type": "Privilege Savings Account",
        "currency": "INR",
        "current_balance": 68200.00,
        "total_income": 110000.00,
        "total_expenditure": 38150.00,
        "monthly_spend": 38150.00,
        "category_breakdown": [
            {"category": "Housing & Rent", "amount": 22000.00, "color": "#10B981"},
            {"category": "Travel", "amount": 8200.00, "color": "#14B8A6"},
            {"category": "Shopping", "amount": 5400.00, "color": "#3B82F6"},
            {"category": "Food & Dining", "amount": 1600.00, "color": "#EC4899"},
            {"category": "Healthcare", "amount": 1350.00, "color": "#F59E0B"}
        ],
        "transactions": [
            {
                "id": "TXN-IND-7910",
                "date": "2026-09-07 20:05",
                "description": "Starbucks Coffee Koramangala",
                "merchant": "Tata Starbucks Pvt Ltd",
                "category": "Food & Dining",
                "amount": 480.00,
                "type": "debit",
                "status": "COMPLETED",
                "payment_method": "UPI / starbucks@icici"
            },
            {
                "id": "TXN-IND-7901",
                "date": "2026-09-06 17:40",
                "description": "Apollo Pharmacy Prescription",
                "merchant": "Apollo Pharmacies Ltd",
                "category": "Healthcare",
                "amount": 1350.00,
                "type": "debit",
                "status": "COMPLETED",
                "payment_method": "UPI / apollo@axis"
            },
            {
                "id": "TXN-IND-7889",
                "date": "2026-09-05 13:20",
                "description": "MakeMyTrip Indigo Flight Booking",
                "merchant": "MakeMyTrip India",
                "category": "Travel",
                "amount": 8200.00,
                "type": "debit",
                "status": "COMPLETED",
                "payment_method": "NetBanking ICICI"
            },
            {
                "id": "TXN-IND-7870",
                "date": "2026-09-03 16:00",
                "description": "Flipkart Big Billion Days Order",
                "merchant": "Flipkart Internet Pvt Ltd",
                "category": "Shopping",
                "amount": 5400.00,
                "type": "debit",
                "status": "COMPLETED",
                "payment_method": "Credit Card •••• 6592"
            },
            {
                "id": "TXN-IND-7855",
                "date": "2026-09-02 11:30",
                "description": "Prestige Apartments Society Maintenance",
                "merchant": "Prestige Residency Trust",
                "category": "Housing & Rent",
                "amount": 22000.00,
                "type": "debit",
                "status": "COMPLETED",
                "payment_method": "NEFT Transfer"
            },
            {
                "id": "TXN-IND-7840",
                "date": "2026-09-01 10:00",
                "description": "Global Consultancy Monthly Remuneration",
                "merchant": "McKinsey Global Services",
                "category": "Salary & Income",
                "amount": 110000.00,
                "type": "credit",
                "status": "COMPLETED",
                "payment_method": "NEFT Direct Credit"
            },
            {
                "id": "TXN-IND-7822",
                "date": "2026-08-29 19:15",
                "description": "Swiggy Instamart Grocery Haul",
                "merchant": "Bundl Technologies",
                "category": "Food & Dining",
                "amount": 1120.00,
                "type": "debit",
                "status": "COMPLETED",
                "payment_method": "UPI / swiggy@icici"
            },
            {
                "id": "TXN-IND-7801",
                "date": "2026-08-28 22:10",
                "description": "International Gaming Subscription Attempt",
                "merchant": "Offshore Gaming Ltd",
                "category": "Entertainment",
                "amount": 14999.00,
                "type": "debit",
                "status": "BLOCKED",
                "payment_method": "Cross-border Debit Card"
            }
        ]
    },
    "c103": {
        "customer_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380c103",
        "code": "C103",
        "name": "Rajesh Patel",
        "email": "rajesh@bank.com",
        "account_number": "SBI •••• 9104",
        "account_type": "Current Business Account",
        "currency": "INR",
        "current_balance": 125000.00,
        "total_income": 150000.00,
        "total_expenditure": 65999.00,
        "monthly_spend": 65999.00,
        "category_breakdown": [
            {"category": "Housing & Rent", "amount": 35000.00, "color": "#10B981"},
            {"category": "Shopping", "amount": 18500.00, "color": "#3B82F6"},
            {"category": "Food & Dining", "amount": 6800.00, "color": "#EC4899"},
            {"category": "Travel", "amount": 4200.00, "color": "#14B8A6"},
            {"category": "Utilities & Bills", "amount": 1499.00, "color": "#F59E0B"}
        ],
        "transactions": [
            {
                "id": "TXN-IND-6410",
                "date": "2026-09-07 15:30",
                "description": "Indian Oil Fuel Station Bandra",
                "merchant": "Indian Oil Corporation",
                "category": "Travel",
                "amount": 4200.00,
                "type": "debit",
                "status": "COMPLETED",
                "payment_method": "SBI Fleet Card POS"
            },
            {
                "id": "TXN-IND-6395",
                "date": "2026-09-06 19:00",
                "description": "Taj Hotel Executive Dining",
                "merchant": "The Indian Hotels Co",
                "category": "Food & Dining",
                "amount": 6800.00,
                "type": "debit",
                "status": "COMPLETED",
                "payment_method": "SBI Corporate Card"
            },
            {
                "id": "TXN-IND-6380",
                "date": "2026-09-05 12:00",
                "description": "Reliance Jio Fiber Commercial",
                "merchant": "Jio Infocomm Ltd",
                "category": "Utilities & Bills",
                "amount": 1499.00,
                "type": "debit",
                "status": "COMPLETED",
                "payment_method": "Auto-debit BBPS"
            },
            {
                "id": "TXN-IND-6350",
                "date": "2026-09-03 18:20",
                "description": "Croma Electronics Office Accessories",
                "merchant": "Infiniti Retail Ltd (Croma)",
                "category": "Shopping",
                "amount": 18500.00,
                "type": "debit",
                "status": "COMPLETED",
                "payment_method": "UPI / croma@sbi"
            },
            {
                "id": "TXN-IND-6330",
                "date": "2026-09-02 10:30",
                "description": "Commercial Office Lease Bandra Kurla",
                "merchant": "Bandra Commercial Estates",
                "category": "Housing & Rent",
                "amount": 35000.00,
                "type": "debit",
                "status": "COMPLETED",
                "payment_method": "RTGS Transfer"
            },
            {
                "id": "TXN-IND-6310",
                "date": "2026-09-01 11:00",
                "description": "Patel Trading Client Inward Payment",
                "merchant": "Vanguard Export Hub",
                "category": "Salary & Income",
                "amount": 150000.00,
                "type": "credit",
                "status": "COMPLETED",
                "payment_method": "RTGS Inward Credit"
            },
            {
                "id": "TXN-IND-6288",
                "date": "2026-08-30 14:10",
                "description": "Cloud Server Annual Renewal",
                "merchant": "AWS Cloud Services",
                "category": "Utilities & Bills",
                "amount": 4999.00,
                "type": "debit",
                "status": "PENDING",
                "payment_method": "Corporate NetBanking"
            }
        ]
    }
}


def _resolve_customer_key(identifier: Optional[str]) -> str:
    """Helper to match user_id, email, or code to c101, c102, or c103."""
    if not identifier:
        return "c101"
    clean = str(identifier).strip().lower()
    for key, data in CUSTOMER_SEED_DATABASE.items():
        if (
            clean == key
            or clean == data["code"].lower()
            or clean == data["email"].lower()
            or clean == data["customer_id"].lower()
            or clean in data["name"].lower()
        ):
            return key
    return "c101"


@router.get("/dashboard-summary", response_model=Dict[str, Any])
async def get_customer_dashboard_summary(
    customer_id: Optional[str] = Query(default=None, description="Customer ID, email, or code (e.g. c101, c102, c103)")
):
    """
    Returns complete dashboard metrics, expenditure breakdown, and isolated recent transactions
    for the logged-in customer.
    """
    key = _resolve_customer_key(customer_id)
    cust_data = CUSTOMER_SEED_DATABASE[key]

    return {
        "success": True,
        "customer": {
            "customer_id": cust_data["customer_id"],
            "code": cust_data["code"],
            "name": cust_data["name"],
            "email": cust_data["email"],
            "account_number": cust_data["account_number"],
            "account_type": cust_data["account_type"],
            "currency": cust_data["currency"],
        },
        "metrics": {
            "current_balance": cust_data["current_balance"],
            "total_income": cust_data["total_income"],
            "total_expenditure": cust_data["total_expenditure"],
            "monthly_spend": cust_data["monthly_spend"],
        },
        "category_breakdown": cust_data["category_breakdown"],
        "transactions": cust_data["transactions"],
        "total_transactions": len(cust_data["transactions"]),
    }


@router.post("/initiate-transaction", response_model=Dict[str, Any])
async def initiate_customer_transaction(payload: InitiateTransactionRequest):
    """
    Creates a new customer transaction, deducts from current balance,
    updates total expenditure and category breakdown, and prepends to transaction history.
    """
    if payload.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transaction amount must be greater than zero."
        )

    key = _resolve_customer_key(payload.customer_id)
    cust_data = CUSTOMER_SEED_DATABASE[key]

    if payload.amount > cust_data["current_balance"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient balance. Current balance is ₹{cust_data['current_balance']:,.2f}."
        )

    import datetime
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    import random
    new_txn_id = f"TXN-IND-{random.randint(9000, 9999)}"

    # Determine status: high amounts over 50,000 flagged for verification demo
    status_label = "PENDING" if payload.amount >= 50000.0 else "COMPLETED"

    new_txn = {
        "id": new_txn_id,
        "date": now_str,
        "description": payload.description or f"Transfer to {payload.beneficiary_name}",
        "merchant": payload.beneficiary_name,
        "category": payload.category or "Shopping",
        "amount": round(payload.amount, 2),
        "type": "debit",
        "status": status_label,
        "payment_method": f"IMPS / A/C •••• {str(payload.account_number)[-4:] if payload.account_number else '9876'}"
    }

    # Deduct balance and update metrics
    cust_data["current_balance"] = round(cust_data["current_balance"] - payload.amount, 2)
    cust_data["total_expenditure"] = round(cust_data["total_expenditure"] + payload.amount, 2)
    cust_data["monthly_spend"] = round(cust_data["monthly_spend"] + payload.amount, 2)

    # Prepend new transaction to list
    cust_data["transactions"].insert(0, new_txn)

    # Update category breakdown
    category_found = False
    for cat in cust_data["category_breakdown"]:
        if cat["category"].lower() == payload.category.lower():
            cat["amount"] = round(cat["amount"] + payload.amount, 2)
            category_found = True
            break
    if not category_found:
        cust_data["category_breakdown"].append({
            "category": payload.category,
            "amount": round(payload.amount, 2),
            "color": "#6366F1"
        })

    return {
        "success": True,
        "message": f"Transfer of ₹{payload.amount:,.2f} to {payload.beneficiary_name} successfully initiated.",
        "transaction": new_txn,
        "updated_metrics": {
            "current_balance": cust_data["current_balance"],
            "total_income": cust_data["total_income"],
            "total_expenditure": cust_data["total_expenditure"],
            "monthly_spend": cust_data["monthly_spend"],
        },
        "category_breakdown": cust_data["category_breakdown"]
    }

