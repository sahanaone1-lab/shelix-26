# api.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from predict_and_explain import analyze_transaction

app = FastAPI(title="Real-Time Fraud Intelligence Engine")

# Allow your frontend dashboard (React, Next.js, or HTML) to talk to the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Schema matching all required dashboard parameters
class TransactionPayload(BaseModel):
    transaction_id: str = "TXN_100044"
    customer_id: str = "CUST_1042"
    transaction_amount: float
    time_of_transaction: str
    location: str
    previous_transaction_location: str
    previous_transaction_time: str
    distance_from_previous_km: float
    txns_last_10_min: int
    txns_last_1_hour: int
    txns_last_24_hours: int
    user_average_amount: float
    user_normal_range_min: float
    user_normal_range_max: float

@app.post("/api/v1/screen-transaction")
def screen(txn: TransactionPayload):
    result = analyze_transaction(txn.model_dump())
    return result

@app.get("/")
def health_check():
    return {"status": "Fraud Detection Engine Live and Operational"}