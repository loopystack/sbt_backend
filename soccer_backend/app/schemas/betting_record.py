from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class BettingRecordBase(BaseModel):
    bet_amount: float
    potential_win: float
    match_teams: str
    match_date: Optional[datetime] = None
    match_league: Optional[str] = None
    match_status: str = "upcoming"
    selected_outcome: str  # home, away, draw
    selected_team: Optional[str] = None
    odds_value: str  # e.g., "+245", "-312"
    odds_decimal: float

class BettingRecordCreate(BettingRecordBase):
    pass

class BettingRecordUpdate(BaseModel):
    actual_profit: Optional[float] = None
    match_status: Optional[str] = None
    bet_status: Optional[str] = None
    is_settled: Optional[bool] = None
    settlement_date: Optional[datetime] = None

class BettingRecord(BettingRecordBase):
    id: int
    user_id: int
    actual_profit: Optional[float] = None
    bet_status: str = "pending"
    is_settled: bool = False
    settlement_date: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class BettingRecordResponse(BaseModel):
    records: list[BettingRecord]
    total: int
    page: int
    per_page: int
    total_pages: int

    class Config:
        from_attributes = True
