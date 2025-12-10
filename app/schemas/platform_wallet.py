from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal


class PlatformWalletResponse(BaseModel):
    """Response schema for platform wallet"""
    id: int
    asset: str
    network: str
    address: str
    balance: Decimal
    is_hot_wallet: bool
    min_balance_threshold: Optional[Decimal]
    max_balance_threshold: Optional[Decimal]
    is_active: bool
    wallet_name: Optional[str]
    last_balance_check: Optional[datetime]
    
    class Config:
        from_attributes = True


class PlatformWalletCreate(BaseModel):
    """Schema for creating a platform wallet"""
    asset: str = Field(..., description="Crypto asset (USDT, BTC, etc.)")
    network: str = Field(..., description="Blockchain network (TRC20, ERC20, etc.)")
    address: str = Field(..., description="Wallet address")
    is_hot_wallet: bool = Field(default=True, description="True for hot wallet, False for cold")
    min_balance_threshold: Optional[Decimal] = Field(None, description="Alert if balance below this")
    max_balance_threshold: Optional[Decimal] = Field(None, description="Transfer to cold if above this")
    wallet_name: Optional[str] = Field(None, description="Human-readable wallet name")
    notes: Optional[str] = Field(None, description="Internal notes")


class PlatformWalletUpdate(BaseModel):
    """Schema for updating platform wallet"""
    balance: Optional[Decimal] = None
    min_balance_threshold: Optional[Decimal] = None
    max_balance_threshold: Optional[Decimal] = None
    is_active: Optional[bool] = None
    wallet_name: Optional[str] = None
    notes: Optional[str] = None


class PlatformWalletBalanceSummary(BaseModel):
    """Summary of platform wallet balances"""
    asset: str
    network: str
    total_balance: Decimal
    hot_wallet_balance: Decimal
    cold_wallet_balance: Decimal
    hot_wallets_count: int
    cold_wallets_count: int




