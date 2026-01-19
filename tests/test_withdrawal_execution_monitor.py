"""
Withdrawal Execution + Monitor + Refund Safety Tests
Tests for withdrawal execution idempotency, failure paths, and refund safety
Covering all manual test cases and automated tests
"""
import pytest
import pytest_asyncio
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select, func
from unittest.mock import AsyncMock, patch, MagicMock

from app.models.user import User
from app.models.deposit import WithdrawalIntent
from app.models.wallet_transaction import WalletTransaction, WalletTransactionType, ReferenceType
from app.services.wallet_service import WalletService
from app.services.withdrawal_execution_service import WithdrawalExecutionService
from app.workers.withdrawal_monitor import WithdrawalMonitorWorker

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
    
    from app.models import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    async with async_session() as session:
        yield session
    
    await engine.dispose()


@pytest_asyncio.fixture
async def test_user(test_db: AsyncSession) -> User:
    """Create a test user"""
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password="hashed",
        is_active=True
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_user_with_balance(test_db: AsyncSession, test_user: User):
    """Create user with 100 USDT balance"""
    await WalletService.credit_balance(
        user_id=test_user.id,
        asset="USDT",
        amount=Decimal("100.00"),
        db=test_db
    )
    await test_db.commit()
    return test_user


@pytest_asyncio.fixture
async def mock_tron_send_service():
    """Mock TronSendService for testing"""
    with patch('app.services.withdrawal_execution_service.tron_send_service') as mock_service:
        yield mock_service


@pytest_asyncio.fixture
async def mock_tron_client():
    """Mock TronClient for testing"""
    with patch('app.workers.withdrawal_monitor.tron_client') as mock_client:
        yield mock_client


