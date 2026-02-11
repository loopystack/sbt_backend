from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import desc, and_, select, func
from datetime import datetime, timezone, time as dt_time

from ..core.deps import get_db, get_current_user
from ..models.user import User
from ..models.betting_record import BettingRecord
from ..models.odds import Odds
from ..models.transaction import Transaction
from ..services.transaction_service import TransactionService
from ..services.compliance_service import compliance_service
from ..services.affiliate_service import AffiliateService
from ..models.affiliate import Referral
from decimal import Decimal
from ..schemas.betting_record import (
    BettingRecordCreate, 
    BettingRecordResponse, 
    BettingRecord as BettingRecordSchema
)

router = APIRouter(prefix="/api/betting", tags=["betting_records"])


def _is_valid_football_result(result: str) -> bool:
    """Only treat as a real match score (e.g. 1-0, 2-1). Rejects scraper garbage like 18-17 or 19-523."""
    if not result or not result.strip():
        return False
    parts = result.strip().split("-")
    if len(parts) != 2:
        return False
    try:
        a, b = int(parts[0]), int(parts[1])
        return 0 <= a <= 15 and 0 <= b <= 15
    except ValueError:
        return False


def _match_has_been_played(match) -> bool:
    """True only if match date+time is in the past (match has started). Never settle future matches."""
    match_date = getattr(match, "date", None)
    if not match_date:
        return False
    match_time = getattr(match, "time", None) or dt_time.min
    try:
        match_dt = datetime.combine(match_date, match_time).replace(tzinfo=timezone.utc)
        return match_dt < datetime.now(timezone.utc)
    except (TypeError, ValueError):
        return False


