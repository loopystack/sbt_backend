"""
Ledger Invariants Tests
Tests that verify wallet balance consistency and ledger correctness
"""
import pytest
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.deposit import UserCryptoBalance
from app.models.wallet_transaction import WalletTransaction, WalletTransactionType, ReferenceType


class LedgerVerifier:
    """Helper class to verify ledger consistency"""

    @staticmethod
    async def recompute_balance_from_ledger(db: AsyncSession, user_id: int, asset: str) -> dict:
        """Recompute user balance by replaying all wallet transactions"""
        # Get all transactions for user/asset in chronological order
        stmt = select(WalletTransaction).where(
            WalletTransaction.user_id == user_id,
            WalletTransaction.asset == asset
        ).order_by(WalletTransaction.created_at, WalletTransaction.id)

        result = await db.execute(stmt)
        transactions = result.scalars().all()

        # Replay transactions to compute balances
        available_balance = Decimal("0")
        reserved_balance = Decimal("0")

        for tx in transactions:
            if tx.type == WalletTransactionType.DEPOSIT_CREDIT:
                available_balance += tx.amount
            elif tx.type == WalletTransactionType.WITHDRAWAL_DEBIT:
                available_balance -= tx.amount
                reserved_balance -= tx.amount  # Unlock reserved
            elif tx.type == WalletTransactionType.WITHDRAWAL_REFUND:
                reserved_balance -= tx.amount  # Unlock reserved
            elif tx.type == WalletTransactionType.BET_LOCK:
                available_balance -= tx.amount
                reserved_balance += tx.amount
            elif tx.type == WalletTransactionType.BET_WIN:
                available_balance += tx.amount
            elif tx.type == WalletTransactionType.BET_REFUND:
                available_balance += tx.amount
                reserved_balance -= tx.amount
            # Add other transaction types as needed

        return {
            "available": available_balance,
            "reserved": reserved_balance,
            "total": available_balance + reserved_balance
        }

    @staticmethod
    async def verify_ledger_consistency(db: AsyncSession, user_id: int, asset: str) -> bool:
        """Verify that stored balance matches recomputed balance"""
        # Get stored balance
        stmt = select(UserCryptoBalance).where(
            UserCryptoBalance.user_id == user_id,
            UserCryptoBalance.asset == asset
        )
        result = await db.execute(stmt)
        stored_balance = result.scalar_one_or_none()

        if not stored_balance:
            # No balance record - check if any transactions exist
            stmt = select(func.count(WalletTransaction.id)).where(
                WalletTransaction.user_id == user_id,
                WalletTransaction.asset == asset
            )
            result = await db.execute(stmt)
            tx_count = result.scalar()
            return tx_count == 0  # OK if no transactions

        # Recompute from ledger
        computed_balance = await LedgerVerifier.recompute_balance_from_ledger(db, user_id, asset)

        # Compare
        return (
            stored_balance.balance == computed_balance["available"] and
            stored_balance.locked_balance == computed_balance["reserved"]
        )


