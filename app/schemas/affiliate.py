from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class AffiliateBase(BaseModel):
    company_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    website_url: Optional[str] = None
    commission_rate: Decimal = Field(default=Decimal("10.00"), ge=0, le=100)
    commission_type: str = Field(default="revenue_share")
    cpa_amount: Optional[Decimal] = None
    payment_method: Optional[str] = None
    payment_details: Optional[str] = None


class AffiliateCreate(AffiliateBase):
    pass


class AffiliateUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = None
    website_url: Optional[str] = None
    commission_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    commission_type: Optional[str] = None
    cpa_amount: Optional[Decimal] = None
    status: Optional[str] = None
    payment_method: Optional[str] = None
    payment_details: Optional[str] = None


class AffiliateResponse(AffiliateBase):
    id: int
    user_id: int
    referral_code: str
    status: str
    total_referrals: int
    total_conversions: int
    total_commission_earned: Decimal
    total_commission_paid: Decimal
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class ReferralResponse(BaseModel):
    id: int
    affiliate_id: int
    referred_user_id: int
    referral_code_used: str
    source: Optional[str]
    campaign_id: Optional[str]
    signup_date: datetime
    first_deposit_date: Optional[datetime]
    first_bet_date: Optional[datetime]
    conversion_date: Optional[datetime]
    is_converted: bool
    total_revenue_generated: Decimal
    total_deposits: Decimal
    total_bets: Decimal
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class CommissionResponse(BaseModel):
    id: int
    affiliate_id: int
    referral_id: Optional[int]
    transaction_id: Optional[int]
    transaction_type: str
    base_amount: Decimal
    commission_rate: Decimal
    commission_amount: Decimal
    status: str
    approved_at: Optional[datetime]
    paid_at: Optional[datetime]
    payment_reference: Optional[str]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class AffiliateDashboard(BaseModel):
    affiliate: AffiliateResponse
    total_referrals: int
    active_referrals: int
    converted_referrals: int
    pending_commissions: Decimal
    approved_commissions: Decimal
    paid_commissions: Decimal
    total_revenue_generated: Decimal
    conversion_rate: float
    average_revenue_per_referral: Decimal
    recent_referrals: List[ReferralResponse]
    recent_commissions: List[CommissionResponse]


class ReferralStats(BaseModel):
    total_referrals: int
    converted_referrals: int
    conversion_rate: float
    total_revenue: Decimal
    average_revenue_per_referral: Decimal
    total_commissions_earned: Decimal


class AffiliateROI(BaseModel):
    affiliate_id: int
    affiliate_code: str
    total_investment: Decimal  # Marketing costs (if tracked)
    total_revenue_generated: Decimal
    total_commissions_paid: Decimal
    net_profit: Decimal
    roi_percentage: float
    conversion_rate: float
    referrals_count: int
    period_days: int

