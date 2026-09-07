from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class CustomerLoginRequest(BaseModel):
    identifier: str = Field(..., description="Customer Email or User ID")
    password: str = Field(..., description="Customer Password")

class AnalystLoginRequest(BaseModel):
    employee_id: str = Field(..., description="Employee ID or Email")
    password: str = Field(..., description="Analyst Password")

class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    role: str

class LoginResponse(BaseModel):
    status: str = "success"
    role: str
    user: UserProfile
    message: str