async def auto_settle_user_bets(db: AsyncSession, user_id: int):
    """
    AUTOMATIC SETTLEMENT: Automatically settle all unsettled bets for a user
    This runs every time the user fetches their betting records
    """
    try:
        # Find all unsettled bets for this user
        unsettled_query = select(BettingRecord).where(
            and_(
                BettingRecord.user_id == user_id,
                BettingRecord.is_settled == False
            )
        )
        
        result = await db.execute(unsettled_query)
        unsettled_bets = result.scalars().all()
        
        if not unsettled_bets:
            return  # No unsettled bets
        
        print(f"🤖 AUTO-SETTLEMENT: Found {len(unsettled_bets)} unsettled bets for user {user_id}")
        
        settled_count = 0
        
        # Process each unsettled bet
        for bet in unsettled_bets:
            # Find the match for this bet
            match = None
            
            # Try to find by match_id first
            if bet.match_id:
                match = await db.get(Odds, bet.match_id)
            
            # If not found, try to find by team names
            if not match:
                try:
                    teams = bet.match_teams.split(" vs ")
                    if len(teams) == 2:
                        match_query = select(Odds).where(
                            and_(
                                Odds.home_team == teams[0].strip(),
                                Odds.away_team == teams[1].strip()
                            )
                        )
                        match_result = await db.execute(match_query)
                        match = match_result.scalar_one_or_none()
                except:
                    pass
            
            if not match or not match.result:
                continue  # Skip if no match found or no result
            if not _is_valid_football_result(match.result):
                continue  # Reject scraper garbage (e.g. 18-17) and impossible scores
            if not _match_has_been_played(match):
                continue  # Never settle future matches; only after match has started
            
            print(f"   🏟️  Settling: {bet.match_teams} ({match.result})")
            
            # Parse result and determine winner
            try:
                home_score, away_score = map(int, match.result.split("-"))
            except (ValueError, AttributeError):
                continue
            
            if home_score > away_score:
                actual_outcome = "home"
            elif away_score > home_score:
                actual_outcome = "away"
            else:
                actual_outcome = "draw"
            
            # Check if bet won
            user_bet = bet.selected_outcome.lower()
            bet_won = (user_bet == actual_outcome)
            
            # Calculate winnings and update
            if bet_won:
                winnings = bet.bet_amount * bet.odds_decimal
                profit = winnings - bet.bet_amount
                
                # Update user balance
                user = await db.get(User, user_id)
                if user:
                    old_balance = float(user.funds_usd)
                    new_balance = old_balance + winnings
                    user.funds_usd = new_balance
                    
                    # Check if transaction already exists to prevent duplicates
                    existing_transaction_query = select(Transaction).where(
                        and_(
                            Transaction.user_id == user_id,
                            Transaction.reference_id == str(bet.id),
                            Transaction.reference_type == "betting_record",
                            Transaction.transaction_type.in_(["bet_won", "bet_lost"])
                        )
                    )
                    existing_transaction_result = await db.execute(existing_transaction_query)
                    existing_transaction = existing_transaction_result.scalar_one_or_none()
                    
                    # Only create transaction if it doesn't already exist
                    if not existing_transaction:
                        transaction = Transaction(
                            user_id=user_id,
                            transaction_type="bet_won",
                            amount=winnings,
                            balance_before=old_balance,
                            balance_after=new_balance,
                            description=f"🏆 Bet Won: {match.home_team} vs {match.away_team} ({match.result}) - {bet.selected_outcome} (Profit: +${profit:.2f})",
                            reference_id=str(bet.id),
                            reference_type="betting_record",
                            status="completed",
                            payment_method="auto_settlement"
                        )
                        db.add(transaction)
                        print(f"      ✅ WON! Profit: ${profit:.2f} (Transaction created)")
                    else:
                        print(f"      ✅ WON! Profit: ${profit:.2f} (Transaction already exists, skipping)")
            else:
                profit = -bet.bet_amount
                
                # Check if transaction already exists to prevent duplicates
                existing_transaction_query = select(Transaction).where(
                    and_(
                        Transaction.user_id == user_id,
                        Transaction.reference_id == str(bet.id),
                        Transaction.reference_type == "betting_record",
                        Transaction.transaction_type.in_(["bet_won", "bet_lost"])
                    )
                )
                existing_transaction_result = await db.execute(existing_transaction_query)
                existing_transaction = existing_transaction_result.scalar_one_or_none()
                
                # Only create transaction if it doesn't already exist
                if not existing_transaction:
                    user = await db.get(User, user_id)
                    if user:
                        balance = float(user.funds_usd)
                        transaction = Transaction(
                            user_id=user_id,
                            transaction_type="bet_lost",
                            amount=0.0,
                            balance_before=balance,
                            balance_after=balance,
                            description=f"❌ Bet Lost: {match.home_team} vs {match.away_team} ({match.result}) - {bet.selected_outcome} (Loss: -${bet.bet_amount:.2f})",
                            reference_id=str(bet.id),
                            reference_type="betting_record",
                            status="completed",
                            payment_method="auto_settlement"
                        )
                        db.add(transaction)
                        await db.flush()  # Flush to get transaction ID
                        
                        # Calculate affiliate commission on bet loss (platform profit)
                        if user.referred_by_affiliate_id:
                            try:
                                referral_query = select(Referral).where(
                                    Referral.referred_user_id == user_id,
                                    Referral.affiliate_id == user.referred_by_affiliate_id
                                )
                                referral_result = await db.execute(referral_query)
                                referral = referral_result.scalar_one_or_none()
                                
                                if referral:
                                    # Commission based on bet amount (platform profit when user loses)
                                    await AffiliateService.calculate_commission(
                                        affiliate_id=user.referred_by_affiliate_id,
                                        transaction_id=transaction.id,
                                        transaction_type="bet_loss",
                                        base_amount=Decimal(str(bet.bet_amount)),
                                        db=db
                                    )
                            except Exception as e:
                                # Log error but don't fail settlement
                                print(f"Failed to calculate affiliate commission on bet loss: {e}")
                        
                        print(f"      ❌ LOST: ${bet.bet_amount:.2f} (Transaction created)")
                else:
                    print(f"      ❌ LOST: ${bet.bet_amount:.2f} (Transaction already exists, skipping)")
            
            # Update betting record
            bet.bet_status = "won" if bet_won else "lost"
            bet.actual_profit = profit
            bet.is_settled = True
            bet.settlement_date = datetime.now(timezone.utc).replace(tzinfo=None)
            bet.match_status = "finished"
            
            settled_count += 1
        
        if settled_count > 0:
            await db.commit()
            print(f"   🎉 Auto-settled {settled_count} bet(s) for user {user_id}")
        
    except Exception as e:
        print(f"❌ Auto-settlement error for user {user_id}: {str(e)}")
        # Don't raise exception - we don't want to break the API call

