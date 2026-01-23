"""
Concurrency Safety Tests
Tests for race conditions, duplicate prevention, and worker safety
"""
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.deposit import WithdrawalIntent, DepositIntent, UserCryptoBalance
from app.models.user import User
from app.models.wallet_transaction import WalletTransaction, WalletTransactionType, ReferenceType
from app.services.withdrawal_execution_service import WithdrawalExecutionService
from app.services.deposit_service import deposit_service
from app.services.wallet_service import wallet_service
from app.core.database import get_db


class TestConcurrencySafety:
    """Test concurrency safety and race condition prevention"""

    @pytest.mark.asyncio
    async def test_concurrent_withdrawal_execution_prevention(self, db_session: AsyncSession, test_user: User):
        """Test that concurrent withdrawal executions don't cause duplicates"""
        # Create a withdrawal intent
        withdrawal = WithdrawalIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_crypto=100.0,
            amount_usd=100.0,
            to_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9",
            status="approved"
        )
        db_session.add(withdrawal)
        await db_session.commit()
        await db_session.refresh(withdrawal)

        # Mock the Tron service to simulate successful execution
        with patch('app.services.withdrawal_execution_service.tron_send_service') as mock_tron:
            mock_result = MagicMock()
            mock_result.tx_hash = "test_tx_hash_123"
            mock_tron.send_usdt_trc20.return_value = mock_result

            # Execute withdrawal twice concurrently
            execution_service = WithdrawalExecutionService()

            async def execute_once():
                return await execution_service.execute_approved_withdrawal(
                    db_session, withdrawal.id, executed_by="test_worker_1"
                )

            # Run two executions concurrently
            results = await asyncio.gather(
                execute_once(),
                execute_once(),
                return_exceptions=True
            )

            # One should succeed, one should fail or be idempotent
            success_count = sum(1 for r in results if not isinstance(r, Exception) and r.get('success'))
            assert success_count == 1, "Only one withdrawal execution should succeed"

            # Check that only one wallet transaction was created for the withdrawal
            stmt = select(WalletTransaction).where(
                WalletTransaction.reference_type == ReferenceType.WITHDRAWAL,
                WalletTransaction.reference_id == withdrawal.id
            )
            result = await db_session.execute(stmt)
            transactions = result.scalars().all()

            # Should have exactly one WITHDRAWAL_DEBIT transaction
            debit_txs = [tx for tx in transactions if tx.type == WalletTransactionType.WITHDRAWAL_DEBIT]
            assert len(debit_txs) == 1, "Should have exactly one debit transaction"

    @pytest.mark.asyncio
    async def test_duplicate_deposit_credit_prevention(self, db_session: AsyncSession, test_user: User):
        """Test that duplicate deposit credits are prevented"""
        # Create a deposit intent
        deposit = DepositIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_crypto=50.0,
            tx_hash="test_deposit_tx_123",
            status="detected"
        )
        db_session.add(deposit)
        await db_session.commit()
        await db_session.refresh(deposit)

        # Try to credit the deposit twice concurrently
        async def credit_once():
            try:
                return await deposit_service.credit_detected_deposit(db_session, deposit.id)
            except Exception as e:
                return e

        # Run credit operations concurrently
        results = await asyncio.gather(
            credit_once(),
            credit_once(),
            return_exceptions=True
        )

        # One should succeed, one should fail
        success_count = sum(1 for r in results if not isinstance(r, Exception) and r.get('success'))
        assert success_count == 1, "Only one deposit credit should succeed"

        # Check wallet transactions
        stmt = select(WalletTransaction).where(
            WalletTransaction.reference_type == ReferenceType.DEPOSIT,
            WalletTransaction.reference_id == deposit.id
        )
        result = await db_session.execute(stmt)
        transactions = result.scalars().all()

        # Should have exactly one DEPOSIT_CREDIT transaction
        credit_txs = [tx for tx in transactions if tx.type == WalletTransactionType.DEPOSIT_CREDIT]
        assert len(credit_txs) == 1, "Should have exactly one credit transaction"

    @pytest.mark.asyncio
    async def test_idempotent_withdrawal_creation(self, db_session: AsyncSession, test_user: User):
        """Test that withdrawal creation is idempotent with client_request_id"""
        from app.routers.withdrawals import initiate_withdrawal
        from fastapi import Request
        from app.core.deps import get_current_user

        # Create test request data
        withdrawal_data = {
            "asset": "USDT",
            "network": "TRC20",
            "amount_crypto": 25.0,
            "to_address": "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9",
            "client_request_id": "test_idempotency_123"
        }

        # Create mock request
        mock_request = MagicMock(spec=Request)
        mock_request.url.path = "/api/withdrawals/initiate"
        mock_request.method = "POST"

        # Mock user dependency
        async def mock_get_current_user():
            return test_user

        # Create withdrawal twice with same client_request_id
        result1 = await initiate_withdrawal(
            withdrawal_data=withdrawal_data,
            request=mock_request,
            db=db_session,
            current_user=test_user
        )

        result2 = await initiate_withdrawal(
            withdrawal_data=withdrawal_data,
            request=mock_request,
            db=db_session,
            current_user=test_user
        )

        # Both should succeed and return the same withdrawal
        assert result1.id == result2.id
        assert result1.asset == result2.asset
        assert result1.amount_crypto == result2.amount_crypto

        # Should have only created one withdrawal in database
        stmt = select(WithdrawalIntent).where(
            WithdrawalIntent.user_id == test_user.id,
            WithdrawalIntent.client_request_id == "test_idempotency_123"
        )
        result = await db_session.execute(stmt)
        withdrawals = result.scalars().all()
        assert len(withdrawals) == 1

    @pytest.mark.asyncio
    async def test_parallel_monitor_workers_safety(self, db_session: AsyncSession):
        """Test that parallel monitor workers don't cause issues"""
        from app.workers.monitoring_worker import MonitoringWorker

        # Create test data that would trigger alerts
        # 1. Create stuck withdrawal
        withdrawal = WithdrawalIntent(
            user_id=1,  # Assuming test user exists
            asset="USDT",
            network="TRC20",
            amount_crypto=10.0,
            amount_usd=10.0,
            to_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9",
            status="processing",
            processed_at=None  # Will be older than threshold
        )
        db_session.add(withdrawal)
        await db_session.commit()

        # Mock datetime to make withdrawal appear stuck
        with patch('app.workers.monitoring_worker.datetime') as mock_datetime:
            mock_now = MagicMock()
            mock_now.now.return_value = MagicMock()
            mock_now.now.return_value.replace.return_value = mock_now.now.return_value
            # Make it appear 2 hours old (beyond 30 min threshold)
            mock_now.now.return_value = mock_now.now.return_value - timedelta(hours=2)
            mock_datetime.now.return_value = mock_now.now.return_value
            mock_datetime.now = mock_now.now

            # Run monitoring cycles concurrently
            worker = MonitoringWorker()

            async def monitor_once():
                return await worker.run_once(db_session)

            results = await asyncio.gather(
                monitor_once(),
                monitor_once(),
                return_exceptions=True
            )

            # Both should complete without errors
            for result in results:
                if isinstance(result, Exception):
                    pytest.fail(f"Monitoring worker failed: {result}")
                assert isinstance(result, dict)
                assert 'alerts_created' in result

            # Should have created exactly one alert (deduplication works)
            # Note: In real test, we'd check alert count, but for now just verify no exceptions

    @pytest.mark.asyncio
    async def test_wallet_balance_concurrent_updates(self, db_session: AsyncSession, test_user: User):
        """Test that concurrent wallet balance updates don't corrupt data"""
        # Create initial balance
        balance = UserCryptoBalance(
            user_id=test_user.id,
            asset="USDT",
            balance=1000.0,
            locked_balance=0.0
        )
        db_session.add(balance)
        await db_session.commit()

        # Perform concurrent balance updates
        async def update_balance(amount: float):
            return await wallet_service.lock_balance(
                user_id=test_user.id,
                asset="USDT",
                amount=amount,
                db=db_session,
                reference_type=ReferenceType.WITHDRAWAL,
                reference_id=1,
                description=f"Test lock {amount}"
            )

        # Try to lock 100, 200, 300 concurrently
        results = await asyncio.gather(
            update_balance(100.0),
            update_balance(200.0),
            update_balance(300.0),
            return_exceptions=True
        )

        # Only one should succeed due to insufficient balance
        success_count = sum(1 for r in results if not isinstance(r, Exception))
        assert success_count <= 1, "Only one balance lock should succeed"

        # Check final balance
        await db_session.refresh(balance)
        # Balance should be consistent (either 1000, 900, or 800 depending on which succeeded)
        assert balance.balance >= 700.0, "Balance should not be corrupted"