-- Migration: Add AI prediction columns to odds table
-- Run this migration to enable saving AI predictions directly to odds table

-- Add AI true odds columns (mathematically fair odds)
ALTER TABLE odds ADD COLUMN IF NOT EXISTS ai_true_odd_1 NUMERIC;
ALTER TABLE odds ADD COLUMN IF NOT EXISTS ai_true_odd_X NUMERIC;
ALTER TABLE odds ADD COLUMN IF NOT EXISTS ai_true_odd_2 NUMERIC;

-- Add AI probability columns (true probabilities from ML model)
ALTER TABLE odds ADD COLUMN IF NOT EXISTS ai_prob_home FLOAT;
ALTER TABLE odds ADD COLUMN IF NOT EXISTS ai_prob_draw FLOAT;
ALTER TABLE odds ADD COLUMN IF NOT EXISTS ai_prob_away FLOAT;

-- Add confidence and metadata columns
ALTER TABLE odds ADD COLUMN IF NOT EXISTS ai_confidence_score FLOAT;
ALTER TABLE odds ADD COLUMN IF NOT EXISTS ai_model_version VARCHAR(255);
ALTER TABLE odds ADD COLUMN IF NOT EXISTS ai_prediction_timestamp TIMESTAMP;

-- Create index for faster queries on AI predictions
CREATE INDEX IF NOT EXISTS idx_odds_ai_prediction_timestamp ON odds(ai_prediction_timestamp);
CREATE INDEX IF NOT EXISTS idx_odds_ai_confidence ON odds(ai_confidence_score);

-- Add comments for documentation
COMMENT ON COLUMN odds.ai_true_odd_1 IS 'AI-calculated true odds for home win (mathematically fair)';
COMMENT ON COLUMN odds.ai_true_odd_X IS 'AI-calculated true odds for draw (mathematically fair)';
COMMENT ON COLUMN odds.ai_true_odd_2 IS 'AI-calculated true odds for away win (mathematically fair)';
COMMENT ON COLUMN odds.ai_prob_home IS 'AI-calculated probability of home win';
COMMENT ON COLUMN odds.ai_prob_draw IS 'AI-calculated probability of draw';
COMMENT ON COLUMN odds.ai_prob_away IS 'AI-calculated probability of away win';
COMMENT ON COLUMN odds.ai_confidence_score IS 'Confidence score (0-1) for AI prediction';
COMMENT ON COLUMN odds.ai_model_version IS 'Model version/timestamp used for prediction';
COMMENT ON COLUMN odds.ai_prediction_timestamp IS 'When AI prediction was made';