class TestManualTestCases:
    """Manual test cases A-E as specified"""
    
    @pytest.mark.asyncio
    async def test_case_a_initiate_withdrawal_lock(
        self, test_db: AsyncSession, test_user_with_balance: User
    ):
        """Case A: Initiate withdrawal 20 (lock) - available: 100 -> 80, locked: 0 -> 20"""
        user = test_user_with_balance
        
        # Initial balance
        initial_balance = await WalletService.get_balance(user.id, "USDT", test_db)
        assert initial_balance["available"] == Decimal("100.00")
        assert initial_balance["reserved"] == Decimal("0")
        
        # Lock balance for withdrawal
        amount = Decimal("20.00")
        ledger = await WalletService.lock_balance(
            user_id=user.id,
            asset="USDT",
            amount=amount,
            db=test_db,
            reference_type=ReferenceType.WITHDRAWAL,
            reference_id=None,  # Will be set when withdrawal is created
            description=f"Lock funds for withdrawal: {amount} USDT"
        )
        await test_db.commit()
        
        # Create withdrawal intent
        withdrawal = WithdrawalIntent(
            user_id=user.id,
            asset="USDT",
            network="TRC20",
            amount_crypto=amount,
            amount_usd=Decimal("20.00"),
            to_address="TTestAddress123",
            status="pending"
        )
        test_db.add(withdrawal)
        await test_db.commit()
        await test_db.refresh(withdrawal)
        
        # Update ledger entry with withdrawal_id
        ledger.reference_id = withdrawal.id
        await test_db.commit()
        
        # Verify balances
        balance = await WalletService.get_balance(user.id, "USDT", test_db)
        assert balance["available"] == Decimal("80.00"), "Available should be 80"
        assert balance["reserved"] == Decimal("20.00"), "Locked should be 20"
        
        # Verify withdrawal status
        assert withdrawal.status == "pending"
        
        # Verify ledger entry
        assert ledger.type == WalletTransactionType.WITHDRAWAL_LOCK
        assert ledger.amount == amount
    
    @pytest.mark.asyncio
    async def test_case_b_approve_execute_success(
        self, test_db: AsyncSession, test_user_with_balance: User, mock_tron_send_service
    ):
        """Case B: Approve then Execute (success) - debit, status=processing, tx_hash set"""
        user = test_user_with_balance
        amount = Decimal("20.00")
        
        # Setup: Lock funds and create withdrawal
        await WalletService.lock_balance(
            user_id=user.id,
            asset="USDT",
            amount=amount,
            db=test_db,
            reference_type=ReferenceType.WITHDRAWAL,
            description=f"Lock funds for withdrawal: {amount} USDT"
        )
        
        withdrawal = WithdrawalIntent(
            user_id=user.id,
            asset="USDT",
            network="TRC20",
            amount_crypto=amount,
            amount_usd=Decimal("20.00"),
            to_address="TTestAddress123",
            status="approved"
        )
        test_db.add(withdrawal)
        await test_db.commit()
        await test_db.refresh(withdrawal)
        
        # Mock successful broadcast
        tx_hash = "0x1234567890abcdef"
        mock_tron_send_service.send_usdt_trc20 = AsyncMock(return_value={"tx_hash": tx_hash})
        mock_tron_send_service.get_hot_wallet_balance = MagicMock(return_value=Decimal("1000.00"))
        mock_tron_send_service.check_hot_wallet_trx_balance = MagicMock(return_value=Decimal("1000.00"))
        
        # Mock limits service
        with patch('app.services.withdrawal_execution_service.limits_service') as mock_limits:
            mock_limits.check_withdrawal_limits = AsyncMock(return_value=None)
            
            # Execute withdrawal
            result_tx_hash = await WithdrawalExecutionService.execute_withdrawal(
                withdrawal_id=withdrawal.id,
                db=test_db
            )
        
        assert result_tx_hash == tx_hash
        
        # Verify withdrawal status
        await test_db.refresh(withdrawal)
        assert withdrawal.status == "processing"
        assert withdrawal.tx_hash == tx_hash
        assert withdrawal.processed_at is not None
        
        # Verify balances
        balance = await WalletService.get_balance(user.id, "USDT", test_db)
        assert balance["available"] == Decimal("80.00"), "Available should remain 80"
        assert balance["reserved"] == Decimal("0"), "Locked should be 0 (deducted)"
        
        # Verify ledger entry for debit
        stmt = select(WalletTransaction).where(
            WalletTransaction.reference_type == ReferenceType.WITHDRAWAL,
            WalletTransaction.reference_id == withdrawal.id,
            WalletTransaction.type == WalletTransactionType.WITHDRAWAL_DEBIT
        )
        result = await test_db.execute(stmt)
        debit_entry = result.scalar_one_or_none()
        assert debit_entry is not None, "Should have WITHDRAWAL_DEBIT ledger entry"
        assert debit_entry.amount == amount
    
    @pytest.mark.asyncio
    async def test_case_c_monitor_confirms(
        self, test_db: AsyncSession, test_user_with_balance: User, mock_tron_client
    ):
        """Case C: Monitor confirms - status=completed, balances unchanged, no new ledger"""
        user = test_user_with_balance
        amount = Decimal("20.00")
        tx_hash = "0x1234567890abcdef"
        
        # Setup: Create processing withdrawal with tx_hash
        # First, simulate the balance after debit (available=80, reserved=0)
        # Deduct from available to match the state after debit
        balance = await WalletService.get_balance(user.id, "USDT", test_db)
        # Credit to get to 100, then lock 20, then debit (net: 80 available, 0 reserved)
        await WalletService.lock_balance(
            user_id=user.id,
            asset="USDT",
            amount=amount,
            db=test_db,
            reference_type=ReferenceType.WITHDRAWAL,
            description="Lock for withdrawal"
        )
        await WalletService.deduct_reserved_balance(
            user_id=user.id,
            asset="USDT",
            amount=amount,
            db=test_db,
            reference_type=ReferenceType.WITHDRAWAL,
            description="Debit for withdrawal"
        )
        await test_db.commit()
        
        processed_time = datetime.now(timezone.utc)
        withdrawal = WithdrawalIntent(
            user_id=user.id,
            asset="USDT",
            network="TRC20",
            amount_crypto=amount,
            amount_usd=Decimal("20.00"),
            to_address="TTestAddress123",
            status="processing",
            tx_hash=tx_hash,
            processed_at=processed_time,
            confirmations=0
        )
        test_db.add(withdrawal)
        
        # Create debit entry (funds were already debited)
        debit_entry = WalletTransaction(
            user_id=user.id,
            asset="USDT",
            type=WalletTransactionType.WITHDRAWAL_DEBIT,
            amount=amount,
            balance_before=Decimal("80.00"),
            balance_after=Decimal("80.00"),
            reserved_before=Decimal("20.00"),
            reserved_after=Decimal("0.00"),
            reference_type=ReferenceType.WITHDRAWAL,
            reference_id=withdrawal.id
        )
        test_db.add(debit_entry)
        await test_db.commit()
        await test_db.refresh(withdrawal)
        
        # Get balance before monitor
        balance_before = await WalletService.get_balance(user.id, "USDT", test_db)
        ledger_count_before = await self._count_ledger_entries(test_db, user.id, "USDT", withdrawal.id)
        
        # Mock monitor: transaction succeeded with enough confirmations
        mock_tron_client.get_tx_info = AsyncMock(return_value={
            "confirmations": 20,  # More than required
            "success": True
        })
        
        # Run monitor
        worker = WithdrawalMonitorWorker()
        stats = {"scanned": 0, "confirmed": 0, "failed": 0, "refunded": 0, "errors": 0}
        await worker._process_processing_withdrawal(withdrawal, test_db, stats)
        await test_db.commit()
        
        # Verify withdrawal status
        await test_db.refresh(withdrawal)
        assert withdrawal.status == "completed"
        assert withdrawal.completed_at is not None
        
        # Verify balances unchanged
        balance_after = await WalletService.get_balance(user.id, "USDT", test_db)
        assert balance_after["available"] == balance_before["available"]
        assert balance_after["reserved"] == balance_before["reserved"]
        
        # Verify no new ledger entry
        ledger_count_after = await self._count_ledger_entries(test_db, user.id, "USDT", withdrawal.id)
        assert ledger_count_after == ledger_count_before, "Should have same number of ledger entries"
    
    @pytest.mark.asyncio
    async def test_case_d_broadcast_fails_unlock(
        self, test_db: AsyncSession, test_user_with_balance: User, mock_tron_send_service
    ):
        """Case D: Broadcast fails - reserved unlocked, available restored, status=failed, NO refund"""
        user = test_user_with_balance
        amount = Decimal("20.00")
        
        # Setup: Lock funds and create approved withdrawal
        await WalletService.lock_balance(
            user_id=user.id,
            asset="USDT",
            amount=amount,
            db=test_db,
            reference_type=ReferenceType.WITHDRAWAL,
            description=f"Lock funds for withdrawal: {amount} USDT"
        )
        
        withdrawal = WithdrawalIntent(
            user_id=user.id,
            asset="USDT",
            network="TRC20",
            amount_crypto=amount,
            amount_usd=Decimal("20.00"),
            to_address="TTestAddress123",
            status="approved"
        )
        test_db.add(withdrawal)
        await test_db.commit()
        await test_db.refresh(withdrawal)
        
        # Get balance before (available=80, locked=20)
        balance_before = await WalletService.get_balance(user.id, "USDT", test_db)
        
        # Mock broadcast failure
        mock_tron_send_service.send_usdt_trc20 = AsyncMock(side_effect=Exception("Broadcast failed"))
        mock_tron_send_service.get_hot_wallet_balance = MagicMock(return_value=Decimal("1000.00"))
        mock_tron_send_service.check_hot_wallet_trx_balance = MagicMock(return_value=Decimal("1000.00"))
        
        # Mock limits service
        with patch('app.services.withdrawal_execution_service.limits_service') as mock_limits:
            mock_limits.check_withdrawal_limits = AsyncMock(return_value=None)
            
            # Execute withdrawal - should fail and unlock
            with pytest.raises(Exception, match="Failed to broadcast"):
                await WithdrawalExecutionService.execute_withdrawal(
                    withdrawal_id=withdrawal.id,
                    db=test_db
                )
        
        # Verify withdrawal status
        await test_db.refresh(withdrawal)
        assert withdrawal.status == "failed"
        assert withdrawal.failed_at is not None
        assert withdrawal.failure_reason is not None
        assert withdrawal.tx_hash is None, "Should not have tx_hash if broadcast failed"
        
        # Verify balances restored (available=100, locked=0)
        balance_after = await WalletService.get_balance(user.id, "USDT", test_db)
        assert balance_after["available"] == Decimal("100.00"), "Available should be restored to 100"
        assert balance_after["reserved"] == Decimal("0"), "Locked should be 0"
        
        # Verify NO refund ledger entry (only unlock should exist)
        stmt = select(WalletTransaction).where(
            WalletTransaction.reference_type == ReferenceType.WITHDRAWAL,
            WalletTransaction.reference_id == withdrawal.id,
            WalletTransaction.type == WalletTransactionType.WITHDRAWAL_REFUND
        )
        result = await test_db.execute(stmt)
        refund_entry = result.scalar_one_or_none()
        assert refund_entry is None, "Should NOT have WITHDRAWAL_REFUND entry (funds were unlocked, not debited)"
    
    @pytest.mark.asyncio
    async def test_case_e_onchain_fail_after_debit_refund(
        self, test_db: AsyncSession, test_user_with_balance: User, mock_tron_client
    ):
        """Case E: On-chain fail after debit - monitor creates refund, idempotent"""
        user = test_user_with_balance
        amount = Decimal("20.00")
        tx_hash = "0x1234567890abcdef"
        
        # Setup: Create processing withdrawal with tx_hash and debit entry
        # First, simulate the balance after debit (available=80, reserved=0)
        await WalletService.lock_balance(
            user_id=user.id,
            asset="USDT",
            amount=amount,
            db=test_db,
            reference_type=ReferenceType.WITHDRAWAL,
            description="Lock for withdrawal"
        )
        # Create debit entry via deduct_reserved_balance
        debit_ledger = await WalletService.deduct_reserved_balance(
            user_id=user.id,
            asset="USDT",
            amount=amount,
            db=test_db,
            reference_type=ReferenceType.WITHDRAWAL,
            description="Debit for withdrawal"
        )
        await test_db.commit()
        
        processed_time = datetime.now(timezone.utc)
        withdrawal = WithdrawalIntent(
            user_id=user.id,
            asset="USDT",
            network="TRC20",
            amount_crypto=amount,
            amount_usd=Decimal("20.00"),
            to_address="TTestAddress123",
            status="processing",
            tx_hash=tx_hash,
            processed_at=processed_time,
            confirmations=0
        )
        test_db.add(withdrawal)
        await test_db.commit()
        await test_db.refresh(withdrawal)
        
        # Update debit entry with withdrawal.id
        debit_ledger.reference_id = withdrawal.id
        await test_db.commit()
        
        # Get balance before (available=80, since debit happened)
        balance_before = await WalletService.get_balance(user.id, "USDT", test_db)
        assert balance_before["available"] == Decimal("80.00")
        
        # Mock monitor: transaction failed on-chain
        mock_tron_client.get_tx_info = AsyncMock(return_value={
            "confirmations": 5,
            "success": False  # Transaction failed
        })
        
        # Run monitor - should create refund
        worker = WithdrawalMonitorWorker()
        stats = {"scanned": 0, "confirmed": 0, "failed": 0, "refunded": 0, "errors": 0}
        await worker._process_processing_withdrawal(withdrawal, test_db, stats)
        await test_db.commit()
        
        # Verify withdrawal status
        await test_db.refresh(withdrawal)
        assert withdrawal.status == "failed"
        
        # Verify balance increased (refund credited)
        balance_after = await WalletService.get_balance(user.id, "USDT", test_db)
        assert balance_after["available"] == Decimal("100.00"), "Available should increase to 100 (refund)"
        
        # Verify refund ledger entry exists
        stmt = select(WalletTransaction).where(
            WalletTransaction.reference_type == ReferenceType.WITHDRAWAL,
            WalletTransaction.reference_id == withdrawal.id,
            WalletTransaction.type == WalletTransactionType.WITHDRAWAL_REFUND
        )
        result = await test_db.execute(stmt)
        refund_entry = result.scalar_one_or_none()
        assert refund_entry is not None, "Should have WITHDRAWAL_REFUND ledger entry"
        assert refund_entry.amount == amount
        
        # Run monitor again - should be idempotent (no second refund)
        balance_before_second = balance_after["available"]
        await worker._process_processing_withdrawal(withdrawal, test_db, stats)
        await test_db.commit()
        
        balance_after_second = await WalletService.get_balance(user.id, "USDT", test_db)
        assert balance_after_second["available"] == balance_before_second, "Balance should not change (idempotent)"
        
        # Verify still only one refund entry
        result = await test_db.execute(stmt)
        all_refunds = list(result.scalars().all())
        assert len(all_refunds) == 1, "Should have exactly one refund entry"
    
    async def _count_ledger_entries(
        self, db: AsyncSession, user_id: int, asset: str, withdrawal_id: int
    ) -> int:
        """Helper to count ledger entries"""
        stmt = select(func.count(WalletTransaction.id)).where(
            WalletTransaction.user_id == user_id,
            WalletTransaction.asset == asset,
            WalletTransaction.reference_type == ReferenceType.WITHDRAWAL,
            WalletTransaction.reference_id == withdrawal_id
        )
        result = await db.execute(stmt)
        return result.scalar() or 0