@router.post("/records", response_model=BettingRecordSchema)
async def create_betting_record(
    betting_record: BettingRecordCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new betting record"""
    try:
        # Check compliance limits before allowing bet
        compliance_check = await compliance_service.check_bet_limits(
            user_id=current_user.id,
            bet_amount=betting_record.bet_amount,
            db=db
        )
        
        if not compliance_check.get("allowed"):
            raise HTTPException(
                status_code=403,
                detail=compliance_check.get("reason", "Bet limit exceeded")
            )
        
        data = betting_record.model_dump()
        # Use canonical match date from Odds when match_id is set so dashboard and league results page show the same date/time
        if betting_record.match_id:
            match = await db.get(Odds, betting_record.match_id)
            if match and getattr(match, "date", None):
                match_time = getattr(match, "time", None) or dt_time.min
                data["match_date"] = datetime.combine(match.date, match_time)
        db_record = BettingRecord(
            user_id=current_user.id,
            **data
        )
        db.add(db_record)
        await db.flush()  # Flush to get the ID
        
        # Create transaction record for the bet placement
        transaction = await TransactionService.create_bet_placed_transaction(
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
        
        await db.flush()  # Flush before affiliate tracking
        
        # Track first bet conversion if user was referred
        if current_user.referred_by_affiliate_id:
            try:
                referral_query = select(Referral).where(
                    Referral.referred_user_id == current_user.id,
                    Referral.affiliate_id == current_user.referred_by_affiliate_id
                )
                referral_result = await db.execute(referral_query)
                referral = referral_result.scalar_one_or_none()
                
                if referral and not referral.first_bet_date:
                    await AffiliateService.track_conversion(
                        referral_id=referral.id,
                        conversion_type="first_bet",
                        db=db
                    )
            except Exception as e:
                # Log error but don't fail bet placement
                print(f"Failed to track first bet conversion: {e}")
        
        await db.commit()
        await db.refresh(db_record)
        return db_record
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to create betting record: {str(e)}")

@router.get("/records", response_model=BettingRecordResponse)
async def get_betting_records(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(10, ge=1, le=100, description="Records per page"),
    status: Optional[str] = Query(None, description="Filter by bet status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's betting records with pagination"""
    try:
        print(f"🔍 Fetching betting records for user {current_user.id} (page={page}, per_page={per_page})")
        
        # 🤖 AUTOMATIC SETTLEMENT: Run settlement before fetching records
        await auto_settle_user_bets(db, current_user.id)
        
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
        
        print(f"✅ Found {len(records)} records out of {total} total for user {current_user.id}")
        
        return BettingRecordResponse(
            records=records,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
    except Exception as e:
        print(f"❌ Error fetching betting records: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch betting records: {str(e)}")

@router.get("/records/stats")
async def get_betting_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's betting statistics"""
    try:
        print(f"🔍 Fetching betting stats for user {current_user.id}")
        
        # 🤖 AUTOMATIC SETTLEMENT: Run settlement before fetching stats
        await auto_settle_user_bets(db, current_user.id)
        
        # Get all records for the user
        query = select(BettingRecord).where(BettingRecord.user_id == current_user.id)
        result = await db.execute(query)
        records = result.scalars().all()
        
        print(f"📊 Found {len(records)} betting records for user {current_user.id}")
        
        total_bets = len(records)
        total_amount_bet = sum(float(record.bet_amount) for record in records)
        total_potential_win = sum(float(record.potential_win) for record in records)
        
        settled_records = [r for r in records if r.is_settled]
        won_bets = sum(1 for r in settled_records if r.bet_status == "won")
        lost_bets = sum(1 for r in settled_records if r.bet_status == "lost")
        pending_bets = total_bets - len(settled_records)
        
        total_profit = sum(float(r.actual_profit or 0) for r in settled_records)
        win_rate = (won_bets / len(settled_records)) * 100.0 if settled_records else 0.0
        
        return {
            "total_bets": int(total_bets),
            "total_amount_bet": round(float(total_amount_bet), 2),
            "total_potential_win": round(float(total_potential_win), 2),
            "won_bets": int(won_bets),
            "lost_bets": int(lost_bets),
            "pending_bets": int(pending_bets),
            "total_profit": round(float(total_profit), 2),
            "win_rate": round(win_rate, 2),
        }
    except Exception as e:
        print(f"❌ Error fetching betting stats: {str(e)}")
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
