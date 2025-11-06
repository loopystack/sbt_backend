from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.admin_deps import get_admin_user
from app.core.deps import get_current_user
from app.models.user import User
from app.models.affiliate import Affiliate, Referral, AffiliateCommission, CommissionStatus
from app.schemas.affiliate import (
    AffiliateCreate,
    AffiliateUpdate,
    AffiliateResponse,
    ReferralResponse,
    CommissionResponse,
    AffiliateDashboard,
    ReferralStats,
    AffiliateROI
)
from app.services.affiliate_service import affiliate_service

router = APIRouter(prefix="/affiliates", tags=["Affiliates"])


@router.post("/register", response_model=AffiliateResponse, status_code=status.HTTP_201_CREATED)
async def register_affiliate(
    affiliate_data: AffiliateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Register a new affiliate account"""
    try:
        # Convert Pydantic model to dict, handling Decimal fields
        affiliate_dict = affiliate_data.model_dump(exclude_unset=True)
        
        affiliate = await affiliate_service.create_affiliate(
            user_id=current_user.id,
            db=db,
            **affiliate_dict
        )
        return affiliate
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except SQLAlchemyError as e:
        import traceback
        traceback.print_exc()
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register affiliate: {str(e)}"
        )


@router.get("/me", response_model=AffiliateResponse)
async def get_my_affiliate(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's affiliate account"""
    try:
        result = await db.execute(
            select(Affiliate).where(Affiliate.user_id == current_user.id)
        )
        affiliate = result.scalar_one_or_none()
        
        if not affiliate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Affiliate account not found. Register first."
            )
        
        return affiliate
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get affiliate account: {str(e)}"
        )


@router.get("/me/dashboard", response_model=AffiliateDashboard)
async def get_my_affiliate_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get affiliate dashboard for current user"""
    try:
        result = await db.execute(
            select(Affiliate).where(Affiliate.user_id == current_user.id)
        )
        affiliate = result.scalar_one_or_none()
        
        if not affiliate:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Affiliate account not found"
            )
        
        try:
            dashboard_data = await affiliate_service.get_affiliate_dashboard(affiliate.id, db)
        except Exception as service_err:
            import traceback
            traceback.print_exc()
            # Return a minimal dashboard if service fails
            from decimal import Decimal
            dashboard_data = {
                "total_referrals": 0,
                "active_referrals": 0,
                "converted_referrals": 0,
                "pending_commissions": Decimal("0"),
                "approved_commissions": Decimal("0"),
                "paid_commissions": affiliate.total_commission_paid or Decimal("0"),
                "total_revenue_generated": Decimal("0"),
                "conversion_rate": 0.0,
                "average_revenue_per_referral": Decimal("0"),
                "recent_referrals": [],
                "recent_commissions": []
            }
        
        # Convert affiliate to response model
        from app.schemas.affiliate import AffiliateResponse
        affiliate_response = AffiliateResponse.model_validate(affiliate)
        
        return AffiliateDashboard(
            affiliate=affiliate_response,
            **dashboard_data
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get affiliate dashboard: {str(e)}"
        )


@router.get("/me/referrals", response_model=List[ReferralResponse])
async def get_my_referrals(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get referrals for current affiliate"""
    result = await db.execute(
        select(Affiliate).where(Affiliate.user_id == current_user.id)
    )
    affiliate = result.scalar_one_or_none()
    
    if not affiliate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Affiliate account not found"
        )
    
    offset = (page - 1) * size
    referrals_query = select(Referral).where(
        Referral.affiliate_id == affiliate.id
    ).order_by(desc(Referral.created_at)).offset(offset).limit(size)
    
    referrals_result = await db.execute(referrals_query)
    referrals = referrals_result.scalars().all()
    
    return referrals


