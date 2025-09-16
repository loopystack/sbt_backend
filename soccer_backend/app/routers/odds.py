from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional, List
from datetime import date, datetime
import math

from app.core.database import get_db
from app.models.odds import Odds
from app.schemas.odds import OddsResponse, OddsListResponse, OddsQueryParams

router = APIRouter()


@router.get("/", response_model=OddsListResponse)
async def get_odds(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(60, ge=1, le=50000, description="Number of items per page"),
    season: Optional[int] = Query(None, description="Filter by season"),
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


@router.get("/best-odds")
async def get_best_odds(
    limit: int = Query(3, ge=1, le=10, description="Number of best odds to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get matches with the best/highest odds for betting.
    Returns upcoming matches with highest odds values across all bet types.
    """
    # Get upcoming matches with highest odds (excluding null values and past dates)
    today = datetime.now().date()
    
    query = select(Odds).where(
        and_(
            Odds.odd_1.isnot(None),
            Odds.odd_X.isnot(None), 
            Odds.odd_2.isnot(None),
            Odds.odd_1 > 0,  # Positive odds only
            Odds.odd_X > 0,
            Odds.odd_2 > 0,
            Odds.date >= today,  # Only upcoming matches
            Odds.result.is_(None)  # Only matches without results
        )
    ).order_by(
        # Order by the maximum odds value among the three options
        func.greatest(Odds.odd_1, Odds.odd_X, Odds.odd_2).desc()
    ).limit(limit)
    
    result = await db.execute(query)
    best_odds = result.scalars().all()
    
    # Format the response with additional metadata
    formatted_odds = []
    for odds in best_odds:
        # Find the best odd type and value
        odds_values = [
            ("Home Win", float(odds.odd_1) if odds.odd_1 else 0),
            ("Draw", float(odds.odd_X) if odds.odd_X else 0),
            ("Away Win", float(odds.odd_2) if odds.odd_2 else 0)
        ]
        
        # Get the highest odds
        best_bet_type, best_odds_value = max(odds_values, key=lambda x: x[1])
        
        formatted_odds.append({
            "id": odds.id,
            "home_team": odds.home_team,
            "away_team": odds.away_team,
            "league": odds.league,
            "country": odds.country,
            "date": odds.date,
            "time": odds.time,
            "best_bet_type": best_bet_type,
            "best_odds_value": best_odds_value,
            "odd_1": float(odds.odd_1) if odds.odd_1 else None,
            "odd_X": float(odds.odd_X) if odds.odd_X else None,
            "odd_2": float(odds.odd_2) if odds.odd_2 else None
        })
    
    return {"best_odds": formatted_odds}


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


@router.get("/upcoming-best-odds")
async def get_upcoming_best_odds(
    limit: int = Query(3, ge=1, le=10, description="Number of best upcoming odds to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get upcoming matches with the best/highest odds for betting.
    Returns only future matches without results that users can bet on.
    """
    # Get upcoming matches with highest odds (excluding null values and past dates)
    today = datetime.now().date()
    
    query = select(Odds).where(
        and_(
            Odds.odd_1.isnot(None),
            Odds.odd_X.isnot(None), 
            Odds.odd_2.isnot(None),
            Odds.odd_1 > 0,  # Positive odds only
            Odds.odd_X > 0,
            Odds.odd_2 > 0,
            Odds.date >= today,  # Only upcoming matches
            Odds.result.is_(None)  # Only matches without results
        )
    ).order_by(
        # Order by the maximum odds value among the three options
        func.greatest(Odds.odd_1, Odds.odd_X, Odds.odd_2).desc()
    ).limit(limit)
    
    result = await db.execute(query)
    best_odds = result.scalars().all()
    
    # Format the response with additional metadata
    formatted_odds = []
    for odds in best_odds:
        # Find the best odd type and value
        odds_values = [
            ("Home Win", float(odds.odd_1) if odds.odd_1 else 0),
            ("Draw", float(odds.odd_X) if odds.odd_X else 0),
            ("Away Win", float(odds.odd_2) if odds.odd_2 else 0)
        ]
        
        # Get the highest odds
        best_bet_type, best_odds_value = max(odds_values, key=lambda x: x[1])
        
        formatted_odds.append({
            "id": odds.id,
            "home_team": odds.home_team,
            "away_team": odds.away_team,
            "league": odds.league,
            "country": odds.country,
            "date": odds.date,
            "time": odds.time,
            "best_bet_type": best_bet_type,
            "best_odds_value": best_odds_value,
            "odd_1": float(odds.odd_1) if odds.odd_1 else None,
            "odd_X": float(odds.odd_X) if odds.odd_X else None,
            "odd_2": float(odds.odd_2) if odds.odd_2 else None
        })
    
    return {"best_odds": formatted_odds}