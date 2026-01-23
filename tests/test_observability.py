"""
Observability Tests
Tests for logging, alerting, and monitoring
"""
import pytest
import logging
from unittest.mock import patch, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.deposit import WithdrawalIntent
from app.services.alert_service import alert_service
from app.core.log_scrubber import SensitiveDataFilter


class TestLoggingSecurity:
    """Test that logs are secure and don't expose sensitive data"""

    def test_log_scrubber_masks_private_keys(self):
        """Test that log scrubber properly masks private keys"""
        filter = SensitiveDataFilter()

        # Test private key masking
        test_message = "Private key found: 0xa1b2c3d4e5f678901234567890abcdef"
        log_record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="",
            lineno=0,
            msg=test_message,
            args=(),
            exc_info=None
        )

        # Apply filter
        result = filter.filter(log_record)

        # Should still return True (don't filter out)
        assert result is True

        # Message should be masked
        assert "***PRIVATE_KEY_MASKED***" in log_record.msg
        assert "0xa1b2c3d4e5f678901234567890abcdef" not in log_record.msg

    def test_log_scrubber_masks_wallet_addresses(self):
        """Test that wallet addresses are masked in logs"""
        filter = SensitiveDataFilter()

        test_cases = [
            "TRC20 address: T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9",
            "ETH address: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
            "BTC address: 1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
        ]

        for test_message in test_cases:
            log_record = logging.LogRecord(
                name="test",
                level=logging.INFO,
                pathname="",
                lineno=0,
                msg=test_message,
                args=(),
                exc_info=None
            )

            filter.filter(log_record)
            assert "***ADDRESS_MASKED***" in log_record.msg

    def test_log_scrubber_masks_api_keys(self):
        """Test that API keys are masked in logs"""
        filter = SensitiveDataFilter()

        test_message = "API key: test_api_key_abcd1234567890efghijklmnop"
        log_record = logging.LogRecord(
            name="test",
            level=logging.INFO,
            pathname="",
            lineno=0,
            msg=test_message,
            args=(),
            exc_info=None
        )

        filter.filter(log_record)
        assert "***API_KEY_MASKED***" in log_record.msg

    def test_log_scrubber_preserves_normal_messages(self):
        """Test that normal log messages are not affected"""
        filter = SensitiveDataFilter()

        normal_messages = [
            "User 123 logged in successfully",
            "Withdrawal initiated for amount 10.0 USDT",
            "Transaction confirmed with 5 confirmations",
            "System health check completed",
        ]

        for message in normal_messages:
            log_record = logging.LogRecord(
                name="test",
                level=logging.INFO,
                pathname="",
                lineno=0,
                msg=message,
                args=(),
                exc_info=None
            )

            original_msg = log_record.msg
            filter.filter(log_record)

            # Should be unchanged
            assert log_record.msg == original_msg


