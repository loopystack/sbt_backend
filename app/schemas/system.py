"""
Pydantic schemas for system monitoring API
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, date
from decimal import Decimal


class SystemHeartbeatResponse(BaseModel):
    """Response schema for system heartbeat"""
    service_name: str
    last_heartbeat_at: datetime
    is_healthy: bool
    meta: Optional[Dict[str, Any]] = None


class SystemHealthResponse(BaseModel):
    """Response schema for system health check"""
    overall_status: str  # healthy, warning, critical
    heartbeats: List[SystemHeartbeatResponse]
    open_alerts_count: int
    hot_wallet_balances: Dict[str, Any]  # {asset: balance} or {error: message}
    latest_reconciliation: Optional[Dict[str, Any]] = None


class SystemAlertResponse(BaseModel):
    """Response schema for system alert"""
    id: int
    type: str
    severity: str
    message: str
    context: Optional[Dict[str, Any]] = None
    status: str
    dedupe_key: str
    created_at: datetime
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    acknowledged_by: Optional[int] = None
    resolved_by: Optional[int] = None


class SystemAlertListResponse(BaseModel):
    """Response schema for system alerts list"""
    alerts: List[SystemAlertResponse]
    total: int
    offset: int
    limit: int


class ReconciliationReportResponse(BaseModel):
    """Response schema for reconciliation report"""
    id: int
    date: datetime
    asset: str
    network: str
    total_user_available: Dict[str, Any]
    total_user_reserved: Dict[str, Any]
    total_user_liability: Dict[str, Any]
    platform_hot_wallet_balance: Dict[str, Any]
    platform_cold_wallet_balance: Optional[Dict[str, Any]] = None
    platform_total_balance: Dict[str, Any]
    delta: Decimal
    status: str  # ok, warn, critical, error
    created_at: datetime
    details: Optional[Dict[str, Any]] = None


class ReconciliationReportListResponse(BaseModel):
    """Response schema for reconciliation reports list"""
    reports: List[ReconciliationReportResponse]
    total: int
    offset: int
    limit: int
    start_date: date
    end_date: date