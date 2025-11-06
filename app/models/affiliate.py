from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Numeric, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from decimal import Decimal
import enum


class AffiliateStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    INACTIVE = "inactive"


class CommissionStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PAID = "paid"
    CANCELLED = "cancelled"


class Affiliate(Base):
    """Affiliate partner tracking"""
    __tablename__ = "affiliates"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    referral_code = Column(String(50), unique=True, nullable=False, index=True)
    
    # Affiliate details
    company_name = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    website_url = Column(String(500), nullable=True)
    
    # Commission settings
    commission_rate = Column(Numeric(5, 2), default=Decimal("10.00"), nullable=False)  # Percentage
    commission_type = Column(String(50), default="revenue_share")  # 'revenue_share', 'cpa', 'hybrid'
    cpa_amount = Column(Numeric(10, 2), nullable=True)  # For CPA model
    
    # Status and tracking
    status = Column(String(50), default=AffiliateStatus.PENDING.value, index=True)
    total_referrals = Column(Integer, default=0)
    total_conversions = Column(Integer, default=0)
    total_commission_earned = Column(Numeric(15, 2), default=Decimal("0.00"))
    total_commission_paid = Column(Numeric(15, 2), default=Decimal("0.00"))
    
    # Payment info
    payment_method = Column(String(50), nullable=True)  # 'bank', 'paypal', 'crypto'
    payment_details = Column(String(1000), nullable=True)  # JSON string
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships  
    # Note: This creates User.affiliate_account automatically via backref
    user = relationship("User", foreign_keys=[user_id], backref="affiliate_account", overlaps="referred_by_affiliate")
    referrals = relationship("Referral", back_populates="affiliate")
    commissions = relationship("AffiliateCommission", back_populates="affiliate")


class Referral(Base):
    """Track user referrals and conversions"""
    __tablename__ = "referrals"
    
    id = Column(Integer, primary_key=True, index=True)
    affiliate_id = Column(Integer, ForeignKey("affiliates.id"), nullable=False, index=True)
    referred_user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    
    # Referral tracking
    referral_code_used = Column(String(50), nullable=False)
    source = Column(String(100), nullable=True)  # 'direct_link', 'banner', 'social', etc.
    campaign_id = Column(String(100), nullable=True)
    
    # Conversion tracking
    signup_date = Column(DateTime(timezone=True), server_default=func.now())
    first_deposit_date = Column(DateTime(timezone=True), nullable=True)
    first_bet_date = Column(DateTime(timezone=True), nullable=True)
    conversion_date = Column(DateTime(timezone=True), nullable=True)
    is_converted = Column(Boolean, default=False, index=True)
    
    # Revenue tracking
    total_revenue_generated = Column(Numeric(15, 2), default=0.00)
    total_deposits = Column(Numeric(15, 2), default=0.00)
    total_bets = Column(Numeric(15, 2), default=0.00)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    affiliate = relationship("Affiliate", back_populates="referrals")
    referred_user = relationship("User", foreign_keys=[referred_user_id])


class AffiliateCommission(Base):
    """Track affiliate commissions"""
    __tablename__ = "affiliate_commissions"
    
    id = Column(Integer, primary_key=True, index=True)
    affiliate_id = Column(Integer, ForeignKey("affiliates.id"), nullable=False, index=True)
    referral_id = Column(Integer, ForeignKey("referrals.id"), nullable=True, index=True)
    
    # Commission source
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    transaction_type = Column(String(50), nullable=False)  # 'deposit', 'bet_loss', 'revenue'
    
    # Commission calculation
    base_amount = Column(Numeric(15, 2), nullable=False)  # Amount that commission is based on
    commission_rate = Column(Numeric(5, 2), nullable=False)  # Rate used for this commission
    commission_amount = Column(Numeric(15, 2), nullable=False)
    
    # Status
    status = Column(String(50), default=CommissionStatus.PENDING.value, index=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    
    # Payment tracking
    payment_reference = Column(String(200), nullable=True)
    payment_method = Column(String(50), nullable=True)
    
    # Notes
    notes = Column(String(1000), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    affiliate = relationship("Affiliate", back_populates="commissions")
    referral = relationship("Referral")
    transaction = relationship("Transaction")

