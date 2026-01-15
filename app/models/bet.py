"""
Bet Model
Core betting model for single bets using internal USDT wallet
"""
from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey, Index, Enum as SQLEnum, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class BetStatus(str, enum.Enum):
    """Bet status enumeration"""
    PENDING = "pending"
    WON = "won"
    LOST = "lost"
    VOID = "void"
    CANCELLED = "cancelled"
    SETTLING = "settling"  # Optional: prevents concurrency issues during settlement


class Bet(Base):
    """
    Bet model for single bets using internal USDT wallet
    Core betting integration using internal wallet
    """
    __tablename__ = "bets"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Match Information
    match_id = Column(Integer, ForeignKey("odds.id"), nullable=False, index=True)
    
    # Betting Details
    market_key = Column(String(50), nullable=False)  # e.g., "1x2", "over_2_5", "both_teams_score"
    selection_key = Column(String(50), nullable=False)  # e.g., "home", "draw", "away", "yes", "no"
    
    # Odds and Stake
    odds_decimal = Column(Numeric(10, 4), nullable=False)  # Decimal odds (e.g., 2.50)
    stake = Column(Numeric(20, 8), nullable=False)  # Stake amount in USDT
    currency = Column(String(10), nullable=False, default="USDT")
    
    # Status
    status = Column(SQLEnum(BetStatus), nullable=False, default=BetStatus.PENDING, index=True)
    
    # Settlement tracking
    settle_version = Column(Integer, nullable=False, default=0)  # For idempotency checks
    
    # Timestamps
    placed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    settled_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="bets")
    match = relationship("Odds", backref="bet_records")  # Changed from "bets" to avoid conflict with Odds.bets column
    
    # Constraints
    __table_args__ = (
        CheckConstraint('stake > 0', name='check_stake_positive'),
        CheckConstraint('odds_decimal >= 1.01', name='check_odds_minimum'),
        # Indexes for performance
        Index('idx_bet_user_status', 'user_id', 'status'),
        Index('idx_bet_match', 'match_id'),
        Index('idx_bet_user_match_market_selection', 'user_id', 'match_id', 'market_key', 'selection_key', 'status'),
    )
    
    def __repr__(self):
        return f"<Bet(id={self.id}, user_id={self.user_id}, match_id={self.match_id}, status={self.status}, stake={self.stake})>"
    
    @property
    def potential_profit(self) -> float:
        """Calculate potential profit if bet wins"""
        return float(self.stake * (self.odds_decimal - 1))
    
    @property
    def potential_payout(self) -> float:
        """Calculate total payout if bet wins (stake + profit)"""
        return float(self.stake * self.odds_decimal)
