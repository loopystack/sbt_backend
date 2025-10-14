"""
Payment schemas for request/response models
"""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, Literal
from decimal import Decimal
from enum import Enum

class PaymentStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"
    PENDING = "pending"
    CANCELLED = "cancelled"

class CardType(str, Enum):
    VISA = "visa"
    MASTERCARD = "mastercard"
    AMERICAN_EXPRESS = "amex"
    DISCOVER = "discover"

class PaymentMethod(str, Enum):
    VISA = "visa"
    MASTERCARD = "mastercard"
    BANK_TRANSFER = "bank_transfer"
    PAYPAL = "paypal"

class CardPaymentRequest(BaseModel):
    card_type: CardType
    card_number: str = Field(..., min_length=13, max_length=19)
    expiry_month: int = Field(..., ge=1, le=12)
    expiry_year: int = Field(..., ge=2024, le=2030)
    cvv: str = Field(..., min_length=3, max_length=4)
    cardholder_name: str = Field(..., min_length=2, max_length=100)
    amount: float = Field(..., gt=0, le=10000)
    
    @validator('card_number')
    def validate_card_number(cls, v):
        # Remove spaces and dashes
        cleaned = v.replace(' ', '').replace('-', '')
        if not cleaned.isdigit():
            raise ValueError('Card number must contain only digits')
        return cleaned
    
    @validator('cvv')
    def validate_cvv(cls, v):
        if not v.isdigit():
            raise ValueError('CVV must contain only digits')
        return v

class BankTransferRequest(BaseModel):
    account_number: str = Field(..., min_length=4, max_length=17)
    routing_number: str = Field(..., min_length=9, max_length=9)
    account_holder_name: str = Field(..., min_length=2, max_length=100)
    bank_name: str = Field(..., min_length=2, max_length=100)
    amount: float = Field(..., gt=0, le=50000)
    
    @validator('account_number')
    def validate_account_number(cls, v):
        if not v.isdigit():
            raise ValueError('Account number must contain only digits')
        return v
    
    @validator('routing_number')
    def validate_routing_number(cls, v):
        if not v.isdigit():
            raise ValueError('Routing number must contain only digits')
        if len(v) != 9:
            raise ValueError('Routing number must be exactly 9 digits')
        return v

class PayPalPaymentRequest(BaseModel):
    email: EmailStr
    amount: float = Field(..., gt=0, le=10000)

class PaymentRequest(BaseModel):
    payment_method: PaymentMethod
    amount: float = Field(..., gt=0)
    currency: str = Field(default="USD")
    
    # Optional fields for different payment methods
    card_data: Optional[CardPaymentRequest] = None
    bank_data: Optional[BankTransferRequest] = None
    paypal_data: Optional[PayPalPaymentRequest] = None

class PaymentResponse(BaseModel):
    transaction_id: str
    status: PaymentStatus
    amount: float
    currency: str = "USD"
    message: str
    new_balance: float
    processing_time: Optional[float] = None
    gateway: Optional[str] = None

class PaymentMethodInfo(BaseModel):
    type: str
    name: str
    min_amount: float
    max_amount: float
    currency: str
    processing_time: str
    fees: str
    available: bool = True

class PaymentMethodsResponse(BaseModel):
    payment_methods: list[PaymentMethodInfo]

# Withdrawal Schemas
class WithdrawalMethod(str, Enum):
    CRYPTO = "crypto"
    CASH = "cash"

class WithdrawalRequest(BaseModel):
    amount: float = Field(..., gt=0)
    method: WithdrawalMethod
    
    # Crypto fields
    crypto_address: Optional[str] = None
    crypto_currency: Optional[str] = None
    crypto_network: Optional[str] = None
    memo: Optional[str] = None
    
    # Cash fields
    card_number: Optional[str] = None
    cardholder_name: Optional[str] = None
    expiry_month: Optional[int] = None
    expiry_year: Optional[int] = None
    cvv: Optional[str] = None
    bank_account: Optional[str] = None
    routing_number: Optional[str] = None
    account_holder_name: Optional[str] = None
    paypal_email: Optional[EmailStr] = None
    cash_method: Optional[str] = None  # "VISA", "Mastercard", "Bank Transfer", "PayPal"

class WithdrawalResponse(BaseModel):
    transaction_id: str
    status: Literal["success", "failed", "pending", "processing"]
    amount: float
    currency: str = "USD"
    message: str
    new_balance: float
    processing_time: Optional[str] = None
    estimated_arrival: Optional[str] = None