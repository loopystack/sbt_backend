from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import desc, and_, select, func

from ..core.deps import get_db, get_current_user
from ..models.user import User
from ..models.transaction import Transaction
from ..schemas.transaction import (
    TransactionCreate, 
    TransactionResponse, 
    Transaction as TransactionSchema,
    TransactionSummary
)

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

@router.post("/", response_model=TransactionSchema)
async def create_transaction(
    transaction: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new transaction record"""
    try:
        db_transaction = Transaction(
            user_id=current_user.id,
            **transaction.model_dump()
        )
        db.add(db_transaction)
        await db.commit()
        await db.refresh(db_transaction)
        return db_transaction
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to create transaction: {str(e)}")

@router.get("/", response_model=TransactionResponse)
async def get_transactions(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Transactions per page"),
    transaction_type: Optional[str] = Query(None, description="Filter by transaction type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's transaction history with pagination"""
    try:
        # Base query
        query = select(Transaction).where(Transaction.user_id == current_user.id)
        
        # Apply filters
        if transaction_type:
            query = query.where(Transaction.transaction_type == transaction_type)
        if status:
            query = query.where(Transaction.status == status)
        
        # Get total count
        count_query = select(func.count()).select_from(Transaction).where(Transaction.user_id == current_user.id)
        if transaction_type:
            count_query = count_query.where(Transaction.transaction_type == transaction_type)
        if status:
            count_query = count_query.where(Transaction.status == status)
        
        total_result = await db.execute(count_query)
        total = total_result.scalar()
        
        # Apply pagination and ordering (newest first)
        query = query.order_by(desc(Transaction.created_at)).offset((page - 1) * per_page).limit(per_page)
        result = await db.execute(query)
        transactions = result.scalars().all()
        
        # Calculate total pages
        total_pages = (total + per_page - 1) // per_page
        
        return TransactionResponse(
            transactions=transactions,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch transactions: {str(e)}")

@router.get("/summary", response_model=TransactionSummary)
async def get_transaction_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's transaction summary statistics"""
    try:
        # Get all transactions for the user
        query = select(Transaction).where(Transaction.user_id == current_user.id)
        result = await db.execute(query)
        transactions = result.scalars().all()
        
        # Calculate summary statistics
        total_deposits = sum(t.amount for t in transactions if t.transaction_type == 'deposit' and t.status == 'completed')
        total_withdrawals = sum(abs(t.amount) for t in transactions if t.transaction_type == 'withdrawal' and t.status == 'completed')
        total_bets = sum(abs(t.amount) for t in transactions if t.transaction_type == 'bet_placed' and t.status == 'completed')
        total_winnings = sum(t.amount for t in transactions if t.transaction_type == 'bet_won' and t.status == 'completed')
        
        net_balance = total_deposits + total_winnings - total_withdrawals - total_bets
        transaction_count = len([t for t in transactions if t.status == 'completed'])
        
        return TransactionSummary(
            total_deposits=total_deposits,
            total_withdrawals=total_withdrawals,
            total_bets=total_bets,
            total_winnings=total_winnings,
            net_balance=net_balance,
            transaction_count=transaction_count
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch transaction summary: {str(e)}")

@router.get("/{transaction_id}", response_model=TransactionSchema)
async def get_transaction(
    transaction_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific transaction by ID"""
    try:
        query = select(Transaction).where(
            and_(
                Transaction.id == transaction_id,
                Transaction.user_id == current_user.id
            )
        )
        result = await db.execute(query)
        transaction = result.scalar_one_or_none()
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        return transaction
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch transaction: {str(e)}")
