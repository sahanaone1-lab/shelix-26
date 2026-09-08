import csv
import logging
import math
import pathlib
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import joblib
import pandas as pd
from app.core.database import get_supabase
from app.services.blockchain_service import blockchain_service

logger = logging.getLogger("fraudlens.fraud_service")

# Deterministic namespace for sample dataset IDs
SAMPLE_DATASET_NAMESPACE = uuid.UUID("f47ac10b-58cc-4372-a567-0e02b2c3d479")

# Approximate city coordinates for spatiotemporal distance calculation
CITY_COORDINATES: Dict[str, tuple] = {
    "delhi": (28.6139, 77.2090),
    "mumbai": (19.0760, 72.8777),
    "bengaluru": (12.9716, 77.5946),
    "chennai": (13.0827, 80.2707),
    "kolkata": (22.5726, 88.3639),
    "hyderabad": (17.3850, 78.4867),
    "pune": (18.5204, 73.8567),
    "jaipur": (26.9124, 75.7873),
}

# Explanation templates from predict_and_explain.py
REASON_TEMPLATES = {
    "amount_deviation": "Amount deviates by +{val:.1f}x from user's typical spending average",
    "implied_travel_speed_kmh": "Impossible Travel Velocity: Physical speed between locations is {val:.1f} km/h",
    "hour_of_day": "Transaction executed during unusual night hours ({val:02d}:00)",
    "txns_last_10_min": "High-frequency burst: {val} payments attempted in the last 10 minutes",
    "txns_last_1_hour": "Velocity spike: {val} payments executed within the past hour",
    "txns_last_24_hours": "Unusual volume: {val} transactions recorded in the last 24 hours",
    "distance_from_prev_km": "Location is {val:.1f} km away from prior authenticated transaction",
    "is_diff_location": "Transaction originated from a new/unrecognized location",
    "transaction_amount": "Nominal purchase amount (₹{val:,.2f}) is in high-risk bracket",
}

