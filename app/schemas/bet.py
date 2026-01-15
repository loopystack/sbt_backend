"""
Bet Schemas
Pydantic schemas for bet API requests and responses
"""
from pydantic import BaseModel, Field, validator
from decimal import Decimal
from datetime import datetime
from typing import Optional
from app.models.bet import BetStatus


class BetPlaceRequest(BaseModel):
    """Request to place a bet"""
    match_id: int = Field(..., description="Match/odds ID")
    market_key: str = Field(..., description="Market type (e.g., '1x2', 'over_2_5')")
    selection_key: str = Field(..., description="Selection (e.g., 'home', 'draw', 'away')")
    odds_decimal: Decimal = Field(..., ge=1.01, description="Decimal odds (must be >= 1.01)")
    stake: Decimal = Field(..., gt=0, description="Stake amount in USDT")
    currency: str = Field(default="USDT", description="Currency (default USDT)")
    
    @validator('stake')
    def validate_stake(cls, v):
        if v < Decimal("1.00"):
            raise ValueError("Stake must be at least 1.00 USDT")
        if v > Decimal("10000.00"):
            raise ValueError("Stake cannot exceed 10,000.00 USDT")
        return v


class BetResponse(BaseModel):
    """Bet response model"""
    id: int
    user_id: int
    match_id: int
    market_key: str
    selection_key: str
    odds_decimal: Decimal
    stake: Decimal
    currency: str
    status: BetStatus
    settle_version: int
    placed_at: datetime
    settled_at: Optional[datetime] = None
    potential_profit: Decimal
    potential_payout: Decimal
    
    class Config:
        from_attributes = True


class BetWithMatchResponse(BetResponse):
    """Bet response with match information"""
    match_home_team: Optional[str] = None
    match_away_team: Optional[str] = None
    match_date: Optional[datetime] = None
    match_league: Optional[str] = None


class BetSettleRequest(BaseModel):
    """Request to settle a bet (admin only)"""
    outcome: str = Field(..., description="Outcome: WIN, LOSS, or VOID")
    
    @validator('outcome')
    def validate_outcome(cls, v):
        v_upper = v.upper()
        if v_upper not in ["WIN", "LOSS", "VOID"]:
            raise ValueError("Outcome must be WIN, LOSS, or VOID")
        return v_upper


class BetListResponse(BaseModel):
    """List of bets with pagination"""
    bets: list[BetResponse]
    total: int
    limit: int
    offset: int
