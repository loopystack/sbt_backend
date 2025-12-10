from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey, Date, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class UserDailyLimits(Base):
    """
    Tracks daily limits for users (deposits, withdrawals, bets)
    Resets daily at midnight UTC
    """
    __tablename__ = "user_daily_limits"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False, default=func.current_date())
    
    # Daily deposit totals
    deposits_count = Column(Integer, default=0)
    deposits_amount_usd = Column(Numeric(15, 2), default=0)
    
    # Daily withdrawal totals
    withdrawals_count = Column(Integer, default=0)
    withdrawals_amount_usd = Column(Numeric(15, 2), default=0)
    
    # Daily betting totals
    bets_count = Column(Integer, default=0)
    bets_amount_usd = Column(Numeric(15, 2), default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="daily_limits")
    
    # Indexes for fast lookups
    __table_args__ = (
        Index('idx_user_date_limits', 'user_id', 'date', unique=True),
        Index('idx_date_limits', 'date'),
    )




