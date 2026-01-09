from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.admin_deps import get_admin_user
from app.models.user import User
from app.models.betting_record import BettingRecord
from app.models.transaction import Transaction
from app.models.deposit import DepositIntent, CryptoTransaction, UserCryptoBalance
from app.schemas.user import UserResponse
from app.schemas.admin import (
    AdminUserResponse, 
    AdminBettingRecordResponse, 
    AdminTransactionResponse,
    AdminStatsResponse,
    UserUpdateRequest
)

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get admin dashboard statistics"""
    
    try:
        # Total users
        total_users_stmt = select(func.count(User.id))
        total_users_result = await db.execute(total_users_stmt)
        total_users = total_users_result.scalar() or 0
        
        # Active users (logged in last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        active_users_stmt = select(func.count(User.id)).where(User.last_login >= thirty_days_ago)
        active_users_result = await db.execute(active_users_stmt)
        active_users = active_users_result.scalar() or 0
        
        # Total betting records
        total_bets_stmt = select(func.count(BettingRecord.id))
        total_bets_result = await db.execute(total_bets_stmt)
        total_bets = total_bets_result.scalar() or 0
        
        # Total bet amount
        total_bet_amount_stmt = select(func.sum(BettingRecord.bet_amount))
        total_bet_amount_result = await db.execute(total_bet_amount_stmt)
        total_bet_amount = total_bet_amount_result.scalar() or 0
        
        # Total transactions
        total_transactions_stmt = select(func.count(Transaction.id))
        total_transactions_result = await db.execute(total_transactions_stmt)
        total_transactions = total_transactions_result.scalar() or 0
        
        # Total transaction volume
        total_transaction_volume_stmt = select(func.sum(func.abs(Transaction.amount)))
        total_transaction_volume_result = await db.execute(total_transaction_volume_stmt)
        total_transaction_volume = total_transaction_volume_result.scalar() or 0
        
        return AdminStatsResponse(
            total_users=total_users,
            active_users=active_users,
            total_bets=total_bets,
            total_bet_amount=float(total_bet_amount),
            total_transactions=total_transactions,
            total_transaction_volume=float(total_transaction_volume)
        )
    except Exception as e:
        print(f"Error in get_admin_stats: {e}")
        # Return default values if there's an error
        return AdminStatsResponse(
            total_users=0,
            active_users=0,
            total_bets=0,
            total_bet_amount=0.0,
            total_transactions=0,
            total_transaction_volume=0.0
        )

@router.get("/users", response_model=List[AdminUserResponse])
async def get_all_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all users with pagination and search"""
    
    try:
        offset = (page - 1) * size
        
        # Build query without selectinload for now
        query = select(User)
        
        if search:
            search_filter = or_(
                User.email.ilike(f"%{search}%"),
                User.username.ilike(f"%{search}%"),
                User.full_name.ilike(f"%{search}%")
            )
            query = query.where(search_filter)
        
        query = query.order_by(desc(User.created_at)).offset(offset).limit(size)
        
        result = await db.execute(query)
        users = result.scalars().all()
        
        # Convert to AdminUserResponse with default values for missing fields
        admin_users = []
        for user in users:
            admin_user = AdminUserResponse.model_validate(user)
            admin_user.total_bets = 0  # Will be calculated separately if needed
            admin_user.total_bet_amount = 0.0
            admin_user.total_transactions = 0
            admin_users.append(admin_user)
        
        return admin_users
    except Exception as e:
        print(f"Error in get_all_users: {e}")
        return []

