from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Numeric, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=True)
    hashed_password = Column(String(255), nullable=True)  # Nullable for Google OAuth users
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_superuser = Column(Boolean, default=False)
    
    # OAuth fields
    google_id = Column(String(100), unique=True, nullable=True, index=True)
    avatar_url = Column(Text, nullable=True)
    
    # User funds (in USD)
    funds_usd = Column(Numeric(15, 2), default=0.00, nullable=False)
    
    # Affiliate/Referral tracking
    referral_code_used = Column(String(50), nullable=True, index=True)  # Code used when signing up
    referred_by_affiliate_id = Column(Integer, ForeignKey("affiliates.id"), nullable=True, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    deposit_intents = relationship("DepositIntent", back_populates="user")
    withdrawal_intents = relationship("WithdrawalIntent", back_populates="user", foreign_keys="WithdrawalIntent.user_id")
    crypto_balances = relationship("UserCryptoBalance", back_populates="user")
    daily_limits = relationship("UserDailyLimits", back_populates="user")
    wallet_transactions = relationship("WalletTransaction", back_populates="user")
    betting_records = relationship("BettingRecord", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")
    click_events = relationship("ClickEvent", back_populates="user")
    page_views = relationship("PageView", back_populates="user")
    conversion_events = relationship("ConversionEvent", back_populates="user")
    compliance = relationship("UserCompliance", back_populates="user", uselist=False)
    compliance_alerts = relationship("ComplianceAlert", back_populates="user")
    # User who referred this user (if any) - uses User.referred_by_affiliate_id -> Affiliate.id  
    # Note: affiliate_account is created via backref from Affiliate.user relationship
    # We use primaryjoin to explicitly specify this uses referred_by_affiliate_id, not user_id
    referred_by_affiliate = relationship(
        "Affiliate", 
        foreign_keys=[referred_by_affiliate_id],
        primaryjoin="User.referred_by_affiliate_id == Affiliate.id",
        overlaps="affiliate_account"
    )

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', username='{self.username}')>"


class EmailVerification(Base):
    __tablename__ = "email_verifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    email = Column(String(255), nullable=False)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<EmailVerification(id={self.id}, user_id={self.user_id}, email='{self.email}')>"


class PasswordReset(Base):
    __tablename__ = "password_resets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    email = Column(String(255), nullable=False)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<PasswordReset(id={self.id}, user_id={self.user_id}, email='{self.email}')>"