@router.get("/me/commissions", response_model=List[CommissionResponse])
async def get_my_commissions(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get commissions for current affiliate"""
    result = await db.execute(
        select(Affiliate).where(Affiliate.user_id == current_user.id)
    )
    affiliate = result.scalar_one_or_none()
    
    if not affiliate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Affiliate account not found"
        )
    
    offset = (page - 1) * size
    commissions_query = select(AffiliateCommission).where(
        AffiliateCommission.affiliate_id == affiliate.id
    )
    
    if status_filter:
        commissions_query = commissions_query.where(
            AffiliateCommission.status == status_filter
        )
    
    commissions_query = commissions_query.order_by(desc(AffiliateCommission.created_at)).offset(offset).limit(size)
    
    commissions_result = await db.execute(commissions_query)
    commissions = commissions_result.scalars().all()
    
    return commissions


# ========== ADMIN ENDPOINTS ==========

@router.get("/admin/all", response_model=List[AffiliateResponse])
async def get_all_affiliates(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all affiliates (admin only)"""
    offset = (page - 1) * size
    affiliates_query = select(Affiliate)
    
    if status_filter:
        affiliates_query = affiliates_query.where(Affiliate.status == status_filter)
    
    affiliates_query = affiliates_query.order_by(desc(Affiliate.created_at)).offset(offset).limit(size)
    
    affiliates_result = await db.execute(affiliates_query)
    affiliates = affiliates_result.scalars().all()
    
    return affiliates


@router.get("/admin/{affiliate_id}", response_model=AffiliateResponse)
async def get_affiliate(
    affiliate_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get affiliate by ID (admin only)"""
    affiliate = await db.get(Affiliate, affiliate_id)
    if not affiliate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Affiliate not found"
        )
    return affiliate


@router.put("/admin/{affiliate_id}", response_model=AffiliateResponse)
async def update_affiliate(
    affiliate_id: int,
    affiliate_data: AffiliateUpdate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Update affiliate (admin only)"""
    affiliate = await db.get(Affiliate, affiliate_id)
    if not affiliate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Affiliate not found"
        )
    
    for field, value in affiliate_data.model_dump(exclude_unset=True).items():
        setattr(affiliate, field, value)
    
    affiliate.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(affiliate)
    
    return affiliate


@router.get("/admin/{affiliate_id}/referrals", response_model=List[ReferralResponse])
async def get_affiliate_referrals(
    affiliate_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get referrals for an affiliate (admin only)"""
    affiliate = await db.get(Affiliate, affiliate_id)
    if not affiliate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Affiliate not found"
        )
    
    offset = (page - 1) * size
    referrals_query = select(Referral).where(
        Referral.affiliate_id == affiliate_id
    ).order_by(desc(Referral.created_at)).offset(offset).limit(size)
    
    referrals_result = await db.execute(referrals_query)
    referrals = referrals_result.scalars().all()
    
    return referrals


@router.get("/admin/{affiliate_id}/commissions", response_model=List[CommissionResponse])
async def get_affiliate_commissions(
    affiliate_id: int,
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get commissions for an affiliate (admin only)"""
    affiliate = await db.get(Affiliate, affiliate_id)
    if not affiliate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Affiliate not found"
        )
    
    offset = (page - 1) * size
    commissions_query = select(AffiliateCommission).where(
        AffiliateCommission.affiliate_id == affiliate_id
    )
    
    if status_filter:
        commissions_query = commissions_query.where(
            AffiliateCommission.status == status_filter
        )
    
    commissions_query = commissions_query.order_by(desc(AffiliateCommission.created_at)).offset(offset).limit(size)
    
    commissions_result = await db.execute(commissions_query)
    commissions = commissions_result.scalars().all()
    
    return commissions


@router.post("/admin/commissions/{commission_id}/approve", response_model=CommissionResponse)
async def approve_commission(
    commission_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Approve a commission (admin only)"""
    commission = await db.get(AffiliateCommission, commission_id)
    if not commission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Commission not found"
        )
    
    commission.status = CommissionStatus.APPROVED.value
    commission.approved_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(commission)
    
    return commission


@router.post("/admin/commissions/{commission_id}/pay", response_model=CommissionResponse)
async def pay_commission(
    commission_id: int,
    payment_reference: Optional[str] = None,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark commission as paid (admin only)"""
    commission = await db.get(AffiliateCommission, commission_id)
    if not commission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Commission not found"
        )
    
    if commission.status != CommissionStatus.APPROVED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Commission must be approved before payment"
        )
    
    commission.status = CommissionStatus.PAID.value
    commission.paid_at = datetime.utcnow()
    commission.payment_reference = payment_reference
    
    # Update affiliate paid total
    commission.affiliate.total_commission_paid += commission.commission_amount
    
    await db.commit()
    await db.refresh(commission)
    
    return commission

