from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class DepositIntentCreate(BaseModel):
    asset: str = Field(..., description="Crypto asset (BTC, ETH, USDC, etc.)")
    network: str = Field(..., description="Blockchain network")
    amount_usd: Decimal = Field(..., description="Amount in USD")

class DepositIntentResponse(BaseModel):
    id: int
    asset: str
    network: str
    address: str
    memo: Optional[str] = None
    amount_usd: Decimal
    qr_code: str  # Base64 encoded QR code
    explorer_url: str
    required_confirmations: int
    expires_at: datetime
    status: str

class DepositStatusResponse(BaseModel):
    id: int
    status: str
    confirmations: int
    required_confirmations: int
    tx_hash: Optional[str] = None
    expires_at: datetime
    settled_at: Optional[datetime] = None

class CryptoAsset(BaseModel):
    asset: str
    networks: List[str]
    memo_required: bool

class CryptoTransactionCreate(BaseModel):
    tx_hash: str
    from_address: Optional[str] = None
    to_address: str
    amount: Decimal
    asset: str
    network: str
    block_number: Optional[int] = None
    confirmations: int = 0
    fee: Optional[Decimal] = None

class DepositConfirmRequest(BaseModel):
    deposit_id: int = Field(..., description="Deposit intent ID")
    tx_hash: str = Field(..., description="Transaction hash")
    amount_crypto: Decimal = Field(..., description="Amount in crypto")
    amount_usd: Decimal = Field(..., description="Amount in USD")