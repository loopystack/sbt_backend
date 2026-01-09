from sqlalchemy import Column, Integer, String, DateTime, Boolean, Numeric, Text, ForeignKey, Index, Date, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class DepositIntent(Base):
    __tablename__ = "deposit_intents"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    asset = Column(String(10), nullable=False)  # BTC, ETH, USDC, USDT, etc.
    network = Column(String(20), nullable=False)  # Bitcoin, Ethereum, TRON, Polygon, etc.
    amount_quote_fiat = Column(Numeric(10, 2), nullable=False)  # USD amount
    amount_crypto = Column(Numeric(20, 8), nullable=True)  # Crypto amount (nullable until detected)
    generated_address = Column(String(100), nullable=False)
    memo = Column(String(100), nullable=True)  # For XRP, XLM, BNB Beacon, EOS
    expires_at = Column(DateTime, nullable=False)
    status = Column(String(20), default="pending")  # pending, detected, confirmed, settled, expired, failed
    tx_hash = Column(String(100), nullable=True)  # Nullable until detected
    confirmations = Column(Integer, default=0)
    required_confirmations = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    detected_at = Column(DateTime, nullable=True)  # When transaction was first detected
    confirmed_at = Column(DateTime, nullable=True)  # When confirmations reached threshold
    settled_at = Column(DateTime, nullable=True)  # When wallet was credited
    
    # Relationships
    user = relationship("User", back_populates="deposit_intents")
    transactions = relationship("CryptoTransaction", back_populates="deposit_intent")
    
    # Indexes and constraints for performance and idempotency
    __table_args__ = (
        Index('idx_deposit_user_status', 'user_id', 'status'),
        Index('idx_deposit_status_expires', 'status', 'expires_at'),  # For worker queries
        Index('idx_deposit_address', 'generated_address'),  # For address lookups
        Index('idx_deposit_tx_hash', 'tx_hash'),
        # Unique constraint on (network, tx_hash) where tx_hash is not null - prevents double credit
        # Note: PostgreSQL doesn't support partial unique constraints directly in SQLAlchemy
        # We'll handle this in the migration with a unique index
    )

class CryptoTransaction(Base):
    __tablename__ = "crypto_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    deposit_intent_id = Column(Integer, ForeignKey("deposit_intents.id"), nullable=True)  # Nullable for withdrawals
    withdrawal_intent_id = Column(Integer, ForeignKey("withdrawal_intents.id"), nullable=True)  # For withdrawals
    tx_hash = Column(String(100), nullable=False, unique=True)
    from_address = Column(String(100), nullable=True)
    to_address = Column(String(100), nullable=False)
    amount = Column(Numeric(20, 8), nullable=False)  # Crypto amount
    asset = Column(String(10), nullable=False)
    network = Column(String(20), nullable=False)
    block_number = Column(Integer, nullable=True)
    confirmations = Column(Integer, default=0)
    fee = Column(Numeric(20, 8), nullable=True)
    status = Column(String(20), default="pending")  # pending, confirmed, failed
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    deposit_intent = relationship("DepositIntent", back_populates="transactions")
    withdrawal_intent = relationship("WithdrawalIntent", back_populates="transactions")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_crypto_tx_deposit_intent', 'deposit_intent_id'),
        Index('idx_crypto_tx_withdrawal_intent', 'withdrawal_intent_id'),
        Index('idx_crypto_tx_status', 'status'),
        Index('idx_crypto_tx_created_at', 'created_at'),
    )

class CryptoInventory(Base):
    __tablename__ = "crypto_inventory"
    
    id = Column(Integer, primary_key=True, index=True)
    asset = Column(String(10), nullable=False)
    network = Column(String(20), nullable=False)
    address = Column(String(100), nullable=False)
    private_key_encrypted = Column(Text, nullable=True)  # Encrypted private key
    balance = Column(Numeric(20, 8), default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class UserCryptoBalance(Base):
    __tablename__ = "user_crypto_balances"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    asset = Column(String(10), nullable=False)
    balance = Column(Numeric(20, 8), default=0)
    locked_balance = Column(Numeric(20, 8), default=0)  # For pending transactions
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="crypto_balances")
    
    # Unique constraint: one balance per user per asset
    __table_args__ = (
        Index('idx_user_asset_balance', 'user_id', 'asset', unique=True),
    )


class WithdrawalIntent(Base):
    __tablename__ = "withdrawal_intents"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    asset = Column(String(10), nullable=False, default="USDT")
    network = Column(String(20), nullable=False)  # TRC20, ERC20, BEP20, etc.
    amount_crypto = Column(Numeric(20, 8), nullable=False)  # Crypto amount
    amount_usd = Column(Numeric(10, 2), nullable=False)  # USD equivalent
    to_address = Column(String(100), nullable=False)  # User's external wallet address
    memo = Column(String(100), nullable=True)  # For XRP, XLM, BNB Beacon, etc.
    
    # Status tracking
    status = Column(String(20), default="pending")  # pending, approved, processing, completed, failed, cancelled
    tx_hash = Column(String(100), nullable=True)  # Our outgoing transaction hash
    confirmations = Column(Integer, default=0)
    
    # Fees
    network_fee = Column(Numeric(20, 8), nullable=True)  # Blockchain network fee
    platform_fee = Column(Numeric(10, 2), default=0)  # Platform service fee (if any)
    
    # Admin fields
    admin_notes = Column(Text, nullable=True)  # Internal admin notes
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Admin user who approved
    approved_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)  # If rejected, reason
    
    # Compliance
    kyc_required = Column(Boolean, default=False)
    kyc_verified = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    processed_at = Column(DateTime, nullable=True)  # When transaction was sent
    completed_at = Column(DateTime, nullable=True)  # When confirmations reached
    failed_at = Column(DateTime, nullable=True)  # When withdrawal failed
    failure_reason = Column(Text, nullable=True)  # Reason for failure
    
    # Relationships
    user = relationship("User", back_populates="withdrawal_intents", foreign_keys=[user_id])
    approver = relationship("User", foreign_keys=[approved_by])
    transactions = relationship("CryptoTransaction", back_populates="withdrawal_intent")
    
    # Indexes for performance and idempotency
    __table_args__ = (
        Index('idx_withdrawal_user_status', 'user_id', 'status'),
        Index('idx_withdrawal_status_created', 'status', 'created_at'),  # For worker queries
        Index('idx_withdrawal_tx_hash', 'tx_hash'),
        Index('idx_withdrawal_created_at', 'created_at'),
        # Unique constraint on (network, tx_hash) where tx_hash is not null - prevents double sending
        # Note: PostgreSQL doesn't support partial unique constraints directly in SQLAlchemy
        # We'll handle this in the migration with a unique index
    )
