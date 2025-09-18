from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import desc, and_, select, func

from ..core.deps import get_db, get_current_user
from ..models.user import User
from ..models.betting_record import BettingRecord
from ..services.transaction_service import TransactionService
from ..schemas.betting_record import (
    BettingRecordCreate, 
    BettingRecordResponse, 
    BettingRecord as BettingRecordSchema
)

router = APIRouter(prefix="/api/betting", tags=["betting_records"])

@router.post("/records", response_model=BettingRecordSchema)
async def create_betting_record(
    betting_record: BettingRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new betting record"""
    try:
        db_record = BettingRecord(
            user_id=current_user.id,
            **betting_record.model_dump()
        )
        db.add(db_record)
        await db.flush()  # Flush to get the ID
        
        # Create transaction record for the bet placement
        await TransactionService.create_bet_placed_transaction(
            db=db,
            user_id=current_user.id,
            amount=betting_record.bet_amount,
            betting_record_id=str(db_record.id),
            match_teams=betting_record.match_teams,
            selected_outcome=betting_record.selected_outcome,
            odds_value=betting_record.odds_value,
            extra_data={
                "match_date": betting_record.match_date.isoformat() if betting_record.match_date else None,
                "match_league": betting_record.match_league,
                "match_status": betting_record.match_status,
                "selected_team": betting_record.selected_team,
                "odds_decimal": betting_record.odds_decimal,
                "potential_win": betting_record.potential_win
            }
        )
        
        await db.commit()
        await db.refresh(db_record)
        return db_record
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to create betting record: {str(e)}")

@router.get("/records", response_model=BettingRecordResponse)
async def get_betting_records(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(10, ge=1, le=50, description="Records per page"),
    status: Optional[str] = Query(None, description="Filter by bet status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's betting records with pagination"""
    try:
        # Base query
        query = select(BettingRecord).where(BettingRecord.user_id == current_user.id)
        
        # Apply status filter if provided
        if status:
            query = query.where(BettingRecord.bet_status == status)
        
        # Get total count
        count_query = select(func.count()).select_from(BettingRecord).where(BettingRecord.user_id == current_user.id)
        if status:
            count_query = count_query.where(BettingRecord.bet_status == status)
        
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Apply pagination and ordering (newest first)
        query = query.order_by(desc(BettingRecord.created_at)).offset((page - 1) * per_page).limit(per_page)
        result = await db.execute(query)
        records = result.scalars().all()
        
        # Calculate total pages
        total_pages = (total + per_page - 1) // per_page
        
        return BettingRecordResponse(
            records=records,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch betting records: {str(e)}")

@router.get("/records/stats")
async def get_betting_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's betting statistics"""
    try:
        # Get all records for the user
        query = select(BettingRecord).where(BettingRecord.user_id == current_user.id)
        result = await db.execute(query)
        records = result.scalars().all()
        
        total_bets = len(records)
        total_amount_bet = sum(record.bet_amount for record in records)
        total_potential_win = sum(record.potential_win for record in records)
        
        settled_records = [r for r in records if r.is_settled]
        won_bets = len([r for r in settled_records if r.bet_status == "won"])
        lost_bets = len([r for r in settled_records if r.bet_status == "lost"])
        
        total_profit = sum(r.actual_profit or 0 for r in settled_records)
        win_rate = (won_bets / len(settled_records)) * 100 if settled_records else 0
        
        return {
            "total_bets": total_bets,
            "total_amount_bet": float(total_amount_bet),
            "total_potential_win": float(total_potential_win),
            "won_bets": won_bets,
            "lost_bets": lost_bets,
            "pending_bets": total_bets - len(settled_records),
            "total_profit": float(total_profit),
            "win_rate": round(win_rate, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch betting stats: {str(e)}")

@router.post("/fix-missing-dates")
async def fix_missing_match_dates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fix existing betting records with missing match dates"""
    try:
        # Get all records with missing match dates for current user
        query = select(BettingRecord).where(
            and_(
                BettingRecord.user_id == current_user.id,
                BettingRecord.match_date.is_(None)
            )
        )
        result = await db.execute(query)
        records_to_fix = result.scalars().all()
        
        updated_count = 0
        
        for record in records_to_fix:
            # Generate a reasonable future date based on when bet was placed
            from datetime import timedelta, datetime
            import random
            
            bet_date = record.created_at
            # Add 1-7 days to bet date for match date
            days_ahead = random.randint(1, 7)
            hours = random.randint(12, 22)  # Between 12 PM and 10 PM
            minutes = random.choice([0, 15, 30, 45])
            
            # Create a new datetime for the match
            match_date = datetime(
                year=bet_date.year,
                month=bet_date.month,
                day=bet_date.day,
                hour=hours,
                minute=minutes,
                second=0,
                microsecond=0,
                tzinfo=bet_date.tzinfo
            ) + timedelta(days=days_ahead)
            
            record.match_date = match_date
            updated_count += 1
        
        await db.commit()
        
        return {
            "message": f"Updated {updated_count} betting records with match dates",
            "updated_count": updated_count
        }
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to fix match dates: {str(e)}")