@router.get("/users/{user_id}", response_model=AdminUserResponse)
async def get_user_by_id(
    user_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get specific user by ID"""
    
    stmt = select(User).options(
        selectinload(User.betting_records),
        selectinload(User.transactions)
    ).where(User.id == user_id)
    
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return AdminUserResponse.model_validate(user)

@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    user_data: UserUpdateRequest,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user information"""
    
    print(f"🔍 Backend: Updating user {user_id} with data: {user_data}")
    
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    print(f"🔍 Backend: Found user {user.username}, current is_superuser: {user.is_superuser}")
    
    # Update fields
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    if user_data.is_verified is not None:
        user.is_verified = user_data.is_verified
    if user_data.is_superuser is not None:
        user.is_superuser = user_data.is_superuser
        print(f"🔍 Backend: Setting is_superuser to {user_data.is_superuser}")
    if user_data.funds_usd is not None:
        user.funds_usd = user_data.funds_usd
    
    await db.commit()
    await db.refresh(user)
    
    print(f"🔍 Backend: After update, user.is_superuser: {user.is_superuser}")
    
    return {"message": "User updated successfully", "user": AdminUserResponse.model_validate(user)}

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a user from the database"""
    
    print(f"🔍 Backend: Deleting user {user_id}")
    
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    print(f"🔍 Backend: Found user {user.username} to delete")
    
    try:
        # Delete related records first to avoid foreign key constraint violations
        # Delete betting records
        betting_records_stmt = select(BettingRecord).where(BettingRecord.user_id == user_id)
        betting_records_result = await db.execute(betting_records_stmt)
        betting_records = betting_records_result.scalars().all()
        for record in betting_records:
            await db.delete(record)
        
        # Delete transactions
        transactions_stmt = select(Transaction).where(Transaction.user_id == user_id)
        transactions_result = await db.execute(transactions_stmt)
        transactions = transactions_result.scalars().all()
        for transaction in transactions:
            await db.delete(transaction)
        
        # Delete deposit intents and related crypto transactions
        deposit_intents_stmt = select(DepositIntent).where(DepositIntent.user_id == user_id)
        deposit_intents_result = await db.execute(deposit_intents_stmt)
        deposit_intents = deposit_intents_result.scalars().all()
        for deposit_intent in deposit_intents:
            # Delete related crypto transactions first
            crypto_transactions_stmt = select(CryptoTransaction).where(CryptoTransaction.deposit_intent_id == deposit_intent.id)
            crypto_transactions_result = await db.execute(crypto_transactions_stmt)
            crypto_transactions = crypto_transactions_result.scalars().all()
            for crypto_transaction in crypto_transactions:
                await db.delete(crypto_transaction)
            # Then delete the deposit intent
            await db.delete(deposit_intent)
        
        # Delete user crypto balances
        crypto_balances_stmt = select(UserCryptoBalance).where(UserCryptoBalance.user_id == user_id)
        crypto_balances_result = await db.execute(crypto_balances_stmt)
        crypto_balances = crypto_balances_result.scalars().all()
        for crypto_balance in crypto_balances:
            await db.delete(crypto_balance)
        
        # Finally delete the user
        await db.delete(user)
        await db.commit()
        
        print(f"🔍 Backend: User {user.username} and all related records deleted successfully")
        
        return {"message": f"User {user.username} and all related data deleted successfully"}
        
    except Exception as e:
        await db.rollback()
        print(f"🔍 Backend: Error deleting user {user.username}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )

@router.get("/betting-records", response_model=List[AdminBettingRecordResponse])
async def get_all_betting_records(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all betting records with pagination and filters"""
    
    try:
        offset = (page - 1) * size
        
        query = select(BettingRecord)
        
        if user_id:
            query = query.where(BettingRecord.user_id == user_id)
        
        if status:
            query = query.where(BettingRecord.bet_status == status)
        
        if search:
            # Search in multiple fields for team names: match_teams, selected_team, and match_league
            search_filter = or_(
                BettingRecord.match_teams.ilike(f"%{search}%"),
                BettingRecord.selected_team.ilike(f"%{search}%"),
                BettingRecord.match_league.ilike(f"%{search}%")
            )
            query = query.where(search_filter)
        
        query = query.order_by(desc(BettingRecord.created_at)).offset(offset).limit(size)
        
        result = await db.execute(query)
        records = result.scalars().all()
        
        # Convert to AdminBettingRecordResponse with user information
        admin_records = []
        for record in records:
            # Get user information for each record
            user_stmt = select(User).where(User.id == record.user_id)
            user_result = await db.execute(user_stmt)
            user = user_result.scalar_one_or_none()
            
            admin_record = AdminBettingRecordResponse.model_validate(record)
            admin_record.user_email = user.email if user else None
            admin_record.user_username = user.username if user else None
            admin_records.append(admin_record)
        
        return admin_records
    except Exception as e:
        print(f"Error in get_all_betting_records: {e}")
        return []

@router.get("/transactions", response_model=List[AdminTransactionResponse])
async def get_all_transactions(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user_id: Optional[int] = Query(None),
    transaction_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all transactions with pagination and filters"""
    
    try:
        offset = (page - 1) * size
        
        query = select(Transaction)
        
        if user_id:
            query = query.where(Transaction.user_id == user_id)
        
        if transaction_type:
            query = query.where(Transaction.transaction_type == transaction_type)
        
        if search:
            # Search in description field for transaction descriptions
            search_filter = Transaction.description.ilike(f"%{search}%")
            query = query.where(search_filter)
        
        query = query.order_by(desc(Transaction.created_at)).offset(offset).limit(size)
        
        result = await db.execute(query)
        transactions = result.scalars().all()
        
        # Convert to AdminTransactionResponse with user information
        admin_transactions = []
        for transaction in transactions:
            # Get user information for each transaction
            user_stmt = select(User).where(User.id == transaction.user_id)
            user_result = await db.execute(user_stmt)
            user = user_result.scalar_one_or_none()
            
            admin_transaction = AdminTransactionResponse.model_validate(transaction)
            admin_transaction.user_email = user.email if user else None
            admin_transaction.user_username = user.username if user else None
            admin_transactions.append(admin_transaction)
        
        return admin_transactions
    except Exception as e:
        print(f"Error in get_all_transactions: {e}")
        return []

@router.get("/financial-analytics")
async def get_financial_analytics(
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get comprehensive financial analytics for the platform"""
    
    try:
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Get all transactions in the date range
        transactions_stmt = select(Transaction).where(
            Transaction.created_at >= start_date,
            Transaction.created_at <= end_date,
            Transaction.status == "completed"
        )
        transactions_result = await db.execute(transactions_stmt)
        transactions = transactions_result.scalars().all()
        
        # Get all betting records in the date range
        betting_records_stmt = select(BettingRecord).where(
            BettingRecord.created_at >= start_date,
            BettingRecord.created_at <= end_date
        )
        betting_records_result = await db.execute(betting_records_stmt)
        betting_records = betting_records_result.scalars().all()
        
        # Calculate financial metrics
        total_income = 0
        total_outcome = 0
        total_profit = 0
        
        # Process transactions
        for transaction in transactions:
            amount = abs(transaction.amount)
            
            # Income sources
            if transaction.transaction_type in ['deposit', 'bet_won'] or \
               (transaction.transaction_type == 'manual_adjustment' and transaction.amount > 0):
                total_income += amount
            
            # Outcome sources  
            elif transaction.transaction_type in ['withdrawal', 'bet_lost'] or \
                 (transaction.transaction_type == 'manual_adjustment' and transaction.amount < 0):
                total_outcome += amount
        
        # Process betting records for additional profit data
        for record in betting_records:
            if record.is_settled and record.actual_profit is not None:
                profit = record.actual_profit
                total_profit += profit
                
                if profit > 0:
                    total_income += profit
                else:
                    total_outcome += abs(profit)
        
        # Calculate derived metrics
        net_profit = total_income - total_outcome
        profit_margin = (net_profit / total_income * 100) if total_income > 0 else 0
        roi = (net_profit / total_outcome * 100) if total_outcome > 0 else 0
        daily_income = total_income / days
        daily_outcome = total_outcome / days
        
        return {
            "total_income": total_income,
            "total_outcome": total_outcome,
            "net_profit": net_profit,
            "profit_margin": round(profit_margin, 1),
            "roi": round(roi, 1),
            "daily_income": round(daily_income, 0),
            "daily_outcome": round(daily_outcome, 0),
            "period_days": days,
            "transactions_count": len(transactions),
            "betting_records_count": len(betting_records),
            "settled_bets_count": len([r for r in betting_records if r.is_settled])
        }
        
    except Exception as e:
        print(f"Error in get_financial_analytics: {e}")
        # Return default values if there's an error
        return {
            "total_income": 0,
            "total_outcome": 0,
            "net_profit": 0,
            "profit_margin": 0.0,
            "roi": 0.0,
            "daily_income": 0,
            "daily_outcome": 0,
            "period_days": days,
            "transactions_count": 0,
            "betting_records_count": 0,
            "settled_bets_count": 0
        }

@router.post("/users/{user_id}/funds")
async def adjust_user_funds(
    user_id: int,
    amount: float,
    description: str,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Manually adjust user funds"""
    
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update user funds
    balance_before = float(user.funds_usd)
    user.funds_usd = balance_before + amount
    balance_after = float(user.funds_usd)
    
    # Create transaction record
    transaction = Transaction(
        user_id=user_id,
        transaction_type="manual_adjustment",
        amount=amount,
        balance_before=balance_before,
        balance_after=balance_after,
        description=f"Manual adjustment by admin: {description}",
        reference_type="manual",
        status="completed"
    )
    
    db.add(transaction)
    await db.commit()
    await db.refresh(user)
    
    return {
        "message": "User funds adjusted successfully",
        "new_balance": float(user.funds_usd),
        "adjustment": amount
    }


# Admin Deposit Management Endpoints
@router.get("/deposits")
async def get_admin_deposits(
    status: Optional[str] = Query(None, description="Filter by status (pending, detected, confirmed, settled, expired, failed)"),
    network: Optional[str] = Query(None, description="Filter by network (TRC20, etc.)"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all deposits with optional filtering
    Admin endpoint for operational support
    """
    try:
        offset = (page - 1) * size
        
        query = select(DepositIntent)
        
        # Apply filters
        conditions = []
        if status:
            conditions.append(DepositIntent.status == status)
        if network:
            conditions.append(DepositIntent.network == network)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        # Get total count
        count_stmt = select(func.count()).select_from(query.subquery())
        count_result = await db.execute(count_stmt)
        total = count_result.scalar() or 0
        
        # Get paginated results
        query = query.order_by(DepositIntent.created_at.desc()).offset(offset).limit(size)
        result = await db.execute(query)
        deposits = result.scalars().all()
        
        return {
            "total": total,
            "page": page,
            "size": size,
            "deposits": [
                {
                    "id": deposit.id,
                    "user_id": deposit.user_id,
                    "asset": deposit.asset,
                    "network": deposit.network,
                    "address": deposit.generated_address,
                    "amount_usd": float(deposit.amount_quote_fiat),
                    "amount_crypto": float(deposit.amount_crypto) if deposit.amount_crypto else None,
                    "status": deposit.status,
                    "tx_hash": deposit.tx_hash,
                    "confirmations": deposit.confirmations,
                    "required_confirmations": deposit.required_confirmations,
                    "created_at": deposit.created_at.isoformat() if deposit.created_at else None,
                    "detected_at": deposit.detected_at.isoformat() if deposit.detected_at else None,
                    "confirmed_at": deposit.confirmed_at.isoformat() if deposit.confirmed_at else None,
                    "settled_at": deposit.settled_at.isoformat() if deposit.settled_at else None,
                    "expires_at": deposit.expires_at.isoformat() if deposit.expires_at else None
                }
                for deposit in deposits
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching deposits: {str(e)}"
        )


@router.post("/deposits/{deposit_id}/retry")
async def admin_retry_deposit(
    deposit_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retry processing a stuck deposit intent
    Admin endpoint for operational support
    """
    try:
        from app.services.deposit_settlement_service import deposit_settlement_service
        
        stmt = select(DepositIntent).where(DepositIntent.id == deposit_id)
        result = await db.execute(stmt)
        deposit_intent = result.scalar_one_or_none()
        
        if not deposit_intent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Deposit intent {deposit_id} not found"
            )
        
        # If status is confirmed, try to settle
        if deposit_intent.status == "confirmed":
            try:
                result = await deposit_settlement_service.settle_deposit_intent(
                    deposit_intent_id=deposit_id,
                    db=db
                )
                return {
                    "message": "Deposit settlement retried successfully",
                    "deposit_id": deposit_id,
                    "result": result
                }
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error retrying settlement: {str(e)}"
                )
        elif deposit_intent.status in ["pending", "detected"]:
            # For pending/detected, the worker will pick it up on next scan
            return {
                "message": f"Deposit intent {deposit_id} will be processed by worker on next scan",
                "deposit_id": deposit_id,
                "status": deposit_intent.status
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot retry deposit with status: {deposit_intent.status}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrying deposit: {str(e)}"
        )


@router.post("/deposits/{deposit_id}/mark_failed")
async def admin_mark_deposit_failed(
    deposit_id: int,
    reason: Optional[str] = Query(None, description="Reason for marking as failed"),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Manually mark a deposit intent as failed
    Admin endpoint for operational support
    """
    try:
        stmt = select(DepositIntent).where(DepositIntent.id == deposit_id)
        result = await db.execute(stmt)
        deposit_intent = result.scalar_one_or_none()
        
        if not deposit_intent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Deposit intent {deposit_id} not found"
            )
        
        # Only allow marking as failed if not already settled
        if deposit_intent.status == "settled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot mark settled deposit as failed"
            )
        
        deposit_intent.status = "failed"
        await db.commit()
        await db.refresh(deposit_intent)
        
        return {
            "message": f"Deposit intent {deposit_id} marked as failed",
            "deposit_id": deposit_id,
            "status": deposit_intent.status,
            "reason": reason
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error marking deposit as failed: {str(e)}"
        )