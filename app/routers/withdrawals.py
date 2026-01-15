from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal
import logging

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_superuser
from app.models.deposit import WithdrawalIntent, UserCryptoBalance
from app.models.user import User
from app.schemas.withdrawal import (
    WithdrawalIntentCreate,
    WithdrawalIntentResponse,
    WithdrawalStatusResponse,
    WithdrawalListResponse,
    WithdrawalAdminUpdate,
    WithdrawalStatus
)
from app.services.address_validator import AddressValidator
from app.services.limits_service import limits_service
from app.services.crypto_service import CryptoService
from app.services.wallet_service import wallet_service
from app.models.wallet_transaction import ReferenceType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/withdrawals", tags=["withdrawals"])

# Supported networks (matching deposits)
# Map user-friendly names to internal network names
SUPPORTED_NETWORKS = {
    "TRC20": {"asset": "USDT", "network_name": "TRON", "validator_name": "TRC20"},
    "ERC20": {"asset": "USDT", "network_name": "Ethereum", "validator_name": "ERC20"},
    "BEP20": {"asset": "USDT", "network_name": "BSC", "validator_name": "BEP20"},
    "Polygon": {"asset": "USDT", "network_name": "Polygon", "validator_name": "Polygon"},
}

# Network fee estimates (in USD)
NETWORK_FEES = {
    "TRC20": Decimal("1.00"),
    "ERC20": Decimal("5.00"),
    "BEP20": Decimal("0.50"),
    "Polygon": Decimal("0.01"),
}


