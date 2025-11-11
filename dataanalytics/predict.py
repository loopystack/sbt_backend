"""
AI Odds Engine - Prediction Module
Calculates true odds using trained AI model
"""
import os
import sys
import joblib
import xgboost as xgb
import pandas as pd
import numpy as np
from datetime import datetime, date
from typing import Dict, Any, Optional, Tuple
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Try to import core modules
try:
    from core.features import compute_features
    from core.db import load_matches
    from core.calibration import TemperatureScaler
    from core.config import ARTIFACT_DIR
except ImportError:
    ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "models", "artifacts")
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    
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
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        return df, ['season', 'date', 'home_team', 'away_team', 'country', 'league']
    
    class TemperatureScaler:
        def transform_proba(self, logits):
            return logits
        @staticmethod
        def load(path):
            return joblib.load(path)

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql+psycopg://", "postgresql://")
if DATABASE_URL:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)


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


def decimal_to_american(decimal_odds: float) -> Optional[int]:
    """Convert decimal odds to American format"""
    if decimal_odds is None or decimal_odds == 0:
        return None
    if decimal_odds >= 2.0:
        return int(round((decimal_odds - 1) * 100))
    else:
        return int(round(-100 / (decimal_odds - 1)))


def calculate_confidence_score(probabilities: Tuple[float, float, float]) -> float:
    """
    Calculate confidence score based on probability distribution entropy.
    Higher confidence = more certain prediction (one outcome dominates)
    """
    prob_1, prob_X, prob_2 = probabilities
    
    # Calculate entropy
    entropy = 0.0
    for prob in [prob_1, prob_X, prob_2]:
        if prob > 0:
            entropy -= prob * np.log2(prob)
    
    # Maximum entropy for 3 outcomes = log2(3) ≈ 1.585
    max_entropy = np.log2(3)
    
    # Normalize to 0-1 scale (1 = high confidence, 0 = low confidence)
    confidence = 1 - (entropy / max_entropy)
    
    return round(confidence, 4)


