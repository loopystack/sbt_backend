"""
Tests for reconciliation service
"""
import pytest
import pytest_asyncio
from decimal import Decimal
from datetime import date, datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import AsyncMock, patch

from app.services.reconciliation_service import reconciliation_service
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
async def test_reconciliation_calculates_correct_delta(test_db):
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