"""
Tests for Deposit Monitor Worker
Tests status transitions and deposit detection
"""
import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select

from app.models.deposit import DepositIntent
from app.models.user import User
from app.workers.deposit_monitor import deposit_monitor_worker
from app.integrations.tron_client import tron_client


TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture
async def test_db():
    """Create test database session"""
    from app.models import Base
    from sqlalchemy.pool import StaticPool
    
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    
    # Create all tables
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


@pytest.fixture
async def pending_deposit_intent(test_db: AsyncSession, test_user: User):
    """Create a pending deposit intent"""
    expires_at = datetime.utcnow() + timedelta(hours=24)
    intent = DepositIntent(
        user_id=test_user.id,
        asset="USDT",
        network="TRC20",
        amount_quote_fiat=Decimal("100.00"),
        generated_address="TTestAddress123456789",
        expires_at=expires_at,
        status="pending",
        required_confirmations=2
    )
    test_db.add(intent)
    await test_db.commit()
    await test_db.refresh(intent)
    return intent


@pytest.mark.asyncio
async def test_pending_intent_with_no_tx_remains_pending(test_db: AsyncSession, pending_deposit_intent: DepositIntent):
    """
    Test that pending intent with no transaction remains pending
    """
    # Mock TronClient to return no transfers
    original_get_transfers = tron_client.get_usdt_transfers_to_address
    
    async def mock_get_transfers(*args, **kwargs):
        return []
    
    tron_client.get_usdt_transfers_to_address = mock_get_transfers
    
    try:
        stats = await deposit_monitor_worker.run_once(test_db)
        
        # Refresh intent
        stmt = select(DepositIntent).where(DepositIntent.id == pending_deposit_intent.id)
        result = await test_db.execute(stmt)
        intent = result.scalar_one()
        
        assert intent.status == "pending"
        assert intent.tx_hash is None
        assert stats["detected"] == 0
    finally:
        tron_client.get_usdt_transfers_to_address = original_get_transfers


@pytest.mark.asyncio
async def test_tx_appears_status_becomes_detected(test_db: AsyncSession, pending_deposit_intent: DepositIntent):
    """
    Test that when a transaction appears, status becomes detected
    """
    # Mock TronClient to return a matching transfer
    original_get_transfers = tron_client.get_usdt_transfers_to_address
    
    async def mock_get_transfers(to_address, since_ts=None, limit=50):
        return [{
            "tx_hash": "test_tx_hash_123",
            "from": "TFromAddress123",
            "to": pending_deposit_intent.generated_address,
            "amount": Decimal("100.00"),
            "block_number": 1000,
            "timestamp": int(datetime.utcnow().timestamp() * 1000)
        }]
    
    tron_client.get_usdt_transfers_to_address = mock_get_transfers
    
    try:
        stats = await deposit_monitor_worker.run_once(test_db)
        
        # Refresh intent
        stmt = select(DepositIntent).where(DepositIntent.id == pending_deposit_intent.id)
        result = await test_db.execute(stmt)
        intent = result.scalar_one()
        
        assert intent.status == "detected"
        assert intent.tx_hash == "test_tx_hash_123"
        assert intent.amount_crypto == Decimal("100.00")
        assert intent.detected_at is not None
        assert stats["detected"] == 1
    finally:
        tron_client.get_usdt_transfers_to_address = original_get_transfers


@pytest.mark.asyncio
async def test_confirmations_reach_threshold_confirmed(test_db: AsyncSession):
    """
    Test that when confirmations reach threshold, status becomes confirmed
    """
    # Create a detected intent
    expires_at = datetime.utcnow() + timedelta(hours=24)
    intent = DepositIntent(
        user_id=1,  # Assuming test_user.id is 1
        asset="USDT",
        network="TRC20",
        amount_quote_fiat=Decimal("100.00"),
        amount_crypto=Decimal("100.00"),
        generated_address="TTestAddress123456789",
        expires_at=expires_at,
        status="detected",
        tx_hash="test_tx_hash_123",
        confirmations=0,
        required_confirmations=2,
        detected_at=datetime.utcnow()
    )
    test_db.add(intent)
    await test_db.commit()
    await test_db.refresh(intent)
    
    # Mock TronClient methods
    original_get_tx_info = tron_client.get_tx_info
    original_get_current_block = tron_client.get_current_block
    
    async def mock_get_tx_info(tx_hash):
        return {
            "block_number": 1000,
            "timestamp": int(datetime.utcnow().timestamp() * 1000),
            "success": True,
            "confirmations": 3  # Above threshold
        }
    
    async def mock_get_current_block():
        return 1002  # Current block is 1002, tx is at 1000, so 3 confirmations
    
    tron_client.get_tx_info = mock_get_tx_info
    tron_client.get_current_block = mock_get_current_block
    
    try:
        stats = await deposit_monitor_worker.run_once(test_db)
        
        # Refresh intent
        stmt = select(DepositIntent).where(DepositIntent.id == intent.id)
        result = await test_db.execute(stmt)
        updated_intent = result.scalar_one()
        
        # Worker now auto-settles confirmed deposits
        # Status should be "settled" (not just "confirmed")
        assert updated_intent.status == "settled", f"Expected 'settled' but got '{updated_intent.status}'"
        # Confirmations should be >= required_confirmations (2)
        assert updated_intent.confirmations >= intent.required_confirmations, \
            f"Expected confirmations >= {intent.required_confirmations}, got {updated_intent.confirmations}"
        assert updated_intent.confirmed_at is not None
        assert updated_intent.settled_at is not None  # Should be settled
        assert stats["confirmed"] == 1
        assert stats["settled"] == 1  # Should also be settled
    finally:
        tron_client.get_tx_info = original_get_tx_info
        tron_client.get_current_block = original_get_current_block


@pytest.mark.asyncio
async def test_expired_intents_skipped(test_db: AsyncSession):
    """
    Test that expired intents are skipped
    """
    # Create an expired intent
    expires_at = datetime.utcnow() - timedelta(hours=1)  # Expired 1 hour ago
    intent = DepositIntent(
        user_id=1,
        asset="USDT",
        network="TRC20",
        amount_quote_fiat=Decimal("100.00"),
        generated_address="TTestAddress123456789",
        expires_at=expires_at,
        status="pending",
        required_confirmations=2
    )
    test_db.add(intent)
    await test_db.commit()
    await test_db.refresh(intent)
    
    stats = await deposit_monitor_worker.run_once(test_db)
    
    # Refresh intent
    stmt = select(DepositIntent).where(DepositIntent.id == intent.id)
    result = await test_db.execute(stmt)
    updated_intent = result.scalar_one()
    
    # Status should remain unchanged (expired intents are skipped)
    assert updated_intent.status == "pending"
    assert stats["scanned"] == 0  # Expired intents are not scanned

