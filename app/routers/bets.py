"""
Bets Router
API endpoints for placing and managing bets using internal USDT wallet
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from decimal import Decimal

from ..core.deps import get_db, get_current_user
from ..models.user import User
from ..models.bet import Bet, BetStatus
from ..services.bet_service import BetService
from ..services.wallet_service import WalletService
from ..schemas.bet import (
    BetPlaceRequest,
    BetResponse,
    BetWithMatchResponse,
    BetSettleRequest,
    BetListResponse
)

router = APIRouter(prefix="/api/bets", tags=["bets"])


@router.post("/place", response_model=BetResponse, status_code=201)
async def place_bet(
    request: BetPlaceRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Place a bet using internal USDT wallet
    
    - Validates match is open
    - Validates stake within limits
    - Locks stake in wallet
    - Creates bet record
    """
    try:
        bet = await BetService.place_bet(
            user_id=current_user.id,
            match_id=request.match_id,
            market_key=request.market_key,
            selection_key=request.selection_key,
            odds_decimal=request.odds_decimal,
            stake=request.stake,
            currency=request.currency,
            db=db
        )
        
        # Get wallet balance snapshot
        wallet_balance = await WalletService.get_balance(
            user_id=current_user.id,
            asset=request.currency,
            db=db
        )
        
        # Convert to response
        bet_response = BetResponse(
            id=bet.id,
            user_id=bet.user_id,
            match_id=bet.match_id,
            market_key=bet.market_key,
            selection_key=bet.selection_key,
            odds_decimal=bet.odds_decimal,
            stake=bet.stake,
            currency=bet.currency,
            status=bet.status,
            settle_version=bet.settle_version,
            placed_at=bet.placed_at,
            settled_at=bet.settled_at,
            potential_profit=bet.potential_profit,
            potential_payout=bet.potential_payout,
            profit=bet.profit,
            payout=bet.payout
        )
        
        return bet_response
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to place bet: {str(e)}")


@router.get("", response_model=BetListResponse)
async def get_user_bets(
    status: Optional[BetStatus] = Query(None, description="Filter by bet status"),
    limit: int = Query(100, ge=1, le=500, description="Number of bets to return"),
    offset: int = Query(0, ge=0, description="Number of bets to skip"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get user's bets with optional status filter
    """
    try:
        bets = await BetService.get_user_bets(
            user_id=current_user.id,
            status=status,
            limit=limit,
            offset=offset,
            db=db
        )
        
        # Get total count
        count_stmt = select(func.count(Bet.id)).where(Bet.user_id == current_user.id)
        if status:
            count_stmt = count_stmt.where(Bet.status == status)
        result = await db.execute(count_stmt)
        total = result.scalar()
        
        bet_responses = [
            BetResponse(
                id=bet.id,
                user_id=bet.user_id,
                match_id=bet.match_id,
                market_key=bet.market_key,
                selection_key=bet.selection_key,
                odds_decimal=bet.odds_decimal,
                stake=bet.stake,
                currency=bet.currency,
                status=bet.status,
                settle_version=bet.settle_version,
                placed_at=bet.placed_at,
                settled_at=bet.settled_at,
                potential_profit=bet.potential_profit,
                potential_payout=bet.potential_payout,
                profit=bet.profit,
                payout=bet.payout
            )
            for bet in bets
        ]
        
        return BetListResponse(
            bets=bet_responses,
            total=total,
            limit=limit,
            offset=offset
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get bets: {str(e)}")


@router.get("/{bet_id}", response_model=BetWithMatchResponse)
async def get_bet(
    bet_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific bet by ID
    """
    try:
        bet = await BetService.get_bet(
            bet_id=bet_id,
            user_id=current_user.id,
            db=db
        )
        
        if not bet:
            raise HTTPException(status_code=404, detail="Bet not found")
        
        # Load match information
        from ..models.odds import Odds
        match = await db.get(Odds, bet.match_id)
        
        bet_response = BetWithMatchResponse(
            id=bet.id,
            user_id=bet.user_id,
            match_id=bet.match_id,
            market_key=bet.market_key,
            selection_key=bet.selection_key,
            odds_decimal=bet.odds_decimal,
            stake=bet.stake,
            currency=bet.currency,
            status=bet.status,
            settle_version=bet.settle_version,
            placed_at=bet.placed_at,
            settled_at=bet.settled_at,
            potential_profit=bet.potential_profit,
            potential_payout=bet.potential_payout,
            match_home_team=match.home_team if match else None,
            match_away_team=match.away_team if match else None,
            match_date=match.date if match else None,
            match_league=match.league if match else None
        )
        
        return bet_response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get bet: {str(e)}")


@router.post("/{bet_id}/cancel", response_model=BetResponse)
async def cancel_bet(
    bet_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancel a pending bet (unlock reserved funds)
    
    Only allows cancellation if:
    - Bet belongs to user
    - Bet status is pending
    - Match has not started
    """
    try:
        bet = await BetService.cancel_bet(
            bet_id=bet_id,
            user_id=current_user.id,
            db=db
        )
        
        # Get wallet balance snapshot
        wallet_balance = await WalletService.get_balance(
            user_id=current_user.id,
            asset=bet.currency,
            db=db
        )
        
        bet_response = BetResponse(
            id=bet.id,
            user_id=bet.user_id,
            match_id=bet.match_id,
            market_key=bet.market_key,
            selection_key=bet.selection_key,
            odds_decimal=bet.odds_decimal,
            stake=bet.stake,
            currency=bet.currency,
            status=bet.status,
            settle_version=bet.settle_version,
            placed_at=bet.placed_at,
            settled_at=bet.settled_at,
            potential_profit=bet.potential_profit,
            potential_payout=bet.potential_payout,
            profit=bet.profit,
            payout=bet.payout
        )
        
        return bet_response
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel bet: {str(e)}")


@router.post("/{bet_id}/settle", response_model=BetResponse)
async def settle_bet_admin(
    bet_id: int,
    request: BetSettleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Settle a bet as WIN, LOSS, or VOID (Admin only)
    
    This endpoint is for testing/staging purposes.
    In production, settlement should be automated based on match results.
    """
    # Check if user is admin
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        bet = await BetService.settle_bet(
            bet_id=bet_id,
            outcome=request.outcome,
            db=db
        )
        
        bet_response = BetResponse(
            id=bet.id,
            user_id=bet.user_id,
            match_id=bet.match_id,
            market_key=bet.market_key,
            selection_key=bet.selection_key,
            odds_decimal=bet.odds_decimal,
            stake=bet.stake,
            currency=bet.currency,
            status=bet.status,
            settle_version=bet.settle_version,
            placed_at=bet.placed_at,
            settled_at=bet.settled_at,
            potential_profit=bet.potential_profit,
            potential_payout=bet.potential_payout,
            profit=bet.profit,
            payout=bet.payout
        )
        
        return bet_response
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to settle bet: {str(e)}")
