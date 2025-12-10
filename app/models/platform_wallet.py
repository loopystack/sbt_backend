from sqlalchemy import Column, Integer, String, DateTime, Boolean, Numeric, Index
from sqlalchemy.sql import func
from app.core.database import Base


class PlatformWallet(Base):
    """
    Manages platform's crypto wallets (hot and cold storage)
    Hot wallets: Used for withdrawals (keep minimum balance)
    Cold wallets: Long-term storage (majority of funds)
    """
    __tablename__ = "platform_wallets"
    
    id = Column(Integer, primary_key=True, index=True)
    asset = Column(String(10), nullable=False)  # USDT, BTC, ETH, etc.
    network = Column(String(20), nullable=False)  # TRC20, ERC20, BEP20, etc.
    address = Column(String(100), nullable=False, unique=True)
    balance = Column(Numeric(20, 8), default=0)  # Current balance (updated via monitoring)
    
    # Wallet type
    is_hot_wallet = Column(Boolean, default=True)  # True = hot (withdrawals), False = cold (storage)
    
    # Balance management
    min_balance_threshold = Column(Numeric(20, 8), nullable=True)  # Alert if below this
    max_balance_threshold = Column(Numeric(20, 8), nullable=True)  # Transfer to cold if above
    
    # Security
    is_active = Column(Boolean, default=True)
    is_multisig = Column(Boolean, default=False)
    required_signatures = Column(Integer, nullable=True)  # For multisig
    total_signatures = Column(Integer, nullable=True)  # For multisig
    
    # Metadata
    wallet_name = Column(String(100), nullable=True)  # e.g., "Hot Wallet 1", "Cold Storage Main"
    notes = Column(String(500), nullable=True)  # Internal notes
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_balance_check = Column(DateTime, nullable=True)  # Last time balance was updated
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_wallet_asset_network', 'asset', 'network'),
        Index('idx_wallet_hot_active', 'is_hot_wallet', 'is_active'),
    )




