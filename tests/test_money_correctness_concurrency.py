"""
Money Correctness Under Concurrency Tests
Tests for race conditions and concurrent money operations
"""
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.deposit import WithdrawalIntent, UserCryptoBalance
from app.models.user import User
from app.models.wallet_transaction import WalletTransaction, WalletTransactionType, ReferenceType
from app.services.withdrawal_execution_service import WithdrawalExecutionService
from app.services.wallet_service import wallet_service


class TestMoneyConcurrency:
    """Test money operations under concurrent access"""

    @pytest.mark.asyncio
    async def test_double_execute_concurrent(self, db_session: AsyncSession, test_user: User):
        """Test two concurrent execute requests - only one should succeed"""
        # Create approved withdrawal
        withdrawal = WithdrawalIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_crypto=10.0,
            amount_usd=10.0,
            to_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9",
            status="approved"
        )
        db_session.add(withdrawal)
        await db_session.commit()
        await db_session.refresh(withdrawal)

        # Create balance
        balance = await wallet_service.get_or_create_balance(test_user.id, "USDT", db_session)
        balance.balance = 100.0
        balance.locked_balance = 10.0  # Already locked from initiate
        await db_session.commit()

        # Mock successful execution
        mock_tron_result = MagicMock()
        mock_tron_result.tx_hash = "test_tx_123"

        execution_service = WithdrawalExecutionService()

        async def execute_once():
            try:
                with patch('app.services.withdrawal_execution_service.tron_send_service') as mock_tron:
                    mock_tron.send_usdt_trc20.return_value = mock_tron_result
                    result = await execution_service.execute_approved_withdrawal(
                        db_session, withdrawal.id, "worker1"
                    )
                    return result
            except Exception as e:
                return e

        # Execute twice concurrently
        results = await asyncio.gather(
            execute_once(),
            execute_once(),
            return_exceptions=True
        )

        # Only one should succeed
        success_count = sum(1 for r in results if isinstance(r, dict) and r.get('success'))
        assert success_count == 1, "Only one execute should succeed"

        # Check database state
        await db_session.refresh(withdrawal)
        assert withdrawal.tx_hash == "test_tx_123"
        assert withdrawal.status == "processing"  # Changed by successful execute

        # Check wallet transactions - should have exactly one DEBIT
        stmt = select(WalletTransaction).where(
            WalletTransaction.reference_type == ReferenceType.WITHDRAWAL,
            WalletTransaction.reference_id == withdrawal.id,
            WalletTransaction.type == WalletTransactionType.WITHDRAWAL_DEBIT
        )
        result = await db_session.execute(stmt)
        debits = result.scalars().all()
        assert len(debits) == 1, "Should have exactly one debit transaction"

    @pytest.mark.asyncio
    async def test_execute_during_monitor_scan(self, db_session: AsyncSession, test_user: User):
        """Test execute operation while monitor is scanning - no refund should occur"""
        # Create approved withdrawal
        withdrawal = WithdrawalIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_crypto=10.0,
            amount_usd=10.0,
            to_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9",
            status="approved"
        )
        db_session.add(withdrawal)
        await db_session.commit()
        await db_session.refresh(withdrawal)

        # Create balance with locked funds
        balance = await wallet_service.get_or_create_balance(test_user.id, "USDT", db_session)
        balance.balance = 100.0
        balance.locked_balance = 10.0
        await db_session.commit()

        # Mock successful execution
        mock_tron_result = MagicMock()
        mock_tron_result.tx_hash = "monitor_test_tx_456"

        execution_service = WithdrawalExecutionService()

        # Start execute (but don't await yet)
        async def execute_withdrawal():
            with patch('app.services.withdrawal_execution_service.tron_send_service') as mock_tron:
                mock_tron.send_usdt_trc20.return_value = mock_tron_result
                result = await execution_service.execute_approved_withdrawal(
                    db_session, withdrawal.id, "worker1"
                )
                return result

        # Simulate monitor checking withdrawal during execute
        async def monitor_check():
            # Wait a bit to ensure execute has started
            await asyncio.sleep(0.01)

            # Check if monitor would try to process this withdrawal
            # (simulating the monitor's logic)
            stmt = select(WithdrawalIntent).where(
                WithdrawalIntent.id == withdrawal.id,
                WithdrawalIntent.status == "processing"
            )
            result = await db_session.execute(stmt)
            current_withdrawal = result.scalar_one_or_none()

            if current_withdrawal:
                # Monitor would check if tx is still processing
                # Should NOT mark as failed or refund
                return "monitor_saw_processing"
            return "monitor_no_action"

        # Run both concurrently
        execute_task = asyncio.create_task(execute_withdrawal())
        monitor_task = asyncio.create_task(monitor_check())

        results = await asyncio.gather(execute_task, monitor_task, return_exceptions=True)

        # Execute should succeed
        execute_result = results[0]
        assert isinstance(execute_result, dict)
        assert execute_result['success'] is True

        # Monitor should see processing status
        monitor_result = results[1]
        assert monitor_result == "monitor_saw_processing"

        # Check final state - no refund should have occurred
        await db_session.refresh(withdrawal)
        assert withdrawal.status == "processing"
        assert withdrawal.tx_hash == "monitor_test_tx_456"

        # No refund transactions should exist
        stmt = select(WalletTransaction).where(
            WalletTransaction.reference_type == ReferenceType.WITHDRAWAL,
            WalletTransaction.reference_id == withdrawal.id,
            WalletTransaction.type == WalletTransactionType.WITHDRAWAL_REFUND
        )
        result = await db_session.execute(stmt)
        refunds = result.scalars().all()
        assert len(refunds) == 0, "No refund should occur during successful execution"

    @pytest.mark.asyncio
    async def test_retry_during_processing(self, db_session: AsyncSession, test_user: User):
        """Test retry operation while withdrawal is still processing"""
        # Create processing withdrawal
        withdrawal = WithdrawalIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_crypto=10.0,
            amount_usd=10.0,
            to_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9",
            status="processing",
            tx_hash="existing_tx_789"
        )
        db_session.add(withdrawal)
        await db_session.commit()
        await db_session.refresh(withdrawal)

        execution_service = WithdrawalExecutionService()

        # Try to retry while still processing
        retry_result = await execution_service.retry_failed_withdrawal(
            db_session, withdrawal.id, "worker1"
        )

        # Should be blocked
        assert retry_result['success'] is False
        assert "cannot retry" in retry_result.get('error', '').lower()

        # Status should remain processing
        await db_session.refresh(withdrawal)
        assert withdrawal.status == "processing"
        assert withdrawal.tx_hash == "existing_tx_789"