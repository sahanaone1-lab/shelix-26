# train_model.py
import pathlib
import joblib
import pandas as pd
import shap
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

ml_dir = pathlib.Path(__file__).resolve().parent
csv_path = ml_dir / "transactions.csv"

if not csv_path.exists():
    import generate_dataset  # Generate if not exists

df = pd.read_csv(csv_path)

# Exact feature set used for model decisions
features = [
    "transaction_amount",
    "hour_of_day",
    "user_avg_amount",
    "amount_deviation",
    "distance_from_prev_km",
    "time_since_prev_hours",
    "implied_travel_speed_kmh",
    "is_diff_location",
    "txns_last_10_min",
    "txns_last_1_hour",
    "txns_last_24_hours"
]

X = df[features]
y = df["is_fraud"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()

model = XGBClassifier(
    n_estimators=120,
    max_depth=4,
    learning_rate=0.08,
    colsample_bytree=0.7,
    colsample_bynode=0.7,
    subsample=0.85,
    scale_pos_weight=scale_pos_weight,
    eval_metric="logloss",
    random_state=42
)
model.fit(X_train, y_train)

# Quick evaluation
preds = model.predict(X_test)
probs = model.predict_proba(X_test)[:, 1]
print(f"ROC-AUC: {roc_auc_score(y_test, probs):.4f}")
print(classification_report(y_test, preds, target_names=["Normal", "Fraud"]))

print("Feature Importances:")
for f, imp in zip(features, model.feature_importances_):
    print(f"  {f:25s}: {imp:.4f}")

# Export model artifacts
explainer = shap.TreeExplainer(model)
joblib.dump(model, ml_dir / "fraud_model.pkl")
joblib.dump(explainer, ml_dir / "shap_explainer.pkl")
joblib.dump(features, ml_dir / "feature_names.pkl")

print(f"Saved fraud_model.pkl, shap_explainer.pkl, and feature_names.pkl to {ml_dir}.")