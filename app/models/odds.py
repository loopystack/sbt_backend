from sqlalchemy import Column, Integer, String, Date, Time, Numeric, Float, DateTime
from app.core.database import Base


class Odds(Base):
    __tablename__ = "odds"

    id = Column(Integer, primary_key=True, index=True)
    season = Column(Integer, nullable=False)
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=True)
    home_team = Column(String(100), nullable=False)
    away_team = Column(String(100), nullable=False)
    result = Column(String(10), nullable=True)
    odd_1 = Column(Numeric, nullable=True)
    odd_X = Column(Numeric, nullable=True)
    odd_2 = Column(Numeric, nullable=True)
    bets = Column(Integer, nullable=True)
    country = Column(String(50), nullable=True)
    league = Column(String(100), nullable=False)
    pre_odd_1 = Column(Numeric, nullable=True)
    pre_odd_X = Column(Numeric, nullable=True)
    pre_odd_2 = Column(Numeric, nullable=True)
    
    # AI Prediction fields (added by AI Odds Engine)
    ai_true_odd_1 = Column(Numeric, nullable=True)  # AI-calculated true odds for home win
    ai_true_odd_X = Column(Numeric, nullable=True)  # AI-calculated true odds for draw
    ai_true_odd_2 = Column(Numeric, nullable=True)  # AI-calculated true odds for away win
    ai_prob_home = Column(Float, nullable=True)  # AI probability of home win
    ai_prob_draw = Column(Float, nullable=True)  # AI probability of draw
    ai_prob_away = Column(Float, nullable=True)  # AI probability of away win
    ai_confidence_score = Column(Float, nullable=True)  # Confidence score (0-1)
    ai_model_version = Column(String(255), nullable=True)  # Model version/timestamp
    ai_prediction_timestamp = Column(DateTime, nullable=True)  # When prediction was made

    def __repr__(self):
        return f"<Odds(id={self.id}, home_team='{self.home_team}', away_team='{self.away_team}', date='{self.date}')>"
