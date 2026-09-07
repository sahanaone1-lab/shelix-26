from fastapi import APIRouter, HTTPException, status
from app.schemas.auth import CustomerLoginRequest, AnalystLoginRequest, LoginResponse, UserProfile
from app.core.database import get_supabase

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory demo credentials for Phase 2 compatibility
DEMO_CUSTOMERS = [
    {
        "identifiers": ["customer@bank.com", "cust123", "alex"],
        "password": "password123",
        "user": UserProfile(
            id="a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
            email="customer@bank.com",
            name="Alex Mercer",
            role="customer"
        )
    }
]

DEMO_ANALYSTS = [
    {
        "identifiers": ["analyst@bank.com", "ANALYST-SEC-09", "analyst01", "sarah"],
        "password": "password123",
        "user": UserProfile(
            id="b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
            email="analyst@bank.com",
            name="Sarah Chen",
            role="analyst"
        )
    }
]

@router.post("/customer/login", response_model=LoginResponse)
async def customer_login(payload: CustomerLoginRequest):
    """
    Authenticate Customer.
    Preserves Phase 2 demo authentication while querying Supabase for user metadata if available.
    """
    clean_id = payload.identifier.strip().lower()
    clean_pwd = payload.password.strip()

    matched_demo = None
    for demo in DEMO_CUSTOMERS:
        if clean_id in [ident.lower() for ident in demo["identifiers"]] and clean_pwd == demo["password"]:
            matched_demo = demo
            break

    if not matched_demo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Customer ID/Email or Password. (Demo: customer@bank.com / password123)"
        )

    user_profile = matched_demo["user"]

    # Optional Supabase enrichment (non-blocking)
    supabase = get_supabase()
    if supabase:
        try:
            res = supabase.table("users").select("*").eq("email", user_profile.email).limit(1).execute()
            if res.data and len(res.data) > 0:
                db_user = res.data[0]
                user_profile = UserProfile(
                    id=str(db_user.get("id", user_profile.id)),
                    email=db_user.get("email", user_profile.email),
                    name=db_user.get("name", user_profile.name),
                    role=db_user.get("role", "customer")
                )
        except Exception:
            pass  # Retain fallback demo profile on network/DB glitch

    return LoginResponse(
        status="success",
        role="customer",
        user=user_profile,
        message="Customer authentication successful"
    )

@router.post("/analyst/login", response_model=LoginResponse)
async def analyst_login(payload: AnalystLoginRequest):
    """
    Authenticate Fraud Analyst.
    Preserves Phase 2 demo authentication while querying Supabase for user metadata if available.
    """
    clean_id = payload.employee_id.strip().lower()
    clean_pwd = payload.password.strip()

    matched_demo = None
    for demo in DEMO_ANALYSTS:
        if clean_id in [ident.lower() for ident in demo["identifiers"]] and clean_pwd == demo["password"]:
            matched_demo = demo
            break

    if not matched_demo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Employee ID/Email or Password. (Demo: analyst@bank.com / password123)"
        )

    user_profile = matched_demo["user"]

    # Optional Supabase enrichment (non-blocking)
    supabase = get_supabase()
    if supabase:
        try:
            res = supabase.table("users").select("*").eq("email", user_profile.email).limit(1).execute()
            if res.data and len(res.data) > 0:
                db_user = res.data[0]
                user_profile = UserProfile(
                    id=str(db_user.get("id", user_profile.id)),
                    email=db_user.get("email", user_profile.email),
                    name=db_user.get("name", user_profile.name),
                    role=db_user.get("role", "analyst")
                )
        except Exception:
            pass

    return LoginResponse(
        status="success",
        role="analyst",
        user=user_profile,
        message="Fraud Analyst authentication successful"
    )
