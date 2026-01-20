from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, date, timezone
from decimal import Decimal
import logging
import hashlib

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_superuser
from app.models.deposit import WithdrawalIntent, UserCryptoBalance
from app.models.user import User
from app.schemas.withdrawal import (
    WithdrawalIntentCreate,
    WithdrawalIntentResponse,
    WithdrawalListResponse,
    WithdrawalDetailResponse,
    WithdrawalAdminApproveRequest,
    WithdrawalAdminRejectRequest,
    WithdrawalAdminListResponse,
)
from app.services.address_validator import AddressValidator
from app.services.limits_service import limits_service
from app.services.wallet_service import wallet_service
from app.models.wallet_transaction import ReferenceType
from app.services.withdrawal_execution_service import WithdrawalExecutionService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/withdrawals", tags=["withdrawals"])

# Supported networks (Initial Implementation)
SUPPORTED_NETWORKS = {
    "TRC20": {"asset": "USDT", "network_name": "TRON", "validator_name": "TRC20"},
}

# Network fee estimates (in crypto units; placeholder for future implementation)
NETWORK_FEES = {
    "TRC20": Decimal("1.00"),
}


@router.post("/initiate", response_model=WithdrawalIntentResponse)
async def initiate_withdrawal(
    withdrawal_data: WithdrawalIntentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new withdrawal request
    
    Initial Phase: TRC20 and USDT only. No on-chain execution.
    """
    # Initial Phase: Restrict to TRC20 and USDT only
    if withdrawal_data.network != "TRC20":
        raise HTTPException(
            status_code=400,
            detail="Only TRC20 network is supported for withdrawals"
        )
    
    if withdrawal_data.asset != "USDT":
        raise HTTPException(
            status_code=400,
            detail="Only USDT is supported for withdrawals"
        )
    
    network_info = SUPPORTED_NETWORKS.get("TRC20")
    if not network_info:
        raise HTTPException(
            status_code=500,
            detail="TRC20 network configuration not found"
        )
    asset = network_info["asset"]
    
    # Idempotency check: If client_request_id provided, check if request already exists
    if withdrawal_data.client_request_id:
        existing_stmt = select(WithdrawalIntent).where(
            and_(
                WithdrawalIntent.user_id == current_user.id,
                WithdrawalIntent.client_request_id == withdrawal_data.client_request_id
            )
        )
        existing_result = await db.execute(existing_stmt)
        existing_withdrawal = existing_result.scalar_one_or_none()
        if existing_withdrawal:
            # Return existing withdrawal (idempotent)
            await db.refresh(existing_withdrawal)
            return WithdrawalIntentResponse(
                id=existing_withdrawal.id,
                asset=existing_withdrawal.asset,
                network=existing_withdrawal.network,
                amount_crypto=existing_withdrawal.amount_crypto,
                amount_usd=existing_withdrawal.amount_usd,
                to_address=existing_withdrawal.to_address,
                memo=existing_withdrawal.memo,
                status=existing_withdrawal.status,
                tx_hash=existing_withdrawal.tx_hash,
                confirmations=existing_withdrawal.confirmations or 0,
                processed_at=existing_withdrawal.processed_at,
                completed_at=existing_withdrawal.completed_at,
                failed_at=existing_withdrawal.failed_at,
                failure_reason=existing_withdrawal.failure_reason,
                network_fee=existing_withdrawal.network_fee,
                platform_fee=existing_withdrawal.platform_fee,
                created_at=existing_withdrawal.created_at,
                estimated_completion=None
            )
    
    # Validate address format
    validator_network = network_info.get("validator_name", withdrawal_data.network)
    is_valid, error_msg = AddressValidator.validate(
        withdrawal_data.to_address,
        validator_network
    )
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid address: {error_msg}"
        )
    
    # Normalize address
    normalized_address = AddressValidator.normalize_address(
        withdrawal_data.to_address,
        validator_network
    )
    
    # Initial Phase: amount is in USDT crypto units (no price-feed dependency)
    amount_crypto = withdrawal_data.amount_crypto
    amount_usd = withdrawal_data.amount_crypto  # USDT ~= 1 USD for limits accounting
    
    # Safety controls (Day 6): Check min/max withdrawal limits
    from app.core.config import settings
    if settings.TRON_WITHDRAW_MIN_AMOUNT and amount_crypto < settings.TRON_WITHDRAW_MIN_AMOUNT:
        raise HTTPException(
            status_code=400,
            detail=f"Withdrawal amount {amount_crypto} {asset} is below minimum {settings.TRON_WITHDRAW_MIN_AMOUNT} {asset}"
        )
    
    if settings.TRON_WITHDRAW_MAX_AMOUNT and amount_crypto > settings.TRON_WITHDRAW_MAX_AMOUNT:
        raise HTTPException(
            status_code=400,
            detail=f"Withdrawal amount {amount_crypto} {asset} exceeds maximum {settings.TRON_WITHDRAW_MAX_AMOUNT} {asset}"
        )
    
    # Check user balance using wallet_service
    balance_info = await wallet_service.get_balance(
        user_id=current_user.id,
        asset=asset,
        db=db
    )
    
    available_balance = balance_info["available"]
    
    if amount_crypto > available_balance:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Available: {available_balance} {asset}, Requested: {amount_crypto} {asset}"
        )
    
    # Check withdrawal limits
    limits_check = await limits_service.check_withdrawal_limits(
        user_id=current_user.id,
        amount_usd=amount_usd,
        db=db
    )
    
    if not limits_check.get("allowed"):
        raise HTTPException(
            status_code=403,
            detail=limits_check.get("reason", "Withdrawal limit exceeded")
        )
    
    # Fees (placeholder; no on-chain execution in initial phase)
    network_fee_crypto = NETWORK_FEES.get(withdrawal_data.network, Decimal("1.00"))
    platform_fee_usd = Decimal("0.00")
    
    # Create withdrawal intent in transaction
    # All operations must be atomic: intent creation + fund lock
    withdrawal_intent = WithdrawalIntent(
        user_id=current_user.id,
        asset=asset,
        network=withdrawal_data.network,
        amount_crypto=amount_crypto,
        amount_usd=amount_usd,
        to_address=normalized_address,
        memo=withdrawal_data.memo,
        client_request_id=withdrawal_data.client_request_id,  # Store for idempotency
        status="pending",
        network_fee=network_fee_crypto,
        platform_fee=platform_fee_usd,
        kyc_required=limits_check.get("kyc_required", False)
    )
    
    db.add(withdrawal_intent)
    await db.flush()  # Get ID for reference
    
    # Lock the balance using wallet_service (creates ledger entry)
    # This must succeed or we rollback the entire transaction
    try:
        await wallet_service.lock_balance(
            user_id=current_user.id,
            asset=asset,
            amount=amount_crypto,
            db=db,
            reference_type=ReferenceType.WITHDRAWAL,
            reference_id=withdrawal_intent.id,
            description=f"Withdrawal lock: {amount_crypto} {asset}"
        )
    except ValueError as e:
        # Rollback entire transaction if lock fails
        # No withdrawal intent created, no funds locked
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    # Commit transaction: both withdrawal intent and fund lock are persisted
    await db.commit()
    await db.refresh(withdrawal_intent)
    
    # Update daily limits
    await limits_service.update_withdrawal_limits(
        user_id=current_user.id,
        amount_usd=amount_usd,
        db=db
    )
    
    return WithdrawalIntentResponse(
        id=withdrawal_intent.id,
        asset=withdrawal_intent.asset,
        network=withdrawal_intent.network,
        amount_crypto=withdrawal_intent.amount_crypto,
        amount_usd=withdrawal_intent.amount_usd,
        to_address=withdrawal_intent.to_address,
        memo=withdrawal_intent.memo,
        status=withdrawal_intent.status,
        tx_hash=withdrawal_intent.tx_hash,
        confirmations=withdrawal_intent.confirmations or 0,
        processed_at=withdrawal_intent.processed_at,
        completed_at=withdrawal_intent.completed_at,
        failed_at=withdrawal_intent.failed_at,
        failure_reason=withdrawal_intent.failure_reason,
        network_fee=withdrawal_intent.network_fee,
        platform_fee=withdrawal_intent.platform_fee,
        created_at=withdrawal_intent.created_at,
        estimated_completion=None  # Can calculate based on network
    )


@router.get("/{withdrawal_id}", response_model=WithdrawalDetailResponse)
async def get_withdrawal_detail(
    withdrawal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get withdrawal detail by ID (includes admin notes + timestamps)
    """
    stmt = select(WithdrawalIntent).where(
        and_(
            WithdrawalIntent.id == withdrawal_id,
            WithdrawalIntent.user_id == current_user.id
        )
    )
    result = await db.execute(stmt)
    withdrawal = result.scalar_one_or_none()
    
    if not withdrawal:
        raise HTTPException(
            status_code=404,
            detail="Withdrawal not found"
        )

    return WithdrawalDetailResponse(
        id=withdrawal.id,
        user_id=withdrawal.user_id,
        asset=withdrawal.asset,
        network=withdrawal.network,
        amount_crypto=withdrawal.amount_crypto,
        amount_usd=withdrawal.amount_usd,
        to_address=withdrawal.to_address,
        memo=withdrawal.memo,
        status=withdrawal.status,
        tx_hash=withdrawal.tx_hash,
        confirmations=withdrawal.confirmations or 0,
        created_at=withdrawal.created_at,
        updated_at=withdrawal.updated_at,
        processed_at=withdrawal.processed_at,
        completed_at=withdrawal.completed_at,
        failed_at=withdrawal.failed_at,
        failure_reason=withdrawal.failure_reason,
        approved_by=withdrawal.approved_by,
        approved_at=withdrawal.approved_at,
        admin_notes=withdrawal.admin_notes,
        rejected_at=getattr(withdrawal, "rejected_at", None),
        rejection_reason=withdrawal.rejection_reason,
    )


@router.get("", response_model=WithdrawalListResponse)
async def list_withdrawals(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List user's withdrawal history
    """
    stmt = select(WithdrawalIntent).where(
        WithdrawalIntent.user_id == current_user.id
    )
    
    if status_filter:
        stmt = stmt.where(WithdrawalIntent.status == status_filter)
    
    stmt = stmt.order_by(WithdrawalIntent.created_at.desc())
    
    # Get total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0
    
    # Get paginated results
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    withdrawals = result.scalars().all()
    
    withdrawal_responses = [
        WithdrawalIntentResponse(
            id=w.id,
            asset=w.asset,
            network=w.network,
            amount_crypto=w.amount_crypto,
            amount_usd=w.amount_usd,
            to_address=w.to_address,
            memo=w.memo,
            status=w.status,
            tx_hash=w.tx_hash,
            confirmations=w.confirmations or 0,
            processed_at=w.processed_at,
            completed_at=w.completed_at,
            failed_at=w.failed_at,
            failure_reason=w.failure_reason,
            network_fee=w.network_fee,
            platform_fee=w.platform_fee,
            created_at=w.created_at,
            estimated_completion=w.completed_at
        )
        for w in withdrawals
    ]
    
    return WithdrawalListResponse(
        withdrawals=withdrawal_responses,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("/{withdrawal_id}/cancel")
async def cancel_withdrawal(
    withdrawal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cancel a pending withdrawal request
    """
    stmt = select(WithdrawalIntent).where(
        and_(
            WithdrawalIntent.id == withdrawal_id,
            WithdrawalIntent.user_id == current_user.id
        )
    )
    result = await db.execute(stmt)
    withdrawal = result.scalar_one_or_none()
    
    if not withdrawal:
        raise HTTPException(
            status_code=404,
            detail="Withdrawal not found"
        )
    
    # Idempotency: If already cancelled, return success without changes
    if withdrawal.status == "cancelled":
        return {"message": "Withdrawal already cancelled", "withdrawal_id": withdrawal_id, "status": "cancelled"}
    
    # Only allow cancellation if status is pending
    if withdrawal.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot cancel withdrawal with status: {withdrawal.status}. Only pending withdrawals can be cancelled."
        )
    
    # Unlock the balance using wallet_service (returns funds to available)
    try:
        await wallet_service.unlock_balance(
            user_id=current_user.id,
            asset=withdrawal.asset,
            amount=withdrawal.amount_crypto,
            db=db,
            reference_type=ReferenceType.WITHDRAWAL,
            reference_id=withdrawal.id,
            description=f"Withdrawal cancellation: {withdrawal.amount_crypto} {withdrawal.asset}"
        )
    except ValueError as e:
        # If unlock fails (e.g., already unlocked), log but continue
        logger.warning(f"Failed to unlock balance for withdrawal {withdrawal.id}: {str(e)}")
        # Check if funds were already unlocked - if so, this is idempotent and we can proceed
        # If not, this is an error condition but we'll still mark as cancelled
    
    # Update withdrawal status
    withdrawal.status = "cancelled"
    withdrawal.rejection_reason = "Cancelled by user"
    
    await db.commit()
    
    return {"message": "Withdrawal cancelled successfully", "withdrawal_id": withdrawal_id}


# Admin endpoints (request + tracking only; NO on-chain execution)
@router.get("/admin/all", response_model=WithdrawalAdminListResponse)
async def admin_list_all_withdrawals(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, description="Filter by status (pending, approved, rejected, cancelled)"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    date_from: Optional[date] = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="Filter to date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_superuser)
):
    """
    Admin: List all withdrawals with filtering
    
    Supports filtering by status, user_id, and date range
    """
    stmt = select(WithdrawalIntent)
    
    # Build filter conditions
    conditions = []
    if status_filter:
        conditions.append(WithdrawalIntent.status == status_filter)
    if user_id:
        conditions.append(WithdrawalIntent.user_id == user_id)
    if date_from:
        conditions.append(func.date(WithdrawalIntent.created_at) >= date_from)
    if date_to:
        conditions.append(func.date(WithdrawalIntent.created_at) <= date_to)
    
    if conditions:
        stmt = stmt.where(and_(*conditions))
    
    stmt = stmt.order_by(WithdrawalIntent.created_at.desc())
    
    # Get total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0
    
    # Get paginated results
    stmt = stmt.offset(skip).limit(limit)
    result = await db.execute(stmt)
    withdrawals = result.scalars().all()
    
    withdrawal_responses = withdrawals
    
    return WithdrawalAdminListResponse(
        withdrawals=withdrawal_responses,
        total=total,
        page=skip // limit + 1,
        page_size=limit
    )


@router.post("/admin/{withdrawal_id}/approve")
async def admin_approve_withdrawal(
    withdrawal_id: int,
    admin_update: WithdrawalAdminApproveRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_superuser)
):
    """
    Admin: Approve a withdrawal request
    """
    stmt = select(WithdrawalIntent).where(WithdrawalIntent.id == withdrawal_id)
    result = await db.execute(stmt)
    withdrawal = result.scalar_one_or_none()
    
    if not withdrawal:
        raise HTTPException(
            status_code=404,
            detail="Withdrawal not found"
        )
    
    # Validation: Only approve if status is pending
    # Idempotency: If already approved, return success without changes
    if withdrawal.status == "approved":
        await db.refresh(withdrawal)
        return {
            "message": "Withdrawal already approved",
            "withdrawal_id": withdrawal_id,
            "status": withdrawal.status
        }
    
    if withdrawal.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot approve withdrawal with status: {withdrawal.status}. Only pending withdrawals can be approved."
        )
    
    # Update withdrawal
    withdrawal.status = "approved"
    withdrawal.approved_by = admin_user.id
    withdrawal.approved_at = datetime.now(timezone.utc)
    if admin_update.admin_notes:
        withdrawal.admin_notes = admin_update.admin_notes
    
    await db.commit()
    await db.refresh(withdrawal)
    
    # TODO: Here you would integrate with your crypto wallet service
    # to actually send the transaction. For now, we just mark it as approved.
    # The actual transaction sending would happen in a background task or service.
    
    return {
        "message": "Withdrawal approved",
        "withdrawal_id": withdrawal_id,
        "status": withdrawal.status
    }


