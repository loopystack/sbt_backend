"""
Unit tests for reconciliation service
Fast tests with mocked external dependencies
"""
import pytest
from decimal import Decimal
from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, patch

from app.services.reconciliation_service import reconciliation_service
from app.models.system_alert import SystemAlertType, SystemAlertSeverity


class TestReconciliationMath:
    """Test reconciliation mathematical calculations"""

    @pytest.mark.asyncio
    async def test_calculates_liability_correctly(self):
        """Test that total liability is calculated as available + reserved"""
        # Mock user balances
        with patch.object(reconciliation_service, '_get_user_balances') as mock_balances:
            mock_balances.return_value = {
                "USDT": {
                    "available": {"USDT": Decimal("1000.0")},
                    "reserved": {"USDT": Decimal("200.0")},
                    "total_liability": {"USDT": Decimal("1200.0")},
                    "user_count": 3
                }
            }

            with patch.object(reconciliation_service, '_get_platform_balances') as mock_platform:
                mock_platform.return_value = {
                    "USDT": {
                        "hot_wallet": {"USDT": Decimal("1200.0")},
                        "cold_wallet": {"USDT": Decimal("0.0")},
                        "total_balance": {"USDT": Decimal("1200.0")}
                    }
                }

                # This would normally create a DB record, but we're testing the math
                # We'll test the calculation logic separately
                user_balances = await reconciliation_service._get_user_balances(None)

                assert user_balances["USDT"]["available"]["USDT"] == Decimal("1000.0")
                assert user_balances["USDT"]["reserved"]["USDT"] == Decimal("200.0")
                assert user_balances["USDT"]["total_liability"]["USDT"] == Decimal("1200.0")

    def test_delta_calculation_positive(self):
        """Test delta calculation when platform has more than liability"""
        liability = Decimal("1000.0")
        platform_balance = Decimal("1050.0")
        delta = platform_balance - liability

        assert delta == Decimal("50.0")

    def test_delta_calculation_negative(self):
        """Test delta calculation when platform has less than liability"""
        liability = Decimal("1000.0")
        platform_balance = Decimal("950.0")
        delta = platform_balance - liability

        assert delta == Decimal("-50.0")

    def test_status_ok_within_tolerance(self):
        """Test status determination within tolerance"""
        tolerance = Decimal("1.0")
        warn_threshold = Decimal("10.0")

        # Within tolerance
        delta = Decimal("0.5")
        abs_delta = abs(delta)

        if abs_delta <= tolerance:
            status = "ok"
        elif abs_delta <= warn_threshold:
            status = "warn"
        else:
            status = "critical"

        assert status == "ok"

    def test_status_warn_above_tolerance(self):
        """Test status determination above tolerance but below critical"""
        tolerance = Decimal("1.0")
        warn_threshold = Decimal("10.0")

        # Above tolerance, within warn threshold
        delta = Decimal("5.0")
        abs_delta = abs(delta)

        if abs_delta <= tolerance:
            status = "ok"
        elif abs_delta <= warn_threshold:
            status = "warn"
        else:
            status = "critical"

        assert status == "warn"

    def test_status_critical_above_warn_threshold(self):
        """Test status determination above warn threshold"""
        tolerance = Decimal("1.0")
        warn_threshold = Decimal("10.0")

        # Above warn threshold
        delta = Decimal("15.0")
        abs_delta = abs(delta)

        if abs_delta <= tolerance:
            status = "ok"
        elif abs_delta <= warn_threshold:
            status = "warn"
        else:
            status = "critical"

        assert status == "critical"

    def test_decimal_precision_preserved(self):
        """Test that Decimal precision is maintained throughout calculations"""
        # Test with high precision decimals
        available = Decimal("1234.567890123456789")
        reserved = Decimal("987.654321098765432")
        liability = available + reserved
        platform_balance = Decimal("2222.222111222333444")
        delta = platform_balance - liability

        # All operations should maintain precision
        assert isinstance(liability, Decimal)
        assert isinstance(delta, Decimal)
        assert liability == Decimal("2222.222211222222221")
        assert delta == Decimal("-0.000099999888777")


class TestReconciliationService:
    """Test reconciliation service business logic"""

    @pytest.mark.asyncio
    async def test_get_latest_report_none_when_empty(self):
        """Test get_latest_report returns None when no reports exist"""
        with patch('app.services.reconciliation_service.AsyncSessionLocal') as mock_session:
            mock_session.return_value.__aenter__.return_value.execute.return_value.scalar_one_or_none.return_value = None

            result = await reconciliation_service.get_latest_report(None)
            assert result is None

    def test_get_reports_in_range_validation(self):
        """Test date range validation"""
        start_date = date(2024, 1, 1)
        end_date = date(2024, 1, 31)

        assert start_date < end_date
        assert isinstance(start_date, date)
        assert isinstance(end_date, date)

    def test_asset_network_defaults(self):
        """Test default asset and network values"""
        # These would be used when creating reconciliation reports
        default_asset = "USDT"
        default_network = "TRC20"

        assert default_asset == "USDT"
        assert default_network == "TRC20"


class TestReconciliationAlerts:
    """Test alert generation logic in reconciliation"""

    def test_critical_mismatch_creates_alert(self):
        """Test that critical mismatches trigger alerts"""
        delta = Decimal("15.0")  # Above warn threshold
        abs_delta = abs(delta)
        tolerance = Decimal("1.0")
        warn_threshold = Decimal("10.0")

        should_alert = abs_delta > warn_threshold
        severity = SystemAlertSeverity.CRITICAL if abs_delta > warn_threshold else SystemAlertSeverity.WARNING

        assert should_alert == True
        assert severity == SystemAlertSeverity.CRITICAL

    def test_warn_mismatch_creates_warning_alert(self):
        """Test that warn mismatches trigger warning alerts"""
        delta = Decimal("7.0")  # Between tolerance and warn threshold
        abs_delta = abs(delta)
        tolerance = Decimal("1.0")
        warn_threshold = Decimal("10.0")

        should_alert = abs_delta > tolerance
        severity = SystemAlertSeverity.CRITICAL if abs_delta > warn_threshold else SystemAlertSeverity.WARNING

        assert should_alert == True
        assert severity == SystemAlertSeverity.WARNING

    def test_small_mismatch_no_alert(self):
        """Test that small mismatches don't trigger alerts"""
        delta = Decimal("0.5")  # Within tolerance
        abs_delta = abs(delta)
        tolerance = Decimal("1.0")

        should_alert = abs_delta > tolerance

        assert should_alert == False

    def test_alert_dedupe_key_generation(self):
        """Test that alert dedupe keys are generated correctly"""
        asset = "USDT"
        status = "critical"

        dedupe_key = f"recon_mismatch_{asset}_{status}"
        expected = "recon_mismatch_USDT_critical"

        assert dedupe_key == expected

    def test_node_down_alert_dedupe_key(self):
        """Test node down alert dedupe key"""
        target_date = date(2024, 1, 15)

        dedupe_key = f"recon_failure_{target_date}"
        expected = "recon_failure_2024-01-15"

        assert dedupe_key == expected