"""
Integration tests for reconciliation service
Uses real database with mocked external services
"""
import pytest
import pytest_asyncio
from decimal import Decimal
from datetime import date, datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import AsyncMock, patch

from app.services.reconciliation_service import reconciliation_service
from app.models.system_alert import SystemAlertType, SystemAlertSeverity, SystemAlert, ReconciliationReport
from app.models.deposit import UserCryptoBalance

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
async def test_reconciliation_report_stored_with_correct_totals(test_db):
    """Test that reconciliation correctly calculates balance differences"""
    # Mock user balances
    with patch.object(reconciliation_service, '_get_user_balances') as mock_user_balances:
        mock_user_balances.return_value = {
            "USDT": {
                "available": {"USDT": Decimal("1000.0")},
                "reserved": {"USDT": Decimal("100.0")},
                "total_liability": {"USDT": Decimal("1100.0")},
                "user_count": 5
            }
        }

        # Mock platform balances
        with patch.object(reconciliation_service, '_get_platform_balances') as mock_platform_balances:
            mock_platform_balances.return_value = {
                "USDT": {
                    "hot_wallet": {"USDT": Decimal("1200.0")},
                    "cold_wallet": {"USDT": Decimal("0.0")},
                    "total_balance": {"USDT": Decimal("1200.0")}
                }
            }

            # Run reconciliation
            report = await reconciliation_service.run_daily_reconciliation(test_db, date.today())

            # Verify calculations
            assert report.total_user_liability["USDT"] == Decimal("1100.0")
            assert report.platform_total_balance["USDT"] == Decimal("1200.0")
            assert report.delta == Decimal("100.0")  # 1200 - 1100
            assert report.status == "warn"  # Delta > $10


@pytest.mark.asyncio
async def test_reconciliation_within_tolerance_is_ok(test_db):
    """Test that small deltas are marked as OK"""
    with patch.object(reconciliation_service, '_get_user_balances') as mock_user_balances:
        mock_user_balances.return_value = {
            "USDT": {
                "available": {"USDT": Decimal("1000.0")},
                "reserved": {"USDT": Decimal("0.0")},
                "total_liability": {"USDT": Decimal("1000.0")},
                "user_count": 1
            }
        }

        with patch.object(reconciliation_service, '_get_platform_balances') as mock_platform_balances:
            mock_platform_balances.return_value = {
                "USDT": {
                    "hot_wallet": {"USDT": Decimal("1000.5")},  # Within $1 tolerance
                    "cold_wallet": {"USDT": Decimal("0.0")},
                    "total_balance": {"USDT": Decimal("1000.5")}
                }
            }

            report = await reconciliation_service.run_daily_reconciliation(test_db, date.today())

            assert report.delta == Decimal("0.5")
            assert report.status == "ok"


@pytest.mark.asyncio
async def test_reconciliation_handles_platform_error(test_db):
    """Test that reconciliation handles platform balance errors gracefully"""
    with patch.object(reconciliation_service, '_get_user_balances') as mock_user_balances:
        mock_user_balances.return_value = {
            "USDT": {
                "available": {"USDT": Decimal("1000.0")},
                "reserved": {"USDT": Decimal("0.0")},
                "total_liability": {"USDT": Decimal("1000.0")},
                "user_count": 1
            }
        }

        # Simulate platform API error
        with patch.object(reconciliation_service, '_get_platform_balances') as mock_platform_balances:
            mock_platform_balances.side_effect = Exception("TronGrid API down")

            # Should create error report and alert
            with patch('app.services.reconciliation_service.alert_service') as mock_alert_service:
                report = await reconciliation_service.run_daily_reconciliation(test_db, date.today())

                assert report.status == "error"
                assert "TronGrid API down" in report.details["error"]

                # Verify alert was created
                mock_alert_service.create_alert.assert_called_once()
                call_args = mock_alert_service.create_alert.call_args
                assert call_args[1]["alert_type"] == SystemAlertType.RECON_MISMATCH
                assert call_args[1]["severity"] == SystemAlertSeverity.CRITICAL


