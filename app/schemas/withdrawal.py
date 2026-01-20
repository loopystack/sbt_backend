from pydantic import BaseModel, Field, field_validator, ConfigDict
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
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class WithdrawalIntentCreate(BaseModel):
    """Request schema for creating a withdrawal"""
    asset: str = Field(default="USDT", description="Crypto asset (USDT only in initial implementation)")
    network: str = Field(..., description="Blockchain network (TRC20 only in initial implementation)")
    amount_crypto: Decimal = Field(..., gt=0, description="Amount in crypto (USDT) to withdraw")
    to_address: str = Field(..., min_length=26, max_length=100, description="Destination wallet address")
    memo: Optional[str] = Field(None, max_length=100, description="Memo/tag if required (XRP, XLM, etc.)")
    client_request_id: Optional[str] = Field(None, max_length=100, description="Client-side idempotency key (optional)")
    
    @field_validator('to_address')
    @classmethod
    def validate_address(cls, v):
        """Basic address validation - should be alphanumeric"""
        if not v.replace('-', '').replace('_', '').isalnum():
            raise ValueError('Invalid address format')
        return v
    
    @field_validator('asset')
    @classmethod
    def validate_asset(cls, v):
        """Initial Implementation: Only USDT allowed"""
        if v != "USDT":
            raise ValueError('Only USDT is supported for withdrawals')
        return v
    
    @field_validator('network')
    @classmethod
    def validate_network(cls, v):
        """Initial Implementation: Only TRC20 allowed"""
        if v != "TRC20":
            raise ValueError('Only TRC20 network is supported for withdrawals')
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
    tx_hash: Optional[str] = None
    confirmations: int = 0
    processed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None
    network_fee: Optional[Decimal]
    platform_fee: Decimal
    created_at: datetime
    estimated_completion: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class WithdrawalDetailResponse(BaseModel):
    """Response schema for withdrawal detail (user)"""
    id: int
    user_id: int
    asset: str
    network: str
    amount_crypto: Decimal
    amount_usd: Decimal
    to_address: str
    memo: Optional[str]
    status: str
    tx_hash: Optional[str] = None
    confirmations: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    admin_notes: Optional[str] = None
    rejected_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class WithdrawalListResponse(BaseModel):
    """Response schema for listing withdrawals (user)"""
    withdrawals: List[WithdrawalIntentResponse]
    total: int
    page: int
    page_size: int


class WithdrawalAdminApproveRequest(BaseModel):
    """Request schema for admin approve"""
    admin_notes: Optional[str] = None


class WithdrawalAdminRejectRequest(BaseModel):
    """Request schema for admin reject"""
    rejection_reason: str = Field(..., min_length=1, max_length=500)
    admin_notes: Optional[str] = None


class WithdrawalAdminItem(BaseModel):
    """Admin list item"""
    id: int
    user_id: int
    asset: str
    network: str
    amount_crypto: Decimal
    amount_usd: Decimal
    to_address: str
    memo: Optional[str]
    status: str
    tx_hash: Optional[str] = None
    confirmations: int = 0
    processed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None
    created_at: datetime
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    admin_notes: Optional[str] = None
    rejected_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class WithdrawalAdminListResponse(BaseModel):
    """Response schema for listing withdrawals (admin)"""
    withdrawals: List[WithdrawalAdminItem]
    total: int
    page: int
    page_size: int
