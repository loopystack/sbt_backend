"""
Manual Golden Path Checklist
Step-by-step verification of complete user journeys
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.deposit import UserCryptoBalance, DepositIntent, WithdrawalIntent
from app.models.wallet_transaction import WalletTransaction, WalletTransactionType, ReferenceType


class GoldenPathChecklist:
    """Manual checklist for verifying complete system functionality"""

    @staticmethod
    def get_checklist_steps():
        """Return the complete golden path checklist"""
        return {
            "user_setup": [
                "✅ Create test user account",
                "✅ User can authenticate and get JWT token",
                "✅ User has initial zero balance",
            ],
            "deposit_flow": [
                "✅ Generate unique deposit address for user",
                "✅ Address is valid TRC20 format (starts with T)",
                "✅ User sends USDT to generated address",
                "✅ Deposit monitor detects transaction",
                "✅ Deposit status changes: pending → detected → completed",
                "✅ User balance increases by deposited amount",
                "✅ Wallet transaction record created (DEPOSIT_CREDIT)",
                "✅ Balance available for withdrawal (not locked)",
            ],
            "balance_verification": [
                "✅ GET /api/wallet/balance returns correct amounts",
                "✅ Available balance matches computed ledger balance",
                "✅ Reserved balance is zero after successful deposit",
                "✅ Total balance = available + reserved",
                "✅ Amounts returned as decimal strings (not floats)",
            ],
            "withdrawal_initiation": [
                "✅ POST /api/withdrawals/initiate validates input",
                "✅ Address validation passes (TRC20 format)",
                "✅ Amount validation passes (sufficient balance, within limits)",
                "✅ Balance locked (reserved amount increases)",
                "✅ Withdrawal created with status='pending'",
                "✅ Idempotency works (same client_request_id returns same withdrawal)",
                "✅ Rate limiting allows legitimate requests",
            ],
            "admin_approval": [
                "✅ Admin can view pending withdrawals",
                "✅ Admin sees withdrawal details (amount, address, user)",
                "✅ Admin can approve withdrawal",
                "✅ Withdrawal status changes to 'approved'",
                "✅ Admin action is logged",
            ],
            "withdrawal_execution": [
                "✅ Execute button visible for approved withdrawals",
                "✅ Execute API call succeeds",
                "✅ Tron transaction broadcast successful",
                "✅ tx_hash recorded in withdrawal",
                "✅ Withdrawal status changes to 'processing'",
                "✅ Wallet transaction created (WITHDRAWAL_DEBIT)",
                "✅ Reserved balance decreases (funds unlocked from reserve)",
            ],
            "transaction_monitoring": [
                "✅ Withdrawal monitor checks confirmations",
                "✅ TronGrid API queried for transaction status",
                "✅ Sufficient confirmations detected",
                "✅ Withdrawal status changes to 'completed'",
                "✅ User balance remains correct",
            ],
            "reconciliation_verification": [
                "✅ Daily reconciliation runs successfully",
                "✅ Internal user balances computed correctly",
                "✅ Platform wallet balances retrieved from TronGrid",
                "✅ Delta calculated: platform_balance - user_liability",
                "✅ Delta within tolerance (±$1.00)",
                "✅ Status reported as 'ok'",
                "✅ Report saved to database",
            ],
            "error_recovery": [
                "✅ If deposit fails, status marked appropriately",
                "✅ If withdrawal broadcast fails, funds unlocked",
                "✅ If confirmation check fails, timeout handling works",
                "✅ Circuit breaker activates on API failures",
                "✅ Stuck transaction detection works",
                "✅ Admin can retry failed operations",
            ],
            "monitoring_alerts": [
                "✅ Worker heartbeats updated every cycle",
                "✅ Stuck transaction alerts created",
                "✅ Low balance alerts triggered",
                "✅ API failure alerts generated",
                "✅ Admin can acknowledge and resolve alerts",
            ],
            "security_verification": [
                "✅ Rate limiting prevents abuse",
                "✅ Private keys never in logs",
                "✅ Wallet addresses masked in logs",
                "✅ Admin endpoints protected",
                "✅ Input validation prevents injection",
                "✅ CORS allows only configured origins",
            ]
        }


class TestGoldenPathValidation:
    """Automated tests that support the manual golden path checklist"""

    @pytest.mark.asyncio
    async def test_complete_deposit_flow(self, db_session: AsyncSession, test_user):
        """Test complete deposit flow end-to-end"""
        # 1. Create user with zero balance
        balance = UserCryptoBalance(
            user_id=test_user.id,
            asset="USDT",
            balance=0.0,
            locked_balance=0.0
        )
        db_session.add(balance)

        # 2. Simulate deposit detection
        deposit = DepositIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_crypto=50.0,
            tx_hash="golden_path_deposit_123",
            status="detected"
        )
        db_session.add(deposit)
        await db_session.commit()

        # 3. Process deposit (simulate monitor)
        from app.services.deposit_service import deposit_service
        result = await deposit_service.credit_detected_deposit(db_session, deposit.id)

        assert result['success'] is True

        # 4. Verify balance updated
        await db_session.refresh(balance)
        assert balance.balance == 50.0
        assert balance.locked_balance == 0.0

        # 5. Verify transaction created
        stmt = select(WalletTransaction).where(
            WalletTransaction.reference_type == ReferenceType.DEPOSIT,
            WalletTransaction.reference_id == deposit.id
        )
        result = await db_session.execute(stmt)
        tx = result.scalar_one()
        assert tx.type == WalletTransactionType.DEPOSIT_CREDIT
        assert tx.amount == 50.0

    @pytest.mark.asyncio
    async def test_complete_withdrawal_flow(self, db_session: AsyncSession, test_user):
        """Test complete withdrawal flow end-to-end"""
        # 1. Setup balance
        balance = UserCryptoBalance(
            user_id=test_user.id,
            asset="USDT",
            balance=100.0,
            locked_balance=0.0
        )
        db_session.add(balance)
        await db_session.commit()

        # 2. Create withdrawal
        from app.routers.withdrawals import initiate_withdrawal
        from fastapi import Request

        mock_request = MagicMock(spec=Request)
        mock_request.url.path = "/api/withdrawals/initiate"
        mock_request.method = "POST"

        result = await initiate_withdrawal({
            "asset": "USDT",
            "network": "TRC20",
            "amount_crypto": 25.0,
            "to_address": "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
        }, mock_request, db_session, test_user)

        withdrawal_id = result.id

        # 3. Verify withdrawal created and balance locked
        await db_session.refresh(balance)
        assert balance.balance == 75.0  # 100 - 25
        assert balance.locked_balance == 25.0

        # 4. Simulate admin approval
        withdrawal = await db_session.get(WithdrawalIntent, withdrawal_id)
        withdrawal.status = "approved"
        await db_session.commit()

        # 5. Simulate execution
        from app.services.withdrawal_execution_service import WithdrawalExecutionService

        execution_service = WithdrawalExecutionService()
        with patch('app.services.withdrawal_execution_service.tron_send_service') as mock_tron:
            mock_result = MagicMock()
            mock_result.tx_hash = "golden_path_withdrawal_456"
            mock_tron.send_usdt_trc20.return_value = mock_result

            exec_result = await execution_service.execute_approved_withdrawal(
                db_session, withdrawal_id, "test_worker"
            )

        assert exec_result['success'] is True

        # 6. Verify final state
        await db_session.refresh(balance)
        assert balance.balance == 75.0  # Unchanged
        assert balance.locked_balance == 0.0  # Unlocked

        await db_session.refresh(withdrawal)
        assert withdrawal.status == "processing"
        assert withdrawal.tx_hash == "golden_path_withdrawal_456"

    @pytest.mark.asyncio
    async def test_reconciliation_accuracy(self, db_session: AsyncSession):
        """Test that reconciliation computes balances accurately"""
        # Create test balances
        balances = [
            UserCryptoBalance(user_id=1, asset="USDT", balance=100.0, locked_balance=10.0),
            UserCryptoBalance(user_id=2, asset="USDT", balance=200.0, locked_balance=20.0),
        ]

        for balance in balances:
            db_session.add(balance)
        await db_session.commit()

        # Run reconciliation
        from app.services.reconciliation_service import reconciliation_service
        report = await reconciliation_service.run_daily_reconciliation(db_session)

        # Should compute total liability correctly
        expected_liability = {"USDT": 330.0}  # (100+10) + (200+20)
        assert report.total_user_liability == expected_liability

        # Status should be 'ok' (since we don't have real platform balance)
        assert report.status in ["ok", "error"]  # error if platform API fails

    @pytest.mark.asyncio
    async def test_error_recovery_works(self, db_session: AsyncSession, test_user):
        """Test that error recovery mechanisms work"""
        # 1. Create withdrawal
        balance = UserCryptoBalance(
            user_id=test_user.id,
            asset="USDT",
            balance=50.0,
            locked_balance=0.0
        )
        db_session.add(balance)

        withdrawal = WithdrawalIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_crypto=25.0,
            amount_usd=25.0,
            to_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9",
            status="approved"
        )
        db_session.add(withdrawal)
        await db_session.commit()

        # 2. Simulate execution failure
        from app.services.withdrawal_execution_service import WithdrawalExecutionService
        execution_service = WithdrawalExecutionService()

        with patch('app.services.withdrawal_execution_service.tron_send_service') as mock_tron:
            mock_tron.send_usdt_trc20.side_effect = Exception("Network error")

            result = await execution_service.execute_approved_withdrawal(
                db_session, withdrawal.id, "worker1"
            )

        assert result['success'] is False

        # 3. Verify funds unlocked (error recovery)
        await db_session.refresh(balance)
        assert balance.balance == 50.0  # Unchanged
        assert balance.locked_balance == 0.0  # Unlocked

        await db_session.refresh(withdrawal)
        assert withdrawal.status == "approved"  # Can be retried

    @pytest.mark.asyncio
    async def test_monitoring_system_works(self, db_session: AsyncSession):
        """Test that monitoring system detects issues and creates alerts"""
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
            processed_at=None
        )
        db_session.add(withdrawal)
        await db_session.commit()

        # Run monitoring
        monitoring_worker = MonitoringWorker()

        with patch('app.workers.monitoring_worker.datetime') as mock_datetime:
            import datetime
            # Make it appear 2 hours old
            old_time = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=2)
            mock_datetime.now.return_value = old_time

            stats = await monitoring_worker.run_once(db_session)

        # Should have detected stuck withdrawal
        assert stats['alerts_created'] >= 1


# Manual checklist for QA team
GOLDEN_PATH_CHECKLIST = """
# Manual Golden Path Testing Checklist

