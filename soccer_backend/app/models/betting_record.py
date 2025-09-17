from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..core.database import Base

class BettingRecord(Base):
    __tablename__ = "betting_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Bet Information
    bet_amount = Column(Float, nullable=False)
    potential_win = Column(Float, nullable=False)
    actual_profit = Column(Float, nullable=True)  # Will be set when match is settled
    
    # Match Information
    match_teams = Column(String(255), nullable=False)
    match_date = Column(DateTime, nullable=True)  # When the actual match is/was played
    match_league = Column(String(100), nullable=True)
    match_status = Column(String(50), default="upcoming")  # upcoming, live, finished
    
    # Betting Details
    selected_outcome = Column(String(50), nullable=False)  # home, away, draw
    selected_team = Column(String(100), nullable=True)  # Team name if home/away
    odds_value = Column(String(20), nullable=False)  # e.g., "+245", "-312"
    odds_decimal = Column(Float, nullable=False)  # decimal odds for calculation
    
    # Bet Status
    bet_status = Column(String(50), default="pending")  # pending, won, lost, void
    is_settled = Column(Boolean, default=False)
    settlement_date = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="betting_records")
