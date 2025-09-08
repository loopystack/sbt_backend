from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional, List
from datetime import date
import math

from app.core.database import get_db
from app.models.odds import Odds
from app.schemas.odds import OddsResponse, OddsListResponse, OddsQueryParams

router = APIRouter()


@router.get("/", response_model=OddsListResponse)
async def get_odds(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(60, ge=1, le=100, description="Number of items per page"),
    season: Optional[str] = Query(None, description="Filter by season"),
    country: Optional[str] = Query(None, description="Filter by country"),
    league: Optional[str] = Query(None, description="Filter by league"),
    home_team: Optional[str] = Query(None, description="Filter by home team"),
    away_team: Optional[str] = Query(None, description="Filter by away team"),
    date_from: Optional[date] = Query(None, description="Filter matches from this date"),
    date_to: Optional[date] = Query(None, description="Filter matches to this date"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get odds with optional filtering and pagination.
    
    - **page**: Page number (starts from 1)
    - **size**: Number of items per page (max 100)
    - **season**: Filter by season year
    - **country**: Filter by country name
    - **league**: Filter by league name
    - **home_team**: Filter by home team name
    - **away_team**: Filter by away team name
    - **date_from**: Filter matches from this date (YYYY-MM-DD)
    - **date_to**: Filter matches to this date (YYYY-MM-DD)
    """
    
    # Build query conditions
    conditions = []
    
    if season:
        conditions.append(Odds.season == season)
    
    if country:
        conditions.append(Odds.country.ilike(f"%{country}%"))
    
    if league:
        conditions.append(Odds.league.ilike(f"%{league}%"))
    
    if home_team:
        conditions.append(Odds.home_team.ilike(f"%{home_team}%"))
    
    if away_team:
        conditions.append(Odds.away_team.ilike(f"%{away_team}%"))
    
    if date_from:
        conditions.append(Odds.date >= date_from)
    
    if date_to:
        conditions.append(Odds.date <= date_to)
    
    # Build base query
    query = select(Odds)
    count_query = select(func.count(Odds.id))
    
    if conditions:
        where_clause = and_(*conditions)
        query = query.where(where_clause)
        count_query = count_query.where(where_clause)
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Calculate pagination
    offset = (page - 1) * size
    pages = math.ceil(total / size) if total > 0 else 0
    
    # Apply pagination and ordering
    query = query.order_by(Odds.date.desc(), Odds.time.desc()).offset(offset).limit(size)
    
    # Execute query
    result = await db.execute(query)
    odds = result.scalars().all()
    
    return OddsListResponse(
        odds=odds,
        total=total,
        page=page,
        size=size,
        pages=pages
    )


@router.get("/{odds_id}", response_model=OddsResponse)
async def get_odds_by_id(
    odds_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get specific odds by ID.
    """
    query = select(Odds).where(Odds.id == odds_id)
    result = await db.execute(query)
    odds = result.scalar_one_or_none()
    
    if not odds:
        raise HTTPException(status_code=404, detail="Odds not found")
    
    return odds


@router.get("/teams/{team_name}", response_model=OddsListResponse)
async def get_odds_by_team(
    team_name: str,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Number of items per page"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get odds for all matches involving a specific team (home or away).
    """
    # Build query conditions for team name
    team_condition = and_(
        Odds.home_team.ilike(f"%{team_name}%"),
        Odds.away_team.ilike(f"%{team_name}%")
    )
    
    # Use OR condition to find team as either home or away
    query = select(Odds).where(
        (Odds.home_team.ilike(f"%{team_name}%")) | 
        (Odds.away_team.ilike(f"%{team_name}%"))
    )
    
    count_query = select(func.count(Odds.id)).where(
        (Odds.home_team.ilike(f"%{team_name}%")) | 
        (Odds.away_team.ilike(f"%{team_name}%"))
    )
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Calculate pagination
    offset = (page - 1) * size
    pages = math.ceil(total / size) if total > 0 else 0
    
    # Apply pagination and ordering
    query = query.order_by(Odds.date.desc(), Odds.time.desc()).offset(offset).limit(size)
    
    # Execute query
    result = await db.execute(query)
    odds = result.scalars().all()
    
    return OddsListResponse(
        odds=odds,
        total=total,
        page=page,
        size=size,
        pages=pages
    )


@router.get("/leagues/list")
async def get_leagues(
    country: Optional[str] = Query(None, description="Filter by country"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all available leagues, optionally filtered by country.
    """
    query = select(Odds.league, Odds.country).distinct()
    
    if country:
        query = query.where(Odds.country.ilike(f"%{country}%"))
    
    query = query.order_by(Odds.country, Odds.league)
    
    result = await db.execute(query)
    leagues = result.all()
    
    # Group by country
    leagues_by_country = {}
    for league, country_name in leagues:
        if country_name not in leagues_by_country:
            leagues_by_country[country_name] = []
        leagues_by_country[country_name].append(league)
    
    return leagues_by_country


@router.get("/countries/list")
async def get_countries(db: AsyncSession = Depends(get_db)):
    """
    Get all available countries.
    """
    query = select(Odds.country).distinct().order_by(Odds.country)
    result = await db.execute(query)
    countries = result.scalars().all()
    
    return {"countries": countries}


@router.get("/seasons/list")
async def get_seasons(db: AsyncSession = Depends(get_db)):
    """
    Get all available seasons.
    """
    query = select(Odds.season).distinct().order_by(Odds.season.desc())
    result = await db.execute(query)
    seasons = result.scalars().all()
    
    return {"seasons": seasons}
