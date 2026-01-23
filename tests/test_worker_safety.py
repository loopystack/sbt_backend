"""
Worker Restart/Crash Safety Tests
Tests for worker crash recovery and restart safety
"""
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.deposit import WithdrawalIntent, DepositIntent
from app.models.system_alert import SystemHeartbeat
from app.workers.monitoring_worker import MonitoringWorker
from app.workers.deposit_monitor import DepositMonitorWorker
from app.workers.withdrawal_monitor import WithdrawalMonitorWorker


class TestWorkerCrashRecovery:
    """Test worker crash and restart safety"""

    @pytest.mark.asyncio
    async def test_monitoring_worker_crash_recovery(self, db_session: AsyncSession):
        """Test that monitoring worker can crash and restart safely"""
        worker = MonitoringWorker()

        # Simulate worker crash mid-cycle
        # First, create some test data that should trigger alerts
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

        # Run first cycle (should detect stuck withdrawal)
        stats1 = await worker.run_once(db_session)
        assert stats1["checks_performed"] > 0

        # Simulate crash - worker doesn't update heartbeat
        # In real scenario, the process would die here

        # Simulate restart - new worker instance
        worker2 = MonitoringWorker()

        # Run second cycle (should work fine, no corruption)
        stats2 = await worker2.run_once(db_session)
        assert stats2["checks_performed"] > 0

        # Check that heartbeats are working
        heartbeat_stmt = db_session.query(SystemHeartbeat).filter(
            SystemHeartbeat.service_name == "monitoring_worker"
        )
        heartbeat = (await db_session.execute(heartbeat_stmt)).scalar_one_or_none()
        assert heartbeat is not None
        assert heartbeat.last_heartbeat_at is not None

    @pytest.mark.asyncio
    async def test_deposit_monitor_crash_recovery(self, db_session: AsyncSession):
        """Test deposit monitor crash recovery"""
        monitor = DepositMonitorWorker()

        # Create deposit that should be processed
        deposit = DepositIntent(
            user_id=1,
            asset="USDT",
            network="TRC20",
            amount_crypto=50.0,
            tx_hash="crash_test_deposit",
            status="detected"
        )
        db_session.add(deposit)
        await db_session.commit()

        # Simulate monitor crash during processing
        # In real scenario, we'd patch the processing to fail midway

        with patch.object(monitor, '_process_single_deposit', side_effect=Exception("Simulated crash")):
            # This would normally crash, but we catch it
            try:
                await monitor._process_single_deposit(deposit)
            except Exception:
                pass  # Expected crash

        # Verify deposit state is unchanged (no partial updates)
        await db_session.refresh(deposit)
        assert deposit.status == "detected"  # Should not have been modified

        # Simulate restart - monitor should be able to process again
        monitor2 = DepositMonitor()

        # This time let it succeed
        with patch('app.services.deposit_service.deposit_service.credit_detected_deposit') as mock_credit:
            mock_credit.return_value = {"success": True}
            await monitor2._process_single_deposit(deposit)

        # Should now be processed
        await db_session.refresh(deposit)
        assert deposit.status == "completed"

    @pytest.mark.asyncio
    async def test_withdrawal_monitor_crash_recovery(self, db_session: AsyncSession):
        """Test withdrawal monitor crash recovery"""
        monitor = WithdrawalMonitorWorker()

        # Create processing withdrawal
        withdrawal = WithdrawalIntent(
            user_id=1,
            asset="USDT",
            network="TRC20",
            amount_crypto=10.0,
            amount_usd=10.0,
            to_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9",
            status="processing",
            tx_hash="crash_test_withdrawal"
        )
        db_session.add(withdrawal)
        await db_session.commit()

        # Simulate monitor crash during confirmation check
        with patch('app.services.tron_send_service.TronSendService.get_transaction_info',
                  side_effect=Exception("API crash")):
            # This would crash in real scenario
            try:
                result = await monitor._check_withdrawal_confirmations(withdrawal)
                # Should handle the crash gracefully
            except Exception:
                pass  # Expected

        # Withdrawal should remain in processing state
        await db_session.refresh(withdrawal)
        assert withdrawal.status == "processing"

        # Simulate restart - monitor should continue checking
        monitor2 = WithdrawalMonitorWorker()

        # Mock successful confirmation
        with patch('app.services.tron_send_service.TronSendService.get_transaction_info') as mock_info:
            mock_info.return_value = {
                "confirmations": 10,
                "block_number": 12345,
                "status": "confirmed"
            }

            await monitor2._check_withdrawal_confirmations(withdrawal)

        # Should now be completed
        await db_session.refresh(withdrawal)
        assert withdrawal.status == "completed"

    @pytest.mark.asyncio
    async def test_heartbeat_updates_after_restart(self, db_session: AsyncSession):
        """Test that heartbeats update correctly after worker restart"""
        # Start a worker
        worker1 = MonitoringWorker()
        await worker1.run_once(db_session)

        # Check initial heartbeat
        heartbeat_stmt = db_session.query(SystemHeartbeat).filter(
            SystemHeartbeat.service_name == "monitoring_worker"
        )
        initial_heartbeat = (await db_session.execute(heartbeat_stmt)).scalar_one()
        initial_time = initial_heartbeat.last_heartbeat_at

        # Wait a bit (simulate time passing)
        await asyncio.sleep(0.01)

        # "Restart" worker (new instance)
        worker2 = MonitoringWorker()
        await worker2.run_once(db_session)

        # Check heartbeat was updated
        updated_heartbeat = (await db_session.execute(heartbeat_stmt)).scalar_one()
        updated_time = updated_heartbeat.last_heartbeat_at

        assert updated_time > initial_time

    @pytest.mark.asyncio
    async def test_no_duplicate_processing_after_restart(self, db_session: AsyncSession):
        """Test that workers don't reprocess completed items after restart"""
        # Create and complete a deposit
        deposit = DepositIntent(
            user_id=1,
            asset="USDT",
            network="TRC20",
            amount_crypto=50.0,
            tx_hash="restart_test_deposit",
            status="detected"
        )
        db_session.add(deposit)
        await db_session.commit()

        # Process it once
        monitor1 = DepositMonitorWorker()
        with patch('app.services.deposit_service.deposit_service.credit_detected_deposit') as mock_credit:
            mock_credit.return_value = {"success": True}
            await monitor1._process_single_deposit(deposit)

        await db_session.refresh(deposit)
        assert deposit.status == "completed"

        # "Restart" monitor and run again
        monitor2 = DepositMonitorWorker()

        # Should not reprocess completed deposit
        with patch('app.services.deposit_service.deposit_service.credit_detected_deposit') as mock_credit:
            await monitor2._process_single_deposit(deposit)
            # Should not have called credit again
            assert not mock_credit.called

        # Status should still be completed
        await db_session.refresh(deposit)
        assert deposit.status == "completed"

    @pytest.mark.asyncio
    async def test_worker_state_isolation(self, db_session: AsyncSession):
        """Test that worker state doesn't persist between restarts"""
        worker1 = MonitoringWorker()

        # Run with some "state"
        stats1 = await worker1.run_once(db_session)
        initial_alerts = stats1.get("alerts_created", 0)

        # "Restart" - new clean instance
        worker2 = MonitoringWorker()

        # Run again - should not have persistent state from worker1
        stats2 = await worker2.run_once(db_session)

        # Should work independently (no crashes from previous state)
        assert "checks_performed" in stats2
        assert isinstance(stats2["checks_performed"], int)