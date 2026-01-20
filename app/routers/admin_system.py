"""
Admin System Monitoring API
Endpoints for health checks, alerts management, and reconciliation reports
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import Optional, List
from datetime import date, datetime, timezone, timedelta

from app.core.database import get_db
from app.core.deps import get_current_superuser
from app.models.user import User
from app.models.system_alert import (
    SystemAlert, SystemAlertStatus, SystemHeartbeat
)
from app.models.reconciliation_report import ReconciliationReport
from app.services.reconciliation_service import reconciliation_service
from app.services.tron_send_service import tron_send_service
from app.schemas.system import (
    SystemHealthResponse,
    SystemAlertResponse,
    SystemAlertListResponse,
    ReconciliationReportResponse,
    ReconciliationReportListResponse
)

router = APIRouter(prefix="/api/admin/system", tags=["admin-system"])


@router.get("/health", response_model=SystemHealthResponse)
async def get_system_health(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_superuser)
):
    """Get overall system health status"""
    # Get all heartbeats
    heartbeat_stmt = select(SystemHeartbeat)
    heartbeat_result = await db.execute(heartbeat_stmt)
    heartbeats = heartbeat_result.scalars().all()

    # Get open alerts count
    alerts_stmt = select(func.count(SystemAlert.id)).where(
        SystemAlert.status == SystemAlertStatus.OPEN
    )
    alerts_result = await db.execute(alerts_stmt)
    open_alerts_count = alerts_result.scalar() or 0

    # Get hot wallet balances
    hot_wallet_balances = {}
    try:
        usdt_balance = tron_send_service.get_hot_wallet_balance()
        trx_balance = tron_send_service.check_hot_wallet_trx_balance()
        hot_wallet_balances = {
            "USDT": float(usdt_balance),
            "TRX": float(trx_balance) if trx_balance else None
        }
    except Exception as e:
        hot_wallet_balances = {"error": str(e)}

    # Get latest reconciliation
    latest_recon = await reconciliation_service.get_latest_report(db)

    # Determine overall health status
    heartbeat_status = "healthy"
    stale_threshold = datetime.now(timezone.utc) - timedelta(minutes=5)

    for heartbeat in heartbeats:
        if heartbeat.last_heartbeat_at < stale_threshold:
            heartbeat_status = "warning"
            break

    if open_alerts_count > 0:
        overall_status = "critical" if open_alerts_count > 5 else "warning"
    elif heartbeat_status == "warning":
        overall_status = "warning"
    else:
        overall_status = "healthy"

    return SystemHealthResponse(
        overall_status=overall_status,
        heartbeats=[
            {
                "service_name": h.service_name,
                "last_heartbeat_at": h.last_heartbeat_at,
                "is_healthy": h.last_heartbeat_at >= stale_threshold,
                "meta": h.meta
            } for h in heartbeats
        ],
        open_alerts_count=open_alerts_count,
        hot_wallet_balances=hot_wallet_balances,
        latest_reconciliation={
            "date": latest_recon.date if latest_recon else None,
            "status": latest_recon.status if latest_recon else None,
            "delta": float(latest_recon.delta) if latest_recon else None
        } if latest_recon else None
    )


@router.get("/alerts", response_model=SystemAlertListResponse)
async def get_system_alerts(
    status_filter: Optional[str] = Query(None, description="Filter by status: open, acknowledged, resolved"),
    severity_filter: Optional[str] = Query(None, description="Filter by severity: info, warning, critical"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_superuser)
):
    """Get system alerts with filtering and pagination"""
    # Build query
    conditions = []
    if status_filter:
        conditions.append(SystemAlert.status == status_filter)
    if severity_filter:
        conditions.append(SystemAlert.severity == severity_filter)

    stmt = select(SystemAlert)
    if conditions:
        stmt = stmt.where(and_(*conditions))

    # Get total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0

    # Get paginated results
    stmt = stmt.order_by(SystemAlert.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    alerts = result.scalars().all()

    alert_responses = [
        SystemAlertResponse(
            id=alert.id,
            type=alert.type,
            severity=alert.severity,
            message=alert.message,
            context=alert.context,
            status=alert.status,
            dedupe_key=alert.dedupe_key,
            created_at=alert.created_at,
            acknowledged_at=alert.acknowledged_at,
            resolved_at=alert.resolved_at,
            acknowledged_by=alert.acknowledged_by,
            resolved_by=alert.resolved_by
        ) for alert in alerts
    ]

    return SystemAlertListResponse(
        alerts=alert_responses,
        total=total,
        offset=offset,
        limit=limit
    )


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_superuser)
):
    """Acknowledge an alert"""
    from app.services.alert_service import alert_service

    success = await alert_service.acknowledge_alert(db, alert_id, admin_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")

    return {"message": "Alert acknowledged"}


@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_superuser)
):
    """Resolve an alert"""
    from app.services.alert_service import alert_service

    success = await alert_service.resolve_alert(db, alert_id, admin_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")

    return {"message": "Alert resolved"}


@router.get("/reconciliation", response_model=ReconciliationReportListResponse)
async def get_reconciliation_reports(
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    status_filter: Optional[str] = Query(None, description="Filter by status: ok, warn, critical, error"),
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_superuser)
):
    """Get reconciliation reports with date range filtering"""
    # Default to last 30 days if no date range specified
    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()

    reports = await reconciliation_service.get_reports_in_range(db, start_date, end_date)

    # Apply status filter
    if status_filter:
        reports = [r for r in reports if r.status == status_filter]

    # Apply pagination
    total = len(reports)
    reports = reports[offset:offset + limit]

    report_responses = [
        ReconciliationReportResponse(
            id=report.id,
            date=report.date,
            asset=report.asset,
            network=report.network,
            total_user_available=report.total_user_available,
            total_user_reserved=report.total_user_reserved,
            total_user_liability=report.total_user_liability,
            platform_hot_wallet_balance=report.platform_hot_wallet_balance,
            platform_cold_wallet_balance=report.platform_cold_wallet_balance,
            platform_total_balance=report.platform_total_balance,
            delta=report.delta,
            status=report.status,
            created_at=report.created_at,
            details=report.details
        ) for report in reports
    ]

    return ReconciliationReportListResponse(
        reports=report_responses,
        total=total,
        offset=offset,
        limit=limit,
        start_date=start_date,
        end_date=end_date
    )


@router.get("/reconciliation/latest", response_model=Optional[ReconciliationReportResponse])
async def get_latest_reconciliation_report(
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_superuser)
):
    """Get the most recent reconciliation report"""
    report = await reconciliation_service.get_latest_report(db)

    if not report:
        return None

    return ReconciliationReportResponse(
        id=report.id,
        date=report.date,
        asset=report.asset,
        network=report.network,
        total_user_available=report.total_user_available,
        total_user_reserved=report.total_user_reserved,
        total_user_liability=report.total_user_liability,
        platform_hot_wallet_balance=report.platform_hot_wallet_balance,
        platform_cold_wallet_balance=report.platform_cold_wallet_balance,
        platform_total_balance=report.platform_total_balance,
        delta=report.delta,
        status=report.status,
        created_at=report.created_at,
        details=report.details
    )


@router.post("/reconciliation/run")
async def trigger_reconciliation(
    target_date: Optional[date] = Query(None, description="Date to reconcile (defaults to today)"),
    db: AsyncSession = Depends(get_db),
    admin_user: User = Depends(get_current_superuser)
):
    """Manually trigger reconciliation (admin only)"""
    report = await reconciliation_service.run_daily_reconciliation(db, target_date)

    return {
        "message": "Reconciliation completed",
        "report_id": report.id,
        "status": report.status,
        "delta": float(report.delta)
    }