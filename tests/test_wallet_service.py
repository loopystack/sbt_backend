"""
Basic tests for wallet service operations
Tests balance locking, unlocking, crediting, and ledger integrity
"""
import pytest
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.wallet_transaction import WalletTransaction, WalletTransactionType, ReferenceType
from app.services.wallet_service import wallet_service


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


@pytest.mark.asyncio
async def test_credit_balance(test_db: AsyncSession):
    """Test crediting balance to user wallet"""
    user_id = 1
    asset = "USDT"
    amount = Decimal("100.00")
    
    # Credit balance
    ledger_entry = await wallet_service.credit_balance(
        user_id=user_id,
        asset=asset,
        amount=amount,
        db=test_db,
        reference_type=ReferenceType.DEPOSIT,
        reference_id=1
    )
    
    await test_db.commit()
    
    # Verify balance
    balance_info = await wallet_service.get_balance(user_id, asset, test_db)
    assert balance_info["available"] == amount
    assert balance_info["reserved"] == Decimal("0")
    assert balance_info["total"] == amount
    
    # Verify ledger entry
    assert ledger_entry.type == WalletTransactionType.DEPOSIT_CREDIT
    assert ledger_entry.amount == amount
    assert ledger_entry.balance_after == amount


@pytest.mark.asyncio
async def test_lock_balance(test_db: AsyncSession):
    """Test locking balance for withdrawal"""
    user_id = 1
    asset = "USDT"
    credit_amount = Decimal("100.00")
    lock_amount = Decimal("50.00")
    
    # First credit balance
    await wallet_service.credit_balance(
        user_id=user_id,
        asset=asset,
        amount=credit_amount,
        db=test_db
    )
    await test_db.commit()
    
    # Lock balance
    ledger_entry = await wallet_service.lock_balance(
        user_id=user_id,
        asset=asset,
        amount=lock_amount,
        db=test_db,
        reference_type=ReferenceType.WITHDRAWAL,
        reference_id=1
    )
    await test_db.commit()
    
    # Verify balance
    balance_info = await wallet_service.get_balance(user_id, asset, test_db)
    assert balance_info["available"] == credit_amount - lock_amount
    assert balance_info["reserved"] == lock_amount
    assert balance_info["total"] == credit_amount
    
    # Verify ledger entry
    assert ledger_entry.type == WalletTransactionType.WITHDRAWAL_LOCK
    assert ledger_entry.amount == lock_amount


@pytest.mark.asyncio
async def test_lock_insufficient_balance(test_db: AsyncSession):
    """Test that locking more than available balance fails"""
    user_id = 1
    asset = "USDT"
    credit_amount = Decimal("100.00")
    lock_amount = Decimal("150.00")
    
    # Credit balance
    await wallet_service.credit_balance(
        user_id=user_id,
        asset=asset,
        amount=credit_amount,
        db=test_db
    )
    await test_db.commit()
    
    # Try to lock more than available - should fail
    with pytest.raises(Exception):  # HTTPException or ValueError
        await wallet_service.lock_balance(
            user_id=user_id,
            asset=asset,
            amount=lock_amount,
            db=test_db
        )


@pytest.mark.asyncio
async def test_unlock_balance(test_db: AsyncSession):
    """Test unlocking reserved balance"""
    user_id = 1
    asset = "USDT"
    credit_amount = Decimal("100.00")
    lock_amount = Decimal("50.00")
    
    # Credit and lock
    await wallet_service.credit_balance(
        user_id=user_id,
        asset=asset,
        amount=credit_amount,
        db=test_db
    )
    await wallet_service.lock_balance(
        user_id=user_id,
        asset=asset,
        amount=lock_amount,
        db=test_db
    )
    await test_db.commit()
    
    # Unlock
    ledger_entry = await wallet_service.unlock_balance(
        user_id=user_id,
        asset=asset,
        amount=lock_amount,
        db=test_db
    )
    await test_db.commit()
    
    # Verify balance restored
    balance_info = await wallet_service.get_balance(user_id, asset, test_db)
    assert balance_info["available"] == credit_amount
    assert balance_info["reserved"] == Decimal("0")
    
    # Verify ledger entry
    assert ledger_entry.type == WalletTransactionType.WITHDRAWAL_UNLOCK


@pytest.mark.asyncio
async def test_debit_balance(test_db: AsyncSession):
    """Test debiting balance (for completed withdrawal)"""
    user_id = 1
    asset = "USDT"
    credit_amount = Decimal("100.00")
    debit_amount = Decimal("30.00")
    
    # Credit balance
    await wallet_service.credit_balance(
        user_id=user_id,
        asset=asset,
        amount=credit_amount,
        db=test_db
    )
    await test_db.commit()
    
    # Debit balance
    ledger_entry = await wallet_service.debit_balance(
        user_id=user_id,
        asset=asset,
        amount=debit_amount,
        db=test_db,
        reference_type=ReferenceType.WITHDRAWAL,
        reference_id=1
    )
    await test_db.commit()
    
    # Verify balance
    balance_info = await wallet_service.get_balance(user_id, asset, test_db)
    assert balance_info["available"] == credit_amount - debit_amount
    assert balance_info["total"] == credit_amount - debit_amount
    
    # Verify ledger entry
    assert ledger_entry.type == WalletTransactionType.WITHDRAWAL_DEBIT


@pytest.mark.asyncio
async def test_ledger_integrity(test_db: AsyncSession):
    """Test that all balance changes create ledger entries"""
    user_id = 1
    asset = "USDT"
    
    # Perform multiple operations
    await wallet_service.credit_balance(user_id, asset, Decimal("100"), db=test_db)
    await wallet_service.lock_balance(user_id, asset, Decimal("50"), db=test_db)
    await wallet_service.unlock_balance(user_id, asset, Decimal("30"), db=test_db)
    await wallet_service.debit_balance(user_id, asset, Decimal("20"), db=test_db)
    await test_db.commit()
    
    # Get all transactions
    transactions = await wallet_service.get_transactions(user_id, asset, limit=100, db=test_db)
    
    # Should have 4 ledger entries
    assert len(transactions) == 4
    
    # Verify transaction types
    types = [tx.type for tx in transactions]
    assert WalletTransactionType.DEPOSIT_CREDIT in types
    assert WalletTransactionType.WITHDRAWAL_LOCK in types
    assert WalletTransactionType.WITHDRAWAL_UNLOCK in types
    assert WalletTransactionType.WITHDRAWAL_DEBIT in types