class TestLedgerInvariants:
    """Test ledger consistency across all money operations"""

    @pytest.mark.asyncio
    async def test_ledger_after_initiate_withdrawal(self, db_session: AsyncSession, test_user):
        """Verify ledger consistency after withdrawal initiation"""
        # Start with clean balance
        balance = UserCryptoBalance(
            user_id=test_user.id,
            asset="USDT",
            balance=Decimal("100.0"),
            locked_balance=Decimal("0")
        )
        db_session.add(balance)
        await db_session.commit()

        # Verify initial consistency
        assert await LedgerVerifier.verify_ledger_consistency(db_session, test_user.id, "USDT")

        # Create withdrawal (this should lock balance)
        from app.routers.withdrawals import initiate_withdrawal
        from fastapi import Request

        withdrawal_data = {
            "asset": "USDT",
            "network": "TRC20",
            "amount_crypto": 10.0,
            "to_address": "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
        }

        mock_request = MagicMock(spec=Request)
        mock_request.url.path = "/api/withdrawals/initiate"
        mock_request.method = "POST"

        result = await initiate_withdrawal(withdrawal_data, mock_request, db_session, test_user)

        # Verify ledger still consistent
        assert await LedgerVerifier.verify_ledger_consistency(db_session, test_user.id, "USDT")

        # Check specific balances
        computed = await LedgerVerifier.recompute_balance_from_ledger(db_session, test_user.id, "USDT")
        assert computed["available"] == Decimal("90.0")  # 100 - 10 locked
        assert computed["reserved"] == Decimal("10.0")   # 10 locked

    @pytest.mark.asyncio
    async def test_ledger_after_execute_withdrawal(self, db_session: AsyncSession, test_user):
        """Verify ledger consistency after withdrawal execution"""
        # Setup balance and approved withdrawal
        balance = UserCryptoBalance(
            user_id=test_user.id,
            asset="USDT",
            balance=Decimal("90.0"),
            locked_balance=Decimal("10.0")  # Already locked
        )
        db_session.add(balance)

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

        assert await LedgerVerifier.verify_ledger_consistency(db_session, test_user.id, "USDT")

        # Execute withdrawal
        from app.services.withdrawal_execution_service import WithdrawalExecutionService

        mock_tron_result = MagicMock()
        mock_tron_result.tx_hash = "ledger_test_tx_123"

        execution_service = WithdrawalExecutionService()

        with patch('app.services.withdrawal_execution_service.tron_send_service') as mock_tron:
            mock_tron.send_usdt_trc20.return_value = mock_tron_result
            result = await execution_service.execute_approved_withdrawal(
                db_session, withdrawal.id, "worker1"
            )

        assert result['success'] is True

        # Verify ledger consistency
        assert await LedgerVerifier.verify_ledger_consistency(db_session, test_user.id, "USDT")

        # Check balances: available should be 90 (unchanged), reserved should be 0 (unlocked)
        computed = await LedgerVerifier.recompute_balance_from_ledger(db_session, test_user.id, "USDT")
        assert computed["available"] == Decimal("90.0")
        assert computed["reserved"] == Decimal("0")

    @pytest.mark.asyncio
    async def test_ledger_after_broadcast_failure(self, db_session: AsyncSession, test_user):
        """Verify ledger consistency after broadcast failure (should unlock)"""
        # Setup balance and approved withdrawal
        balance = UserCryptoBalance(
            user_id=test_user.id,
            asset="USDT",
            balance=Decimal("90.0"),
            locked_balance=Decimal("10.0")
        )
        db_session.add(balance)

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

        assert await LedgerVerifier.verify_ledger_consistency(db_session, test_user.id, "USDT")

        # Execute withdrawal with broadcast failure
        from app.services.withdrawal_execution_service import WithdrawalExecutionService

        execution_service = WithdrawalExecutionService()

        with patch('app.services.withdrawal_execution_service.tron_send_service') as mock_tron:
            mock_tron.send_usdt_trc20.side_effect = Exception("Broadcast failed")
            result = await execution_service.execute_approved_withdrawal(
                db_session, withdrawal.id, "worker1"
            )

        assert result['success'] is False

        # Verify ledger consistency
        assert await LedgerVerifier.verify_ledger_consistency(db_session, test_user.id, "USDT")

        # Check balances: should be unlocked (available=100, reserved=0)
        computed = await LedgerVerifier.recompute_balance_from_ledger(db_session, test_user.id, "USDT")
        assert computed["available"] == Decimal("100.0")
        assert computed["reserved"] == Decimal("0")

    @pytest.mark.asyncio
    async def test_ledger_after_timeout_failure(self, db_session: AsyncSession, test_user):
        """Verify ledger consistency after timeout failure (should refund)"""
        # Setup processing withdrawal that's timed out
        balance = UserCryptoBalance(
            user_id=test_user.id,
            asset="USDT",
            balance=Decimal("90.0"),
            locked_balance=Decimal("0")  # Already debited
        )
        db_session.add(balance)

        withdrawal = WithdrawalIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_crypto=10.0,
            amount_usd=10.0,
            to_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9",
            status="processing",
            tx_hash="timeout_test_tx"
        )
        db_session.add(withdrawal)
        await db_session.commit()

        assert await LedgerVerifier.verify_ledger_consistency(db_session, test_user.id, "USDT")

        # Simulate timeout failure (monitor would do this)
        from app.workers.monitoring_worker import MonitoringWorker
        worker = MonitoringWorker()

        # Mock the time to make it appear old
        with patch('app.workers.monitoring_worker.datetime') as mock_datetime:
            import datetime
            old_time = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=2)
            mock_datetime.now.return_value = old_time

            await worker._check_stuck_withdrawals(db_session, {"alerts_created": 0})

        # Should have created refund
        assert await LedgerVerifier.verify_ledger_consistency(db_session, test_user.id, "USDT")

        # Check balances: should be refunded (available=100, reserved=0)
        computed = await LedgerVerifier.recompute_balance_from_ledger(db_session, test_user.id, "USDT")
        assert computed["available"] == Decimal("100.0")
        assert computed["reserved"] == Decimal("0")

    @pytest.mark.asyncio
    async def test_ledger_after_idempotent_operations(self, db_session: AsyncSession, test_user):
        """Verify ledger consistency after idempotent duplicate operations"""
        # Setup initial balance
        balance = UserCryptoBalance(
            user_id=test_user.id,
            asset="USDT",
            balance=Decimal("100.0"),
            locked_balance=Decimal("0")
        )
        db_session.add(balance)
        await db_session.commit()

        assert await LedgerVerifier.verify_ledger_consistency(db_session, test_user.id, "USDT")

        # Try to create same withdrawal twice with client_request_id
        from app.routers.withdrawals import initiate_withdrawal
        from fastapi import Request

        withdrawal_data = {
            "asset": "USDT",
            "network": "TRC20",
            "amount_crypto": 10.0,
            "to_address": "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9",
            "client_request_id": "idempotent_test_123"
        }

        mock_request = MagicMock(spec=Request)
        mock_request.url.path = "/api/withdrawals/initiate"
        mock_request.method = "POST"

        # Create twice
        result1 = await initiate_withdrawal(withdrawal_data, mock_request, db_session, test_user)
        result2 = await initiate_withdrawal(withdrawal_data, mock_request, db_session, test_user)

        # Should return same result
        assert result1.id == result2.id

        # Ledger should still be consistent
        assert await LedgerVerifier.verify_ledger_consistency(db_session, test_user.id, "USDT")

        # Should only have one set of lock transactions
        computed = await LedgerVerifier.recompute_balance_from_ledger(db_session, test_user.id, "USDT")
        assert computed["available"] == Decimal("90.0")
        assert computed["reserved"] == Decimal("10.0")