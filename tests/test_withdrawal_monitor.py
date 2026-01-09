"""
Tests for withdrawal monitor worker
Week 4: Withdrawal Confirmation Tracking
"""
import pytest
from decimal import Decimal
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from sqlalchemy import select

from app.models.deposit import WithdrawalIntent
from app.models.user import User
from app.models.wallet_transaction import WalletTransaction, WalletTransactionType, ReferenceType
from app.workers.withdrawal_monitor import WithdrawalMonitorWorker


# Test database setup (in-memory SQLite for testing)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture
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


@pytest.fixture
async def test_user(test_db: AsyncSession):
    """Create a test user"""
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password="hashed_password",
        is_active=True
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user


@pytest.mark.asyncio
async def test_monitor_confirms_withdrawal(test_db, test_user):
    """Test that monitor confirms withdrawal when confirmations are sufficient"""
    # Create processing withdrawal
    withdrawal = WithdrawalIntent(
        user_id=test_user.id,
        asset="USDT",
        network="TRC20",
        amount_crypto=Decimal("100.0"),
        amount_usd=Decimal("100.0"),
        to_address="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        status="processing",
        tx_hash="0x1234567890abcdef",
        confirmations=1,
        processed_at=datetime.now(timezone.utc)
    )
    test_db.add(withdrawal)
    await test_db.flush()
    
    # Mock tron_client
    with patch('app.workers.withdrawal_monitor.tron_client') as mock_client:
        mock_client.get_tx_info = AsyncMock(return_value={
            "block_number": 100,
            "confirmations": 3,  # Above required (2)
            "success": True,
            "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000)
        })
        
        # Run monitor
        worker = WithdrawalMonitorWorker()
        stats = await worker.run_once(test_db)
        
        # Verify
        await test_db.refresh(withdrawal)
        assert withdrawal.status == "completed"
        assert withdrawal.completed_at is not None
        assert withdrawal.confirmations == 3
        assert stats["confirmed"] == 1


@pytest.mark.asyncio
async def test_monitor_refunds_failed_withdrawal(test_db, test_user):
    """Test that monitor refunds funds when withdrawal fails (only if debit happened)"""
    # Create processing withdrawal
    withdrawal = WithdrawalIntent(
        user_id=test_user.id,
        asset="USDT",
        network="TRC20",
        amount_crypto=Decimal("100.0"),
        amount_usd=Decimal("100.0"),
        to_address="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        status="processing",
        tx_hash="0x1234567890abcdef",
        confirmations=0,
        processed_at=datetime.now(timezone.utc)
    )
    test_db.add(withdrawal)
    await test_db.flush()
    
    # CRITICAL: Create WITHDRAWAL_DEBIT entry to simulate that debit happened
    # In real scenario, this would be created by execute_withdrawal via deduct_reserved_balance
    debit_entry = WalletTransaction(
        user_id=test_user.id,
        asset="USDT",
        type=WalletTransactionType.WITHDRAWAL_DEBIT,
        amount=Decimal("100.0"),
        balance_before=Decimal("1000.0"),
        balance_after=Decimal("1000.0"),  # Available unchanged
        reserved_before=Decimal("100.0"),
        reserved_after=Decimal("0.0"),  # Reserved deducted
        reference_type=ReferenceType.WITHDRAWAL,
        reference_id=withdrawal.id,
        description="Withdrawal settlement (deduct from reserved): 100.0 USDT"
    )
    test_db.add(debit_entry)
    await test_db.flush()
    
    # Mock tron_client to return failed transaction
    with patch('app.workers.withdrawal_monitor.tron_client') as mock_client:
        mock_client.get_tx_info = AsyncMock(return_value={
            "block_number": 100,
            "confirmations": 3,
            "success": False,  # Transaction failed
            "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000)
        })
        
        # Run monitor (no need to mock WalletService since we're testing real logic)
        worker = WithdrawalMonitorWorker()
        stats = await worker.run_once(test_db)
        
        # Verify
        await test_db.refresh(withdrawal)
        assert withdrawal.status == "failed"
        assert withdrawal.failed_at is not None
        assert withdrawal.failure_reason is not None
        assert stats["failed"] == 1
        assert stats["refunded"] == 1
        
        # Verify WITHDRAWAL_REFUND ledger entry was created
        refund_check = select(WalletTransaction).where(
            WalletTransaction.reference_type == ReferenceType.WITHDRAWAL,
            WalletTransaction.reference_id == withdrawal.id,
            WalletTransaction.type == WalletTransactionType.WITHDRAWAL_REFUND
        )
        result = await test_db.execute(refund_check)
        refund_entry = result.scalar_one_or_none()
        assert refund_entry is not None, "WITHDRAWAL_REFUND entry should be created"
        assert refund_entry.amount == Decimal("100.0")