class TestAlertGeneration:
    """Test that appropriate alerts are generated for failures"""

    @pytest.mark.asyncio
    async def test_withdrawal_stuck_alert_generated(self, db_session: AsyncSession):
        """Test that stuck withdrawal alert is generated"""
        from app.workers.monitoring_worker import MonitoringWorker

        # Create stuck withdrawal
        withdrawal = WithdrawalIntent(
            user_id=1,
            asset="USDT",
            network="TRC20",
            amount_crypto=10.0,
            amount_usd=10.0,
            to_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9",
            status="processing",
            processed_at=None  # Will appear stuck
        )
        db_session.add(withdrawal)
        await db_session.commit()

        monitoring_worker = MonitoringWorker()

        # Mock time to make withdrawal appear stuck
        with patch('app.workers.monitoring_worker.datetime') as mock_datetime:
            import datetime
            old_time = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=2)
            mock_datetime.now.return_value = old_time

            stats = await monitoring_worker.run_once(db_session)

        # Should have created alerts
        assert stats['alerts_created'] >= 1

    @pytest.mark.asyncio
    async def test_hot_wallet_balance_alert(self, db_session: AsyncSession):
        """Test that low hot wallet balance creates alert"""
        from app.workers.monitoring_worker import MonitoringWorker

        monitoring_worker = MonitoringWorker()

        # Mock low balance
        with patch('app.workers.monitoring_worker.tron_send_service') as mock_tron:
            mock_tron.get_hot_wallet_balance.return_value = 50.0  # Below 100 threshold

            stats = await monitoring_worker.run_once(db_session)

        # Should have created low balance alert
        assert stats['alerts_created'] >= 1

    @pytest.mark.asyncio
    async def test_node_down_alert_on_api_failure(self, db_session: AsyncSession):
        """Test that API failures create node down alerts"""
        from app.workers.monitoring_worker import MonitoringWorker

        monitoring_worker = MonitoringWorker()

        # Mock API failure
        with patch('app.workers.monitoring_worker.tron_send_service') as mock_tron:
            mock_tron.get_hot_wallet_balance.side_effect = Exception("Node unreachable")

            stats = await monitoring_worker.run_once(db_session)

        # Should have created node down alert and recorded error
        assert stats['alerts_created'] >= 1
        assert stats['errors'] >= 1

    @pytest.mark.asyncio
    async def test_duplicate_credit_alert(self, db_session: AsyncSession):
        """Test that duplicate credit detection creates alerts"""
        from app.workers.monitoring_worker import MonitoringWorker
        from app.models.wallet_transaction import WalletTransaction, WalletTransactionType, ReferenceType

        # Create duplicate credit transactions
        for i in range(2):
            tx = WalletTransaction(
                user_id=1,
                asset="USDT",
                amount=10.0,
                type=WalletTransactionType.DEPOSIT_CREDIT,
                reference_type=ReferenceType.DEPOSIT,
                reference_id=1,
                balance_before=0.0,
                balance_after=10.0,
                reserved_before=0.0,
                reserved_after=0.0,
                description=f"Duplicate credit {i}"
            )
            db_session.add(tx)

        await db_session.commit()

        monitoring_worker = MonitoringWorker()
        stats = await monitoring_worker.run_once(db_session)

        # Should have detected duplicate and created alert
        assert stats['alerts_created'] >= 1


class TestAlertDeduplication:
    """Test that alerts are properly deduplicated"""

    @pytest.mark.asyncio
    async def test_duplicate_alerts_not_created(self, db_session: AsyncSession):
        """Test that duplicate alerts with same dedupe_key are not created"""
        # Create first alert
        alert1 = await alert_service.create_alert(
            db=db_session,
            alert_type="NODE_DOWN",
            severity="CRITICAL",
            message="Test node down alert",
            dedupe_key="test_node_down_123"
        )
        assert alert1 is not None

        # Try to create duplicate
        alert2 = await alert_service.create_alert(
            db=db_session,
            alert_type="NODE_DOWN",
            severity="CRITICAL",
            message="Test node down alert duplicate",
            dedupe_key="test_node_down_123"
        )

        # Should return None (deduplicated)
        assert alert2 is None

    @pytest.mark.asyncio
    async def test_alert_retrigger_after_resolution(self, db_session: AsyncSession):
        """Test that alerts can be retriggered after resolution"""
        # Create and resolve alert
        alert1 = await alert_service.create_alert(
            db=db_session,
            alert_type="WITHDRAWAL_STUCK",
            severity="WARNING",
            message="Test stuck withdrawal",
            dedupe_key="test_stuck_123"
        )
        assert alert1 is not None

        # Resolve it
        success = await alert_service.resolve_alert(db_session, alert1.id, 1)
        assert success

        # Should be able to create same alert again
        alert2 = await alert_service.create_alert(
            db=db_session,
            alert_type="WITHDRAWAL_STUCK",
            severity="WARNING",
            message="Test stuck withdrawal again",
            dedupe_key="test_stuck_123"
        )

        # Should succeed this time
        assert alert2 is not None
        assert alert2.id != alert1.id


