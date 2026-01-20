"""
Tests for monitoring worker and alert system
"""
import pytest
import pytest_asyncio
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import AsyncMock, patch

from app.workers.monitoring_worker import MonitoringWorker
from app.services.alert_service import alert_service
from app.models.system_alert import SystemAlertType, SystemAlertSeverity

# Test database setup
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture
async def test_db():
    """Create test database session"""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    async with engine.begin() as conn:
        # Import all models to create tables
        from app.core.database import Base
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with async_session() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_monitoring_worker_detects_stale_heartbeats(test_db):
    """Test that monitoring worker detects stale service heartbeats"""
    from app.models.system_alert import SystemHeartbeat

    # Create a stale heartbeat (6 minutes old)
    stale_time = datetime.now(timezone.utc) - timedelta(minutes=6)
    stale_heartbeat = SystemHeartbeat(
        service_name="deposit_monitor",
        last_heartbeat_at=stale_time,
        meta={"scanned": 100}
    )

    # Create a fresh heartbeat
    fresh_heartbeat = SystemHeartbeat(
        service_name="withdrawal_monitor",
        last_heartbeat_at=datetime.now(timezone.utc),
        meta={"processed": 50}
    )

    test_db.add(stale_heartbeat)
    test_db.add(fresh_heartbeat)
    await test_db.commit()

    worker = MonitoringWorker()

    # Mock alert service to verify alerts are created
    with patch('app.workers.monitoring_worker.alert_service') as mock_alert_service:
        stats = await worker.run_once(test_db)

        # Should have detected the stale heartbeat
        mock_alert_service.create_alert.assert_called_once()
        call_args = mock_alert_service.create_alert.call_args

        assert call_args[1]["alert_type"] == SystemAlertType.WORKER_UNHEALTHY
        assert call_args[1]["severity"] == SystemAlertSeverity.CRITICAL
        assert "deposit_monitor" in call_args[1]["message"]
        assert call_args[1]["dedupe_key"] == "worker_unhealthy_deposit_monitor"


@pytest.mark.asyncio
async def test_monitoring_worker_detects_stuck_deposits(test_db):
    """Test detection of stuck deposits"""
    from app.models.deposit import DepositIntent

    # Create stuck deposit (older than threshold)
    stuck_time = datetime.now(timezone.utc) - timedelta(minutes=35)
    stuck_deposit = DepositIntent(
        user_id=1,
        asset="USDT",
        network="TRC20",
        amount_crypto=Decimal("100.0"),
        amount_usd=Decimal("100.0"),
        generated_address="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        status="pending",
        created_at=stuck_time
    )

    # Create fresh deposit
    fresh_deposit = DepositIntent(
        user_id=1,
        asset="USDT",
        network="TRC20",
        amount_crypto=Decimal("50.0"),
        amount_usd=Decimal("50.0"),
        generated_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb",
        status="pending",
        created_at=datetime.now(timezone.utc)
    )

    test_db.add(stuck_deposit)
    test_db.add(fresh_deposit)
    await test_db.commit()

    worker = MonitoringWorker()

    with patch('app.workers.monitoring_worker.alert_service') as mock_alert_service:
        stats = await worker.run_once(test_db)

        # Should have created alert for stuck deposit
        mock_alert_service.create_alert.assert_called_once()
        call_args = mock_alert_service.create_alert.call_args

        assert call_args[1]["alert_type"] == SystemAlertType.DEPOSIT_STUCK
        assert call_args[1]["severity"] == SystemAlertSeverity.WARNING
        assert "1 deposits stuck" in call_args[1]["message"]
        assert call_args[1]["context"]["stuck_count"] == 1


@pytest.mark.asyncio
async def test_monitoring_worker_detects_stuck_withdrawals(test_db):
    """Test detection of stuck withdrawals"""
    from app.models.deposit import WithdrawalIntent

    # Create stuck withdrawal (older than timeout)
    stuck_time = datetime.now(timezone.utc) - timedelta(minutes=65)
    stuck_withdrawal = WithdrawalIntent(
        user_id=1,
        asset="USDT",
        network="TRC20",
        amount_crypto=Decimal("100.0"),
        amount_usd=Decimal("100.0"),
        to_address="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        status="processing",
        tx_hash="0x1234567890abcdef",
        processed_at=stuck_time
    )

    test_db.add(stuck_withdrawal)
    await test_db.commit()

    worker = MonitoringWorker()

    with patch('app.workers.monitoring_worker.alert_service') as mock_alert_service:
        with patch('app.workers.monitoring_worker.WalletService') as mock_wallet:
            mock_wallet.get_balance.return_value = {"reserved": Decimal("100.0")}

            stats = await worker.run_once(test_db)

            # Should have created alert and attempted refund
            mock_alert_service.create_alert.assert_called_once()
            call_args = mock_alert_service.create_alert.call_args

            assert call_args[1]["alert_type"] == SystemAlertType.WITHDRAWAL_STUCK
            assert call_args[1]["severity"] == SystemAlertSeverity.CRITICAL
            assert "1 withdrawals stuck" in call_args[1]["message"]