def predict_true_odds(
    home_team: str,
    away_team: str,
    league: str,
    country: str,
    match_date: date,
    bookmaker_odd_1: Optional[float] = None,
    bookmaker_odd_X: Optional[float] = None,
    bookmaker_odd_2: Optional[float] = None,
    n_last: int = 5
) -> Dict[str, Any]:
    """
    Calculate true odds for a match using AI model.
    
    Args:
        home_team: Home team name
        away_team: Away team name
        league: League name
        country: Country name
        match_date: Match date
        bookmaker_odd_1: Bookmaker odds for home win (optional)
        bookmaker_odd_X: Bookmaker odds for draw (optional)
        bookmaker_odd_2: Bookmaker odds for away win (optional)
        n_last: Number of recent matches to consider for features
    
    Returns:
        Dict with true odds, probabilities, confidence, and comparison metrics
    """
    match_date_ts = pd.to_datetime(match_date)
    
    # Load historical data
    sql = text("""
        SELECT season, date, time, home_team, away_team, result, 
               odd_1, "odd_X" as odd_X, odd_2, bets, country, league
        FROM odds
        WHERE date <= :dt
        ORDER BY date ASC
    """)
    
    with engine.connect() as conn:
        hist = pd.read_sql(sql, conn, params={'dt': match_date_ts})
    
    hist['date'] = pd.to_datetime(hist['date'], errors='coerce')
    
    # Try to find exact match row (for bookmaker odds)
    match_odds = hist[
        (hist['home_team'] == home_team) &
        (hist['away_team'] == away_team) &
        (hist['league'] == league) &
        (hist['country'] == country) &
        (hist['date'] == match_date_ts)
    ].tail(1)
    
    # Use provided odds or from database
    if not match_odds.empty:
        odd_1 = match_odds.iloc[0]['odd_1'] if bookmaker_odd_1 is None else bookmaker_odd_1
        odd_X = match_odds.iloc[0]['odd_X'] if bookmaker_odd_X is None else bookmaker_odd_X
        odd_2 = match_odds.iloc[0]['odd_2'] if bookmaker_odd_2 is None else bookmaker_odd_2
    else:
        odd_1 = bookmaker_odd_1
        odd_X = bookmaker_odd_X
        odd_2 = bookmaker_odd_2
    
    # Append row for prediction
    new_row = {
        'season': None,
        'date': match_date_ts,
        'time': None,
        'home_team': home_team,
        'away_team': away_team,
        'result': None,
        'odd_1': odd_1,
        'odd_X': odd_X,
        'odd_2': odd_2,
        'bets': None,
        'country': country,
        'league': league
    }
    
    hist = pd.concat([hist, pd.DataFrame([new_row])], ignore_index=True)
    hist = hist.sort_values('date').reset_index(drop=True)
    
    # Compute features
    df_feats, feat_cols = compute_features(hist, n_last=n_last)
    match_row = df_feats.iloc[-1].copy()
    
    # Load artifacts
    model, used_features, le_country, le_league, temp_scaler = load_artifacts()
    
    # Encode categorical safely
    if str(match_row['country']) in le_country.classes_:
        match_row['country_enc'] = le_country.transform([str(match_row['country'])])[0]
    else:
        match_row['country_enc'] = -1
    
    if str(match_row['league']) in le_league.classes_:
        match_row['league_enc'] = le_league.transform([str(match_row['league'])])[0]
    else:
        match_row['league_enc'] = -1
    
    # Prepare features
    X = match_row[used_features].fillna(0).values.reshape(1, -1)
    dmat = xgb.DMatrix(X, feature_names=used_features)
    
    # Get predictions
    logits = model.predict(dmat, output_margin=True)[0]
    
    # Apply temperature scaling if available
    if temp_scaler is not None:
        proba = temp_scaler.transform_proba(logits.reshape(1, -1))[0]
    else:
        proba = model.predict(dmat)[0]
    
    # Ensure probabilities sum to 1
    proba = proba / proba.sum()
    
    # Calculate true odds (fair odds from probabilities)
    true_odds_1 = 1.0 / proba[0] if proba[0] > 0 else None
    true_odds_X = 1.0 / proba[1] if proba[1] > 0 else None
    true_odds_2 = 1.0 / proba[2] if proba[2] > 0 else None
    
    # Calculate confidence score
    confidence = calculate_confidence_score((proba[0], proba[1], proba[2]))
    
    # Calculate bookmaker implied probabilities
    def bookmaker_implied_probs(odd_1, odd_X, odd_2):
        def inv(x):
            try:
                return 1.0 / float(x) if x and float(x) > 0 else 0.0
            except:
                return 0.0
        p1 = inv(odd_1)
        pX = inv(odd_X)
        p2 = inv(odd_2)
        s = p1 + pX + p2
        if s <= 0:
            return [1/3, 1/3, 1/3]
        return [p1/s, pX/s, p2/s]
    
    bm_implied = bookmaker_implied_probs(odd_1, odd_X, odd_2) if all([odd_1, odd_X, odd_2]) else [None, None, None]
    
    # Calculate expected values (value betting metrics)
    ev_home = (proba[0] * float(odd_1)) - 1 if odd_1 else None
    ev_draw = (proba[1] * float(odd_X)) - 1 if odd_X else None
    ev_away = (proba[2] * float(odd_2)) - 1 if odd_2 else None
    
    return {
        # Match info
        'home_team': home_team,
        'away_team': away_team,
        'league': league,
        'country': country,
        'match_date': match_date.isoformat(),
        
        # AI True Probabilities
        'ai_prob_home': float(proba[0]),
        'ai_prob_draw': float(proba[1]),
        'ai_prob_away': float(proba[2]),
        
        # AI True Odds (mathematically fair)
        'ai_true_odd_1': round(true_odds_1, 2) if true_odds_1 else None,
        'ai_true_odd_X': round(true_odds_X, 2) if true_odds_X else None,
        'ai_true_odd_2': round(true_odds_2, 2) if true_odds_2 else None,
        
        # Bookmaker Odds
        'bookmaker_odd_1': float(odd_1) if odd_1 else None,
        'bookmaker_odd_X': float(odd_X) if odd_X else None,
        'bookmaker_odd_2': float(odd_2) if odd_2 else None,
        
        # Bookmaker Implied Probabilities
        'bm_implied_home': float(bm_implied[0]) if bm_implied[0] else None,
        'bm_implied_draw': float(bm_implied[1]) if bm_implied[1] else None,
        'bm_implied_away': float(bm_implied[2]) if bm_implied[2] else None,
        
        # Value Metrics
        'expected_value_home': round(ev_home, 4) if ev_home is not None else None,
        'expected_value_draw': round(ev_draw, 4) if ev_draw is not None else None,
        'expected_value_away': round(ev_away, 4) if ev_away is not None else None,
        
        # Confidence
        'confidence_score': confidence,
        'confidence_level': _get_confidence_level(confidence),
        
        # Model info
        'model_version': _get_model_version(),
        'prediction_timestamp': datetime.now().isoformat()
    }


def _get_confidence_level(confidence: float) -> str:
    """Convert confidence score to human-readable level"""
    if confidence >= 0.8:
        return "Very High"
    elif confidence >= 0.6:
        return "High"
    elif confidence >= 0.4:
        return "Medium"
    elif confidence >= 0.2:
        return "Low"
    else:
        return "Very Low"


def _get_model_version() -> str:
    """Get model version from metadata"""
    metadata_path = f"{ARTIFACT_DIR}/model_metadata.joblib"
    if os.path.exists(metadata_path):
        try:
            metadata = joblib.load(metadata_path)
            return metadata.get('trained_at', 'unknown')
        except:
            return 'unknown'
    return 'unknown'


if __name__ == "__main__":
    # Example usage
    result = predict_true_odds(
        home_team="Manchester United",
        away_team="Liverpool",
        league="Premier League",
        country="England",
        match_date=date.today()
    )
    print(result)