class TestMonitoringCoverage:
    """Test that monitoring covers all critical systems"""

    @pytest.mark.asyncio
    async def test_all_workers_have_heartbeats(self, db_session: AsyncSession):
        """Test that all expected workers have heartbeat monitoring"""
        from app.workers.monitoring_worker import MonitoringWorker

        monitoring_worker = MonitoringWorker()
        stats = await monitoring_worker.run_once(db_session)

        # Should have checked expected number of workers
        # (deposit_monitor, withdrawal_monitor, monitoring_worker)
        assert stats['checks_performed'] >= 3

    @pytest.mark.asyncio
    async def test_balance_monitoring_works(self, db_session: AsyncSession):
        """Test that wallet balance monitoring functions"""
        from app.workers.monitoring_worker import MonitoringWorker

        monitoring_worker = MonitoringWorker()

        # Mock normal balance
        with patch('app.workers.monitoring_worker.tron_send_service') as mock_tron:
            mock_tron.get_hot_wallet_balance.return_value = 150.0  # Normal balance
            mock_tron.check_hot_wallet_trx_balance.return_value = 10000.0

            stats = await monitoring_worker.run_once(db_session)

        # Should complete without alerts
        assert stats['alerts_created'] == 0
        assert stats['errors'] == 0

    @pytest.mark.asyncio
    async def test_reconciliation_monitoring(self, db_session: AsyncSession):
        """Test that reconciliation status is monitored"""
        # This would require setting up reconciliation data
        # For now, we verify the monitoring doesn't crash
        from app.workers.monitoring_worker import MonitoringWorker

        monitoring_worker = MonitoringWorker()
        stats = await monitoring_worker.run_once(db_session)

        # Should complete successfully
        assert 'checks_performed' in stats


class TestLogContentVerification:
    """Test that logs contain appropriate information"""

    @pytest.mark.asyncio
    async def test_withdrawal_logs_contain_identifiers(self, db_session: AsyncSession, test_user, caplog):
        """Test that withdrawal operations log appropriate identifiers"""
        from app.routers.withdrawals import initiate_withdrawal
        from fastapi import Request

        # Create balance
        from app.models.deposit import UserCryptoBalance
        balance = UserCryptoBalance(
            user_id=test_user.id,
            asset="USDT",
            balance=100.0,
            locked_balance=0.0
        )
        db_session.add(balance)
        await db_session.commit()

        mock_request = MagicMock(spec=Request)
        mock_request.url.path = "/api/withdrawals/initiate"
        mock_request.method = "POST"

        with caplog.at_level(logging.INFO):
            result = await initiate_withdrawal({
                "asset": "USDT",
                "network": "TRC20",
                "amount_crypto": 10.0,
                "to_address": "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
            }, mock_request, db_session, test_user)

        # Logs should contain user ID but not sensitive data
        log_messages = [record.message for record in caplog.records]

        # Should contain user identifier
        user_found = any(str(test_user.id) in msg for msg in log_messages)
        assert user_found, "Logs should contain user identifier"

        # Should not contain private keys
        private_key_found = any("private" in msg.lower() and "key" in msg.lower() for msg in log_messages)
        assert not private_key_found, "Logs should not contain private keys"

    @pytest.mark.asyncio
    async def test_error_logs_contain_context(self, db_session: AsyncSession, caplog):
        """Test that error logs contain useful context"""
        from app.routers.withdrawals import initiate_withdrawal
        from fastapi import Request

        mock_request = MagicMock(spec=Request)
        mock_request.url.path = "/api/withdrawals/initiate"
        mock_request.method = "POST"

        # Trigger validation error
        with caplog.at_level(logging.WARNING):
            with pytest.raises(Exception):
                await initiate_withdrawal({
                    "asset": "USDT",
                    "network": "TRC20",
                    "amount_crypto": -10.0,  # Invalid amount
                    "to_address": "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
                }, mock_request, db_session, MagicMock())

        # Should have logged the validation error
        error_logged = any("validation" in msg.lower() or "error" in msg.lower()
                          for msg in [record.message for record in caplog.records])
        assert error_logged, "Validation errors should be logged"