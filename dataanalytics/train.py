"""
AI Odds Engine - Training Module
Trains XGBoost model on historical + real-time match data
"""
import os
import sys
import joblib
import xgboost as xgb
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import log_loss, accuracy_score
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Try to import core modules, fallback to local implementations
try:
    from core.features import compute_features
    from core.db import load_matches
    from core.calibration import TemperatureScaler
    from core.config import ARTIFACT_DIR
except ImportError:
    # Fallback: define minimal versions if core modules don't exist
    ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "models", "artifacts")
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    
    # Minimal implementations (you may need to adjust these)
    def load_matches():
        load_dotenv()
        DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql+psycopg://", "postgresql://")
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
        sql = text("""
            SELECT season, date, time, home_team, away_team, result, 
                   odd_1, "odd_X" as odd_X, odd_2, bets, country, league
            FROM odds
            ORDER BY date ASC
        """)
        with engine.connect() as conn:
            return pd.read_sql(sql, conn)
    
    def compute_features(df, n_last=5):
        # Placeholder - you'll need to implement this based on your feature engineering
        # For now, return basic features
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        return df, ['season', 'date', 'home_team', 'away_team', 'country', 'league']
    
    class TemperatureScaler:
        def __init__(self):
            self.T = 1.0
        def fit(self, logits, market_probs, initial_T=1.0):
            self.T = initial_T
        def transform_proba(self, logits):
            return logits
        def save(self, path):
            joblib.dump(self, path)
        @staticmethod
        def load(path):
            return joblib.load(path)

load_dotenv()

# Ensure artifact directory exists
os.makedirs(ARTIFACT_DIR, exist_ok=True)


def cross_entropy(true_probs, pred_probs, eps=1e-15):
    """Cross-entropy between two probability distributions."""
    true_probs = np.clip(true_probs, eps, 1 - eps)
    pred_probs = np.clip(pred_probs, eps, 1 - eps)
    return -np.mean(np.sum(true_probs * np.log(pred_probs), axis=1))


def bookmaker_implied_probs_row(row):
    """Compute normalized probabilities from bookmaker odds."""
    def inv(x):
        try:
            return 1.0 / float(x) if x and float(x) > 0 else 0.0
        except:
            return 0.0
    p1 = inv(row.get('odd_1'))
    pX = inv(row.get('odd_X') or row.get('odd_x'))
    p2 = inv(row.get('odd_2'))
    s = p1 + pX + p2
    if s <= 0:
        return np.array([1/3, 1/3, 1/3])
    return np.array([p1/s, pX/s, p2/s])


def load_historical_and_realtime_data(include_recent_days=7):
    """
    Load historical data + recent real-time match data for training.
    
    Args:
        include_recent_days: Number of recent days to include (for real-time data)
    
    Returns:
        DataFrame with all match data
    """
    print(f"📊 Loading historical + real-time data (last {include_recent_days} days)...")
    
    df = load_matches()
    
    # Ensure date column is datetime
    df['date'] = pd.to_datetime(df['date'], errors='coerce')
    
    # Filter to include recent matches (real-time data)
    if include_recent_days > 0:
        cutoff_date = datetime.now() - timedelta(days=include_recent_days)
        recent_matches = df[df['date'] >= cutoff_date]
        print(f"   Found {len(recent_matches)} recent matches (last {include_recent_days} days)")
    
    print(f"   Total matches loaded: {len(df)}")
    print(f"   Date range: {df['date'].min()} to {df['date'].max()}")
    
    return df