@router.post("/admin/{withdrawal_id}/reject")
async def admin_reject_withdrawal(
    withdrawal_id: int,
    admin_update: WithdrawalAdminRejectRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_superuser)
):
    """
    Admin: Reject a withdrawal request
    """
    stmt = select(WithdrawalIntent).where(WithdrawalIntent.id == withdrawal_id)
    result = await db.execute(stmt)
    withdrawal = result.scalar_one_or_none()
    
    if not withdrawal:
        raise HTTPException(
            status_code=404,
            detail="Withdrawal not found"
        )
    
    # Idempotency: if already rejected, return success without changes
    if withdrawal.status == "rejected":
        return {
            "message": "Withdrawal already rejected",
            "withdrawal_id": withdrawal_id,
            "status": withdrawal.status
        }

    if withdrawal.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot reject withdrawal with status: {withdrawal.status}. Only pending withdrawals can be rejected."
        )
    
    # Unlock the balance using wallet_service (returns funds to available)
    try:
        await wallet_service.unlock_balance(
            user_id=withdrawal.user_id,
            asset=withdrawal.asset,
            amount=withdrawal.amount_crypto,
            db=db,
            reference_type=ReferenceType.WITHDRAWAL,
            reference_id=withdrawal.id,
            description=f"Withdrawal rejection: {withdrawal.amount_crypto} {withdrawal.asset}"
        )
    except ValueError as e:
        logger.warning(f"Failed to unlock balance for withdrawal {withdrawal.id}: {str(e)}")
        # Continue with rejection even if unlock fails (should not happen)
    
    # Update withdrawal status
    withdrawal.status = "rejected"
    withdrawal.rejected_at = datetime.now(timezone.utc)
    withdrawal.rejection_reason = admin_update.rejection_reason or "Rejected by admin"
    if admin_update.admin_notes:
        withdrawal.admin_notes = admin_update.admin_notes
    
    await db.commit()
    
    return {
        "message": "Withdrawal rejected",
        "withdrawal_id": withdrawal_id,
        "status": withdrawal.status
    }


