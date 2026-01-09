"""
Tests for withdrawal execution service
Week 4: Withdrawal Execution
"""
import pytest
from decimal import Decimal
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.deposit import WithdrawalIntent
from app.models.user import User
from app.services.withdrawal_execution_service import WithdrawalExecutionService
from app.models.wallet_transaction import ReferenceType


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
async def test_execute_withdrawal_success(test_db, test_user):
    """Test successful withdrawal execution"""
    # Create approved withdrawal
    withdrawal = WithdrawalIntent(
        user_id=test_user.id,
        asset="USDT",
        network="TRC20",
        amount_crypto=Decimal("100.0"),
        amount_usd=Decimal("100.0"),
        to_address="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        status="approved"
    )
    test_db.add(withdrawal)
    await test_db.flush()
    
    # Mock tron_send_service
    with patch('app.services.withdrawal_execution_service.tron_send_service') as mock_send:
        mock_send.send_usdt_trc20 = AsyncMock(return_value={
            "tx_hash": "0x1234567890abcdef",
            "raw": {}
        })
        mock_send.get_hot_wallet_balance = MagicMock(return_value=Decimal("1000.0"))
        
        # Mock wallet service - use deduct_reserved_balance (new method)
        with patch('app.services.withdrawal_execution_service.WalletService') as mock_wallet:
            mock_wallet.deduct_reserved_balance = AsyncMock()
            
            # Execute withdrawal
            tx_hash = await WithdrawalExecutionService.execute_withdrawal(
                withdrawal_id=withdrawal.id,
                db=test_db
            )
        
        # Verify
        assert tx_hash == "0x1234567890abcdef"
        await test_db.refresh(withdrawal)
        assert withdrawal.tx_hash == "0x1234567890abcdef"
        assert withdrawal.status == "processing"
        assert withdrawal.processed_at is not None
        
        # Verify wallet service was called with new method
        mock_wallet.deduct_reserved_balance.assert_called_once()


@pytest.mark.asyncio
async def test_execute_withdrawal_idempotent(test_db, test_user):
    """Test that executing twice doesn't send twice (idempotency)"""
    # Create withdrawal with existing tx_hash
    withdrawal = WithdrawalIntent(
        user_id=test_user.id,
        asset="USDT",
        network="TRC20",
        amount_crypto=Decimal("100.0"),
        amount_usd=Decimal("100.0"),
        to_address="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        status="processing",
        tx_hash="0xexisting_hash"
    )
    test_db.add(withdrawal)
    await test_db.flush()
    
    # Mock tron_send_service
    with patch('app.services.withdrawal_execution_service.tron_send_service') as mock_send:
        mock_send.send_usdt_trc20 = AsyncMock()
        
        # Execute withdrawal (should return existing tx_hash without sending)
        tx_hash = await WithdrawalExecutionService.execute_withdrawal(
            withdrawal_id=withdrawal.id,
            db=test_db
        )
        
        # Verify
        assert tx_hash == "0xexisting_hash"
        mock_send.send_usdt_trc20.assert_not_called()


@pytest.mark.asyncio
async def test_execute_withdrawal_not_approved(test_db, test_user):
    """Test that only approved withdrawals can be executed"""
    # Create pending withdrawal
    withdrawal = WithdrawalIntent(
        user_id=test_user.id,
        asset="USDT",
        network="TRC20",
        amount_crypto=Decimal("100.0"),
        amount_usd=Decimal("100.0"),
        to_address="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        status="pending"
    )
    test_db.add(withdrawal)
    await test_db.flush()
    
    # Attempt to execute (should fail)
    with pytest.raises(ValueError, match="status is 'pending'"):
        await WithdrawalExecutionService.execute_withdrawal(
            withdrawal_id=withdrawal.id,
            db=test_db
        )


@pytest.mark.asyncio
async def test_execute_withdrawal_insufficient_hot_wallet_balance(test_db, test_user):
    """Test that execution fails if hot wallet has insufficient balance"""
    # Create approved withdrawal
    withdrawal = WithdrawalIntent(
        user_id=test_user.id,
        asset="USDT",
        network="TRC20",
        amount_crypto=Decimal("1000.0"),
        amount_usd=Decimal("1000.0"),
        to_address="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        status="approved"
    )
    test_db.add(withdrawal)
    await test_db.flush()
    
    # Mock tron_send_service with insufficient balance
    with patch('app.services.withdrawal_execution_service.tron_send_service') as mock_send:
        mock_send.get_hot_wallet_balance = MagicMock(return_value=Decimal("100.0"))  # Less than 1000
        
        # Attempt to execute (should fail)
        with pytest.raises(ValueError, match="Insufficient hot wallet balance"):
            await WithdrawalExecutionService.execute_withdrawal(
                withdrawal_id=withdrawal.id,
                db=test_db
            )


@pytest.mark.asyncio
async def test_execute_withdrawal_failed_sends_refund(test_db, test_user):
    """Test that failed execution marks withdrawal as failed"""
    # Create approved withdrawal
    withdrawal = WithdrawalIntent(
        user_id=test_user.id,
        asset="USDT",
        network="TRC20",
        amount_crypto=Decimal("100.0"),
        amount_usd=Decimal("100.0"),
        to_address="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        status="approved"
    )
    test_db.add(withdrawal)
    await test_db.flush()
    
    # Mock tron_send_service to raise exception
    with patch('app.services.withdrawal_execution_service.tron_send_service') as mock_send:
        mock_send.get_hot_wallet_balance = MagicMock(return_value=Decimal("1000.0"))
        mock_send.send_usdt_trc20 = AsyncMock(side_effect=Exception("Network error"))
        
        # Mock wallet service to verify unlock is called
        with patch('app.services.withdrawal_execution_service.WalletService') as mock_wallet:
            mock_wallet.unlock_balance = AsyncMock()
            
            # Attempt to execute (should fail and mark as failed)
            with pytest.raises(Exception, match="Failed to broadcast"):
                await WithdrawalExecutionService.execute_withdrawal(
                    withdrawal_id=withdrawal.id,
                    db=test_db
                )
            
            # Verify unlock_balance was called to refund reserved funds
            mock_wallet.unlock_balance.assert_called_once()
    
    await test_db.refresh(withdrawal)
    assert withdrawal.status == "failed"
    assert withdrawal.failed_at is not None
    assert withdrawal.failure_reason is not None

