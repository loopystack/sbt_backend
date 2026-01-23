"""
Functional/API tests for admin system monitoring endpoints
Black-box API testing with TestClient
"""
import pytest
from decimal import Decimal
from datetime import datetime, timedelta, timezone, date
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system_alert import SystemAlert, SystemHeartbeat, ReconciliationReport
from app.models.deposit import UserCryptoBalance
from app.models.user import User
from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_get_system_health_success(client: AsyncClient, test_db: AsyncSession):
    """Test GET /api/admin/system/health returns correct structure"""
    # Create test admin user
    admin_user = User(
        username="admin",
        email="admin@test.com",
        hashed_password="hashed",
        is_superuser=True
    )
    test_db.add(admin_user)
    await test_db.commit()

    # Create test heartbeats
    heartbeat1 = SystemHeartbeat(
        service_name="deposit_monitor",
        last_heartbeat_at=datetime.now(timezone.utc) - timedelta(minutes=2),
        meta={"scanned": 100}
    )
    heartbeat2 = SystemHeartbeat(
        service_name="withdrawal_monitor",
        last_heartbeat_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        meta={"processed": 50}
    )

    test_db.add(heartbeat1)
    test_db.add(heartbeat2)

    # Create test alert
    alert = SystemAlert(
        type="test_alert",
        severity="warning",
        message="Test alert message",
        dedupe_key="test_dedupe",
        status="open"
    )
    test_db.add(alert)
    await test_db.commit()

    # Generate token
    token = create_access_token({"sub": str(admin_user.id)})

    # Mock tron service for wallet balances
    from unittest.mock import patch
    with patch('app.routers.admin_system.tron_send_service') as mock_tron:
        mock_tron.get_hot_wallet_balance.return_value = Decimal("1500.0")
        mock_tron.check_hot_wallet_trx_balance.return_value = Decimal("2000.0")

        # Create latest reconciliation
        recon = ReconciliationReport(
            date=datetime.now(timezone.utc),
            asset="USDT",
            network="TRC20",
            total_user_available={"USDT": Decimal("1000.0")},
            total_user_reserved={"USDT": Decimal("0.0")},
            total_user_liability={"USDT": Decimal("1000.0")},
            platform_hot_wallet_balance={"USDT": Decimal("1000.0")},
            platform_total_balance={"USDT": Decimal("1000.0")},
            delta=Decimal("0.0"),
            status="ok"
        )
        test_db.add(recon)
        await test_db.commit()

        # Make request
        response = await client.get(
            "/api/admin/system/health",
            headers={"Authorization": f"Bearer {token}"}
        )

        assert response.status_code == 200
        data = response.json()

        # Verify response structure
        assert "overall_status" in data
        assert "heartbeats" in data
        assert "open_alerts_count" in data
        assert "hot_wallet_balances" in data
        assert "latest_reconciliation" in data

        # Verify heartbeats
        assert len(data["heartbeats"]) == 2
        heartbeat_names = [h["service_name"] for h in data["heartbeats"]]
        assert "deposit_monitor" in heartbeat_names
        assert "withdrawal_monitor" in heartbeat_names

        # Verify alerts count
        assert data["open_alerts_count"] >= 1

        # Verify wallet balances
        assert "USDT" in data["hot_wallet_balances"]
        assert "TRX" in data["hot_wallet_balances"]