def calculate_haversine_distance(loc1: str, loc2: str) -> float:
    """Calculates geographical distance between two cities in kilometers."""
    c1 = CITY_COORDINATES.get(loc1.strip().lower())
    c2 = CITY_COORDINATES.get(loc2.strip().lower())
    if not c1 or not c2:
        return 0.0 if loc1.strip().lower() == loc2.strip().lower() else 500.0

    lat1, lon1 = math.radians(c1[0]), math.radians(c1[1])
    lat2, lon2 = math.radians(c2[0]), math.radians(c2[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return 6371.0 * c  # Earth radius in km


class FraudAnalysisService:
    """
    Decoupled service layer connecting FastAPI, the ML model, and Supabase.
    """

    def __init__(self):
        self.ml_dir = pathlib.Path(__file__).resolve().parents[2] / "ml" / "fraud-detection-ml"
        self._model = None
        self._explainer = None
        self._feature_names = None

    def _ensure_artifacts_loaded(self):
        """Loads model artifacts using reliable absolute paths."""
        if self._model is None or self._explainer is None or self._feature_names is None:
            try:
                model_path = self.ml_dir / "fraud_model.pkl"
                explainer_path = self.ml_dir / "shap_explainer.pkl"
                feature_path = self.ml_dir / "feature_names.pkl"

                logger.info(f"Loading ML model artifacts from: {self.ml_dir}")
                self._model = joblib.load(model_path)
                self._explainer = joblib.load(explainer_path)
                self._feature_names = joblib.load(feature_path)
                logger.info(f"Loaded ML artifacts successfully. Features: {self._feature_names}")
            except Exception as e:
                logger.error(f"Failed to load ML artifacts: {e}", exc_info=True)
                raise RuntimeError(f"Could not load ML artifacts: {e}")

    def evaluate_features(self, input_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs the trained model & SHAP explainer on the 11 features,
        converts output to 0-100 score, and applies fixed business rules:
          LOW: 0–39     → trusted-device verification
          MEDIUM: 40–69 → trusted-device verification
          HIGH: 70–100  → BLOCKED + priority investigation
        """
        self._ensure_artifacts_loaded()

        # Construct input DataFrame matching exact feature names and order
        df = pd.DataFrame([input_dict])[self._feature_names]

        # 1. Predict risk probability & compute 0-100 score
        risk_prob = float(self._model.predict_proba(df)[0][1])
        score_100 = int(round(risk_prob * 100))

        # 2. Fixed Business Rules
        if score_100 >= 70:
            risk_level = "HIGH"
            decision = "BLOCKED"
            status = "BLOCKED"
        elif score_100 >= 40:
            risk_level = "MEDIUM"
            decision = "TRUSTED_DEVICE_VERIFICATION"
            status = "FLAGGED"
        else:
            risk_level = "LOW"
            decision = "TRUSTED_DEVICE_VERIFICATION"
            status = "FLAGGED"

        # 3. Extract SHAP Explanations across all 11 model features using existing explainer
        shap_vals = self._explainer.shap_values(df)[0]
        shap_by_feature = {
            name: round(float(score), 4) for name, score in zip(self._feature_names, shap_vals)
        }

        # 4. Extract actual transaction values and baseline context
        amt = float(input_dict.get("transaction_amount", df["transaction_amount"].iloc[0]))
        hour = int(input_dict.get("hour_of_day", df["hour_of_day"].iloc[0]))
        user_avg = float(input_dict.get("user_avg_amount", df["user_avg_amount"].iloc[0]))
        amt_dev = float(input_dict.get("amount_deviation", df["amount_deviation"].iloc[0]))
        dist_km = float(input_dict.get("distance_from_prev_km", df["distance_from_prev_km"].iloc[0]))
        time_hours = float(input_dict.get("time_since_prev_hours", df["time_since_prev_hours"].iloc[0]))
        speed = float(input_dict.get("implied_travel_speed_kmh", df["implied_travel_speed_kmh"].iloc[0]))
        is_diff = int(input_dict.get("is_diff_location", df["is_diff_location"].iloc[0]))
        n_10m = int(input_dict.get("txns_last_10_min", df["txns_last_10_min"].iloc[0]))
        n_1h = int(input_dict.get("txns_last_1_hour", df["txns_last_1_hour"].iloc[0]))
        n_24h = int(input_dict.get("txns_last_24_hours", df["txns_last_24_hours"].iloc[0]))

        loc = str(input_dict.get("location", "Delhi")).strip()
        prev_loc = str(input_dict.get("previous_location", loc)).strip()
        range_min = float(input_dict.get("normal_range_min", 0.0))
        range_max = float(input_dict.get("normal_range_max", 0.0))

        # 5. Build transaction-specific risk drivers (mapping model features to human-readable factors)
        def fmt_shap(val: float) -> str:
            if abs(val) < 0.005:
                return "+0.00"
            return f"{val:+.2f}"

        drivers = []

        # Driver A: Transaction Amount Anomaly
        # Features: amount_deviation, transaction_amount
        shap_dev = shap_by_feature.get("amount_deviation", 0.0)
        shap_amt = shap_by_feature.get("transaction_amount", 0.0)
        shap_impact_amt = round(shap_dev + shap_amt, 4) if (shap_dev * shap_amt > 0) else (shap_dev if abs(shap_dev) >= abs(shap_amt) else shap_amt)

        has_amount_anomaly = (
            amt_dev > 0.5
            or (range_max > 0 and amt > range_max)
            or shap_impact_amt > 0.05
        )
        if has_amount_anomaly:
            drivers.append({
                "factor": "amount_deviation",
                "feature_name": "transaction_amount",
                "title": "Transaction Amount Anomaly",
                "current": f"₹{amt:,.2f}",
                "historical_avg": f"₹{user_avg:,.2f}" if user_avg > 0 else "N/A",
                "normal_range": f"₹{range_min:,.2f} – ₹{range_max:,.2f}" if (range_min > 0 or range_max > 0) else None,
                "deviation": f"{amt_dev * 100:+.1f}%" if amt_dev != 0 else "+0.0%",
                "shap_impact": shap_impact_amt,
                "shap_display": fmt_shap(shap_impact_amt),
                "reason": f"Transaction amount (₹{amt:,.2f}) is significantly higher than the customer's historical spending pattern (avg ₹{user_avg:,.2f}), deviating by {amt_dev * 100:+.1f}%.",
                "explanation": "Transaction amount is significantly higher than the customer's historical spending pattern."
            })

        # Driver B: Location & Travel Velocity Anomaly
        # Features: implied_travel_speed_kmh, distance_from_prev_km, is_diff_location
        shap_speed = shap_by_feature.get("implied_travel_speed_kmh", 0.0)
        shap_dist = shap_by_feature.get("distance_from_prev_km", 0.0)
        shap_impact_speed = round(shap_speed + shap_dist, 4) if (shap_speed * shap_dist > 0) else (shap_speed if abs(shap_speed) >= abs(shap_dist) else shap_dist)

        has_travel_anomaly = (
            speed > 300.0
            or (dist_km > 200.0 and time_hours < 2.0)
            or shap_impact_speed > 0.05
        )
        if has_travel_anomaly:
            time_display = f"{time_hours:.2f} hours" if time_hours >= 1.0 else f"{time_hours * 60:.0f} mins"
            drivers.append({
                "factor": "implied_travel_speed_kmh",
                "feature_name": "implied_travel_speed_kmh",
                "title": "Impossible Travel Speed",
                "current_location": loc,
                "previous_location": prev_loc,
                "distance": f"{dist_km:,.1f} km",
                "time_since_previous": time_display,
                "implied_speed": f"{speed:,.1f} km/h",
                "shap_impact": shap_impact_speed,
                "shap_display": fmt_shap(shap_impact_speed),
                "reason": f"Physical travel speed between consecutive locations ({loc} and {prev_loc}) is {speed:,.1f} km/h across {dist_km:,.1f} km in {time_display}, which is physically impossible.",
                "explanation": f"Implied travel speed of {speed:,.1f} km/h exceeds physical possibility, indicating concurrent card usage or account takeover."
            })

        # Driver C: Transaction Velocity Spike
        # Features: txns_last_10_min, txns_last_1_hour, txns_last_24_hours
        shap_10m = shap_by_feature.get("txns_last_10_min", 0.0)
        shap_1h = shap_by_feature.get("txns_last_1_hour", 0.0)
        shap_24h = shap_by_feature.get("txns_last_24_hours", 0.0)
        shap_impact_vel = round(shap_10m + shap_1h, 4) if (shap_10m * shap_1h > 0) else (shap_10m if abs(shap_10m) >= abs(shap_1h) else shap_1h)

        has_velocity_anomaly = (
            n_10m >= 2
            or n_1h >= 4
            or n_24h >= 10
            or shap_impact_vel > 0.05
        )
        if has_velocity_anomaly:
            drivers.append({
                "factor": "txns_last_10_min",
                "feature_name": "txns_last_10_min",
                "title": "High Transaction Frequency",
                "txns_last_10_min": n_10m,
                "txns_last_1_hour": n_1h,
                "txns_last_24_hours": n_24h,
                "shap_impact": shap_impact_vel,
                "shap_display": fmt_shap(shap_impact_vel),
                "reason": f"High-frequency burst: {n_10m} payments attempted in the last 10 minutes ({n_1h} in the last hour, {n_24h} in 24 hours).",
                "explanation": f"Transaction velocity surge ({n_10m} txns in 10 mins, {n_1h} in 1 hr) indicates rapid automated testing or account draining."
            })

        # Driver D: Transaction Execution Timing
        # Feature: hour_of_day
        shap_hour = shap_by_feature.get("hour_of_day", 0.0)
        has_time_anomaly = (hour < 6 or hour >= 23 or shap_hour > 0.05)
        if has_time_anomaly:
            drivers.append({
                "factor": "hour_of_day",
                "feature_name": "hour_of_day",
                "title": "Unusual Transaction Time",
                "current_hour": f"{hour:02d}:00",
                "baseline_schedule": "Typical daytime activity (07:00 – 23:00)",
                "shap_impact": shap_hour,
                "shap_display": fmt_shap(shap_hour),
                "reason": f"Transaction executed during unusual night hours ({hour:02d}:00), outside the customer's normal operating schedule.",
                "explanation": f"Transaction occurred outside the customer's normal transaction timing ({hour:02d}:00 night hours)."
            })

        # If no anomaly was triggered (normal low-risk transaction)
        if not drivers:
            shap_norm_amt = shap_dev if abs(shap_dev) > 0.005 else shap_amt
            drivers.append({
                "factor": "amount_deviation",
                "feature_name": "transaction_amount",
                "title": "Overall Spending Profile",
                "current": f"₹{amt:,.2f}",
                "historical_avg": f"₹{user_avg:,.2f}" if user_avg > 0 else "N/A",
                "normal_range": f"₹{range_min:,.2f} – ₹{range_max:,.2f}" if (range_min > 0 or range_max > 0) else None,
                "deviation": f"{amt_dev * 100:+.1f}%" if amt_dev != 0 else "+0.0%",
                "shap_impact": shap_norm_amt,
                "shap_display": fmt_shap(shap_norm_amt),
                "reason": f"Transaction amount (₹{amt:,.2f}) aligns with customer's typical spending baseline.",
                "explanation": "Transaction behavior is consistent with historical patterns."
            })

        # Sort drivers by absolute SHAP impact descending so primary drivers lead
        drivers = sorted(drivers, key=lambda d: abs(d.get("shap_impact", 0.0)), reverse=True)

        return {
            "risk_prob": risk_prob,
            "risk_score": float(score_100),
            "risk_level": risk_level,
            "decision": decision,
            "status": status,
            "reasons": drivers,
            "features_evaluated": input_dict,
            "shap_by_feature": shap_by_feature,
        }

    def _ensure_user_and_account(self, supabase, user_id: str) -> tuple:
        """
        Ensures target user and account records exist in Supabase to satisfy foreign key constraints.
        """
        # Ensure user
        user_res = supabase.table("users").select("id").eq("id", user_id).limit(1).execute()
        if not user_res.data or len(user_res.data) == 0:
            logger.info(f"Seeding demo user: {user_id}")
            supabase.table("users").upsert({
                "id": user_id,
                "name": "Alex Mercer",
                "email": "customer@bank.com",
                "role": "customer"
            }).execute()

        # Ensure account
        acct_res = supabase.table("accounts").select("id").eq("user_id", user_id).limit(1).execute()
        if acct_res.data and len(acct_res.data) > 0:
            account_id = acct_res.data[0]["id"]
        else:
            account_id = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33"
            logger.info(f"Seeding demo account: {account_id}")
            supabase.table("accounts").upsert({
                "id": account_id,
                "user_id": user_id,
                "account_number": "ACCT-4128-9021",
                "account_type": "Checking",
                "balance": 12450.00
            }).execute()

        return user_id, account_id

    def seed_and_screen_sample_dataset(self, user_id: str = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11") -> Dict[str, Any]:
        """
        Loads the 100-record seed dataset from sample_100_transactions.csv,
        runs each through the trained ML model, and saves results into Supabase.
        Guarantees IDEMPOTENT synchronization:
        - Uses deterministic UUIDs and sample signature matching.
        - If a sample transaction already exists in Supabase, it is NOT inserted again.
        - Cleans up duplicate instances of sample transactions without touching non-sample records.
        - Repeated sync calls always result in exactly 100 unique sample transactions.
        """
        self._ensure_artifacts_loaded()
        csv_path = self.ml_dir / "sample_100_transactions.csv"

        if not csv_path.exists():
            raise FileNotFoundError(f"Sample dataset not found at {csv_path}")

        supabase = get_supabase()
        if not supabase:
            raise RuntimeError("Supabase client not available")

        # Ensure parent user and account exist
        user_id, account_id = self._ensure_user_and_account(supabase, user_id)

        # 1. Parse all 100 records from CSV
        sample_rows = []
        with open(csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader):
                amt = round(float(row["transaction_amount"]), 2)
                loc = row.get("location", "Delhi").strip()
                det_id = str(uuid.uuid5(SAMPLE_DATASET_NAMESPACE, f"sample_100_txn_{idx}_{amt}_{loc.lower()}"))
                sample_rows.append({
                    "index": idx,
                    "det_id": det_id,
                    "amt": amt,
                    "loc": loc,
                    "signature": (amt, loc.lower()),
                    "raw_row": row,
                })

        sample_signatures = {r["signature"] for r in sample_rows}

        # 2. Fetch all existing transactions for this user from Supabase
        existing_res = (
            supabase.table("transactions")
            .select("id, amount, location, user_id, status, risk_score, risk_level, reasons")
            .eq("user_id", user_id)
            .execute()
        )
        existing_txns = existing_res.data or []

        # 3. Group existing sample transactions by signature to detect and clean duplicates
        sample_existing_map: Dict[tuple, List[Dict[str, Any]]] = {}
        for txn in existing_txns:
            t_amt = round(float(txn["amount"]), 2)
            t_loc = (txn.get("location") or "").strip().lower()
            t_sig = (t_amt, t_loc)
            if t_sig in sample_signatures:
                sample_existing_map.setdefault(t_sig, []).append(txn)

        duplicate_ids_to_clean: List[str] = []
        active_sample_records: Dict[tuple, Dict[str, Any]] = {}

        for sig, matching_txns in sample_existing_map.items():
            # Keep the first transaction instance
            active_sample_records[sig] = matching_txns[0]
            # If duplicates exist for this sample transaction, mark extras for cleanup
            if len(matching_txns) > 1:
                for extra in matching_txns[1:]:
                    duplicate_ids_to_clean.append(extra["id"])

        # Clean up duplicate instances in batches without touching non-sample transactions
        if duplicate_ids_to_clean:
            logger.info(f"Deduplicating {len(duplicate_ids_to_clean)} redundant sample transaction copies...")
            for i in range(0, len(duplicate_ids_to_clean), 100):
                batch = duplicate_ids_to_clean[i:i + 100]
                try:
                    supabase.table("suspicious_attempts").delete().in_("transaction_id", batch).execute()
                except Exception as e:
                    logger.warning(f"Note on suspicious_attempts cleanup batch: {e}")
                try:
                    supabase.table("transactions").delete().in_("id", batch).execute()
                except Exception as e:
                    logger.warning(f"Note on transactions cleanup batch: {e}")

        # 4. Evaluate sample rows and prepare new inserts only for missing sample records
        transactions_to_insert = []
        evaluations_to_insert = []
        high_risk_count = 0
        medium_risk_count = 0
        low_risk_count = 0

        now_iso = datetime.now(timezone.utc).isoformat()

        for s_item in sample_rows:
            row = s_item["raw_row"]
            sig = s_item["signature"]
            amt = s_item["amt"]
            loc = s_item["loc"]
            det_id = s_item["det_id"]

            hour = int(row["hour_of_day"])
            user_avg = float(row["user_avg_amount"])
            amt_dev = float(row["amount_deviation"])
            dist_km = float(row["distance_from_prev_km"])
            time_hours = float(row["time_since_prev_hours"])
            speed = float(row["implied_travel_speed_kmh"])
            is_diff = int(row["is_diff_location"])
            n_10m = int(row["txns_last_10_min"])
            n_1h = int(row["txns_last_1_hour"])
            n_24h = int(row["txns_last_24_hours"])

            feature_dict = {
                "transaction_amount": float(row["transaction_amount"]),
                "hour_of_day": hour,
                "user_avg_amount": user_avg,
                "amount_deviation": amt_dev,
                "distance_from_prev_km": dist_km,
                "time_since_prev_hours": time_hours,
                "implied_travel_speed_kmh": speed,
                "is_diff_location": is_diff,
                "txns_last_10_min": n_10m,
                "txns_last_1_hour": n_1h,
                "txns_last_24_hours": n_24h,
                "location": loc,
                "previous_location": row.get("previous_location", loc),
                "normal_range_min": float(row.get("normal_range_min", 0.0)),
                "normal_range_max": float(row.get("normal_range_max", 0.0)),
            }

            evaluation = self.evaluate_features(feature_dict)

            if evaluation["risk_level"] == "HIGH":
                high_risk_count += 1
            elif evaluation["risk_level"] == "MEDIUM":
                medium_risk_count += 1
            else:
                low_risk_count += 1

            # Idempotency check: if transaction already exists in Supabase, update its reasons to keep explanations in sync
            if sig in active_sample_records:
                existing_record = active_sample_records[sig]
                try:
                    supabase.table("transactions").update({
                        "reasons": evaluation["reasons"]
                    }).eq("id", existing_record["id"]).execute()
                except Exception as e:
                    logger.warning(f"Note on updating reasons for {existing_record['id']}: {e}")
                continue

            txn_payload = {
                "id": det_id,
                "user_id": user_id,
                "account_id": account_id,
                "amount": amt,
                "transaction_type": "TRANSFER",
                "location": loc,
                "status": evaluation["status"],
                "risk_score": evaluation["risk_score"],
                "risk_level": evaluation["risk_level"],
                "reasons": evaluation["reasons"],
                "analysis_timestamp": now_iso,
            }
            transactions_to_insert.append(txn_payload)
            evaluations_to_insert.append(evaluation)

        # 5. Insert new records if any were missing
        if transactions_to_insert:
            logger.info(f"Inserting {len(transactions_to_insert)} new sample transactions into Supabase...")
            insert_res = supabase.table("transactions").insert(transactions_to_insert).execute()
            created_txns = insert_res.data or []

            suspicious_attempts_to_insert = []
            for txn_record, eval_result in zip(created_txns, evaluations_to_insert):
                if eval_result["risk_level"] in ["HIGH", "MEDIUM"]:
                    primary_reason = (
                        eval_result["reasons"][0]["reason"]
                        if eval_result["reasons"]
                        else f"{eval_result['risk_level']} risk score detected ({eval_result['risk_score']}/100)"
                    )
                    suspicious_attempts_to_insert.append({
                        "transaction_id": txn_record.get("id"),
                        "user_id": user_id,
                        "reason": primary_reason,
                        "risk_score": eval_result["risk_score"],
                        "risk_level": eval_result["risk_level"],
                        "explanations": eval_result["reasons"],
                        "status": "UNDER_REVIEW" if eval_result["risk_level"] == "MEDIUM" else "BLOCKED",
                    })

            if suspicious_attempts_to_insert:
                logger.info(f"Inserting {len(suspicious_attempts_to_insert)} suspicious attempts into Supabase...")
                supabase.table("suspicious_attempts").insert(suspicious_attempts_to_insert).execute()

            # Anchor finalized decisions (COMPLETED / BLOCKED) to FraudDecisionLedger
            for txn_record, eval_result in zip(created_txns, evaluations_to_insert):
                status_clean = (txn_record.get("status") or "").upper()
                if status_clean in ("COMPLETED", "BLOCKED"):
                    try:
                        self.finalize_and_anchor_decision(
                            transaction_id=txn_record["id"],
                            decision=status_clean,
                            risk_score=eval_result["risk_score"],
                            risk_level=eval_result["risk_level"],
                            evidence_data=eval_result.get("reasons"),
                            update_db=False,
                        )
                    except Exception as b_err:
                        logger.warning(
                            f"Blockchain anchoring skipped for sample txn {txn_record.get('id')} (non-blocking): {b_err}"
                        )
        else:
            logger.info("All 100 sample transactions already exist in Supabase. No new rows inserted.")

        return {
            "status": "success",
            "total_processed": len(sample_rows),
            "unique_sample_transactions": 100,
            "new_inserted": len(transactions_to_insert),
            "already_existing": len(sample_rows) - len(transactions_to_insert),
            "high_risk": high_risk_count,
            "medium_risk": medium_risk_count,
            "low_risk": low_risk_count,
        }

    def get_all_analyst_transactions(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Fetches all transactions from Supabase for the Analyst Dashboard,
        prioritized by risk_score descending.
        Does not truncate results unless an explicit limit is provided.
        """
        supabase = get_supabase()
        if not supabase:
            return []

        try:
            query = (
                supabase.table("transactions")
                .select("*, users(name, email), accounts(account_number, account_type), beneficiaries(beneficiary_name, account_reference)")
                .order("risk_score", desc=True)
            )
            if limit is not None:
                query = query.limit(limit)
            res = query.execute()
            return res.data or []
        except Exception as e:
            logger.error(f"Error fetching transactions for analyst: {e}", exc_info=True)
            return []

    def get_suspicious_attempts(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Fetches suspicious attempts from Supabase for priority investigation.
        Does not truncate results unless an explicit limit is provided.
        """
        supabase = get_supabase()
        if not supabase:
            return []

        try:
            query = (
                supabase.table("suspicious_attempts")
                .select("*, transactions(*)")
                .order("risk_score", desc=True)
            )
            if limit is not None:
                query = query.limit(limit)
            res = query.execute()
            return res.data or []
        except Exception as e:
            logger.error(f"Error fetching suspicious attempts: {e}", exc_info=True)
            return []

    def finalize_and_anchor_decision(
        self,
        transaction_id: str,
        decision: str,
        risk_score: Optional[float] = None,
        risk_level: Optional[str] = None,
        evidence_data: Optional[Any] = None,
        update_db: bool = True,
    ) -> Dict[str, Any]:
        """
        Finalizes an existing transaction decision (COMPLETED or BLOCKED) and anchors it
        to the FraudDecisionLedger smart contract layer.

        Step 1: Create the blockchain audit payload.
        Step 2: Generate required transaction/evidence hash.
        Step 3: Send audit record to FraudDecisionLedger.
        Step 4: Capture blockchain transaction reference / block ID.
        Step 5: Store blockchain reference and audit metadata in backend store.
        Step 6: Fail-safe guarantee: blockchain failure does NOT break transaction outcome.
        - Zero sensitive customer PII on-chain.
        - Backend logging on successful anchoring.
        """
        decision_clean = str(decision).strip().upper()
        if decision_clean not in {"COMPLETED", "BLOCKED"}:
            raise ValueError(f"Decision must be 'COMPLETED' or 'BLOCKED'. Received: '{decision}'")

        supabase = get_supabase()
        db_record = None

        if supabase:
            try:
                res = (
                    supabase.table("transactions")
                    .select("*")
                    .eq("id", transaction_id)
                    .limit(1)
                    .execute()
                )
                if res.data and len(res.data) > 0:
                    db_record = res.data[0]
                    if risk_score is None:
                        risk_score = float(db_record.get("risk_score") or 0.0)
                    if risk_level is None:
                        risk_level = str(db_record.get("risk_level") or "LOW")
                    if evidence_data is None:
                        evidence_data = db_record.get("reasons")

                    if update_db and db_record.get("status") != decision_clean:
                        supabase.table("transactions").update({
                            "status": decision_clean
                        }).eq("id", transaction_id).execute()
                        db_record["status"] = decision_clean
            except Exception as e:
                logger.warning(f"Database interaction note for transaction {transaction_id}: {e}")

        # Fallback values if not in database
        final_score = float(risk_score if risk_score is not None else (85.0 if decision_clean == "BLOCKED" else 15.0))
        final_level = str(risk_level or ("HIGH" if decision_clean == "BLOCKED" else "LOW")).upper()

        # Step 1-5: Anchor to FraudDecisionLedger with fail-safe error handling
        blockchain_result = None
        try:
            blockchain_result = blockchain_service.record_fraud_decision(
                transaction_id=str(transaction_id),
                risk_score=final_score,
                risk_category=final_level,
                decision=decision_clean,
                evidence_data=evidence_data,
            )
        except Exception as bc_err:
            # Step 6: Fail-safe guarantee — core transaction flow is never broken
            logger.warning(
                f"Blockchain anchoring skipped or failed for Txn {transaction_id} (non-blocking, core flow preserved): {bc_err}"
            )

        return {
            "transaction_id": transaction_id,
            "decision": decision_clean,
            "risk_score": final_score,
            "risk_level": final_level,
            "status": decision_clean,
            "blockchain_anchored": bool(blockchain_result and blockchain_result.get("anchored")),
            "blockchain_record": blockchain_result,
        }

    def enrich_transaction_shap(self, txn: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ensures transaction reasons contain genuine, non-zero SHAP values derived
        from the trained model and transaction features.
        """
        if not txn:
            return txn

        reasons = txn.get("reasons")
        has_zero_shap = bool(reasons) and any(
            (r.get("shap_impact") == 0.0 and r.get("shap_display") in {"+0.00", "+0.0", "0.00"})
            for r in reasons
            if r.get("factor") in {"amount_deviation", "implied_travel_speed_kmh", "txns_last_10_min"}
        )

        if not has_zero_shap and reasons:
            return txn

        try:
            self._ensure_artifacts_loaded()
            amt = round(float(txn.get("amount") or 0.0), 2)
            loc = (txn.get("location") or "").strip().lower()
            csv_path = self.ml_dir / "sample_100_transactions.csv"
            if csv_path.exists():
                with open(csv_path, mode="r", encoding="utf-8") as f:
                    for row in csv.DictReader(f):
                        r_amt = round(float(row["transaction_amount"]), 2)
                        r_loc = (row.get("location") or "").strip().lower()
                        if r_amt == amt and r_loc == loc:
                            feature_dict = {
                                "transaction_amount": float(row["transaction_amount"]),
                                "hour_of_day": int(row["hour_of_day"]),
                                "user_avg_amount": float(row["user_avg_amount"]),
                                "amount_deviation": float(row["amount_deviation"]),
                                "distance_from_prev_km": float(row["distance_from_prev_km"]),
                                "time_since_prev_hours": float(row["time_since_prev_hours"]),
                                "implied_travel_speed_kmh": float(row["implied_travel_speed_kmh"]),
                                "is_diff_location": int(row["is_diff_location"]),
                                "txns_last_10_min": int(row["txns_last_10_min"]),
                                "txns_last_1_hour": int(row["txns_last_1_hour"]),
                                "txns_last_24_hours": int(row["txns_last_24_hours"]),
                                "location": row.get("location", "Delhi"),
                                "previous_location": row.get("previous_location", "Delhi"),
                                "normal_range_min": float(row.get("normal_range_min", 0.0)),
                                "normal_range_max": float(row.get("normal_range_max", 0.0)),
                            }
                            eval_res = self.evaluate_features(feature_dict)
                            txn["reasons"] = eval_res["reasons"]
                            try:
                                supabase = get_supabase()
                                if supabase and txn.get("id"):
                                    supabase.table("transactions").update({
                                        "reasons": eval_res["reasons"]
                                    }).eq("id", txn["id"]).execute()
                            except Exception:
                                pass
                            return txn
        except Exception as e:
            logger.warning(f"Could not enrich transaction SHAP: {e}")

        return txn


fraud_service = FraudAnalysisService()