@router.post("/initiate", response_model=WithdrawalIntentResponse)
async def initiate_withdrawal(
    withdrawal_data: WithdrawalIntentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new withdrawal request
    """
    # Validate network
    if withdrawal_data.network not in SUPPORTED_NETWORKS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported network: {withdrawal_data.network}"
        )
    
    network_info = SUPPORTED_NETWORKS[withdrawal_data.network]
    asset = network_info["asset"]
    
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
    
    # Get current USD price for the asset
    asset_price = Decimal(str(CryptoService.get_current_price(asset)))
    
    # Calculate crypto amount from USD
    amount_crypto = withdrawal_data.amount_usd / asset_price
    
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
        amount_usd=withdrawal_data.amount_usd,
        db=db
    )
    
    if not limits_check.get("allowed"):
        raise HTTPException(
            status_code=403,
            detail=limits_check.get("reason", "Withdrawal limit exceeded")
        )
    
    # Calculate fees
    network_fee_usd = NETWORK_FEES.get(withdrawal_data.network, Decimal("1.00"))
    platform_fee_usd = Decimal("0.00")  # No platform fee for now (user-friendly)
    
    # Check if memo is required
    memo_required = CryptoService.is_memo_required(asset, network_info["network_name"])
    if memo_required and not withdrawal_data.memo:
        raise HTTPException(
            status_code=400,
            detail=f"Memo/tag is required for {withdrawal_data.network} network"
        )
    
    # Create withdrawal intent
    withdrawal_intent = WithdrawalIntent(
        user_id=current_user.id,
        asset=asset,
        network=withdrawal_data.network,
        amount_crypto=amount_crypto,
        amount_usd=withdrawal_data.amount_usd,
        to_address=normalized_address,
        memo=withdrawal_data.memo,
        status="pending",
        network_fee=network_fee_usd / asset_price,  # Network fee in crypto
        platform_fee=platform_fee_usd,
        kyc_required=limits_check.get("kyc_required", False)
    )
    
    db.add(withdrawal_intent)
    await db.flush()
    
    # Lock the balance using wallet_service (creates ledger entry)
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
        # Convert ValueError to HTTPException for API response
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    await db.commit()
    await db.refresh(withdrawal_intent)
    
    # Update daily limits
    await limits_service.update_withdrawal_limits(
        user_id=current_user.id,
        amount_usd=withdrawal_data.amount_usd,
        db=db
    )
    
    # Auto-approve if amount is below threshold
    if limits_check.get("auto_approve", False):
        withdrawal_intent.status = "approved"
        withdrawal_intent.approved_at = datetime.utcnow()
        await db.commit()
        await db.refresh(withdrawal_intent)
    
    return WithdrawalIntentResponse(
        id=withdrawal_intent.id,
        asset=withdrawal_intent.asset,
        network=withdrawal_intent.network,
        amount_crypto=withdrawal_intent.amount_crypto,
        amount_usd=withdrawal_intent.amount_usd,
        to_address=withdrawal_intent.to_address,
        memo=withdrawal_intent.memo,
        status=withdrawal_intent.status,
        network_fee=withdrawal_intent.network_fee,
        platform_fee=withdrawal_intent.platform_fee,
        created_at=withdrawal_intent.created_at,
        estimated_completion=None  # Can calculate based on network
    )


@router.get("/{withdrawal_id}", response_model=WithdrawalStatusResponse)
async def get_withdrawal_status(
    withdrawal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get withdrawal status by ID
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
    
    # Get required confirmations
    required_confirmations = CryptoService.get_required_confirmations(
        withdrawal.asset,
        withdrawal.network
    )
    
    return WithdrawalStatusResponse(
        id=withdrawal.id,
        status=withdrawal.status,
        tx_hash=withdrawal.tx_hash,
        confirmations=withdrawal.confirmations,
        required_confirmations=required_confirmations,
        created_at=withdrawal.created_at,
        processed_at=withdrawal.processed_at,
        completed_at=withdrawal.completed_at,
        failed_at=withdrawal.failed_at,
        failure_reason=withdrawal.failure_reason,
        network_fee=withdrawal.network_fee
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
    
    if withdrawal.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel withdrawal with status: {withdrawal.status}"
        )
    
    # Unlock the balance using wallet_service
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
        logger.warning(f"Failed to unlock balance for withdrawal {withdrawal.id}: {str(e)}")
    
    # Update withdrawal status
    withdrawal.status = "cancelled"
    withdrawal.rejection_reason = "Cancelled by user"
    
    await db.commit()
    
    return {"message": "Withdrawal cancelled successfully", "withdrawal_id": withdrawal_id}


# Admin endpoints
@router.get("/admin/all", response_model=WithdrawalListResponse)
async def admin_list_all_withdrawals(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_superuser)
):
    """
    Admin: List all withdrawals
    """
    stmt = select(WithdrawalIntent)
    
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


@router.post("/admin/{withdrawal_id}/approve")
async def admin_approve_withdrawal(
    withdrawal_id: int,
    admin_update: WithdrawalAdminUpdate,
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
    
    if withdrawal.status != "pending" and withdrawal.status != "approved":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve withdrawal with status: {withdrawal.status}"
        )
    
    # Update withdrawal
    withdrawal.status = "approved"
    withdrawal.approved_by = admin_user.id
    withdrawal.approved_at = datetime.utcnow()
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
    admin_update: WithdrawalAdminUpdate,
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
    
    if withdrawal.status not in ["pending", "approved"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reject withdrawal with status: {withdrawal.status}"
        )
    
    # Unlock the balance using wallet_service
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
    
    # Update withdrawal
    withdrawal.status = "cancelled"
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
    Admin: Execute an approved withdrawal (send on-chain)
    Real on-chain sending for USDT TRC20
    """
    from app.services.withdrawal_execution_service import WithdrawalExecutionService
    
    stmt = select(WithdrawalIntent).where(WithdrawalIntent.id == withdrawal_id)
    result = await db.execute(stmt)
    withdrawal = result.scalar_one_or_none()
    
    if not withdrawal:
        raise HTTPException(
            status_code=404,
            detail="Withdrawal not found"
        )
    
    if withdrawal.status != "approved":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot execute withdrawal with status: {withdrawal.status}. Must be 'approved'"
        )
    
    if withdrawal.tx_hash:
        raise HTTPException(
            status_code=400,
            detail=f"Withdrawal already has tx_hash: {withdrawal.tx_hash}. Cannot execute twice."
        )
    
    try:
        # Execute withdrawal (idempotent)
        tx_hash = await WithdrawalExecutionService.execute_withdrawal(
            withdrawal_id=withdrawal_id,
            db=db
        )
        
        await db.refresh(withdrawal)
        
        return {
            "message": "Withdrawal executed successfully",
            "withdrawal_id": withdrawal_id,
            "tx_hash": tx_hash,
            "status": withdrawal.status
        }
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error executing withdrawal {withdrawal_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to execute withdrawal: {str(e)}"
        )


