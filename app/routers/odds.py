from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, text
from sqlalchemy.orm import load_only
from typing import Optional, List
from datetime import date, datetime
import math

from app.core.database import get_db
from app.models.odds import Odds
from app.models.betting_record import BettingRecord
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.odds import (
    OddsResponse,
    OddsListResponse,
    OddsQueryParams,
    DroppingOddsItem,
    DroppingOddsResponse,
    SureBetItem,
    SureBetsResponse,
    StatisticsResponse,
)

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


@router.get("/dropping-odds", response_model=DroppingOddsResponse)
async def get_dropping_odds(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=100, description="Page size"),
    min_drop_percent: float = Query(20.0, ge=0, le=100, description="Minimum drop percentage (e.g. 20 = 20%)"),
    bet_type: Optional[str] = Query(None, description="Filter: 1, X, or 2"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get matches where odds have dropped (current < previous). Returns one row per outcome (1/X/2) that dropped.
    """
    today = date.today()
    max_rows = 400
    cols = [
        Odds.id, Odds.date, Odds.time, Odds.home_team, Odds.away_team,
        Odds.country, Odds.league,
        Odds.odd_1, Odds.odd_X, Odds.odd_2,
        Odds.pre_odd_1, Odds.pre_odd_X, Odds.pre_odd_2,
    ]
    query = (
        select(Odds)
        .options(load_only(*cols))
        .where(Odds.date >= today)
        .where(
            ((Odds.odd_1.isnot(None)) & (Odds.pre_odd_1.isnot(None)) & (Odds.odd_1 < Odds.pre_odd_1))
            | ((Odds.odd_X.isnot(None)) & (Odds.pre_odd_X.isnot(None)) & (Odds.odd_X < Odds.pre_odd_X))
            | ((Odds.odd_2.isnot(None)) & (Odds.pre_odd_2.isnot(None)) & (Odds.odd_2 < Odds.pre_odd_2))
        )
        .order_by(Odds.date.asc(), Odds.time.asc())
        .limit(max_rows)
    )
    result = await db.execute(query)
    rows = result.scalars().all()
    items: List[DroppingOddsItem] = []
    for o in rows:
        time_str = str(o.time) if o.time else "00:00"
        if len(time_str) >= 5 and time_str[2] == ":":
            time_str = time_str[:5]
        date_str = o.date.strftime("%Y-%m-%d")
        teams = f"{o.home_team} - {o.away_team}"
        country = o.country or ""
        for label, curr, pre in [
            ("1", o.odd_1, o.pre_odd_1),
            ("X", o.odd_X, o.pre_odd_X),
            ("2", o.odd_2, o.pre_odd_2),
        ]:
            if bet_type and label != bet_type:
                continue
            if curr is None or pre is None or float(curr) >= float(pre):
                continue
            try:
                drop = (float(curr) - float(pre)) / float(pre) * 100
            except (ZeroDivisionError, TypeError):
                continue
            if drop > 0:
                continue
            if abs(drop) < min_drop_percent:
                continue
            items.append(
                DroppingOddsItem(
                    id=f"{o.id}-{label}",
                    match_id=o.id,
                    sport="Football",
                    country=country,
                    league=o.league or "",
                    bet_type=label,
                    date=date_str,
                    time=time_str,
                    teams=teams,
                    current_odds=float(curr),
                    previous_odds=float(pre),
                    drop_percent=round(drop, 1),
                    best_current_odds=float(curr),
                    bookmaker="Platform",
                )
            )
    items.sort(key=lambda x: x.drop_percent)
    total = len(items)
    pages = math.ceil(total / size) if total > 0 else 0
    offset = (page - 1) * size
    page_items = items[offset : offset + size]
    return DroppingOddsResponse(items=page_items, total=total, page=page, size=size, pages=pages)


@router.get("/sure-bets", response_model=SureBetsResponse)
async def get_sure_bets(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    date_from: Optional[date] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    min_profit_percent: float = Query(0.0, ge=0, le=50, description="Minimum profit %"),
    db: AsyncSession = Depends(get_db),
):
    """
    Get sure bets (arbitrage): matches where best odds across rows give 1/odd_1 + 1/odd_X + 1/odd_2 < 1.
    Groups odds by (date, home_team, away_team, league, country), takes max per outcome, then filters by implied sum < 1.
    """
    today = date.today()
    from_date = date_from if date_from is not None else today
    to_date = date_to if date_to is not None else today
    max_rows = 2000
    cols = [
        Odds.id, Odds.date, Odds.time, Odds.home_team, Odds.away_team,
        Odds.country, Odds.league,
        Odds.odd_1, Odds.odd_X, Odds.odd_2,
    ]
    query = (
        select(Odds)
        .options(load_only(*cols))
        .where(Odds.date >= from_date)
        .where(Odds.date <= to_date)
        .where(Odds.result.is_(None))
        .where(
            Odds.odd_1.isnot(None),
            Odds.odd_X.isnot(None),
            Odds.odd_2.isnot(None),
            Odds.odd_1 > 0,
            Odds.odd_X > 0,
            Odds.odd_2 > 0,
        )
        .order_by(Odds.date.asc(), Odds.time.asc())
        .limit(max_rows)
    )
    result = await db.execute(query)
    rows = result.scalars().all()

    # Group by match (date, home_team, away_team, league, country)
    groups: dict = {}
    for o in rows:
        key = (o.date, o.home_team, o.away_team, (o.league or ""), (o.country or ""))
        if key not in groups:
            groups[key] = []
        groups[key].append(
            (float(o.odd_1), float(o.odd_X), float(o.odd_2), o.time)
        )

    items: List[SureBetItem] = []
    for (match_date, home_team, away_team, league, country), odds_list in groups.items():
        best_1 = max(x[0] for x in odds_list)
        best_x = max(x[1] for x in odds_list)
        best_2 = max(x[2] for x in odds_list)
        implied = (1.0 / best_1) + (1.0 / best_x) + (1.0 / best_2)
        if implied >= 1.0:
            continue
        profit_pct = (1.0 / implied - 1.0) * 100.0
        if profit_pct < min_profit_percent:
            continue
        time_val = odds_list[0][3]
        time_str = str(time_val)[:5] if time_val else "00:00"
        date_str = match_date.strftime("%Y-%m-%d")
        teams = f"{home_team} - {away_team}"
        total_stake = 100.0
        stake_1 = total_stake * (1.0 / best_1) / implied
        stake_x = total_stake * (1.0 / best_x) / implied
        stake_2 = total_stake * (1.0 / best_2) / implied
        guaranteed_return = total_stake * (1.0 / implied)
        bet_id = f"{date_str}-{home_team[:20]}-{away_team[:20]}".replace(" ", "_")
        items.append(
            SureBetItem(
                id=bet_id,
                sport="Football",
                country=country,
                league=league,
                teams=teams,
                date=date_str,
                time=time_str,
                best_odd_1=round(best_1, 2),
                best_odd_x=round(best_x, 2),
                best_odd_2=round(best_2, 2),
                profit_percent=round(profit_pct, 2),
                stake_1=round(stake_1, 2),
                stake_x=round(stake_x, 2),
                stake_2=round(stake_2, 2),
                total_stake=round(total_stake, 2),
                guaranteed_return=round(guaranteed_return, 2),
            )
        )

    items.sort(key=lambda x: -x.profit_percent)
    total = len(items)
    pages = math.ceil(total / size) if total > 0 else 0
    offset = (page - 1) * size
    page_items = items[offset : offset + size]
    return SureBetsResponse(items=page_items, total=total, page=page, size=size, pages=pages)


@router.get("/statistics")
async def get_statistics(db: AsyncSession = Depends(get_db)):
    """
    Get platform statistics: bookmakers count, sports count, and daily matches count.
    Returns real-time data from the database.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        today = datetime.now().date()
        
        # Get average number of bookmakers per match (more accurate than MAX)
        # The bets column represents bookmakers offering odds per match from OddsPortal
        # Using average gives a better representation of platform coverage
        avg_bookmakers_query = select(func.avg(Odds.bets)).where(
            and_(Odds.bets.isnot(None), Odds.bets > 0)
        )
        avg_bookmakers_result = await db.execute(avg_bookmakers_query)
        avg_bookmakers_raw = avg_bookmakers_result.scalar()
        
        # Convert to float first, then int (handles Decimal/Numeric types)
        try:
            avg_bookmakers = float(avg_bookmakers_raw) if avg_bookmakers_raw is not None else 0.0
        except (TypeError, ValueError):
            avg_bookmakers = 0.0
        
        # Round up to nearest 10 for display (e.g., 45 -> 50, 67 -> 70)
        if avg_bookmakers > 0:
            bookmakers_display = int(((int(avg_bookmakers) + 9) // 10) * 10)
        else:
            bookmakers_display = 0
        
        # Count distinct leagues (sports)
        distinct_leagues_query = select(func.count(func.distinct(Odds.league)))
        distinct_leagues_result = await db.execute(distinct_leagues_query)
        sports_count_raw = distinct_leagues_result.scalar()
        
        # Convert to int (handles Decimal/Numeric types)
        try:
            sports_count = int(float(sports_count_raw)) if sports_count_raw is not None else 0
        except (TypeError, ValueError):
            sports_count = 0
        
        # Count matches for today
        today_matches_query = select(func.count(Odds.id)).where(Odds.date == today)
        today_matches_result = await db.execute(today_matches_query)
        daily_matches_raw = today_matches_result.scalar()
        
        # Convert to int (handles Decimal/Numeric types)
        try:
            daily_matches = int(float(daily_matches_raw)) if daily_matches_raw is not None else 0
        except (TypeError, ValueError):
            daily_matches = 0
        
        # Cap at reasonable maximum to avoid showing unrealistic numbers
        # If > 1000, it might indicate duplicates or data issues
        if daily_matches > 1000:
            logger.warning(f"Daily matches count seems high: {daily_matches}. This might indicate duplicates.")
            # Still return the actual count, but log a warning
        
        # Ensure all values are proper Python int types (not Decimal, not string)
        # Convert to native Python int to avoid Pydantic validation issues
        def ensure_int(value):
            """Ensure value is a native Python int"""
            if value is None:
                return 0
            if isinstance(value, (int, float)):
                return int(value)
            if isinstance(value, str):
                try:
                    return int(float(value))
                except (ValueError, TypeError):
                    return 0
            # Handle Decimal and other numeric types
            try:
                return int(float(value))
            except (ValueError, TypeError):
                return 0
        
        bookmakers_final = ensure_int(bookmakers_display)
        sports_final = ensure_int(sports_count)
        daily_matches_final = ensure_int(daily_matches)
        
        # Verify types are actually int (remove assertions to avoid crashes, just log)
        if not isinstance(bookmakers_final, int):
            logger.warning(f"bookmakers_final is {type(bookmakers_final)}, not int. Value: {bookmakers_final}")
            bookmakers_final = int(bookmakers_final) if bookmakers_final is not None else 0
        if not isinstance(sports_final, int):
            logger.warning(f"sports_final is {type(sports_final)}, not int. Value: {sports_final}")
            sports_final = int(sports_final) if sports_final is not None else 0
        if not isinstance(daily_matches_final, int):
            logger.warning(f"daily_matches_final is {type(daily_matches_final)}, not int. Value: {daily_matches_final}")
            daily_matches_final = int(daily_matches_final) if daily_matches_final is not None else 0
        
        logger.info(f"Statistics API called: bookmakers={bookmakers_final} (type: {type(bookmakers_final).__name__}), sports={sports_final} (type: {type(sports_final).__name__}), daily_matches={daily_matches_final} (type: {type(daily_matches_final).__name__})")
        
        # Final conversion to ensure native Python int types
        final_bookmakers = int(bookmakers_final) if bookmakers_final is not None else 0
        final_sports = int(sports_final) if sports_final is not None else 0
        final_daily_matches = int(daily_matches_final) if daily_matches_final is not None else 0
        
        # Return dict directly - FastAPI will serialize it as JSON
        # This avoids Pydantic validation issues
        result_dict = {
            "bookmakers": final_bookmakers,
            "sports": final_sports,
            "daily_matches": final_daily_matches
        }
        
        logger.info(f"Returning statistics dict: {result_dict}")
        logger.info(f"Types: bookmakers={type(final_bookmakers).__name__}, sports={type(final_sports).__name__}, daily_matches={type(final_daily_matches).__name__}")
        
        return result_dict
        
    except Exception as e:
        logger.error(f"Error fetching statistics: {e}", exc_info=True)
        # Return zeros on error (frontend will handle the error state)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch statistics: {str(e)}"
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