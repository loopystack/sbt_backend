"""
AI Odds Engine - Main Executor
Orchestrates training, prediction, and saving AI results to database
"""
import os
import sys
import asyncio
import pandas as pd
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy import create_engine, text, update
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from dotenv import load_dotenv

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from train import train_ai_model, load_artifacts
from predict import predict_true_odds

load_dotenv()

# Database connection
DB_URL = os.getenv("DB_URL", "")
# Convert to sync connection for SQLAlchemy core operations
SYNC_DB_URL = DB_URL.replace("postgresql+psycopg://", "postgresql://").replace("postgresql+asyncpg://", "postgresql://")
engine = create_engine(SYNC_DB_URL, pool_pre_ping=True)


class AIOddsEngine:
    """Main AI Odds Engine executor"""
    
    def __init__(self):
        self.engine = engine
    
    def train_model(self, include_recent_days: int = 7, retrain: bool = False):
        """
        Train AI model on historical + real-time data.
        
        Args:
            include_recent_days: Number of recent days to include
            retrain: Force retrain even if model exists
        """
        print("=" * 60)
        print("🤖 AI Odds Engine - Training")
        print("=" * 60)
        
        try:
            model, features, le_country, le_league, temp_scaler = train_ai_model(
                include_recent_days=include_recent_days,
                retrain=retrain
            )
            print("✅ Training completed successfully!")
            return True
        except Exception as e:
            print(f"❌ Training failed: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def predict_and_save_upcoming_matches(
        self,
        days_ahead: int = 7,
        batch_size: int = 100
    ) -> Dict[str, Any]:
        """
        Predict true odds for upcoming matches and save to database.
        
        Args:
            days_ahead: Number of days ahead to predict
            batch_size: Batch size for processing
        
        Returns:
            Summary statistics
        """
        print("=" * 60)
        print("🔮 AI Odds Engine - Prediction & Save")
        print("=" * 60)
        
        today = date.today()
        end_date = today + timedelta(days=days_ahead)
        
        # Get upcoming matches
        sql = text("""
            SELECT id, season, date, time, home_team, away_team, 
                   odd_1, "odd_X" as odd_X, odd_2, country, league
            FROM odds
            WHERE date >= :start_date 
              AND date <= :end_date
              AND result IS NULL
            ORDER BY date ASC, time ASC
        """)
        
        with self.engine.connect() as conn:
            matches = pd.read_sql(
                sql, 
                conn, 
                params={'start_date': today, 'end_date': end_date}
            )
        
        if len(matches) == 0:
            print("⚠️ No upcoming matches found")
            return {"processed": 0, "saved": 0, "errors": 0}
        
        print(f"📊 Found {len(matches)} upcoming matches")
        
        stats = {
            "processed": 0,
            "saved": 0,
            "errors": 0,
            "skipped": 0
        }
        
        # Process matches in batches
        for i in range(0, len(matches), batch_size):
            batch = matches.iloc[i:i+batch_size]
            print(f"\n📦 Processing batch {i//batch_size + 1} ({len(batch)} matches)...")
            
            for _, match in batch.iterrows():
                try:
                    stats["processed"] += 1
                    
                    # Predict true odds
                    prediction = predict_true_odds(
                        home_team=match['home_team'],
                        away_team=match['away_team'],
                        league=match['league'],
                        country=match['country'] or '',
                        match_date=match['date'],
                        bookmaker_odd_1=float(match['odd_1']) if match['odd_1'] else None,
                        bookmaker_odd_X=float(match['odd_X']) if match['odd_X'] else None,
                        bookmaker_odd_2=float(match['odd_2']) if match['odd_2'] else None
                    )
                    
                    # Save to database
                    success = self._save_prediction_to_db(match['id'], prediction)
                    
                    if success:
                        stats["saved"] += 1
                        if stats["saved"] % 10 == 0:
                            print(f"   ✅ Saved {stats['saved']} predictions...")
                    else:
                        stats["skipped"] += 1
                        
                except Exception as e:
                    stats["errors"] += 1
                    print(f"   ❌ Error processing match {match['id']}: {e}")
                    continue
        
        print("\n" + "=" * 60)
        print("📊 Summary:")
        print(f"   Processed: {stats['processed']}")
        print(f"   Saved: {stats['saved']}")
        print(f"   Skipped: {stats['skipped']}")
        print(f"   Errors: {stats['errors']}")
        print("=" * 60)
        
        return stats
    
    def _save_prediction_to_db(self, match_id: int, prediction: Dict[str, Any]) -> bool:
        """
        Save AI prediction results to database.
        
        Note: This assumes you have added columns to the odds table:
        - ai_true_odd_1, ai_true_odd_X, ai_true_odd_2 (Numeric)
        - ai_prob_home, ai_prob_draw, ai_prob_away (Float)
        - ai_confidence_score (Float)
        - ai_model_version (String)
        - ai_prediction_timestamp (DateTime)
        
        If columns don't exist, you'll need to add them via migration.
        """
        try:
            # Check if AI columns exist (try to update with a test query)
            update_sql = text("""
                UPDATE odds
                SET 
                    ai_true_odd_1 = :true_odd_1,
                    ai_true_odd_X = :true_odd_X,
                    ai_true_odd_2 = :true_odd_2,
                    ai_prob_home = :prob_home,
                    ai_prob_draw = :prob_draw,
                    ai_prob_away = :prob_away,
                    ai_confidence_score = :confidence,
                    ai_model_version = :model_version,
                    ai_prediction_timestamp = :timestamp
                WHERE id = :match_id
            """)
            
            with self.engine.connect() as conn:
                result = conn.execute(
                    update_sql,
                    {
                        'match_id': match_id,
                        'true_odd_1': prediction.get('ai_true_odd_1'),
                        'true_odd_X': prediction.get('ai_true_odd_X'),
                        'true_odd_2': prediction.get('ai_true_odd_2'),
                        'prob_home': prediction.get('ai_prob_home'),
                        'prob_draw': prediction.get('ai_prob_draw'),
                        'prob_away': prediction.get('ai_prob_away'),
                        'confidence': prediction.get('confidence_score'),
                        'model_version': prediction.get('model_version', 'unknown'),
                        'timestamp': datetime.now()
                    }
                )
                conn.commit()
                
                return result.rowcount > 0
                
        except Exception as e:
            # If columns don't exist, try alternative approach
            # You can create a separate table for AI predictions
            try:
                return self._save_to_ai_predictions_table(match_id, prediction)
            except Exception as e2:
                print(f"   ⚠️ Could not save prediction: {e2}")
                return False
    
    def _save_to_ai_predictions_table(self, match_id: int, prediction: Dict[str, Any]) -> bool:
        """
        Save to a separate ai_predictions table (fallback if odds table doesn't have AI columns).
        This creates the table if it doesn't exist.
        """
        try:
            # Create table if not exists
            create_table_sql = text("""
                CREATE TABLE IF NOT EXISTS ai_predictions (
                    id SERIAL PRIMARY KEY,
                    match_id INTEGER NOT NULL REFERENCES odds(id),
                    ai_true_odd_1 NUMERIC,
                    ai_true_odd_X NUMERIC,
                    ai_true_odd_2 NUMERIC,
                    ai_prob_home FLOAT,
                    ai_prob_draw FLOAT,
                    ai_prob_away FLOAT,
                    ai_confidence_score FLOAT,
                    ai_model_version VARCHAR(255),
                    ai_prediction_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(match_id)
                )
            """)
            
            insert_sql = text("""
                INSERT INTO ai_predictions 
                (match_id, ai_true_odd_1, ai_true_odd_X, ai_true_odd_2,
                 ai_prob_home, ai_prob_draw, ai_prob_away,
                 ai_confidence_score, ai_model_version, ai_prediction_timestamp)
                VALUES 
                (:match_id, :true_odd_1, :true_odd_X, :true_odd_2,
                 :prob_home, :prob_draw, :prob_away,
                 :confidence, :model_version, :timestamp)
                ON CONFLICT (match_id) 
                DO UPDATE SET
                    ai_true_odd_1 = EXCLUDED.ai_true_odd_1,
                    ai_true_odd_X = EXCLUDED.ai_true_odd_X,
                    ai_true_odd_2 = EXCLUDED.ai_true_odd_2,
                    ai_prob_home = EXCLUDED.ai_prob_home,
                    ai_prob_draw = EXCLUDED.ai_prob_draw,
                    ai_prob_away = EXCLUDED.ai_prob_away,
                    ai_confidence_score = EXCLUDED.ai_confidence_score,
                    ai_model_version = EXCLUDED.ai_model_version,
                    ai_prediction_timestamp = EXCLUDED.ai_prediction_timestamp
            """)
            
            with self.engine.connect() as conn:
                conn.execute(create_table_sql)
                conn.execute(
                    insert_sql,
                    {
                        'match_id': match_id,
                        'true_odd_1': prediction.get('ai_true_odd_1'),
                        'true_odd_X': prediction.get('ai_true_odd_X'),
                        'true_odd_2': prediction.get('ai_true_odd_2'),
                        'prob_home': prediction.get('ai_prob_home'),
                        'prob_draw': prediction.get('ai_prob_draw'),
                        'prob_away': prediction.get('ai_prob_away'),
                        'confidence': prediction.get('confidence_score'),
                        'model_version': prediction.get('model_version', 'unknown'),
                        'timestamp': datetime.now()
                    }
                )
                conn.commit()
                return True
                
        except Exception as e:
            print(f"   ⚠️ Error saving to ai_predictions table: {e}")
            return False
    
    def run_full_pipeline(
        self,
        train: bool = False,
        include_recent_days: int = 7,
        predict_days_ahead: int = 7
    ):
        """
        Run full AI odds engine pipeline:
        1. Train model (if requested)
        2. Predict true odds for upcoming matches
        3. Save results to database
        """
        print("\n" + "=" * 60)
        print("🚀 AI Odds Engine - Full Pipeline")
        print("=" * 60)
        
        # Step 1: Train model
        if train:
            print("\n📚 Step 1: Training model...")
            success = self.train_model(include_recent_days=include_recent_days, retrain=True)
            if not success:
                print("❌ Training failed, aborting pipeline")
                return
        else:
            print("\n⏭️  Step 1: Skipping training (use --train to retrain)")
        
        # Step 2: Predict and save
        print("\n🔮 Step 2: Predicting true odds and saving to database...")
        stats = self.predict_and_save_upcoming_matches(days_ahead=predict_days_ahead)
        
        print("\n✅ Pipeline completed!")
        return stats


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="AI Odds Engine - Main Executor")
    parser.add_argument("--train", action="store_true", help="Train model before predicting")
    parser.add_argument("--recent-days", type=int, default=7, help="Days of recent data for training")
    parser.add_argument("--predict-days", type=int, default=7, help="Days ahead to predict")
    parser.add_argument("--predict-only", action="store_true", help="Only run predictions (skip training)")
    
    args = parser.parse_args()
    
    engine = AIOddsEngine()
    
    if args.predict_only:
        # Only predict, don't train
        engine.predict_and_save_upcoming_matches(days_ahead=args.predict_days)
    else:
        # Run full pipeline
        engine.run_full_pipeline(
            train=args.train,
            include_recent_days=args.recent_days,
            predict_days_ahead=args.predict_days
        )


if __name__ == "__main__":
    main()