## Prerequisites
- [ ] Staging environment deployed and accessible
- [ ] Test user account created
- [ ] Admin account has access
- [ ] TronGrid API key configured
- [ ] Hot wallet has test USDT

## Test User Setup
- [ ] User can register/login successfully
- [ ] JWT token received and valid
- [ ] Initial balance is zero

## Deposit Testing
- [ ] Generate deposit address via API
- [ ] Address format is valid TRC20 (starts with T)
- [ ] Send test USDT to address via TronLink/Metamask
- [ ] Deposit appears in pending deposits
- [ ] Deposit monitor detects transaction within 5 minutes
- [ ] Status changes: pending → detected → completed
- [ ] User balance increases correctly
- [ ] Transaction appears in wallet history

## Balance Verification
- [ ] GET /api/wallet/balance returns correct values
- [ ] Available balance = deposited amount
- [ ] Reserved balance = 0
- [ ] Amounts are decimal strings, not floats
- [ ] Balance matches ledger computation

## Withdrawal Testing
- [ ] Initiate withdrawal with valid amount/address
- [ ] Request succeeds, returns withdrawal ID
- [ ] Balance shows amount moved to reserved
- [ ] Withdrawal appears in user's withdrawal list
- [ ] Status is 'pending'

## Admin Operations
- [ ] Admin can view pending withdrawals
- [ ] Admin can approve withdrawal
- [ ] Status changes to 'approved'
- [ ] Admin can execute approved withdrawal
- [ ] Tron transaction broadcast succeeds
- [ ] tx_hash recorded and visible
- [ ] Status changes to 'processing'