class TestAutomatedTests:
    """Automated tests for withdrawal execution and monitor"""
    
    @pytest.mark.asyncio
    async def test_execute_twice_returns_same_tx_hash(
        self, test_db: AsyncSession, test_user_with_balance: User, mock_tron_send_service
    ):
        """Execute twice returns same tx_hash (idempotency)"""
        user = test_user_with_balance
        amount = Decimal("20.00")
        
        # Setup: Lock funds and create approved withdrawal
        await WalletService.lock_balance(
            user_id=user.id,
            asset="USDT",
            amount=amount,
            db=test_db,
            reference_type=ReferenceType.WITHDRAWAL,
            description=f"Lock funds for withdrawal: {amount} USDT"
        )
        
        withdrawal = WithdrawalIntent(
            user_id=user.id,
            asset="USDT",
            network="TRC20",
            amount_crypto=amount,
            amount_usd=Decimal("20.00"),
            to_address="TTestAddress123",
            status="approved"
        )
        test_db.add(withdrawal)
        await test_db.commit()
        await test_db.refresh(withdrawal)
        
        tx_hash = "0x1234567890abcdef"
        mock_tron_send_service.send_usdt_trc20 = AsyncMock(return_value={"tx_hash": tx_hash})
        mock_tron_send_service.get_hot_wallet_balance = MagicMock(return_value=Decimal("1000.00"))
        mock_tron_send_service.check_hot_wallet_trx_balance = MagicMock(return_value=Decimal("1000.00"))
        
        with patch('app.services.withdrawal_execution_service.limits_service') as mock_limits:
            mock_limits.check_withdrawal_limits = AsyncMock(return_value=None)
            
            # First execution
            result1 = await WithdrawalExecutionService.execute_withdrawal(
                withdrawal_id=withdrawal.id,
                db=test_db
            )
            assert result1 == tx_hash
            
            # Refresh withdrawal
            await test_db.refresh(withdrawal)
            
            # Second execution - should return same tx_hash without broadcasting
            result2 = await WithdrawalExecutionService.execute_withdrawal(
                withdrawal_id=withdrawal.id,
                db=test_db
            )
            assert result2 == tx_hash
            
            # Verify send_usdt_trc20 was called only once (second call should return early)
            assert mock_tron_send_service.send_usdt_trc20.call_count == 1
    
    @pytest.mark.asyncio
    async def test_monitor_refunds_only_if_debit_exists(
        self, test_db: AsyncSession, test_user_with_balance: User, mock_tron_client
    ):
        """Monitor refunds only if debit entry exists"""
        user = test_user_with_balance
        amount = Decimal("20.00")
        tx_hash = "0x1234567890abcdef"
        
        # Setup: Create failed withdrawal WITHOUT debit entry (broadcast failed, funds unlocked)
        withdrawal = WithdrawalIntent(
            user_id=user.id,
            asset="USDT",
            network="TRC20",
            amount_crypto=amount,
            amount_usd=Decimal("20.00"),
            to_address="TTestAddress123",
            status="failed",
            tx_hash=None,  # No tx_hash (broadcast failed)
            failed_at=datetime.now(timezone.utc),
            failure_reason="Broadcast failed"
        )
        test_db.add(withdrawal)
        await test_db.commit()
        await test_db.refresh(withdrawal)
        
        # Verify NO debit entry exists
        stmt = select(WalletTransaction).where(
            WalletTransaction.reference_type == ReferenceType.WITHDRAWAL,
            WalletTransaction.reference_id == withdrawal.id,
            WalletTransaction.type == WalletTransactionType.WITHDRAWAL_DEBIT
        )
        result = await test_db.execute(stmt)
        debit_entry = result.scalar_one_or_none()
        assert debit_entry is None, "Should not have debit entry (broadcast failed)"
        
        # Get balance before
        balance_before = await WalletService.get_balance(user.id, "USDT", test_db)
        
        # Try to refund (should skip - no debit)
        worker = WithdrawalMonitorWorker()
        refunded = await worker._refund_withdrawal(withdrawal, test_db)
        
        assert refunded == False, "Should NOT refund (no debit happened)"
        
        # Verify balance unchanged
        balance_after = await WalletService.get_balance(user.id, "USDT", test_db)
        assert balance_after["available"] == balance_before["available"]
        
        # Verify NO refund entry
        stmt = select(WalletTransaction).where(
            WalletTransaction.reference_type == ReferenceType.WITHDRAWAL,
            WalletTransaction.reference_id == withdrawal.id,
            WalletTransaction.type == WalletTransactionType.WITHDRAWAL_REFUND
        )
        result = await test_db.execute(stmt)
        refund_entry = result.scalar_one_or_none()
        assert refund_entry is None, "Should NOT have refund entry (no debit happened)"
    
    @pytest.mark.asyncio
    async def test_broadcast_fail_unlocks(
        self, test_db: AsyncSession, test_user_with_balance: User, mock_tron_send_service
    ):
        """Broadcast fail unlocks reserved balance"""
        user = test_user_with_balance
        amount = Decimal("20.00")
        
        # Setup: Lock funds
        await WalletService.lock_balance(
            user_id=user.id,
            asset="USDT",
            amount=amount,
            db=test_db,
            reference_type=ReferenceType.WITHDRAWAL,
            description=f"Lock funds for withdrawal: {amount} USDT"
        )
        
        withdrawal = WithdrawalIntent(
            user_id=user.id,
            asset="USDT",
            network="TRC20",
            amount_crypto=amount,
            amount_usd=Decimal("20.00"),
            to_address="TTestAddress123",
            status="approved"
        )
        test_db.add(withdrawal)
        await test_db.commit()
        await test_db.refresh(withdrawal)
        
        # Verify locked
        balance_before = await WalletService.get_balance(user.id, "USDT", test_db)
        assert balance_before["reserved"] == amount
        
        # Mock broadcast failure
        mock_tron_send_service.send_usdt_trc20 = AsyncMock(side_effect=Exception("Broadcast failed"))
        mock_tron_send_service.get_hot_wallet_balance = MagicMock(return_value=Decimal("1000.00"))
        mock_tron_send_service.check_hot_wallet_trx_balance = MagicMock(return_value=Decimal("1000.00"))
        
        with patch('app.services.withdrawal_execution_service.limits_service') as mock_limits:
            mock_limits.check_withdrawal_limits = AsyncMock(return_value=None)
            
            with pytest.raises(Exception):
                await WithdrawalExecutionService.execute_withdrawal(
                    withdrawal_id=withdrawal.id,
                    db=test_db
                )
        
        # Verify unlocked
        balance_after = await WalletService.get_balance(user.id, "USDT", test_db)
        assert balance_after["reserved"] == Decimal("0"), "Reserved should be unlocked"
        assert balance_after["available"] == Decimal("100.00"), "Available should be restored"
    
    @pytest.mark.asyncio
    async def test_idempotent_refund(
        self, test_db: AsyncSession, test_user_with_balance: User
    ):
        """Refund is idempotent (no double refund)"""
        user = test_user_with_balance
        amount = Decimal("20.00")
        
        # Setup: Create failed withdrawal with debit entry
        # First, simulate the balance after debit (available=80, reserved=0)
        await WalletService.lock_balance(
            user_id=user.id,
            asset="USDT",
            amount=amount,
            db=test_db,
            reference_type=ReferenceType.WITHDRAWAL,
            description="Lock for withdrawal"
        )
        # Create debit entry via deduct_reserved_balance
        await WalletService.deduct_reserved_balance(
            user_id=user.id,
            asset="USDT",
            amount=amount,
            db=test_db,
            reference_type=ReferenceType.WITHDRAWAL,
            description="Debit for withdrawal"
        )
        await test_db.commit()
        
        withdrawal = WithdrawalIntent(
            user_id=user.id,
            asset="USDT",
            network="TRC20",
            amount_crypto=amount,
            amount_usd=Decimal("20.00"),
            to_address="TTestAddress123",
            status="failed",
            tx_hash="0x1234567890abcdef",
            failed_at=datetime.now(timezone.utc)
        )
        test_db.add(withdrawal)
        await test_db.commit()
        await test_db.refresh(withdrawal)
        
        # Update the debit entry with withdrawal.id
        stmt = select(WalletTransaction).where(
            WalletTransaction.user_id == user.id,
            WalletTransaction.type == WalletTransactionType.WITHDRAWAL_DEBIT,
            WalletTransaction.reference_type == ReferenceType.WITHDRAWAL
        ).order_by(WalletTransaction.id.desc()).limit(1)
        result = await test_db.execute(stmt)
        debit_entry = result.scalar_one_or_none()
        if debit_entry:
            debit_entry.reference_id = withdrawal.id
            await test_db.commit()
        
        # First refund
        worker = WithdrawalMonitorWorker()
        refunded1 = await worker._refund_withdrawal(withdrawal, test_db)
        await test_db.commit()
        
        assert refunded1 == True, "First refund should succeed"
        
        balance_after_first = await WalletService.get_balance(user.id, "USDT", test_db)
        assert balance_after_first["available"] == Decimal("100.00")
        
        # Second refund - should be idempotent
        refunded2 = await worker._refund_withdrawal(withdrawal, test_db)
        await test_db.commit()
        
        assert refunded2 == False, "Second refund should be skipped (idempotent)"
        
        balance_after_second = await WalletService.get_balance(user.id, "USDT", test_db)
        assert balance_after_second["available"] == balance_after_first["available"], "Balance should not change"
        
        # Verify only one refund entry
        stmt = select(WalletTransaction).where(
            WalletTransaction.reference_type == ReferenceType.WITHDRAWAL,
            WalletTransaction.reference_id == withdrawal.id,
            WalletTransaction.type == WalletTransactionType.WITHDRAWAL_REFUND
        )
        result = await test_db.execute(stmt)
        refunds = list(result.scalars().all())
        assert len(refunds) == 1, "Should have exactly one refund entry"
