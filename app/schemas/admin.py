from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class AdminUserResponse(BaseModel):
    id: int
    email: EmailStr
    username: str
    full_name: Optional[str]
    is_active: bool
    is_verified: bool
    is_superuser: bool
    google_id: Optional[str]
    avatar_url: Optional[str]
    funds_usd: float
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime]
    
    # Additional computed fields
    total_bets: int = 0
    total_bet_amount: float = 0.0
    total_transactions: int = 0
    
    model_config = {"from_attributes": True}

class AdminBettingRecordResponse(BaseModel):
    id: int
    user_id: int
    bet_amount: float
    potential_win: float
    actual_profit: Optional[float]
    match_id: Optional[int]
    match_teams: str
    match_date: Optional[datetime]
    match_league: Optional[str]
    match_status: str
    selected_outcome: str
    selected_team: Optional[str]
    odds_value: str
    odds_decimal: float
    bet_status: str
    is_settled: bool
    settlement_date: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    
    # User information
    user_email: Optional[str] = None
    user_username: Optional[str] = None
    
    model_config = {"from_attributes": True}

class AdminTransactionResponse(BaseModel):
    id: int
    user_id: int
    transaction_type: str
    amount: float
    balance_before: float
    balance_after: float
    description: str
    reference_id: Optional[str]
    reference_type: Optional[str]
    status: str
    payment_method: Optional[str]
    external_reference: Optional[str]
    extra_data: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    # User information
    user_email: Optional[str] = None
    user_username: Optional[str] = None
    
    model_config = {"from_attributes": True}

class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    total_bets: int
    total_bet_amount: float
    total_transactions: int
    total_transaction_volume: float

class UserUpdateRequest(BaseModel):
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    is_superuser: Optional[bool] = None
    funds_usd: Optional[float] = None
