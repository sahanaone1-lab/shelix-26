# generate_dataset.py
import numpy as np
import pandas as pd
import pathlib

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

# Time: primarily daytime (7 AM - 11 PM), but realistic ~5% late evening / night activity
hour_weights = [
    0.005, 0.005, 0.005, 0.005, 0.005, 0.015, 0.03, 0.05, 0.07, 0.08, 0.08, 0.08,
    0.08, 0.08, 0.07, 0.07, 0.07, 0.06, 0.05, 0.05, 0.04, 0.02, 0.01, 0.005
]
p_hour = np.array(hour_weights) / np.sum(hour_weights)
norm_hour = np.random.choice(range(24), size=n_normal, p=p_hour)
norm_loc = np.random.choice(cities, size=n_normal)
norm_prev_loc = norm_loc  # Usually same city

# Spatiotemporal distances
norm_time_diff_hours = np.random.exponential(scale=12.0, size=n_normal) + 1.0  # Hours gap
norm_distance_km = np.random.exponential(scale=6.0, size=n_normal)            # Local distance

# Velocity counters
norm_txns_10m = np.zeros(n_normal, dtype=int)
norm_txns_1h = np.random.choice([0, 1], size=n_normal, p=[0.85, 0.15])
norm_txns_24h = np.random.poisson(lam=2, size=n_normal)

# -------------------------------------------------------------
# 2. Simulate Fraud Scenarios (Multi-Driver Distributions)
# -------------------------------------------------------------
fraud_avg_amt = np.random.uniform(500, 3000, size=n_fraud)
fraud_range_min = fraud_avg_amt * 0.4
fraud_range_max = fraud_avg_amt * 1.8

# Multi-vector fraud: some driven by huge amount, some by impossible travel,
# some by velocity burst, some by off-hours timing, and compound frauds.
fraud_scenarios = np.random.choice(
    ["amount", "travel", "velocity", "night_timing", "compound"],
    size=n_fraud,
    p=[0.25, 0.25, 0.20, 0.15, 0.15],
)

fraud_amount = np.zeros(n_fraud)
fraud_deviation = np.zeros(n_fraud)
fraud_hour = np.zeros(n_fraud, dtype=int)
fraud_loc = []
fraud_prev_loc = []
fraud_distance_km = np.zeros(n_fraud)
fraud_time_diff_hours = np.zeros(n_fraud)
fraud_txns_10m = np.zeros(n_fraud, dtype=int)
fraud_txns_1h = np.zeros(n_fraud, dtype=int)
fraud_txns_24h = np.zeros(n_fraud, dtype=int)

for i in range(n_fraud):
    scenario = fraud_scenarios[i]
    f_avg = fraud_avg_amt[i]
    f_max = fraud_range_max[i]

    l1 = np.random.choice(cities)
    l2 = np.random.choice(cities)

    if scenario == "amount":
        # Massive purchase spike (3.5x to 15x normal max)
        amt = f_max * np.random.uniform(3.5, 14.0)
        h = np.random.choice(range(24))
        dist = np.random.exponential(scale=10.0)
        td = np.random.uniform(1.0, 12.0)
        n10 = 0
        n1 = np.random.choice([0, 1])
        n24 = np.random.randint(1, 5)
        l2 = l1

    elif scenario == "travel":
        # Impossible physical velocity across distant cities in minimal minutes
        amt = np.random.uniform(f_avg * 0.8, f_max * 1.5)
        h = np.random.choice(range(24))
        dist = np.random.uniform(350.0, 1400.0)
        td = np.random.uniform(0.05, 0.5)  # 3 to 30 mins
        n10 = np.random.choice([0, 1])
        n1 = np.random.choice([1, 2])
        n24 = np.random.randint(2, 6)
        while l2 == l1:
            l2 = np.random.choice(cities)

    elif scenario == "velocity":
        # Rapid automated card testing / drain bursts
        amt = np.random.uniform(f_avg * 0.5, f_max * 1.5)
        h = np.random.choice(range(24))
        dist = np.random.exponential(scale=10.0)
        td = np.random.uniform(0.05, 0.3)
        n10 = np.random.choice([2, 3, 4, 5])
        n1 = n10 + np.random.randint(2, 6)
        n24 = n1 + np.random.randint(5, 15)
        l2 = l1

    elif scenario == "night_timing":
        # High-risk off-hours execution with moderate amount deviation
        amt = f_max * np.random.uniform(1.8, 4.0)
        h = np.random.choice([0, 1, 2, 3, 4, 5])
        dist = np.random.uniform(20.0, 300.0)
        td = np.random.uniform(0.5, 3.0)
        n10 = np.random.choice([0, 1])
        n1 = np.random.choice([1, 2, 3])
        n24 = np.random.randint(3, 8)

    else:  # compound
        # Simultaneous severe anomalies (matches sample high-fraud transactions)
        amt = f_max * np.random.uniform(4.0, 12.0)
        h = np.random.choice([0, 1, 2, 3, 4, 5])
        dist = np.random.uniform(400.0, 1300.0)
        td = np.random.uniform(0.05, 0.4)
        n10 = np.random.choice([2, 3, 4, 5])
        n1 = n10 + np.random.randint(2, 6)
        n24 = n1 + np.random.randint(5, 15)
        while l2 == l1:
            l2 = np.random.choice(cities)

    fraud_amount[i] = amt
    fraud_deviation[i] = (amt - f_avg) / f_avg
    fraud_hour[i] = h
    fraud_loc.append(l1)
    fraud_prev_loc.append(l2)
    fraud_distance_km[i] = dist
    fraud_time_diff_hours[i] = td
    fraud_txns_10m[i] = n10
    fraud_txns_1h[i] = n1
    fraud_txns_24h[i] = n24

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
    "is_fraud": 0,
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
    "is_fraud": 1,
})

df = pd.concat([df_norm, df_fraud], ignore_index=True).sample(frac=1.0, random_state=42).reset_index(drop=True)

# Derive implied speed (km/h) for Impossible Travel detection
df["implied_travel_speed_kmh"] = df["distance_from_prev_km"] / np.maximum(df["time_since_prev_hours"], 0.01)
df["is_diff_location"] = (df["location"] != df["previous_location"]).astype(int)

output_path = pathlib.Path(__file__).resolve().parent / "transactions.csv"
df.to_csv(output_path, index=False)
print(f"Generated transactions.csv ({len(df)} rows, {df['is_fraud'].mean()*100:.2f}% fraud rate) at {output_path}")