@router.post("/admin/{withdrawal_id}/execute")
async def admin_execute_withdrawal(
    withdrawal_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_superuser)
):
    """
    Admin: Execute an approved withdrawal (broadcast + mark processing + debit reserved).
    Idempotent: if already has tx_hash, returns existing tx_hash.
    """
    try:
        tx_hash = await WithdrawalExecutionService.execute_withdrawal(withdrawal_id=withdrawal_id, db=db)
        return {"message": "Withdrawal execution started", "withdrawal_id": withdrawal_id, "tx_hash": tx_hash}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        logger.error(f"Error executing withdrawal {withdrawal_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to execute withdrawal: {str(e)}")


@router.post("/admin/{withdrawal_id}/retry")
async def admin_retry_withdrawal(
    withdrawal_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_superuser)
):
    """
    Admin: Retry a failed withdrawal (re-lock funds if needed, then execute).
    """
    try:
        tx_hash = await WithdrawalExecutionService.retry_failed_withdrawal(withdrawal_id=withdrawal_id, db=db)
        return {"message": "Withdrawal retried", "withdrawal_id": withdrawal_id, "tx_hash": tx_hash}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except Exception as e:
        logger.error(f"Error retrying withdrawal {withdrawal_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to retry withdrawal: {str(e)}")


