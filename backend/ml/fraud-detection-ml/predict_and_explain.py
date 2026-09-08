# predict_and_explain.py
from datetime import datetime
import pathlib
import joblib
import pandas as pd

ml_dir = pathlib.Path(__file__).resolve().parent

# Load assets
model = joblib.load(ml_dir / "fraud_model.pkl")
explainer = joblib.load(ml_dir / "shap_explainer.pkl")
feature_names = joblib.load(ml_dir / "feature_names.pkl")

# Human-readable templates for SHAP risk drivers
REASON_TEMPLATES = {
    "amount_deviation": "Amount deviates by +{val:.1f}x from user's typical spending average",
    "implied_travel_speed_kmh": "Impossible Travel Velocity: Physical speed between locations is {val:.1f} km/h",
    "hour_of_day": "Transaction executed during unusual night hours ({val:02d}:00)",
    "txns_last_10_min": "High-frequency burst: {val} payments attempted in the last 10 minutes",
    "txns_last_1_hour": "Velocity spike: {val} payments executed within the past hour",
    "txns_last_24_hours": "Unusual volume: {val} transactions recorded in the last 24 hours",
    "distance_from_prev_km": "Location is {val:.1f} km away from prior authenticated transaction",
    "is_diff_location": "Transaction originated from a new/unrecognized location",
    "transaction_amount": "Nominal purchase amount (₹{val:,.2f}) is in high-risk bracket"
}

def analyze_transaction(txn: dict) -> dict:
    """
    Accepts all required transaction & historical parameters,
    computes spatiotemporal and velocity derivations,
    and returns Risk Level, Score/100, Decision, and Explainable AI reasons.
    """
    # 1. Parse timestamps to compute time elapsed in hours
    t_curr = datetime.fromisoformat(txn["time_of_transaction"])
    t_prev = datetime.fromisoformat(txn["previous_transaction_time"])
    time_diff_hours = max((t_curr - t_prev).total_seconds() / 3600.0, 0.01)

    # 2. Extract values and compute deviations
    amt = float(txn["transaction_amount"])
    user_avg = float(txn["user_average_amount"])
    range_min = float(txn["user_normal_range_min"])
    range_max = float(txn["user_normal_range_max"])
    
    # Calculate deviation ratio
    amount_deviation = (amt - user_avg) / max(user_avg, 1.0)
    
    distance_km = float(txn["distance_from_previous_km"])
    implied_speed = distance_km / time_diff_hours
    is_diff_loc = 1 if txn["location"].strip().lower() != txn["previous_transaction_location"].strip().lower() else 0

    # 3. Assemble feature dataframe aligned with model training
    input_dict = {
        "transaction_amount": amt,
        "hour_of_day": t_curr.hour,
        "user_avg_amount": user_avg,
        "amount_deviation": amount_deviation,
        "distance_from_prev_km": distance_km,
        "time_since_prev_hours": time_diff_hours,
        "implied_travel_speed_kmh": implied_speed,
        "is_diff_location": is_diff_loc,
        "txns_last_10_min": int(txn["txns_last_10_min"]),
        "txns_last_1_hour": int(txn["txns_last_1_hour"]),
        "txns_last_24_hours": int(txn["txns_last_24_hours"])
    }
    input_df = pd.DataFrame([input_dict])[feature_names]

    # 4. Predict Risk Probability and compute score
    risk_prob = float(model.predict_proba(input_df)[0][1])
    score_100 = int(round(risk_prob * 100))

    # Determine Decision Badges
    if score_100 >= 70:
        risk_level = "HIGH"
        decision = "BLOCK"
    elif score_100 >= 30:
        risk_level = "MEDIUM"
        decision = "REVIEW"
    else:
        risk_level = "LOW"
        decision = "APPROVE"

    # 5. Extract SHAP Explanations
    shap_vals = explainer.shap_values(input_df)[0]
    explanations = []

    for name, shap_score in zip(feature_names, shap_vals):
        if shap_score > 0.05:  # Pushed verdict towards fraud
            raw_val = input_df[name].iloc[0]
            template = REASON_TEMPLATES.get(name, f"Anomalous pattern in {name}: {{val}}")
            explanations.append({
                "factor": name,
                "impact": round(float(shap_score), 4),
                "reason": template.format(val=raw_val)
            })

    # Sort descending by influence
    explanations = sorted(explanations, key=lambda x: x["impact"], reverse=True)

    # Return structured output with all original and computed properties
    return {
        "parameters_evaluated": {
            "transaction_amount": f"₹{amt:,.2f}",
            "time_of_transaction": txn["time_of_transaction"],
            "location": txn["location"],
            "previous_transaction_location": txn["previous_transaction_location"],
            "previous_transaction_time": txn["previous_transaction_time"],
            "distance_from_previous_transaction": f"{distance_km:.1f} km",
            "time_elapsed": f"{time_diff_hours:.2f} hours",
            "velocity": {
                "last_10_min": txn["txns_last_10_min"],
                "last_1_hour": txn["txns_last_1_hour"],
                "last_24_hours": txn["txns_last_24_hours"]
            },
            "user_normal_profile": {
                "average_amount": f"₹{user_avg:,.2f}",
                "normal_range": f"₹{range_min:,.2f} - ₹{range_max:,.2f}",
                "amount_deviation": f"{amount_deviation:+.2f}x"
            }
        },
        "risk_level": risk_level,            # LOW | MEDIUM | HIGH
        "score": f"{score_100}/100",        # e.g., 94/100
        "score_numeric": score_100,
        "decision": decision,                # APPROVE | REVIEW | BLOCK
        "reasons": explanations[:3]         # Top 3 primary drivers
    }


# -------------------------------------------------------------
# Demo Test Scenarios
# -------------------------------------------------------------
if __name__ == "__main__":
    print("\n--- TEST CASE 1: Suspicious Account Takeover (Spike + Impossible Travel) ---")
    suspicious_payload = {
        "transaction_amount": 42500.00,
        "time_of_transaction": "2026-03-07T03:15:00",
        "location": "Mumbai",
        "previous_transaction_location": "Delhi",
        "previous_transaction_time": "2026-03-07T02:30:00",  # Only 45 mins earlier
        "distance_from_previous_km": 1150.0,                 # 1150 km in 45 mins -> ~1500 km/h
        "txns_last_10_min": 3,
        "txns_last_1_hour": 5,
        "txns_last_24_hours": 9,
        "user_average_amount": 2500.00,
        "user_normal_range_min": 800.00,
        "user_normal_range_max": 4500.00
    }

    result1 = analyze_transaction(suspicious_payload)
    print(f"Risk Level: {result1['risk_level']} | Decision: {result1['decision']} | Score: {result1['score']}")
    print("Detected Risk Reasons:")
    for r in result1["reasons"]:
        print(f"  • {r['reason']} (Impact: {r['impact']})")

    print("\n--- TEST CASE 2: Normal Routine Transaction ---")
    normal_payload = {
        "transaction_amount": 1850.00,
        "time_of_transaction": "2026-03-07T14:20:00",
        "location": "Chennai",
        "previous_transaction_location": "Chennai",
        "previous_transaction_time": "2026-03-06T20:10:00",
        "distance_from_previous_km": 4.2,
        "txns_last_10_min": 0,
        "txns_last_1_hour": 0,
        "txns_last_24_hours": 2,
        "user_average_amount": 2000.00,
        "user_normal_range_min": 500.00,
        "user_normal_range_max": 3500.00
    }

    result2 = analyze_transaction(normal_payload)
    print(f"Risk Level: {result2['risk_level']} | Decision: {result2['decision']} | Score: {result2['score']}")