@pytest.mark.asyncio
async def test_get_reports_in_range(test_db):
    """Test fetching reconciliation reports within date range"""
    # Create test reports
    from app.models.reconciliation_report import ReconciliationReport

    # Create reports for different dates
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
        platform_hot_wallet_balance={"USDT": Decimal("1000.0")},
        platform_total_balance={"USDT": Decimal("1000.0")},
        delta=Decimal("0.0"),
        status="ok"
    )

    test_db.add(report1)
    test_db.add(report2)
    await test_db.commit()

    # Test date range query
    start_date = date(2024, 1, 15)
    end_date = date(2024, 1, 16)

    reports = await reconciliation_service.get_reports_in_range(test_db, start_date, end_date)

    assert len(reports) == 2
    assert reports[0].date.date() == date(2024, 1, 16)  # Most recent first
    assert reports[1].date.date() == date(2024, 1, 15)


# Integration Tests - Real DB with Mocked External Services

@pytest.mark.asyncio
async def test_reconciliation_with_real_db_balances(test_db):
    """Integration test: Create real balances in DB, mock platform API"""
    # Create test user balances in database
    balance1 = UserCryptoBalance(
        user_id=1,
        asset="USDT",
        balance=Decimal("500.0"),
        locked_balance=Decimal("50.0")
    )
    balance2 = UserCryptoBalance(
        user_id=2,
        asset="USDT",
        balance=Decimal("300.0"),
        locked_balance=Decimal("25.0")
    )

    test_db.add(balance1)
    test_db.add(balance2)
    await test_db.commit()

    # Mock platform balance (Tron API)
    with patch.object(reconciliation_service, '_get_platform_balances') as mock_platform:
        mock_platform.return_value = {
            "USDT": {
                "hot_wallet": {"USDT": Decimal("900.0")},  # 875 liability + 25 delta
                "cold_wallet": {"USDT": Decimal("0.0")},
                "total_balance": {"USDT": Decimal("900.0")}
            }
        }

        # Mock alert service to avoid external calls
        with patch('app.services.reconciliation_service.alert_service') as mock_alert_service:
            mock_alert_service.create_alert.return_value = None

            # Run reconciliation
            report = await reconciliation_service.run_daily_reconciliation(test_db, date.today())

            # Verify report was stored in real DB
            assert report.id is not None
            assert report.asset == "USDT"
            assert report.network == "TRC20"
            assert report.total_user_liability["USDT"] == Decimal("875.0")  # 800 + 75
            assert report.platform_total_balance["USDT"] == Decimal("900.0")
            assert report.delta == Decimal("25.0")  # 900 - 875
            assert report.status == "warn"  # Delta > $10
            assert report.details["user_count"] == 2


@pytest.mark.asyncio
async def test_critical_mismatch_creates_alert(test_db):
    """Integration test: Critical mismatch triggers alert"""
    # Create test balance
    balance = UserCryptoBalance(
        user_id=1,
        asset="USDT",
        balance=Decimal("1000.0"),
        locked_balance=Decimal("0.0")
    )
    test_db.add(balance)
    await test_db.commit()

    # Mock platform with large discrepancy (> $10)
    with patch.object(reconciliation_service, '_get_platform_balances') as mock_platform:
        mock_platform.return_value = {
            "USDT": {
                "hot_wallet": {"USDT": Decimal("1015.0")},  # 15 USD discrepancy
                "cold_wallet": {"USDT": Decimal("0.0")},
                "total_balance": {"USDT": Decimal("1015.0")}
            }
        }

        # Mock alert service to capture calls
        with patch('app.services.reconciliation_service.alert_service') as mock_alert_service:
            mock_alert_service.create_alert.return_value = SystemAlert(
                type=SystemAlertType.RECON_MISMATCH,
                severity=SystemAlertSeverity.CRITICAL,
                message="Test alert",
                dedupe_key="test_key"
            )

            # Run reconciliation
            report = await reconciliation_service.run_daily_reconciliation(test_db, date.today())

            # Verify alert was created
            mock_alert_service.create_alert.assert_called_once()
            call_args = mock_alert_service.create_alert.call_args

            assert call_args[1]["alert_type"] == SystemAlertType.RECON_MISMATCH
            assert call_args[1]["severity"] == SystemAlertSeverity.CRITICAL
            assert "delta = 15" in call_args[1]["message"]
            assert report.status == "critical"


