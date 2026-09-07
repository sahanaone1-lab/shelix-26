from typing import Optional, List, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field

# 1. User Schema
class UserBase(BaseModel):
    name: str
    email: str
    role: str = "customer"

class UserResponse(UserBase):
    id: str
    created_at: Optional[datetime] = None

# 2. Account Schema
class AccountBase(BaseModel):
    account_number: str
    account_type: str = "Checking"
    balance: float = 5000.00

class AccountResponse(AccountBase):
    id: str
    user_id: str
    created_at: Optional[datetime] = None

# 3. Device Schema
class DeviceBase(BaseModel):
    device_id: str
    device_type: str
    trusted: bool = True

class DeviceResponse(DeviceBase):
    id: str
    user_id: str
    last_seen: Optional[datetime] = None
    created_at: Optional[datetime] = None

# 4. Beneficiary Schema
class BeneficiaryBase(BaseModel):
    beneficiary_name: str
    account_reference: str

class BeneficiaryResponse(BeneficiaryBase):
    id: str
    user_id: str
    created_at: Optional[datetime] = None

# 5. Transaction Schema (Includes ML outputs & SHAP explanations)
class TransactionBase(BaseModel):
    account_id: Optional[str] = None
    amount: float
    transaction_type: str = "TRANSFER"
    location: Optional[str] = "Delhi"
    device_id: Optional[str] = None
    status: str = "COMPLETED"

class TransactionResponse(TransactionBase):
    id: str
    user_id: str
    beneficiary_id: Optional[str] = None
    transaction_time: Optional[datetime] = None
    risk_score: Optional[float] = 0.00
    risk_level: Optional[str] = "LOW"
    reasons: Optional[List[Dict[str, Any]]] = None
    analysis_timestamp: Optional[datetime] = None
    created_at: Optional[datetime] = None

# 6. Suspicious Attempt Schema
class SuspiciousAttemptBase(BaseModel):
    reason: str
    risk_score: float = 0.00
    risk_level: str = "HIGH"
    status: str = "UNDER_REVIEW"

class SuspiciousAttemptResponse(SuspiciousAttemptBase):
    id: str
    transaction_id: Optional[str] = None
    user_id: str
    explanations: Optional[List[Dict[str, Any]]] = None
    created_at: Optional[datetime] = None
