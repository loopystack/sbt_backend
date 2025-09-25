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
    
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update fields
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    if user_data.is_verified is not None:
        user.is_verified = user_data.is_verified
    if user_data.is_superuser is not None:
        user.is_superuser = user_data.is_superuser
    if user_data.funds_usd is not None:
        user.funds_usd = user_data.funds_usd
    
    await db.commit()
    await db.refresh(user)
    
    return {"message": "User updated successfully", "user": AdminUserResponse.model_validate(user)}

@router.get("/betting-records", response_model=List[AdminBettingRecordResponse])
async def get_all_betting_records(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    user_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
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
        
        query = query.order_by(desc(BettingRecord.created_at)).offset(offset).limit(size)
        
        result = await db.execute(query)
        records = result.scalars().all()
        
        # Convert to AdminBettingRecordResponse
        admin_records = []
        for record in records:
            admin_record = AdminBettingRecordResponse.model_validate(record)
            admin_record.user_email = None  # Will be populated separately if needed
            admin_record.user_username = None
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
        
        query = query.order_by(desc(Transaction.created_at)).offset(offset).limit(size)
        
        result = await db.execute(query)
        transactions = result.scalars().all()
        
        # Convert to AdminTransactionResponse
        admin_transactions = []
        for transaction in transactions:
            admin_transaction = AdminTransactionResponse.model_validate(transaction)
            admin_transaction.user_email = None  # Will be populated separately if needed
            admin_transaction.user_username = None
            admin_transactions.append(admin_transaction)
        
        return admin_transactions
    except Exception as e:
        print(f"Error in get_all_transactions: {e}")
        return []

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