@pytest.mark.asyncio
async def test_small_mismatch_no_alert(test_db):
    """Integration test: Small mismatch within tolerance doesn't create alert"""
    # Create test balance
    balance = UserCryptoBalance(
        user_id=1,
        asset="USDT",
        balance=Decimal("1000.0"),
        locked_balance=Decimal("0.0")
    )
    test_db.add(balance)
    await test_db.commit()

    # Mock platform with small discrepancy (< $1)
    with patch.object(reconciliation_service, '_get_platform_balances') as mock_platform:
        mock_platform.return_value = {
            "USDT": {
                "hot_wallet": {"USDT": Decimal("1000.5")},  # Within tolerance
                "cold_wallet": {"USDT": Decimal("0.0")},
                "total_balance": {"USDT": Decimal("1000.5")}
            }
        }

        # Mock alert service to ensure no calls
        with patch('app.services.reconciliation_service.alert_service') as mock_alert_service:
            # Run reconciliation
            report = await reconciliation_service.run_daily_reconciliation(test_db, date.today())

            # Verify no alert was created
            mock_alert_service.create_alert.assert_not_called()
            assert report.status == "ok"
            assert report.delta == Decimal("0.5")


@pytest.mark.asyncio
async def test_node_down_creates_error_report_and_alert(test_db):
    """Integration test: Platform API failure creates error report and alert"""
    # Create test balance
    balance = UserCryptoBalance(
        user_id=1,
        asset="USDT",
        balance=Decimal("1000.0"),
        locked_balance=Decimal("0.0")
    )
    test_db.add(balance)
    await test_db.commit()

    # Mock platform API failure (TronGrid down)
    with patch.object(reconciliation_service, '_get_platform_balances') as mock_platform:
        mock_platform.side_effect = Exception("TronGrid API unavailable")

        # Mock alert service to capture alert creation
        with patch('app.services.reconciliation_service.alert_service') as mock_alert_service:
            mock_alert_service.create_alert.return_value = SystemAlert(
                type=SystemAlertType.RECON_MISMATCH,
                severity=SystemAlertSeverity.CRITICAL,
                message="Test alert",
                dedupe_key="test_key"
            )

            # Run reconciliation
            report = await reconciliation_service.run_daily_reconciliation(test_db, date.today())

            # Verify error report was created
            assert report.status == "error"
            assert "TronGrid API unavailable" in report.details["error"]
            assert report.delta == Decimal("0")  # No delta on error

            # Verify alert was created for API failure
            mock_alert_service.create_alert.assert_called_once()
            call_args = mock_alert_service.create_alert.call_args

            assert call_args[1]["alert_type"] == SystemAlertType.RECON_MISMATCH
            assert "TronGrid API unavailable" in call_args[1]["message"]


@pytest.mark.asyncio
async def test_get_reports_in_range_with_real_data(test_db):
    """Integration test: Query reports within date range"""
    # Create multiple reconciliation reports
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

    # Query date range
    start_date = date(2024, 1, 15)
    end_date = date(2024, 1, 16)

    reports = await reconciliation_service.get_reports_in_range(test_db, start_date, end_date)

    assert len(reports) == 2
    assert reports[0].date.date() == date(2024, 1, 16)  # Most recent first
    assert reports[1].date.date() == date(2024, 1, 15)
    assert reports[0].status == "warn"
    assert reports[1].status == "ok"


@pytest.mark.asyncio
async def test_get_latest_report_returns_most_recent(test_db):
    """Integration test: Get latest report returns most recent"""
    # Create reports with different dates
    old_report = ReconciliationReport(
        date=datetime(2024, 1, 14, tzinfo=timezone.utc),
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

    test_db.add(old_report)
    test_db.add(latest_report)
    await test_db.commit()

    # Get latest
    result = await reconciliation_service.get_latest_report(test_db)

    assert result is not None
    assert result.date.date() == date(2024, 1, 16)
    assert result.id == latest_report.id