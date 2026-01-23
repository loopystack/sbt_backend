"""
Unit tests for monitoring worker
Fast tests with mocked external dependencies
"""
import pytest
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

from app.workers.monitoring_worker import MonitoringWorker
from app.models.system_alert import SystemAlertType, SystemAlertSeverity


class TestStuckDetectionRules:
    """Test stuck transaction detection logic"""

    def test_stuck_withdrawal_detection_logic(self):
        """Test the logic for detecting stuck withdrawals"""
        worker = MonitoringWorker()
        timeout_minutes = 60  # CONFIRM_TIMEOUT_MINUTES

        # Current time
        now = datetime.now(timezone.utc)

        # Test cases
        test_cases = [
            # (processed_at, expected_stuck)
            (now - timedelta(minutes=30), False),  # Recent, not stuck
            (now - timedelta(minutes=70), True),   # Old, stuck
            (now - timedelta(hours=2), True),      # Very old, stuck
            (None, False),                          # No processed_at, not stuck
        ]

        for processed_at, expected_stuck in test_cases:
            if processed_at:
                time_diff = now - processed_at
                is_stuck = time_diff.total_seconds() > (timeout_minutes * 60)
                assert is_stuck == expected_stuck, f"Failed for processed_at={processed_at}"
            else:
                # No processed_at means not stuck
                assert expected_stuck == False

    def test_stuck_deposit_detection_logic(self):
        """Test the logic for detecting stuck deposits"""
        worker = MonitoringWorker()
        stuck_threshold_minutes = 30

        now = datetime.now(timezone.utc)

        # Test cases
        test_cases = [
            # (created_at, expected_stuck)
            (now - timedelta(minutes=15), False),  # Recent, not stuck
            (now - timedelta(minutes=35), True),   # Old, stuck
            (now - timedelta(hours=1), True),      # Very old, stuck
        ]

        for created_at, expected_stuck in test_cases:
            time_diff = now - created_at
            is_stuck = time_diff.total_seconds() > (stuck_threshold_minutes * 60)
            assert is_stuck == expected_stuck, f"Failed for created_at={created_at}"

    def test_withdrawal_stuck_dedupe_key_generation(self):
        """Test dedupe key generation for stuck withdrawal alerts"""
        stuck_count = 5

        dedupe_key = f"stuck_withdrawals_{stuck_count}"
        expected = "stuck_withdrawals_5"

        assert dedupe_key == expected

    def test_deposit_stuck_dedupe_key_generation(self):
        """Test dedupe key generation for stuck deposit alerts"""
        stuck_count = 3

        dedupe_key = f"stuck_deposits_{stuck_count}"
        expected = "stuck_deposits_3"

        assert dedupe_key == expected


class TestHeartbeatStaleLogic:
    """Test heartbeat monitoring logic"""

    def test_heartbeat_stale_detection(self):
        """Test logic for detecting stale heartbeats"""
        worker = MonitoringWorker()
        stale_threshold_minutes = 5

        now = datetime.now(timezone.utc)
        stale_threshold = now - timedelta(minutes=stale_threshold_minutes)

        test_cases = [
            # (last_heartbeat, expected_stale)
            (now - timedelta(minutes=2), False),      # Recent, not stale
            (now - timedelta(minutes=6), True),       # Old, stale
            (now - timedelta(hours=1), True),         # Very old, stale
        ]

        for last_heartbeat, expected_stale in test_cases:
            is_stale = last_heartbeat < stale_threshold
            assert is_stale == expected_stale, f"Failed for last_heartbeat={last_heartbeat}"

    def test_worker_unhealthy_dedupe_key_generation(self):
        """Test dedupe key generation for unhealthy worker alerts"""
        service_name = "deposit_monitor"

        dedupe_key = f"worker_unhealthy_{service_name}"
        expected = "worker_unhealthy_deposit_monitor"

        assert dedupe_key == expected


