from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..core.database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Transaction Information
    transaction_type = Column(String(50), nullable=False)  # 'deposit', 'withdrawal', 'bet_placed', 'bet_won', 'bet_lost'
    amount = Column(Float, nullable=False)  # Positive for credits, negative for debits
    balance_before = Column(Float, nullable=False)  # Balance before this transaction
    balance_after = Column(Float, nullable=False)  # Balance after this transaction
    
    # Transaction Details
    description = Column(String(500), nullable=False)  # Human-readable description
    reference_id = Column(String(100), nullable=True)  # Reference to betting_record ID or payment ID
    reference_type = Column(String(50), nullable=True)  # 'betting_record', 'payment', 'manual'
    
    # Status and Metadata
    status = Column(String(50), default="completed")  # 'pending', 'completed', 'failed', 'cancelled'
    payment_method = Column(String(100), nullable=True)  # 'card', 'crypto', 'bank_transfer', etc.
    external_reference = Column(String(200), nullable=True)  # External payment system reference
    
    # Additional Data (JSON-like storage)
    extra_data = Column(Text, nullable=True)  # JSON string for additional data
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="transactions")
    affiliate_commissions = relationship("AffiliateCommission", back_populates="transaction")
