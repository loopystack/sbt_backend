from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from enum import Enum


class WithdrawalStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class WithdrawalIntentCreate(BaseModel):
    """Request schema for creating a withdrawal"""
    asset: str = Field(default="USDT", description="Crypto asset (USDT, BTC, ETH, etc.)")
    network: str = Field(..., description="Blockchain network (TRC20, ERC20, BEP20, etc.)")
    amount_usd: Decimal = Field(..., gt=0, description="Amount in USD")
    to_address: str = Field(..., min_length=26, max_length=100, description="Destination wallet address")
    memo: Optional[str] = Field(None, max_length=100, description="Memo/tag if required (XRP, XLM, etc.)")
    
    @field_validator('to_address')
    @classmethod
    def validate_address(cls, v):
        """Basic address validation - should be alphanumeric"""
        if not v.replace('-', '').replace('_', '').isalnum():
            raise ValueError('Invalid address format')
        return v


class WithdrawalIntentResponse(BaseModel):
    """Response schema for withdrawal intent"""
    id: int
    asset: str
    network: str
    amount_crypto: Decimal
    amount_usd: Decimal
    to_address: str
    memo: Optional[str]
    status: str
    network_fee: Optional[Decimal]
    platform_fee: Decimal
    created_at: datetime
    estimated_completion: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class WithdrawalStatusResponse(BaseModel):
    """Response schema for withdrawal status check"""
    id: int
    status: str
    tx_hash: Optional[str]
    confirmations: int
    required_confirmations: int
    created_at: datetime
    processed_at: Optional[datetime]
    completed_at: Optional[datetime]
    failed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None
    network_fee: Optional[Decimal] = None
    
    model_config = ConfigDict(from_attributes=True)


class WithdrawalListResponse(BaseModel):
    """Response schema for listing withdrawals"""
    withdrawals: List[WithdrawalIntentResponse]
    total: int
    page: int
    page_size: int


class WithdrawalAdminUpdate(BaseModel):
    """Schema for admin to update withdrawal status"""
    status: WithdrawalStatus
    admin_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    tx_hash: Optional[str] = None
    
    @model_validator(mode='after')
    def validate_rejection_reason(self):
        """Rejection reason required if status is cancelled"""
        if self.status == WithdrawalStatus.CANCELLED and not self.rejection_reason:
            raise ValueError('Rejection reason required when status is cancelled')
        return self




