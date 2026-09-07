# generate_dataset.py
import numpy as np
import pandas as pd

np.random.seed(42)
n_normal = 9000
n_fraud = 1000
total = n_normal + n_fraud

cities = ["Mumbai", "Delhi", "Bengaluru", "Chennai", "Kolkata", "Pune", "Hyderabad", "Jaipur"]

# -------------------------------------------------------------
# 1. Simulate Normal Baseline Profiles
# -------------------------------------------------------------
norm_avg_amt = np.random.uniform(500, 3000, size=n_normal)
norm_range_min = norm_avg_amt * 0.4
norm_range_max = norm_avg_amt * 1.8

# Amount within habitual range
norm_amount = np.random.uniform(norm_range_min, norm_range_max)
norm_deviation = (norm_amount - norm_avg_amt) / norm_avg_amt

# Time & Location
norm_hour = np.random.choice(range(7, 23), size=n_normal)  # 7 AM to 11 PM
norm_loc = np.random.choice(cities, size=n_normal)
norm_prev_loc = norm_loc  # Usually same city

# Spatiotemporal distances
norm_time_diff_hours = np.random.exponential(scale=12.0, size=n_normal) + 1.0  # Hours gap
norm_distance_km = np.random.exponential(scale=6.0, size=n_normal)            # Local distance

# Velocity counters
norm_txns_10m = np.zeros(n_normal, dtype=int)
norm_txns_1h = np.random.choice([0, 1], size=n_normal, p=[0.8, 0.2])
norm_txns_24h = np.random.poisson(lam=2, size=n_normal)

# -------------------------------------------------------------
# 2. Simulate Fraud Scenarios
# -------------------------------------------------------------
fraud_avg_amt = np.random.uniform(500, 3000, size=n_fraud)
fraud_range_min = fraud_avg_amt * 0.4
fraud_range_max = fraud_avg_amt * 1.8

# Sudden massive spike above baseline range
fraud_amount = fraud_range_max * np.random.uniform(4.0, 15.0, size=n_fraud)
fraud_deviation = (fraud_amount - fraud_avg_amt) / fraud_avg_amt

# Midnight timing + high geographical delta
fraud_hour = np.random.choice([0, 1, 2, 3, 4, 5], size=n_fraud)
fraud_loc = np.random.choice(cities, size=n_fraud)
fraud_prev_loc = np.random.choice(cities, size=n_fraud)

# Impossible velocity: long distance in very short time
fraud_time_diff_hours = np.random.uniform(0.05, 0.4, size=n_fraud)      # 3 to 24 mins gap
fraud_distance_km = np.random.uniform(350.0, 1400.0, size=n_fraud)      # Hundreds of km away

# High velocity burst
fraud_txns_10m = np.random.choice([2, 3, 4, 5], size=n_fraud)
fraud_txns_1h = fraud_txns_10m + np.random.randint(2, 6, size=n_fraud)
fraud_txns_24h = fraud_txns_1h + np.random.randint(5, 15, size=n_fraud)

# -------------------------------------------------------------
# 3. Combine DataFrames
# -------------------------------------------------------------
df_norm = pd.DataFrame({
    "transaction_amount": norm_amount,
    "hour_of_day": norm_hour,
    "user_avg_amount": norm_avg_amt,
    "normal_range_min": norm_range_min,
    "normal_range_max": norm_range_max,
    "amount_deviation": norm_deviation,
    "location": norm_loc,
    "previous_location": norm_prev_loc,
    "distance_from_prev_km": norm_distance_km,
    "time_since_prev_hours": norm_time_diff_hours,
    "txns_last_10_min": norm_txns_10m,
    "txns_last_1_hour": norm_txns_1h,
    "txns_last_24_hours": norm_txns_24h,
    "is_fraud": 0
})

df_fraud = pd.DataFrame({
    "transaction_amount": fraud_amount,
    "hour_of_day": fraud_hour,
    "user_avg_amount": fraud_avg_amt,
    "normal_range_min": fraud_range_min,
    "normal_range_max": fraud_range_max,
    "amount_deviation": fraud_deviation,
    "location": fraud_loc,
    "previous_location": fraud_prev_loc,
    "distance_from_prev_km": fraud_distance_km,
    "time_since_prev_hours": fraud_time_diff_hours,
    "txns_last_10_min": fraud_txns_10m,
    "txns_last_1_hour": fraud_txns_1h,
    "txns_last_24_hours": fraud_txns_24h,
    "is_fraud": 1
})

df = pd.concat([df_norm, df_fraud], ignore_index=True).sample(frac=1.0, random_state=42).reset_index(drop=True)

# Derive implied speed (km/h) for Impossible Travel detection
df["implied_travel_speed_kmh"] = df["distance_from_prev_km"] / np.maximum(df["time_since_prev_hours"], 0.01)
df["is_diff_location"] = (df["location"] != df["previous_location"]).astype(int)

df.to_csv("transactions.csv", index=False)
print(f"Generated transactions.csv ({len(df)} rows, {df['is_fraud'].mean()*100:.2f}% fraud rate)")