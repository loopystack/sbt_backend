from typing import Optional, Union
from datetime import datetime
from pydantic import BaseModel, field_validator

class BettingRecordBase(BaseModel):
    bet_amount: float
    potential_win: float
    match_teams: str
    match_date: Optional[Union[datetime, str]] = None
    match_league: Optional[str] = None
    match_status: str = "upcoming"
    selected_outcome: str  # home, away, draw
    selected_team: Optional[str] = None
    odds_value: str  # e.g., "+245", "-312"
    odds_decimal: float

    @field_validator('match_date', mode='before')
    @classmethod
    def parse_match_date(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str):
            try:
                # Handle different ISO formats
                if v.endswith('Z'):
                    v = v.replace('Z', '+00:00')
                dt = datetime.fromisoformat(v)
                # Convert to naive datetime (remove timezone info) for database compatibility
                if dt.tzinfo is not None:
                    dt = dt.replace(tzinfo=None)
                return dt
            except (ValueError, TypeError) as e:
                print(f"❌ Error parsing match_date '{v}': {e}")
                return None
        elif isinstance(v, datetime):
            # If it's already a datetime, remove timezone info if present
            if v.tzinfo is not None:
                v = v.replace(tzinfo=None)
            return v
        return v

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
