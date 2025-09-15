from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, time


class OddsBase(BaseModel):
    season: int
    date: date
    time: time
    home_team: str
    away_team: str
    result: Optional[str] = None
    half_first: Optional[str] = None
    half_second: Optional[str] = None
    odd_1: Optional[float] = None
    odd_X: Optional[float] = None
    odd_2: Optional[float] = None
    bets: Optional[int] = None
    country: str
    league: str


class OddsResponse(OddsBase):
    id: int

    model_config = {"from_attributes": True}


class OddsListResponse(BaseModel):
    odds: List[OddsResponse]
    total: int
    page: int
    size: int
    pages: int


class OddsQueryParams(BaseModel):
    page: int = Field(default=1, ge=1, description="Page number")
    size: int = Field(default=20, ge=1, le=100, description="Number of items per page")
    season: Optional[int] = Field(default=None, description="Filter by season")
    country: Optional[str] = Field(default=None, description="Filter by country")
    league: Optional[str] = Field(default=None, description="Filter by league")
    home_team: Optional[str] = Field(default=None, description="Filter by home team")
    away_team: Optional[str] = Field(default=None, description="Filter by away team")
    date_from: Optional[date] = Field(default=None, description="Filter matches from this date")
    date_to: Optional[date] = Field(default=None, description="Filter matches to this date")
