from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime


class ClickEventBase(BaseModel):
    element_type: str
    element_id: Optional[str] = None
    page_path: str
    meta_data: Optional[Dict[str, Any]] = None


class ClickEventCreate(ClickEventBase):
    session_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class ClickEventResponse(ClickEventBase):
    id: int
    user_id: Optional[int] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class PageViewBase(BaseModel):
    page_path: str
    page_title: Optional[str] = None
    referrer: Optional[str] = None
    duration_seconds: Optional[float] = None
    meta_data: Optional[Dict[str, Any]] = None


class PageViewCreate(PageViewBase):
    session_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class PageViewResponse(PageViewBase):
    id: int
    user_id: Optional[int] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ConversionEventBase(BaseModel):
    event_type: str
    element_id: Optional[str] = None
    page_path: Optional[str] = None
    value: Optional[float] = None
    meta_data: Optional[Dict[str, Any]] = None


class ConversionEventCreate(ConversionEventBase):
    session_id: Optional[str] = None


class ConversionEventResponse(ConversionEventBase):
    id: int
    user_id: Optional[int] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class RegionalRestrictionBase(BaseModel):
    country_code: str = Field(..., max_length=2)
    country_name: str
    is_restricted: bool = False
    restriction_type: Optional[str] = None
    restricted_features: Optional[List[str]] = None
    notes: Optional[str] = None


class RegionalRestrictionCreate(RegionalRestrictionBase):
    pass


class RegionalRestrictionUpdate(BaseModel):
    is_restricted: Optional[bool] = None
    restriction_type: Optional[str] = None
    restricted_features: Optional[List[str]] = None
    notes: Optional[str] = None


class RegionalRestrictionResponse(RegionalRestrictionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class UserComplianceBase(BaseModel):
    daily_deposit_limit: float = 1000.0
    weekly_deposit_limit: float = 5000.0
    monthly_deposit_limit: float = 20000.0
    max_session_duration_minutes: int = 240
    max_session_loss: float = 1000.0
    cooling_off_hours: int = 24
    max_bet_amount: float = 500.0
    max_daily_bet_limit: float = 2000.0


class UserComplianceUpdate(BaseModel):
    daily_deposit_limit: Optional[float] = None
    weekly_deposit_limit: Optional[float] = None
    monthly_deposit_limit: Optional[float] = None
    max_session_duration_minutes: Optional[int] = None
    max_session_loss: Optional[float] = None
    cooling_off_hours: Optional[int] = None
    max_bet_amount: Optional[float] = None
    max_daily_bet_limit: Optional[float] = None


class UserComplianceResponse(UserComplianceBase):
    id: int
    user_id: int
    is_self_excluded: bool
    self_exclusion_until: Optional[datetime] = None
    self_exclusion_reason: Optional[str] = None
    current_daily_deposits: float
    current_weekly_deposits: float
    current_monthly_deposits: float
    session_warnings_count: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ComplianceAlertBase(BaseModel):
    alert_type: str
    severity: str = "info"
    message: str
    meta_data: Optional[Dict[str, Any]] = None


class ComplianceAlertCreate(ComplianceAlertBase):
    user_id: int


class ComplianceAlertResponse(ComplianceAlertBase):
    id: int
    user_id: int
    acknowledged: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Analytics aggregation models
class CTRMetrics(BaseModel):
    """Click-Through Rate metrics"""
    element_type: str
    total_clicks: int
    total_views: int
    ctr_percentage: float
    unique_users: int
    period_days: int


class ConversionMetrics(BaseModel):
    """Conversion funnel metrics"""
    event_type: str
    total_conversions: int
    total_views: int
    conversion_rate: float
    total_value: float
    period_days: int


class RevenueMetrics(BaseModel):
    """Revenue tracking metrics"""
    total_revenue: float
    total_deposits: float
    total_withdrawals: float
    total_bet_volume: float
    platform_profit: float
    margin_percentage: float
    period_days: int
    daily_average: float


class RegionalAnalytics(BaseModel):
    """Regional analytics"""
    country_code: str
    country_name: str
    total_users: int
    total_revenue: float
    total_deposits: float
    average_deposit: float
    compliance_flags: int
    is_restricted: bool


class ComplianceDashboard(BaseModel):
    """Compliance dashboard data"""
    total_users: int
    users_with_limits: int
    active_session_timeouts: int
    cooling_off_active: int
    self_excluded_users: int
    recent_alerts: List[ComplianceAlertResponse]
    at_risk_users: int


class MatchCTR(BaseModel):
    """Match-specific CTR metrics"""
    match_name: str
    league: str
    total_clicks: int
    unique_users: int
    avg_odds: float
    top_outcome: str
    outcome_distribution: Dict[str, int]


class ROIMetrics(BaseModel):
    """ROI tracking metrics"""
    total_revenue: float
    total_cost: float
    net_profit: float
    roi_percentage: float
    period_days: int
    roi_by_source: Dict[str, float]  # ROI by traffic source
    roi_by_campaign: Dict[str, float]  # ROI by campaign
    daily_roi_trend: List[Dict[str, Any]]  # Daily ROI over time


class HeatmapData(BaseModel):
    """Heatmap coordinate data"""
    page_path: str
    coordinates: List[Dict[str, Any]]  # [{x, y, intensity, clicks, conversions}]
    element_heatmap: List[Dict[str, Any]]  # Heat data by element type
