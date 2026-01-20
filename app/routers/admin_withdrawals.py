from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import date

from app.core.database import get_db
from app.core.deps import get_current_superuser
from app.models.user import User
from app.schemas.withdrawal import (
    WithdrawalAdminListResponse,
    WithdrawalAdminApproveRequest,
    WithdrawalAdminRejectRequest,
)

# Reuse implementations from withdrawals router to keep behavior consistent
from app.routers.withdrawals import (
    admin_list_all_withdrawals as _admin_list_all_withdrawals,
    admin_approve_withdrawal as _admin_approve_withdrawal,
    admin_reject_withdrawal as _admin_reject_withdrawal,
    admin_execute_withdrawal as _admin_execute_withdrawal,
    admin_retry_withdrawal as _admin_retry_withdrawal,
)


router = APIRouter(prefix="/api/admin/withdrawals", tags=["admin-withdrawals"])


@router.get("", response_model=WithdrawalAdminListResponse)
async def list_admin_withdrawals(
    skip: int = 0,
    limit: int = 20,
    status_filter: Optional[str] = None,
    user_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_superuser),
):
    return await _admin_list_all_withdrawals(
        skip=skip,
        limit=limit,
        status_filter=status_filter,
        user_id=user_id,
        date_from=date_from,
        date_to=date_to,
        db=db,
        admin_user=admin_user,
    )


@router.post("/{withdrawal_id}/approve")
async def approve_withdrawal(
    withdrawal_id: int,
    admin_update: WithdrawalAdminApproveRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_superuser),
):
    return await _admin_approve_withdrawal(withdrawal_id=withdrawal_id, admin_update=admin_update, db=db, admin_user=admin_user)


@router.post("/{withdrawal_id}/reject")
async def reject_withdrawal(
    withdrawal_id: int,
    admin_update: WithdrawalAdminRejectRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_superuser),
):
    return await _admin_reject_withdrawal(withdrawal_id=withdrawal_id, admin_update=admin_update, db=db, admin_user=admin_user)


@router.post("/{withdrawal_id}/execute")
async def execute_withdrawal(
    withdrawal_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_superuser),
):
    return await _admin_execute_withdrawal(withdrawal_id=withdrawal_id, db=db, admin_user=admin_user)


@router.post("/{withdrawal_id}/retry")
async def retry_withdrawal(
    withdrawal_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_superuser),
):
    return await _admin_retry_withdrawal(withdrawal_id=withdrawal_id, db=db, admin_user=admin_user)

