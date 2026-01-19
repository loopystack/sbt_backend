"""
Wallet Transaction Ledger Model
Tracks all balance changes for audit and reconciliation
"""
from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey, Index, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class WalletTransactionType(str, enum.Enum):
    """Types of wallet transactions"""
    DEPOSIT_CREDIT = "DEPOSIT_CREDIT"
    BET_LOCK = "BET_LOCK"  # Lock stake when bet is placed
    BET_UNLOCK = "BET_UNLOCK"  # Generic unlock (legacy, use specific types)
    BET_CANCEL_UNLOCK = "BET_CANCEL_UNLOCK"  # Unlock stake when bet is cancelled
    BET_VOID_UNLOCK = "BET_VOID_UNLOCK"  # Unlock stake when bet is voided
    BET_DEBIT = "BET_DEBIT"  # Generic debit (legacy, use BET_LOSS_DEDUCT)
    BET_LOSS_DEDUCT = "BET_LOSS_DEDUCT"  # Deduct reserved stake (loss)
    BET_PAYOUT = "BET_PAYOUT"  # Generic payout (legacy, use specific types)
    BET_WIN_DEDUCT_STAKE = "BET_WIN_DEDUCT_STAKE"  # Deduct reserved stake on win
    BET_WIN_PAYOUT_CREDIT = "BET_WIN_PAYOUT_CREDIT"  # Credit payout on win
    BET_WIN = "BET_WIN"  # Legacy: use BET_WIN_PAYOUT_CREDIT instead
    BET_LOSS = "BET_LOSS"  # Legacy: use BET_LOSS_DEDUCT instead
    WITHDRAWAL_LOCK = "WITHDRAWAL_LOCK"
    WITHDRAWAL_UNLOCK = "WITHDRAWAL_UNLOCK"
    WITHDRAWAL_DEBIT = "WITHDRAWAL_DEBIT"
    WITHDRAWAL_REFUND = "WITHDRAWAL_REFUND"  # Refund when withdrawal fails
    MANUAL_ADJUSTMENT = "MANUAL_ADJUSTMENT"


class ReferenceType(str, enum.Enum):
    """Types of references for wallet transactions"""
    DEPOSIT = "deposit"
    BET = "bet"
    WITHDRAWAL = "withdrawal"
    MANUAL = "manual"


class WalletTransaction(Base):
    """
    Ledger entry for every balance change
    Ensures complete audit trail and reconciliation
    """
    __tablename__ = "wallet_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    asset = Column(String(10), nullable=False, index=True)  # USDT, BTC, etc.
    
    # Transaction details
    type = Column(SQLEnum(WalletTransactionType), nullable=False, index=True)
    amount = Column(Numeric(20, 8), nullable=False)  # Always positive, direction determined by type
    
    # Balance snapshots
    balance_before = Column(Numeric(20, 8), nullable=False)
    balance_after = Column(Numeric(20, 8), nullable=False)
    reserved_before = Column(Numeric(20, 8), nullable=False, default=0)
    reserved_after = Column(Numeric(20, 8), nullable=False, default=0)
    
    # Reference to source transaction
    reference_type = Column(SQLEnum(ReferenceType), nullable=True)
    reference_id = Column(Integer, nullable=True)  # ID of deposit_intent, bet, withdrawal_intent, etc.
    
    # Metadata
    description = Column(String(500), nullable=True)  # Human-readable description
    metadata_json = Column(String(1000), nullable=True)  # JSON string for additional data (renamed from 'metadata' - reserved in SQLAlchemy)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now(), nullable=False, index=True)
    
    # Relationships
    user = relationship("User", back_populates="wallet_transactions")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_wallet_tx_user_asset', 'user_id', 'asset'),
        Index('idx_wallet_tx_user_date', 'user_id', 'created_at'),
        Index('idx_wallet_tx_reference', 'reference_type', 'reference_id'),
        Index('idx_wallet_tx_type_date', 'type', 'created_at'),
    )
    
    def __repr__(self):
        return f"<WalletTransaction(id={self.id}, user_id={self.user_id}, type={self.type}, amount={self.amount})>"