def train_ai_model(include_recent_days=7, retrain=True):
    """
    Train AI model on historical + real-time match data.
    
    Args:
        include_recent_days: Number of recent days to include for real-time training
        retrain: If True, retrain from scratch; if False, load existing model
    
    Returns:
        Trained model and artifacts
    """
    print("=" * 60)
    print("🤖 AI Odds Engine - Training Module")
    print("=" * 60)
    
    if not retrain and os.path.exists(f"{ARTIFACT_DIR}/xgb_model.joblib"):
        print("📦 Loading existing model...")
        return load_artifacts()
    
    # 1️⃣ Load historical + real-time data
    df = load_historical_and_realtime_data(include_recent_days=include_recent_days)
    
    # 2️⃣ Compute features
    print("\n🔧 Computing features...")
    df_feats, feat_cols = compute_features(df)
    
    # 3️⃣ Encode categorical features
    print("🔤 Encoding categorical features...")
    le_country = LabelEncoder()
    le_league = LabelEncoder()
    df_feats['country_enc'] = le_country.fit_transform(df_feats['country'].astype(str))
    df_feats['league_enc'] = le_league.fit_transform(df_feats['league'].astype(str))
    
    used_features = [c for c in feat_cols if c not in ('country', 'league')] + ['country_enc', 'league_enc']
    
    # 4️⃣ Prepare training data (only rows with results)
    df_train = df_feats[df_feats['target'].notna()].copy()
    
    if len(df_train) == 0:
        raise ValueError("No training data found! Ensure matches have results.")
    
    X = df_train[used_features].fillna(0)
    y = df_train['target'].astype(int)
    
    print(f"   Training samples: {len(X)}")
    print(f"   Features: {len(used_features)}")
    
    # 5️⃣ Split chronologically (time-aware split)
    split_idx = int(len(df_train) * 0.9)
    X_train, X_val = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_val = y.iloc[:split_idx], y.iloc[split_idx:]
    
    print(f"   Train set: {len(X_train)} samples")
    print(f"   Validation set: {len(X_val)} samples")
    
    # 6️⃣ Create DMatrix for XGBoost
    dtrain = xgb.DMatrix(X_train, label=y_train)
    dval = xgb.DMatrix(X_val, label=y_val)
    
    # 7️⃣ Train XGBoost model
    print("\n🚀 Training XGBoost model...")
    params = {
        'objective': 'multi:softprob',
        'num_class': 3,
        'eval_metric': 'mlogloss',
        'eta': 0.05,
        'max_depth': 6,
        'subsample': 0.8,
        'colsample_bytree': 0.7,
        'seed': 42,
        'verbosity': 1
    }
    
    model = xgb.train(
        params,
        dtrain,
        num_boost_round=1000,
        evals=[(dtrain, 'train'), (dval, 'eval')],
        early_stopping_rounds=50,
        verbose_eval=50
    )
    
    # 8️⃣ Evaluate model
    print("\n📊 Model Evaluation:")
    preds_val = model.predict(dval)
    logloss = log_loss(y_val, preds_val)
    accuracy = accuracy_score(y_val, preds_val.argmax(axis=1))
    
    print(f"   LogLoss: {logloss:.4f}")
    print(f"   Accuracy: {accuracy:.4f}")
    
    # 9️⃣ Calibrate with bookmaker odds
    print("\n🎯 Calibrating with bookmaker odds...")
    logits_val = model.predict(dval, output_margin=True)
    
    odds_cols = df_train.iloc[split_idx:][['odd_1', 'odd_X', 'odd_2']].fillna(0).to_dict(orient='records')
    market_probs = np.vstack([bookmaker_implied_probs_row(r) for r in odds_cols])
    
    ts = TemperatureScaler()
    ts.fit(logits_val, market_probs, initial_T=1.0)
    print(f"   Temperature T: {ts.T:.4f}")
    
    calibrated_probs = ts.transform_proba(logits_val)
    ce_market = cross_entropy(market_probs, calibrated_probs)
    print(f"   Cross-Entropy (calibrated->market): {ce_market:.4f}")
    
    # 🔟 Save artifacts
    print(f"\n💾 Saving artifacts to {ARTIFACT_DIR}...")
    joblib.dump(model, f"{ARTIFACT_DIR}/xgb_model.joblib")
    joblib.dump(le_country, f"{ARTIFACT_DIR}/le_country.joblib")
    joblib.dump(le_league, f"{ARTIFACT_DIR}/le_league.joblib")
    joblib.dump(used_features, f"{ARTIFACT_DIR}/features.joblib")
    ts.save(f"{ARTIFACT_DIR}/temp_scaler.joblib")
    
    # Save model metadata
    metadata = {
        'trained_at': datetime.now().isoformat(),
        'training_samples': len(X_train),
        'validation_samples': len(X_val),
        'features_count': len(used_features),
        'logloss': float(logloss),
        'accuracy': float(accuracy),
        'temperature_T': float(ts.T),
        'include_recent_days': include_recent_days
    }
    joblib.dump(metadata, f"{ARTIFACT_DIR}/model_metadata.joblib")
    
    print("✅ Model training completed!")
    print("=" * 60)
    
    return model, used_features, le_country, le_league, ts


def load_artifacts():
    """Load trained model artifacts"""
    model = joblib.load(f"{ARTIFACT_DIR}/xgb_model.joblib")
    le_country = joblib.load(f"{ARTIFACT_DIR}/le_country.joblib")
    le_league = joblib.load(f"{ARTIFACT_DIR}/le_league.joblib")
    used_features = joblib.load(f"{ARTIFACT_DIR}/features.joblib")
    
    temp_path = f"{ARTIFACT_DIR}/temp_scaler.joblib"
    temp_scaler = None
    if os.path.exists(temp_path):
        temp_scaler = TemperatureScaler.load(temp_path)
    
    return model, used_features, le_country, le_league, temp_scaler


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Train AI Odds Engine")
    parser.add_argument("--recent-days", type=int, default=7, help="Days of recent data to include")
    parser.add_argument("--retrain", action="store_true", help="Force retrain even if model exists")
    
    args = parser.parse_args()
    
    train_ai_model(include_recent_days=args.recent_days, retrain=args.retrain)
