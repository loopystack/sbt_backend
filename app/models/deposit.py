from sqlalchemy import Column, Integer, String, DateTime, Boolean, Numeric, Text, ForeignKey
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
    generated_address = Column(String(100), nullable=False)
    memo = Column(String(100), nullable=True)  # For XRP, XLM, BNB Beacon, EOS
    expires_at = Column(DateTime, nullable=False)
    status = Column(String(20), default="pending")  # pending, confirmed, expired, failed
    tx_hash = Column(String(100), nullable=True)
    confirmations = Column(Integer, default=0)
    required_confirmations = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    settled_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="deposit_intents")
    transactions = relationship("CryptoTransaction", back_populates="deposit_intent")

class CryptoTransaction(Base):
    __tablename__ = "crypto_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    deposit_intent_id = Column(Integer, ForeignKey("deposit_intents.id"), nullable=False)
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

# Add relationships to existing User model
# User.deposit_intents = relationship("DepositIntent", back_populates="user")
# User.crypto_balances = relationship("UserCryptoBalance", back_populates="user")