@pytest.mark.asyncio
async def test_monitoring_worker_detects_low_wallet_balance(test_db):
    """Test detection of low hot wallet balances"""
    worker = MonitoringWorker()

    # Mock tron_send_service to return low balance
    with patch('app.workers.monitoring_worker.tron_send_service') as mock_tron:
        mock_tron.get_hot_wallet_balance.return_value = Decimal("50.0")  # Below $100 threshold
        mock_tron.check_hot_wallet_trx_balance.return_value = Decimal("500.0")  # Below 1000 TRX threshold

        with patch('app.workers.monitoring_worker.alert_service') as mock_alert_service:
            stats = await worker.run_once(test_db)

            # Should have created alerts for both low balances
            assert mock_alert_service.create_alert.call_count == 2

            # Check USDT alert
            usdt_call = mock_alert_service.create_alert.call_args_list[0]
            assert usdt_call[1]["alert_type"] == SystemAlertType.HOT_WALLET_LOW
            assert usdt_call[1]["severity"] == SystemAlertSeverity.CRITICAL
            assert "USDT balance is critically low" in usdt_call[1]["message"]

            # Check TRX alert
            trx_call = mock_alert_service.create_alert.call_args_list[1]
            assert trx_call[1]["alert_type"] == SystemAlertType.HOT_WALLET_LOW
            assert trx_call[1]["severity"] == SystemAlertSeverity.WARNING
            assert "TRX balance is low" in trx_call[1]["message"]


@pytest.mark.asyncio
async def test_alert_deduplication(test_db):
    """Test that identical alerts are deduplicated"""
    # Create first alert
    alert1 = await alert_service.create_alert(
        db=test_db,
        alert_type=SystemAlertType.DEPOSIT_STUCK,
        severity=SystemAlertSeverity.WARNING,
        message="Test alert message",
        dedupe_key="test_alert_123"
    )

    assert alert1 is not None

    # Try to create identical alert - should be deduplicated
    alert2 = await alert_service.create_alert(
        db=test_db,
        alert_type=SystemAlertType.DEPOSIT_STUCK,
        severity=SystemAlertSeverity.WARNING,
        message="Test alert message",
        dedupe_key="test_alert_123"
    )

    assert alert2 is None  # Should be deduplicated

    # Verify only one alert exists in database
    from app.models.system_alert import SystemAlert
    result = await test_db.execute(
        test_db.query(SystemAlert).filter(SystemAlert.dedupe_key == "test_alert_123")
    )
    alerts = result.scalars().all()
    assert len(alerts) == 1


@pytest.mark.asyncio
async def test_alert_acknowledgment_and_resolution(test_db):
    """Test alert acknowledgment and resolution workflow"""
    from app.models.system_alert import SystemAlert, SystemAlertStatus

    # Create an alert
    alert = SystemAlert(
        type=SystemAlertType.DEPOSIT_STUCK,
        severity=SystemAlertSeverity.WARNING,
        message="Test alert",
        dedupe_key="test_ack_123",
        status=SystemAlertStatus.OPEN
    )
    test_db.add(alert)
    await test_db.commit()
    await test_db.refresh(alert)

    # Acknowledge the alert
    success = await alert_service.acknowledge_alert(test_db, alert.id, user_id=1)
    assert success

    await test_db.refresh(alert)
    assert alert.status == SystemAlertStatus.ACKNOWLEDGED
    assert alert.acknowledged_at is not None
    assert alert.acknowledged_by == 1

    # Resolve the alert
    success = await alert_service.resolve_alert(test_db, alert.id, user_id=2)
    assert success

    await test_db.refresh(alert)
    assert alert.status == SystemAlertStatus.RESOLVED
    assert alert.resolved_at is not None
    assert alert.resolved_by == 2