@pytest.mark.asyncio
async def test_get_system_alerts_with_filters(client: AsyncClient, test_db: AsyncSession):
    """Test GET /api/admin/system/alerts with various filters"""
    # Create test admin user
    admin_user = User(
        username="admin",
        email="admin@test.com",
        hashed_password="hashed",
        is_superuser=True
    )
    test_db.add(admin_user)

    # Create test alerts
    alert1 = SystemAlert(
        type="deposit_stuck",
        severity="warning",
        message="Deposit stuck",
        dedupe_key="alert1",
        status="open"
    )
    alert2 = SystemAlert(
        type="withdrawal_stuck",
        severity="critical",
        message="Withdrawal stuck",
        dedupe_key="alert2",
        status="acknowledged"
    )
    alert3 = SystemAlert(
        type="hot_wallet_low",
        severity="critical",
        message="Low wallet balance",
        dedupe_key="alert3",
        status="open"
    )

    test_db.add(alert1)
    test_db.add(alert2)
    test_db.add(alert3)
    await test_db.commit()

    token = create_access_token({"sub": str(admin_user.id)})

    # Test status filter
    response = await client.get(
        "/api/admin/system/alerts?status_filter=open",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2  # alert1 and alert3
    assert all(alert["status"] == "open" for alert in data["alerts"])

    # Test severity filter
    response = await client.get(
        "/api/admin/system/alerts?severity_filter=critical",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2  # alert2 and alert3
    assert all(alert["severity"] == "critical" for alert in data["alerts"])


@pytest.mark.asyncio
async def test_acknowledge_alert_workflow(client: AsyncClient, test_db: AsyncSession):
    """Test alert acknowledgment workflow"""
    # Create test admin user
    admin_user = User(
        username="admin",
        email="admin@test.com",
        hashed_password="hashed",
        is_superuser=True
    )
    test_db.add(admin_user)

    # Create test alert
    alert = SystemAlert(
        type="test_alert",
        severity="warning",
        message="Test alert",
        dedupe_key="ack_test",
        status="open"
    )
    test_db.add(alert)
    await test_db.commit()

    token = create_access_token({"sub": str(admin_user.id)})

    # Acknowledge alert
    response = await client.post(
        f"/api/admin/system/alerts/{alert.id}/acknowledge",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200

    # Verify alert was acknowledged
    await test_db.refresh(alert)
    assert alert.status == "acknowledged"
    assert alert.acknowledged_at is not None
    assert alert.acknowledged_by == admin_user.id


@pytest.mark.asyncio
async def test_resolve_alert_workflow(client: AsyncClient, test_db: AsyncSession):
    """Test alert resolution workflow"""
    # Create test admin user
    admin_user = User(
        username="admin",
        email="admin@test.com",
        hashed_password="hashed",
        is_superuser=True
    )
    test_db.add(admin_user)

    # Create acknowledged alert
    alert = SystemAlert(
        type="test_alert",
        severity="warning",
        message="Test alert",
        dedupe_key="resolve_test",
        status="acknowledged",
        acknowledged_at=datetime.now(timezone.utc),
        acknowledged_by=admin_user.id
    )
    test_db.add(alert)
    await test_db.commit()

    token = create_access_token({"sub": str(admin_user.id)})

    # Resolve alert
    response = await client.post(
        f"/api/admin/system/alerts/{alert.id}/resolve",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200

    # Verify alert was resolved
    await test_db.refresh(alert)
    assert alert.status == "resolved"
    assert alert.resolved_at is not None
    assert alert.resolved_by == admin_user.id


@pytest.mark.asyncio
async def test_get_reconciliation_reports_date_range(client: AsyncClient, test_db: AsyncSession):
    """Test GET /api/admin/system/reconciliation with date filtering"""
    # Create test admin user
    admin_user = User(
        username="admin",
        email="admin@test.com",
        hashed_password="hashed",
        is_superuser=True
    )
    test_db.add(admin_user)

    # Create test reconciliation reports
    report1 = ReconciliationReport(
        date=datetime(2024, 1, 15, tzinfo=timezone.utc),
        asset="USDT",
        network="TRC20",
        total_user_available={"USDT": Decimal("1000.0")},
        total_user_reserved={"USDT": Decimal("0.0")},
        total_user_liability={"USDT": Decimal("1000.0")},
        platform_hot_wallet_balance={"USDT": Decimal("1000.0")},
        platform_total_balance={"USDT": Decimal("1000.0")},
        delta=Decimal("0.0"),
        status="ok"
    )

    report2 = ReconciliationReport(
        date=datetime(2024, 1, 16, tzinfo=timezone.utc),
        asset="USDT",
        network="TRC20",
        total_user_available={"USDT": Decimal("1000.0")},
        total_user_reserved={"USDT": Decimal("0.0")},
        total_user_liability={"USDT": Decimal("1000.0")},
        platform_hot_wallet_balance={"USDT": Decimal("1010.0")},
        platform_total_balance={"USDT": Decimal("1010.0")},
        delta=Decimal("10.0"),
        status="warn"
    )

    test_db.add(report1)
    test_db.add(report2)
    await test_db.commit()

    token = create_access_token({"sub": str(admin_user.id)})

    # Query date range
    response = await client.get(
        "/api/admin/system/reconciliation?start_date=2024-01-15&end_date=2024-01-16",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 2
    assert len(data["reports"]) == 2

    # Verify order (most recent first)
    assert data["reports"][0]["date"].startswith("2024-01-16")
    assert data["reports"][1]["date"].startswith("2024-01-15")


@pytest.mark.asyncio
async def test_get_latest_reconciliation_report(client: AsyncClient, test_db: AsyncSession):
    """Test GET /api/admin/system/reconciliation/latest"""
    # Create test admin user
    admin_user = User(
        username="admin",
        email="admin@test.com",
        hashed_password="hashed",
        is_superuser=True
    )
    test_db.add(admin_user)

    # Create latest report
    latest_report = ReconciliationReport(
        date=datetime(2024, 1, 16, tzinfo=timezone.utc),
        asset="USDT",
        network="TRC20",
        total_user_available={"USDT": Decimal("1000.0")},
        total_user_reserved={"USDT": Decimal("0.0")},
        total_user_liability={"USDT": Decimal("1000.0")},
        platform_hot_wallet_balance={"USDT": Decimal("1000.0")},
        platform_total_balance={"USDT": Decimal("1000.0")},
        delta=Decimal("0.0"),
        status="ok"
    )

    test_db.add(latest_report)
    await test_db.commit()

    token = create_access_token({"sub": str(admin_user.id)})

    # Get latest report
    response = await client.get(
        "/api/admin/system/reconciliation/latest",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()

    assert data is not None
    assert data["status"] == "ok"
    assert data["delta"] == 0.0
    assert data["asset"] == "USDT"


@pytest.mark.asyncio
async def test_run_reconciliation_manually(client: AsyncClient, test_db: AsyncSession):
    """Test POST /api/admin/system/reconciliation/run manual trigger"""
    # Create test admin user
    admin_user = User(
        username="admin",
        email="admin@test.com",
        hashed_password="hashed",
        is_superuser=True
    )
    test_db.add(admin_user)

    # Create test balance
    balance = UserCryptoBalance(
        user_id=1,
        asset="USDT",
        balance=Decimal("1000.0"),
        locked_balance=Decimal("0.0")
    )
    test_db.add(balance)
    await test_db.commit()

    token = create_access_token({"sub": str(admin_user.id)})

    # Mock external services
    from unittest.mock import patch
    with patch('app.routers.admin_system.reconciliation_service') as mock_recon:
        mock_recon.run_daily_reconciliation.return_value = ReconciliationReport(
            id=1,
            date=datetime.now(timezone.utc),
            asset="USDT",
            network="TRC20",
            total_user_available={"USDT": Decimal("1000.0")},
            total_user_reserved={"USDT": Decimal("0.0")},
            total_user_liability={"USDT": Decimal("1000.0")},
            platform_hot_wallet_balance={"USDT": Decimal("1000.0")},
            platform_total_balance={"USDT": Decimal("1000.0")},
            delta=Decimal("0.0"),
            status="ok"
        )

        # Run reconciliation manually
        response = await client.post(
            "/api/admin/system/reconciliation/run",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()

        assert "message" in data
        assert "report_id" in data
        assert "status" in data
        assert "delta" in data


@pytest.mark.asyncio
async def test_non_admin_access_denied(client: AsyncClient, test_db: AsyncSession):
    """Test that non-admin users cannot access system endpoints"""
    # Create regular user (not superuser)
    regular_user = User(
        username="user",
        email="user@test.com",
        hashed_password="hashed",
        is_superuser=False
    )
    test_db.add(regular_user)
    await test_db.commit()

    token = create_access_token({"sub": str(regular_user.id)})

    # Try to access system health endpoint
    response = await client.get(
        "/api/admin/system/health",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403  # Forbidden


@pytest.mark.asyncio
async def test_invalid_alert_id_returns_404(client: AsyncClient, test_db: AsyncSession):
    """Test that invalid alert ID returns 404"""
    # Create test admin user
    admin_user = User(
        username="admin",
        email="admin@test.com",
        hashed_password="hashed",
        is_superuser=True
    )
    test_db.add(admin_user)
    await test_db.commit()

    token = create_access_token({"sub": str(admin_user.id)})

    # Try to acknowledge non-existent alert
    response = await client.post(
        "/api/admin/system/alerts/99999/acknowledge",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404