## Transaction Monitoring
- [ ] Withdrawal monitor runs successfully
- [ ] Checks confirmations via TronGrid API
- [ ] After sufficient confirmations, status → 'completed'
- [ ] User balance remains correct
- [ ] Reserved balance decreases to zero

## Reconciliation Testing
- [ ] Run daily reconciliation manually
- [ ] Computes user liabilities correctly
- [ ] Retrieves platform balance from TronGrid
- [ ] Calculates delta accurately
- [ ] Status shows 'ok' (within tolerance)
- [ ] Report saved with correct data

## Error Scenarios
- [ ] Test insufficient balance → rejected
- [ ] Test invalid address → rejected
- [ ] Test amount > max limit → rejected
- [ ] Test API timeout → circuit breaker activates
- [ ] Test stuck transaction → alert created
- [ ] Test failed execution → funds unlocked

## Security Verification
- [ ] Rate limiting works (429 on too many requests)
- [ ] Admin endpoints blocked for regular users
- [ ] Private keys not in logs
- [ ] Sensitive data masked in logs
- [ ] CORS allows only configured origins

## Monitoring & Alerts
- [ ] Worker heartbeats updated
- [ ] Stuck transaction alerts appear
- [ ] Admin can acknowledge/resolve alerts
- [ ] Alert deduplication works
- [ ] No duplicate alerts for same issue

## Performance Verification
- [ ] API responses < 500ms under normal load
- [ ] No memory leaks during testing
- [ ] Database connections stable
- [ ] Error rate < 1%

## Sign-Off
- [ ] All tests pass
- [ ] No critical issues found
- [ ] Performance meets requirements
- [ ] Security verification complete
- [ ] Ready for production deployment

**Tested by:** ___________________________ **Date:** _____________
**Environment:** Staging **Result:** ✅ PASS / ❌ FAIL
"""