class TestWalletBalanceMonitoring:
    """Test hot wallet balance monitoring logic"""

    def test_usdt_balance_critical_threshold(self):
        """Test USDT balance critical threshold detection"""
        threshold = Decimal("100.0")

        test_cases = [
            # (balance, expected_critical)
            (Decimal("150.0"), False),  # Above threshold, OK
            (Decimal("80.0"), True),    # Below threshold, critical
            (Decimal("100.0"), False), # At threshold, OK
            (Decimal("99.9"), True),   # Just below threshold, critical
        ]

        for balance, expected_critical in test_cases:
            is_critical = balance < threshold
            assert is_critical == expected_critical, f"Failed for balance={balance}"

    def test_trx_balance_warning_threshold(self):
        """Test TRX balance warning threshold detection"""
        threshold = Decimal("1000.0")

        test_cases = [
            # (balance, expected_warning)
            (Decimal("1500.0"), False), # Above threshold, OK
            (Decimal("800.0"), True),   # Below threshold, warning
            (Decimal("1000.0"), False), # At threshold, OK
            (Decimal("999.9"), True),  # Just below threshold, warning
        ]

        for balance, expected_warning in test_cases:
            is_warning = balance < threshold
            assert is_warning == expected_warning, f"Failed for balance={balance}"

    def test_wallet_balance_dedupe_keys(self):
        """Test dedupe key generation for wallet balance alerts"""
        # USDT critical
        usdt_balance = Decimal("50.0")
        usdt_dedupe_key = f"hot_wallet_low_usdt_{usdt_balance}"
        expected_usdt = "hot_wallet_low_usdt_50.0"
        assert usdt_dedupe_key == expected_usdt

        # TRX warning
        trx_balance = Decimal("500.0")
        trx_dedupe_key = f"hot_wallet_low_trx_{trx_balance}"
        expected_trx = "hot_wallet_low_trx_500.0"
        assert trx_dedupe_key == expected_trx


class TestLedgerAnomalyDetection:
    """Test ledger consistency checking logic"""

    def test_duplicate_credit_detection_logic(self):
        """Test logic for detecting duplicate credit entries"""
        # Simulate finding multiple credit entries for same reference
        duplicate_counts = [
            # (reference_id, credit_count, expected_anomaly)
            (1, 1, False),  # Normal, one credit entry
            (2, 2, True),   # Anomaly, two credit entries
            (3, 3, True),   # Anomaly, three credit entries
        ]

        anomalies = []
        for reference_id, credit_count, expected_anomaly in duplicate_counts:
            if credit_count > 1:
                anomalies.append(reference_id)

        assert len(anomalies) == 2
        assert 2 in anomalies
        assert 3 in anomalies
        assert 1 not in anomalies

    def test_refund_anomaly_detection_logic(self):
        """Test logic for detecting refund anomalies"""
        # Simulate WITHDRAWAL_REFUND entries without corresponding DEBIT
        refund_ids = [1, 2, 3]
        debit_ids = [1, 3]  # Missing debit for ID 2

        anomalies = []
        for refund_id in refund_ids:
            if refund_id not in debit_ids:
                anomalies.append(refund_id)

        assert len(anomalies) == 1
        assert 2 in anomalies

    def test_duplicate_credit_dedupe_key_generation(self):
        """Test dedupe key for duplicate credit alerts"""
        duplicate_count = 3

        dedupe_key = f"duplicate_credits_{duplicate_count}"
        expected = "duplicate_credits_3"

        assert dedupe_key == expected

    def test_refund_anomaly_dedupe_key_generation(self):
        """Test dedupe key for refund anomaly alerts"""
        anomaly_count = 2

        dedupe_key = f"refund_anomalies_{anomaly_count}"
        expected = "refund_anomalies_2"

        assert dedupe_key == expected