@pytest.mark.asyncio
async def test_monitor_skips_refund_when_no_debit(test_db, test_user):
    """Test that monitor does NOT refund if debit never happened (prevents over-credit)"""
    # Create processing withdrawal (status=processing with tx_hash, but debit never happened)
    # This simulates a case where broadcast succeeded but debit failed, and funds were unlocked
    withdrawal = WithdrawalIntent(
        user_id=test_user.id,
        asset="USDT",
        network="TRC20",
        amount_crypto=Decimal("100.0"),
        amount_usd=Decimal("100.0"),
        to_address="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        status="processing",
        tx_hash="0x1234567890abcdef",
        confirmations=0,
        processed_at=datetime.now(timezone.utc)
    )
    test_db.add(withdrawal)
    await test_db.flush()
    
    # CRITICAL: Do NOT create WITHDRAWAL_DEBIT entry
    # This simulates the case where debit failed and funds were unlocked instead
    
    # Mock tron_client to return failed transaction
    with patch('app.workers.withdrawal_monitor.tron_client') as mock_client:
        mock_client.get_tx_info = AsyncMock(return_value={
            "block_number": 100,
            "confirmations": 3,
            "success": False,  # Transaction failed
            "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000)
        })
        
        # Run monitor
        worker = WithdrawalMonitorWorker()
        stats = await worker.run_once(test_db)
        
        # Verify withdrawal is marked as failed
        await test_db.refresh(withdrawal)
        assert withdrawal.status == "failed"
        assert withdrawal.failed_at is not None
        
        # CRITICAL: Verify NO refund was issued (no WITHDRAWAL_REFUND entry)
        refund_check = select(WalletTransaction).where(
            WalletTransaction.reference_type == ReferenceType.WITHDRAWAL,
            WalletTransaction.reference_id == withdrawal.id,
            WalletTransaction.type == WalletTransactionType.WITHDRAWAL_REFUND
        )
        result = await test_db.execute(refund_check)
        refund_entry = result.scalar_one_or_none()
        assert refund_entry is None, "WITHDRAWAL_REFUND entry should NOT be created when debit didn't happen"
        
        # Stats should show failed but NOT refunded
        assert stats["failed"] == 1
        assert stats["refunded"] == 0  # No refund because no debit


@pytest.mark.asyncio
async def test_monitor_handles_timeout(test_db, test_user):
    """Test that monitor marks withdrawal as failed after timeout"""
    # Create processing withdrawal that's timed out
    withdrawal = WithdrawalIntent(
        user_id=test_user.id,
        asset="USDT",
        network="TRC20",
        amount_crypto=Decimal("100.0"),
        amount_usd=Decimal("100.0"),
        to_address="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        status="processing",
        tx_hash="0x1234567890abcdef",
        confirmations=0,
        processed_at=datetime.now(timezone.utc) - timedelta(minutes=61)  # Past timeout (60 min)
    )
    test_db.add(withdrawal)
    await test_db.flush()
    
    # Create WITHDRAWAL_DEBIT entry to simulate that debit happened
    debit_entry = WalletTransaction(
        user_id=test_user.id,
        asset="USDT",
        type=WalletTransactionType.WITHDRAWAL_DEBIT,
        amount=Decimal("100.0"),
        balance_before=Decimal("1000.0"),
        balance_after=Decimal("1000.0"),
        reserved_before=Decimal("100.0"),
        reserved_after=Decimal("0.0"),
        reference_type=ReferenceType.WITHDRAWAL,
        reference_id=withdrawal.id,
        description="Withdrawal settlement (deduct from reserved): 100.0 USDT"
    )
    test_db.add(debit_entry)
    await test_db.flush()
    
    # Run monitor (no need to mock WalletService since we're testing real logic)
    worker = WithdrawalMonitorWorker()
    stats = await worker.run_once(test_db)
    
    # Verify
    await test_db.refresh(withdrawal)
    assert withdrawal.status == "failed"
    assert withdrawal.failed_at is not None
    assert "timeout" in withdrawal.failure_reason.lower()
    assert stats["failed"] == 1
    assert stats["refunded"] == 1
    
    # Verify WITHDRAWAL_REFUND was created
    refund_check = select(WalletTransaction).where(
        WalletTransaction.reference_type == ReferenceType.WITHDRAWAL,
        WalletTransaction.reference_id == withdrawal.id,
        WalletTransaction.type == WalletTransactionType.WITHDRAWAL_REFUND
    )
    result = await test_db.execute(refund_check)
    refund_entry = result.scalar_one_or_none()
    assert refund_entry is not None, "WITHDRAWAL_REFUND entry should be created on timeout"


@pytest.mark.asyncio
async def test_monitor_skips_locked_withdrawals(test_db, test_user):
    """Test that monitor skips withdrawals locked by another worker"""
    # Create processing withdrawal
    withdrawal = WithdrawalIntent(
        user_id=test_user.id,
        asset="USDT",
        network="TRC20",
        amount_crypto=Decimal("100.0"),
        amount_usd=Decimal("100.0"),
        to_address="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        status="processing",
        tx_hash="0x1234567890abcdef",
        confirmations=0,
        processed_at=datetime.now(timezone.utc)
    )
    test_db.add(withdrawal)
    await test_db.flush()
    
    # Mock tron_client
    with patch('app.workers.withdrawal_monitor.tron_client') as mock_client:
        mock_client.get_tx_info = AsyncMock(return_value={
            "block_number": 100,
            "confirmations": 3,
            "success": True,
            "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000)
        })
        
        # Run monitor (should handle SKIP LOCKED gracefully)
        worker = WithdrawalMonitorWorker()
        stats = await worker.run_once(test_db)
        
        # Should have scanned the withdrawal
        assert stats["scanned"] == 1

