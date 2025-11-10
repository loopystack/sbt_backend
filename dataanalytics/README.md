# AI Odds Engine

A 3-file AI-powered odds calculation system that trains on historical + real-time match data and saves predictions to the database.

## File Structure

### 1. `train.py` - Training Module
- **Purpose**: Train XGBoost model on historical + real-time match data
- **Features**:
  - Loads historical match data
  - Includes recent real-time data (configurable days)
  - Computes features (Elo, form, head-to-head, etc.)
  - Trains XGBoost model with temperature calibration
  - Saves model artifacts to `models/artifacts/`

**Usage:**
```bash
python train.py --recent-days 7 --retrain
```

### 2. `predict.py` - Prediction Module
- **Purpose**: Calculate true odds using trained AI model
- **Features**:
  - Loads trained model artifacts
  - Computes features for a match
  - Predicts true probabilities (Home/Draw/Away)
  - Calculates mathematically fair odds
  - Computes confidence scores
  - Compares with bookmaker odds for value betting

**Usage:**
```python
from predict import predict_true_odds

result = predict_true_odds(
    home_team="Manchester United",
    away_team="Liverpool",
    league="Premier League",
    country="England",
    match_date=date.today()
)
```

### 3. `engine.py` - Main Executor
- **Purpose**: Orchestrates training, prediction, and database saving
- **Features**:
  - Trains model (optional)
  - Predicts true odds for upcoming matches
  - Saves AI predictions to database
  - Batch processing for efficiency
  - Error handling and statistics

**Usage:**
```bash
# Full pipeline (train + predict + save)
python engine.py --train --recent-days 7 --predict-days 7

# Only predict and save (skip training)
python engine.py --predict-only --predict-days 7
```

## Database Schema

The AI predictions are saved to the database. You have two options:

### Option 1: Add columns to existing `odds` table (Recommended)
```sql
ALTER TABLE odds ADD COLUMN IF NOT EXISTS ai_true_odd_1 NUMERIC;
ALTER TABLE odds ADD COLUMN IF NOT EXISTS ai_true_odd_X NUMERIC;
ALTER TABLE odds ADD COLUMN IF NOT EXISTS ai_true_odd_2 NUMERIC;
ALTER TABLE odds ADD COLUMN IF NOT EXISTS ai_prob_home FLOAT;
ALTER TABLE odds ADD COLUMN IF NOT EXISTS ai_prob_draw FLOAT;
ALTER TABLE odds ADD COLUMN IF NOT EXISTS ai_prob_away FLOAT;
ALTER TABLE odds ADD COLUMN IF NOT EXISTS ai_confidence_score FLOAT;
ALTER TABLE odds ADD COLUMN IF NOT EXISTS ai_model_version VARCHAR(255);
ALTER TABLE odds ADD COLUMN IF NOT EXISTS ai_prediction_timestamp TIMESTAMP;
```

### Option 2: Separate `ai_predictions` table (Fallback)
The engine automatically creates this table if Option 1 columns don't exist.

## Workflow

1. **Training** (`train.py`):
   - Loads historical + recent match data
   - Computes features
   - Trains XGBoost model
   - Calibrates with bookmaker odds
   - Saves model artifacts

2. **Prediction** (`predict.py`):
   - Loads trained model
   - Computes features for a match
   - Predicts true probabilities
   - Calculates fair odds
   - Returns comprehensive analysis

3. **Execution** (`engine.py`):
   - Runs training (optional)
   - Processes upcoming matches
   - Saves predictions to database
   - Provides statistics

## Model Features

The AI model uses:
- **Historical data**: Match results, team performance
- **Real-time indicators**: Recent form, current standings
- **Team statistics**: Elo ratings, head-to-head records
- **League patterns**: League-specific characteristics
- **Bookmaker odds**: Market-implied probabilities for calibration

## Output

Each prediction includes:
- **True Probabilities**: AI-calculated probabilities (Home/Draw/Away)
- **True Odds**: Mathematically fair odds (1/probability)
- **Confidence Score**: 0-1 scale (entropy-based)
- **Expected Values**: Value betting metrics (EV = prob × odds - 1)
- **Comparison**: True odds vs bookmaker odds

## Scheduling

Run the engine periodically (e.g., daily via cron):

```bash
# Daily at 2 AM - retrain weekly, predict daily
0 2 * * 0 cd /path/to/dataanalytics && python engine.py --train --recent-days 7 --predict-days 7
0 2 * * 1-6 cd /path/to/dataanalytics && python engine.py --predict-only --predict-days 7
```

## Dependencies

- XGBoost
- scikit-learn
- pandas
- numpy
- SQLAlchemy
- python-dotenv

## Notes

- Model artifacts are saved in `models/artifacts/`
- The engine gracefully handles missing database columns
- Predictions are updated if they already exist (upsert)
- Batch processing for efficiency with large datasets


