from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, field_validator
import json

class TransactionBase(BaseModel):
    transaction_type: str  # 'deposit', 'withdrawal', 'bet_placed', 'bet_won', 'bet_lost'
    amount: float
    balance_before: float
    balance_after: float
    description: str
    reference_id: Optional[str] = None
    reference_type: Optional[str] = None
    status: str = "completed"
    payment_method: Optional[str] = None
    external_reference: Optional[str] = None
    extra_data: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    status: Optional[str] = None
    external_reference: Optional[str] = None
    extra_data: Optional[str] = None

class Transaction(TransactionBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @property
    def parsed_extra_data(self) -> Dict[str, Any]:
        """Parse extra_data JSON string to dictionary"""
        if self.extra_data:
            try:
                return json.loads(self.extra_data)
            except json.JSONDecodeError:
                return {}
        return {}

class TransactionResponse(BaseModel):
    transactions: list[Transaction]
    total: int
    page: int
    per_page: int
    total_pages: int

    class Config:
        from_attributes = True

class TransactionSummary(BaseModel):
    """Summary of transaction statistics"""
    total_deposits: float
    total_withdrawals: float
    total_bets: float
    total_winnings: float
    net_balance: float
    transaction_count: int