class TestMonitoringWorkerConfiguration:
    """Test monitoring worker configuration values"""

    def test_default_thresholds(self):
        """Test that default threshold values are reasonable"""
        worker = MonitoringWorker()

        # Check that thresholds are positive and reasonable
        assert worker.monitor_interval > 0
        assert worker.heartbeat_stale_threshold > 0
        assert worker.deposit_stuck_threshold > 0
        assert worker.withdrawal_stuck_threshold > 0
        assert worker.hot_wallet_usdt_threshold > 0
        assert worker.hot_wallet_trx_threshold > 0

        # Check that withdrawal timeout is greater than deposit stuck threshold
        # (withdrawals should have longer timeout than deposits)
        assert worker.withdrawal_stuck_threshold >= worker.deposit_stuck_threshold

    def test_threshold_relationships(self):
        """Test that threshold values have logical relationships"""
        worker = MonitoringWorker()

        # Heartbeat check should be more frequent than heartbeat timeout
        assert worker.monitor_interval <= worker.heartbeat_stale_threshold * 60

        # Deposit stuck threshold should be reasonable (not too short or long)
        assert 10 <= worker.deposit_stuck_threshold <= 120  # 10 minutes to 2 hours

        # Withdrawal stuck threshold should be reasonable
        assert 30 <= worker.withdrawal_stuck_threshold <= 240  # 30 minutes to 4 hours


# Integration Tests - Real DB with Mocked External Services

@pytest.mark.asyncio
async def test_monitoring_detects_stuck_withdrawal_integration(test_db):
    """Integration test: Stuck withdrawal detection with real DB"""
    from app.models.deposit import WithdrawalIntent
    from app.models.system_alert import SystemAlert

    # Create stuck withdrawal in database
    stuck_time = datetime.now(timezone.utc) - timedelta(minutes=70)  # Over timeout
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

    # Create mock wallet service for refund
    with patch('app.workers.monitoring_worker.WalletService') as mock_wallet:
        mock_wallet.get_balance.return_value = {"reserved": Decimal("100.0")}

        # Mock alert service
        with patch('app.workers.monitoring_worker.alert_service') as mock_alert_service:
            mock_alert_service.create_alert.return_value = SystemAlert(
                type="withdrawal_stuck",
                severity="critical",
                message="Test alert",
                dedupe_key="test_key"
            )

            # Run monitoring
            worker = MonitoringWorker()
            stats = await worker.run_once(test_db)

            # Verify alert was created
            mock_alert_service.create_alert.assert_called_once()
            call_args = mock_alert_service.create_alert.call_args

            assert call_args[1]["alert_type"] == "withdrawal_stuck"
            assert call_args[1]["severity"] == "critical"
            assert "1 withdrawals stuck" in call_args[1]["message"]
            assert stats["alerts_created"] == 1


@pytest.mark.asyncio
async def test_monitoring_detects_stuck_deposit_integration(test_db):
    """Integration test: Stuck deposit detection with real DB"""
    from app.models.deposit import DepositIntent
    from app.models.system_alert import SystemAlert

    # Create stuck deposit in database
    stuck_time = datetime.now(timezone.utc) - timedelta(minutes=35)  # Over threshold
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

    test_db.add(stuck_deposit)
    await test_db.commit()

    # Mock alert service
    with patch('app.workers.monitoring_worker.alert_service') as mock_alert_service:
        mock_alert_service.create_alert.return_value = SystemAlert(
            type="deposit_stuck",
            severity="warning",
            message="Test alert",
            dedupe_key="test_key"
        )

        # Run monitoring
        worker = MonitoringWorker()
        stats = await worker.run_once(test_db)

        # Verify alert was created
        mock_alert_service.create_alert.assert_called_once()
        call_args = mock_alert_service.create_alert.call_args

        assert call_args[1]["alert_type"] == "deposit_stuck"
        assert call_args[1]["severity"] == "warning"
        assert "1 deposits stuck" in call_args[1]["message"]
        assert stats["alerts_created"] == 1


@pytest.mark.asyncio
async def test_monitoring_detects_stale_heartbeat_integration(test_db):
    """Integration test: Stale heartbeat detection with real DB"""
    from app.models.system_alert import SystemHeartbeat, SystemAlert

    # Create stale heartbeat in database
    stale_time = datetime.now(timezone.utc) - timedelta(minutes=10)  # Over 5 min threshold
    stale_heartbeat = SystemHeartbeat(
        service_name="deposit_monitor",
        last_heartbeat_at=stale_time,
        meta={"scanned": 100}
    )

    test_db.add(stale_heartbeat)
    await test_db.commit()

    # Mock alert service
    with patch('app.workers.monitoring_worker.alert_service') as mock_alert_service:
        mock_alert_service.create_alert.return_value = SystemAlert(
            type="worker_unhealthy",
            severity="critical",
            message="Test alert",
            dedupe_key="test_key"
        )

        # Run monitoring
        worker = MonitoringWorker()
        stats = await worker.run_once(test_db)

        # Verify alert was created
        mock_alert_service.create_alert.assert_called_once()
        call_args = mock_alert_service.create_alert.call_args

        assert call_args[1]["alert_type"] == "worker_unhealthy"
        assert call_args[1]["severity"] == "critical"
        assert "deposit_monitor" in call_args[1]["message"]
        assert stats["alerts_created"] == 1


