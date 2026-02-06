from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, text
from typing import Optional, List
from datetime import date, datetime
import math

from app.core.database import get_db
from app.models.odds import Odds
from app.models.betting_record import BettingRecord
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.odds import OddsResponse, OddsListResponse, OddsQueryParams

router = APIRouter()


def convert_to_decimal_odds(odds: float) -> float:
    """
    Convert odds to decimal format.
    
    Handles:
    - American odds (positive/negative)
    - Already decimal odds (>= 1.01)
    
    Args:
        odds: Odds value to convert
        
    Returns:
        Decimal odds (e.g., 2.50 means 2.5x return)
    """
    if odds == 0:
        return 1.01  # Avoid division by zero
    
    # If already decimal odds (positive and >= 1.01), return as is
    if odds >= 1.01:
        return odds
    
    # Handle American odds
    if odds > 0:
        # Positive American odds: +150 -> 2.50 decimal
        return (odds / 100) + 1
    else:
        # Negative American odds: -150 -> 1.67 decimal  
        return (100 / abs(odds)) + 1


@router.get("/", response_model=OddsListResponse)
async def get_odds(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Number of items per page"),
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
    
    # Results page: only show matches with a valid score (N-M, 0-25 each). Exclude scraper garbage like 19-523.
    if date_to and not date_from:
        conditions.append(Odds.result.isnot(None))
        conditions.append(func.coalesce(func.trim(Odds.result), "") != "")
        conditions.append(text("trim(result) ~ '^[0-9]{1,2}-[0-9]{1,2}$'"))
    
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
    
    # Ordering: Results (date_to set, past matches) = newest first; Next matches = soonest first
    if date_to and not date_from:
        query = query.order_by(Odds.date.desc(), Odds.time.desc()).offset(offset).limit(size)
    else:
        query = query.order_by(Odds.date.asc(), Odds.time.asc()).offset(offset).limit(size)
    
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
    DEPRECATED: Use /value-bets instead for proper value betting opportunities.
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


@router.get("/value-bets")
async def get_value_bets(
    limit: int = Query(3, ge=1, le=10, description="Number of value bets to return"),
    min_ev: float = Query(0.05, ge=0.01, le=0.5, description="Minimum expected value (5% default)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get matches with positive expected value (value betting opportunities).
    
    Value betting means the bookmaker's implied probability is lower than the true probability.
    
    Example:
    - Bookmaker odds: 4.00 (25% implied probability)  
    - True probability: 35%
    - Expected Value = (0.35 * 4.00) - 1 = 0.40 (40% positive EV)
    
    Args:
        limit: Number of value bets to return
        min_ev: Minimum expected value threshold (e.g., 0.05 = 5%)
    
    Returns:
        List of matches with positive expected value, sorted by EV descending
    """
    today = datetime.now().date()
    
    # Get all upcoming matches with valid odds
    query = select(Odds).where(
        and_(
            Odds.odd_1.isnot(None),
            Odds.odd_X.isnot(None), 
            Odds.odd_2.isnot(None),
            Odds.odd_1 != 0,  # Valid odds (will convert later)
            Odds.odd_X != 0,
            Odds.odd_2 != 0,
            Odds.date >= today,  # Only upcoming matches
            Odds.result.is_(None)  # Only matches without results
        )
    ).order_by(Odds.date.asc(), Odds.time.asc())
    
    result = await db.execute(query)
    all_matches = result.scalars().all()
    
    value_bets = []
    
    for match in all_matches:
        # Convert odds to decimal format (handle American odds)
        odd_1 = convert_to_decimal_odds(float(match.odd_1))
        odd_X = convert_to_decimal_odds(float(match.odd_X)) 
        odd_2 = convert_to_decimal_odds(float(match.odd_2))
        
        # Calculate implied probabilities from bookmaker odds
        implied_prob_1 = 1 / odd_1  # Home win
        implied_prob_X = 1 / odd_X  # Draw
        implied_prob_2 = 1 / odd_2  # Away win
        
        # Calculate bookmaker margin (overround)
        total_implied = implied_prob_1 + implied_prob_X + implied_prob_2
        margin = total_implied - 1.0
        
        # Adjust for bookmaker margin to get fair probabilities
        fair_prob_1 = implied_prob_1 / total_implied
        fair_prob_X = implied_prob_X / total_implied  
        fair_prob_2 = implied_prob_2 / total_implied
        
        # Estimate true probabilities using statistical model
        # For now, we'll use a simple model based on historical data patterns
        # In a real system, this would use machine learning or complex statistical models
        
        # Simple model: Adjust probabilities based on team strength indicators
        # Use league and historical performance patterns
        true_prob_1, true_prob_X, true_prob_2 = estimate_true_probabilities(
            match.home_team, match.away_team, match.league, match.country,
            fair_prob_1, fair_prob_X, fair_prob_2
        )
        
        # Calculate expected values for each outcome
        ev_1 = (true_prob_1 * odd_1) - 1  # Home win EV
        ev_X = (true_prob_X * odd_X) - 1  # Draw EV  
        ev_2 = (true_prob_2 * odd_2) - 1  # Away win EV
        
        # Find the best value bet
        value_bets_for_match = [
            ("Home Win", ev_1, odd_1, true_prob_1, implied_prob_1),
            ("Draw", ev_X, odd_X, true_prob_X, implied_prob_X),
            ("Away Win", ev_2, odd_2, true_prob_2, implied_prob_2)
        ]
        
        # Get the bet with highest positive EV
        best_bet = max(value_bets_for_match, key=lambda x: x[1])
        bet_type, expected_value, odds_value, true_prob, implied_prob = best_bet
        
        # Only include if EV meets minimum threshold
        if expected_value >= min_ev:
            value_bets.append({
                "id": match.id,
                "home_team": match.home_team,
                "away_team": match.away_team,
                "league": match.league,
                "country": match.country,
                "date": match.date,
                "time": match.time,
                "best_bet_type": bet_type,
                "best_odds_value": odds_value,
                "expected_value": round(expected_value, 4),
                "expected_value_percent": round(expected_value * 100, 2),
                "true_probability": round(true_prob, 4),
                "implied_probability": round(implied_prob, 4),
                "value_edge": round((true_prob - implied_prob) * 100, 2),  # Edge in percentage points
                "odd_1": odd_1,
                "odd_X": odd_X,
                "odd_2": odd_2,
                "bookmaker_margin": round(margin * 100, 2)
            })
    
    # Sort by expected value descending and return top matches
    value_bets.sort(key=lambda x: x["expected_value"], reverse=True)
    
    return {
        "value_bets": value_bets[:limit],
        "total_found": len(value_bets),
        "min_ev_threshold": min_ev,
        "explanation": {
            "what_is_value_betting": "Value betting means finding odds where the bookmaker's implied probability is lower than the true probability of the outcome.",
            "expected_value": "EV = (True Probability × Odds) - 1. Positive EV indicates a profitable bet long-term.",
            "example": "If true probability is 35% and odds are 4.00 (25% implied), EV = (0.35 × 4.00) - 1 = 0.40 (40% edge)"
        }
    }


def estimate_true_probabilities(home_team: str, away_team: str, league: str, country: str, 
                               fair_prob_1: float, fair_prob_X: float, fair_prob_2: float):
    """
    Estimate true probabilities using a simple statistical model.
    
    In a production system, this would use:
    - Historical head-to-head records
    - Current team form and statistics  
    - Player injuries and suspensions
    - Home advantage factors
    - League-specific patterns
    - Machine learning models trained on historical data
    
    For now, we'll use a simplified model that adjusts based on known patterns.
    """
    
    # Start with bookmaker's fair probabilities as baseline
    true_prob_1 = fair_prob_1
    true_prob_X = fair_prob_X  
    true_prob_2 = fair_prob_2
    
    # Adjust based on league characteristics
    league_lower = league.lower()
    
    # Premier League: More competitive, fewer draws
    if "premier" in league_lower or "england" in country.lower():
        true_prob_X *= 0.9  # Reduce draw probability
        true_prob_1 *= 1.05  # Slight home advantage boost
        
    # La Liga: Technical play, more draws in mid-table games
    elif "la liga" in league_lower or "spain" in country.lower():
        if fair_prob_1 < 0.4 and fair_prob_2 < 0.4:  # Evenly matched teams
            true_prob_X *= 1.1  # Increase draw probability
            
    # Bundesliga: High-scoring, fewer draws
    elif "bundesliga" in league_lower or "germany" in country.lower():
        true_prob_X *= 0.85  # Reduce draw probability
        
    # Serie A: Tactical, more draws
    elif "serie a" in league_lower or "italy" in country.lower():
        true_prob_X *= 1.05  # Increase draw probability
        
    # Ligue 1: PSG dominance affects home/away balance
    elif "ligue" in league_lower or "france" in country.lower():
        # If one team much stronger (high probability), boost it further
        if fair_prob_1 > 0.6:
            true_prob_1 *= 1.1
        elif fair_prob_2 > 0.6:
            true_prob_2 *= 1.1
    
    # Look for team name patterns that might indicate strength
    home_lower = home_team.lower()
    away_lower = away_team.lower()
    
    # Big teams (simplified detection)
    big_teams = ["barcelona", "real madrid", "bayern", "manchester", "liverpool", 
                 "arsenal", "chelsea", "juventus", "milan", "psg", "city"]
    
    home_is_big = any(big_team in home_lower for big_team in big_teams)
    away_is_big = any(big_team in away_lower for big_team in big_teams)
    
    # Adjust for big team vs small team matchups
    if home_is_big and not away_is_big:
        true_prob_1 *= 1.08  # Boost home big team
        true_prob_2 *= 0.85  # Reduce away small team
    elif away_is_big and not home_is_big:
        true_prob_2 *= 1.08  # Boost away big team  
        true_prob_1 *= 0.85  # Reduce home small team
    
    # Home advantage (general boost for home team)
    true_prob_1 *= 1.03  # Small home advantage
    true_prob_2 *= 0.98  # Small away disadvantage
    
    # Normalize to ensure probabilities sum to 1
    total = true_prob_1 + true_prob_X + true_prob_2
    true_prob_1 /= total
    true_prob_X /= total
    true_prob_2 /= total
    
    return true_prob_1, true_prob_X, true_prob_2


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
    
    # Apply pagination and ordering (sooner to later - upcoming matches first)
    query = query.order_by(Odds.date.asc(), Odds.time.asc()).offset(offset).limit(size)
    
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