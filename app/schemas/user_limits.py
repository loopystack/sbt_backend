from pydantic import BaseModel
from typing import Optional
from datetime import date
from decimal import Decimal


class UserDailyLimitsResponse(BaseModel):
    """Response schema for user daily limits"""
    user_id: int
    date: date
    deposits_count: int
    deposits_amount_usd: Decimal
    withdrawals_count: int
    withdrawals_amount_usd: Decimal
    bets_count: int
    bets_amount_usd: Decimal
    
    class Config:
        from_attributes = True


class UserLimitsSummary(BaseModel):
    """Summary of user limits with remaining capacity"""
    date: date
    
    # Deposits
    deposits_count: int
    deposits_amount_usd: Decimal
    deposits_remaining_usd: Decimal
    
    # Withdrawals
    withdrawals_count: int
    withdrawals_amount_usd: Decimal
    withdrawals_remaining_usd: Decimal
    
    # Bets
    bets_count: int
    bets_amount_usd: Decimal
    bets_remaining_usd: Decimal