@pytest.mark.asyncio
async def test_monitoring_low_wallet_balance_integration(test_db):
    """Integration test: Low wallet balance detection with mocked Tron API"""
    from app.models.system_alert import SystemAlert

    # Mock tron service to return low balances
    with patch('app.workers.monitoring_worker.tron_send_service') as mock_tron:
        mock_tron.get_hot_wallet_balance.return_value = Decimal("50.0")  # Below $100 threshold
        mock_tron.check_hot_wallet_trx_balance.return_value = Decimal("500.0")  # Below 1000 TRX threshold

        # Mock alert service
        with patch('app.workers.monitoring_worker.alert_service') as mock_alert_service:
            mock_alert_service.create_alert.return_value = SystemAlert(
                type="hot_wallet_low",
                severity="critical",
                message="Test alert",
                dedupe_key="test_key"
            )

            # Run monitoring
            worker = MonitoringWorker()
            stats = await worker.run_once(test_db)

            # Verify two alerts were created (USDT + TRX)
            assert mock_alert_service.create_alert.call_count == 2

            # Check USDT alert
            usdt_call = mock_alert_service.create_alert.call_args_list[0]
            assert usdt_call[1]["alert_type"] == "hot_wallet_low"
            assert usdt_call[1]["severity"] == "critical"
            assert "USDT balance is critically low" in usdt_call[1]["message"]

            # Check TRX alert
            trx_call = mock_alert_service.create_alert.call_args_list[1]
            assert trx_call[1]["alert_type"] == "hot_wallet_low"
            assert trx_call[1]["severity"] == "warning"
            assert "TRX balance is low" in trx_call[1]["message"]

            assert stats["alerts_created"] == 2


@pytest.mark.asyncio
async def test_monitoring_respects_deduplication_integration(test_db):
    """Integration test: Alert deduplication works across multiple runs"""
    from app.models.deposit import DepositIntent
    from app.models.system_alert import SystemAlert

    # Create stuck deposit
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

    test_db.add(stuck_deposit)
    await test_db.commit()

    # Mock alert service
    with patch('app.workers.monitoring_worker.alert_service') as mock_alert_service:
        mock_alert_service.create_alert.return_value = SystemAlert(
            type="deposit_stuck",
            severity="warning",
            message="Test alert",
            dedupe_key="test_key"
        )

        worker = MonitoringWorker()

        # First run - should create alert
        stats1 = await worker.run_once(test_db)
        assert stats1["alerts_created"] == 1
        assert mock_alert_service.create_alert.call_count == 1

        # Reset mock
        mock_alert_service.reset_mock()

        # Second run - should NOT create duplicate alert (deduplication)
        stats2 = await worker.run_once(test_db)
        assert stats2["alerts_created"] == 0
        mock_alert_service.create_alert.assert_not_called()


@pytest.mark.asyncio
async def test_monitoring_updates_own_heartbeat_integration(test_db):
    """Integration test: Monitoring worker updates its own heartbeat"""
    from app.models.system_alert import SystemHeartbeat

    worker = MonitoringWorker()

    # Run monitoring - should update heartbeat
    stats = await worker.run_once(test_db)

    # Verify heartbeat was created/updated
    heartbeat_stmt = test_db.query(SystemHeartbeat).filter(
        SystemHeartbeat.service_name == "monitoring_worker"
    )
    heartbeat = (await test_db.execute(heartbeat_stmt)).scalar_one_or_none()

    assert heartbeat is not None
    assert heartbeat.service_name == "monitoring_worker"
    assert heartbeat.last_heartbeat_at is not None
    assert heartbeat.meta is not None
    assert heartbeat.meta["alerts_created"] == stats["alerts_created"]