@router.get("/admin/all")
async def admin_list_withdrawals(
    status: Optional[str] = Query(None, description="Filter by status (pending, approved, processing, completed, failed, cancelled)"),
    network: Optional[str] = Query(None, description="Filter by network (TRC20, etc.)"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_superuser)
):
    """
    Admin: List all withdrawals with optional filtering
    Enhanced with tx_hash, confirmations, failure_reason
    """
    offset = (page - 1) * size
    
    query = select(WithdrawalIntent)
    
    # Apply filters
    conditions = []
    if status:
        conditions.append(WithdrawalIntent.status == status)
    if network:
        conditions.append(WithdrawalIntent.network == network)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    # Get total count
    count_stmt = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0
    
    # Get paginated results
    query = query.order_by(WithdrawalIntent.created_at.desc()).offset(offset).limit(size)
    result = await db.execute(query)
    withdrawals = result.scalars().all()
    
    return {
        "total": total,
        "page": page,
        "size": size,
        "withdrawals": [
            {
                "id": w.id,
                "user_id": w.user_id,
                "asset": w.asset,
                "network": w.network,
                "amount_crypto": float(w.amount_crypto),
                "amount_usd": float(w.amount_usd),
                "to_address": w.to_address,
                "status": w.status,
                "tx_hash": w.tx_hash,
                "confirmations": w.confirmations,
                "network_fee": float(w.network_fee) if w.network_fee else None,
                "failure_reason": w.failure_reason,
                "created_at": w.created_at.isoformat() if w.created_at else None,
                "approved_at": w.approved_at.isoformat() if w.approved_at else None,
                "processed_at": w.processed_at.isoformat() if w.processed_at else None,
                "completed_at": w.completed_at.isoformat() if w.completed_at else None,
                "failed_at": w.failed_at.isoformat() if w.failed_at else None
            }
            for w in withdrawals
        ]
    }


@router.post("/admin/{withdrawal_id}/retry")
async def admin_retry_withdrawal(
    withdrawal_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_superuser)
):
    """
    Admin: Retry a failed withdrawal
    Only allowed if status is 'failed' and funds are properly restored
    """
    from app.services.withdrawal_execution_service import WithdrawalExecutionService
    
    stmt = select(WithdrawalIntent).where(WithdrawalIntent.id == withdrawal_id)
    result = await db.execute(stmt)
    withdrawal = result.scalar_one_or_none()
    
    if not withdrawal:
        raise HTTPException(
            status_code=404,
            detail="Withdrawal not found"
        )
    
    if withdrawal.status != "failed":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot retry withdrawal with status: {withdrawal.status}. Must be 'failed'"
        )
    
    # Safety check: if tx_hash exists and transaction was actually sent (not just a failed broadcast),
    # we cannot retry with a new transaction. The old tx_hash must be marked as permanently failed.
    if withdrawal.tx_hash and withdrawal.processed_at:
        # Transaction was already broadcast. Check if it can be retried
        # In a real system, you might check the blockchain to see if tx_hash is confirmed as failed
        # For now, we allow retry but reset the tx_hash (user/admin should verify old tx is not valid)
        logger.warning(
            f"Retrying withdrawal {withdrawal_id} with existing tx_hash={withdrawal.tx_hash}. "
            f"Old transaction should be verified as failed before retry."
        )
        # Reset tx_hash to allow new transaction
        withdrawal.tx_hash = None
    
    # Check if funds were refunded (should have been done by monitor worker)
    balance_info = await wallet_service.get_balance(
        user_id=withdrawal.user_id,
        asset=withdrawal.asset,
        db=db
    )
    
    # Funds should be in available (refunded) or reserved (if never debited)
    # If using new deduct_reserved_balance approach, failed withdrawals are refunded to available
    # So we check available balance
    if balance_info["available"] < withdrawal.amount_crypto:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot retry: insufficient balance. Available: {balance_info['available']}, Required: {withdrawal.amount_crypto}. "
                   f"Funds should have been refunded by the monitor worker."
        )
    
    # Reset withdrawal to approved status
    withdrawal.status = "approved"
    # tx_hash already cleared above if it existed
    withdrawal.failed_at = None
    withdrawal.failure_reason = None
    withdrawal.processed_at = None
    withdrawal.confirmations = 0
    
    # Lock funds again
    try:
        await wallet_service.lock_balance(
            user_id=withdrawal.user_id,
            asset=withdrawal.asset,
            amount=withdrawal.amount_crypto,
            db=db,
            reference_type=ReferenceType.WITHDRAWAL,
            reference_id=withdrawal.id,
            description=f"Retry withdrawal: {withdrawal.amount_crypto} {withdrawal.asset}"
        )
    except ValueError as e:
        # Convert ValueError to HTTPException for API response
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    await db.commit()
    await db.refresh(withdrawal)
    
    return {
        "message": "Withdrawal reset to approved status. Use /execute to send on-chain.",
        "withdrawal_id": withdrawal_id,
        "status": withdrawal.status
    }

