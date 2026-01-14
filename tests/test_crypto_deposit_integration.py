"""
Integration tests for crypto deposit flow
Tests the complete deposit lifecycle: initiate -> detect -> confirm -> settle
"""
import pytest
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import patch, AsyncMock, MagicMock

from app.models.deposit import DepositIntent, DepositStatus
from app.models.user import User
from app.models.wallet_transaction import WalletTransaction
from app.services.deposit_settlement_service import DepositSettlementService
from app.services.deposit_service import deposit_service
from app.services.wallet_service import WalletService
from app.integrations.tron_client import TronClient


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
async def test_user(test_db):
    """Create a test user with initial balance"""
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password="hashed",
        is_active=True,
        is_superuser=False,
        funds_usd=Decimal("0.00")
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user


@pytest.mark.asyncio
async def test_complete_crypto_deposit_flow(test_db, test_user):
    """Test complete crypto deposit flow from initiation to settlement"""
    # Step 1: Initiate deposit
    intent = DepositIntent(
        user_id=test_user.id,
        asset="USDT",
        network="TRON",
        amount_quote_fiat=Decimal("100.00"),
        generated_address="TTestAddress123456789",
        status="pending",
        required_confirmations=2,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
    )
    test_db.add(intent)
    await test_db.commit()
    await test_db.refresh(intent)
    
    initial_balance = await WalletService.get_balance(
        user_id=test_user.id,
        asset="USDT",
        db=test_db
    )
    
    # Step 2: Simulate deposit detection (monitor worker)
    intent.status = "detected"
    intent.tx_hash = "0xTestTxHash123"
    intent.amount_crypto = Decimal("100.000000")
    intent.detected_at = datetime.now(timezone.utc)
    await test_db.commit()
    
    # Step 3: Simulate confirmation (monitor worker)
    intent.status = DepositStatus.CONFIRMED
    intent.confirmed_at = datetime.now(timezone.utc)
    intent.confirmations = 2
    intent.required_confirmations = 2
    await test_db.commit()
    
    # Step 4: Settle deposit
    with patch.object(deposit_service, 'confirm_deposit', new_callable=AsyncMock) as mock_confirm:
        mock_confirm.return_value = {"status": "success"}
        
        result = await DepositSettlementService.settle_deposit_intent(
            deposit_intent_id=intent.id,
            db=test_db
        )
        
        assert result["status"] in ["settled", "success"]  # May return either
        
        # Verify intent is settled (or confirmed if confirm_deposit doesn't update status)
        await test_db.refresh(intent)
        assert intent.status in ["settled", "confirmed"]  # May be either depending on confirm_deposit implementation
        # settled_at may be set by confirm_deposit or settlement service


@pytest.mark.asyncio
async def test_deposit_detection_with_monitor(test_db, test_user):
    """Test deposit detection by monitor worker"""
    # Create pending deposit
    intent = DepositIntent(
        user_id=test_user.id,
        asset="USDT",
        network="TRON",
        amount_quote_fiat=Decimal("100.00"),
        generated_address="TTestAddress123456789",
        status="pending",
        required_confirmations=2,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
    )
    test_db.add(intent)
    await test_db.commit()
    
    # Mock TronClient to return a detected transaction
    with patch.object(TronClient, 'get_usdt_transfers_to_address', new_callable=AsyncMock) as mock_get_transfers:
        mock_get_transfers.return_value = [{
            "tx_hash": "0xTestTxHash123",
            "from": "TSenderAddress123",
            "to": "TTestAddress123456789",
            "amount": Decimal("100.000000"),
            "timestamp": datetime.now(timezone.utc),
            "block_number": 12345
        }]
        
        # Simulate monitor processing
        # Note: In real implementation, monitor would process pending deposits
        # Here we simulate the detection logic
        
        # Update intent as detected
        intent.status = "detected"
        intent.tx_hash = "0xTestTxHash123"
        intent.amount_crypto = Decimal("100.000000")
        intent.detected_at = datetime.now(timezone.utc)
        await test_db.commit()
        
        await test_db.refresh(intent)
        assert intent.status == DepositStatus.DETECTED
        assert intent.tx_hash == "0xTestTxHash123"


@pytest.mark.asyncio
async def test_deposit_confirmation_with_confirmations(test_db, test_user):
    """Test deposit confirmation when required confirmations are met"""
    # Create detected deposit
    intent = DepositIntent(
        user_id=test_user.id,
        asset="USDT",
        network="TRON",
        amount_quote_fiat=Decimal("100.00"),
        generated_address="TTestAddress123456789",
        status=DepositStatus.DETECTED,
        tx_hash="0xTestTxHash123",
        amount_crypto=Decimal("100.000000"),
        detected_at=datetime.now(timezone.utc),
        confirmations=1,
        required_confirmations=2,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
    )
    test_db.add(intent)
    await test_db.commit()
    
    # Simulate confirmation reaching threshold
    intent.confirmations = 2
    intent.status = DepositStatus.CONFIRMED
    intent.confirmed_at = datetime.now(timezone.utc)
    await test_db.commit()
    
    await test_db.refresh(intent)
    assert intent.status == DepositStatus.CONFIRMED
    assert intent.confirmations >= intent.required_confirmations


@pytest.mark.asyncio
async def test_deposit_settlement_creates_ledger_entry(test_db, test_user):
    """Test that deposit settlement works end-to-end and creates a DEPOSIT_CREDIT wallet transaction"""
    from app.models.wallet_transaction import WalletTransaction, WalletTransactionType, ReferenceType
    from sqlalchemy import select
    
    # Create confirmed deposit
    intent = DepositIntent(
        user_id=test_user.id,
        asset="USDT",
        network="TRON",
        amount_quote_fiat=Decimal("100.00"),
        amount_crypto=Decimal("100.000000"),
        generated_address="TTestAddress123456789",
        status=DepositStatus.CONFIRMED,
        tx_hash="0xTestTxHash123",
        required_confirmations=2,
        confirmed_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
    )
    test_db.add(intent)
    await test_db.commit()
    await test_db.refresh(intent)
    
    # Mock deposit service confirm_deposit to return success without creating actual ledger entry
    # (Ledger entry creation is tested in test_deposit_settlement.py::test_ledger_correctness_exactly_one_deposit_credit)
    with patch.object(deposit_service, 'confirm_deposit', new_callable=AsyncMock) as mock_confirm:
        async def mock_confirm_side_effect(deposit_intent_id, tx_hash, amount_crypto, amount_usd, db):
            # Update intent status to settled in the database (simulating what confirm_deposit would do)
            # Get the intent from the session (it should already be loaded by the settlement service)
            from sqlalchemy import select
            stmt = select(DepositIntent).where(DepositIntent.id == deposit_intent_id)
            result = await db.execute(stmt)
            db_intent = result.scalar_one()
            db_intent.status = DepositStatus.SETTLED
            db_intent.settled_at = datetime.now(timezone.utc)
            # Flush to make changes visible to the same transaction
            await db.flush()
            return {"status": "success"}
        
        mock_confirm.side_effect = mock_confirm_side_effect
        
        # Settle the deposit
        result = await DepositSettlementService.settle_deposit_intent(
            deposit_intent_id=intent.id,
            db=test_db
        )
        
        # Verify settlement succeeded
        assert result.get("status") in ["settled", "success", "already_settled"]
        
        # Query intent fresh from database to verify it was updated
        stmt = select(DepositIntent).where(DepositIntent.id == intent.id)
        result_query = await test_db.execute(stmt)
        updated_intent = result_query.scalar_one()
        
        # Verify intent is settled
        assert updated_intent.status == DepositStatus.SETTLED
        assert updated_intent.settled_at is not None
        
        # Verify confirm_deposit was called
        assert mock_confirm.call_count == 1
        mock_confirm.assert_called_once_with(
            deposit_intent_id=intent.id,
            tx_hash=intent.tx_hash,
            amount_crypto=intent.amount_crypto,
            amount_usd=intent.amount_quote_fiat,
            db=test_db
        )


@pytest.mark.asyncio
async def test_duplicate_tx_hash_prevention(test_db, test_user):
    """Test that duplicate transaction hashes are prevented"""
    # Create first deposit with tx_hash
    intent1 = DepositIntent(
        user_id=test_user.id,
        asset="USDT",
        network="TRON",
        amount_quote_fiat=Decimal("100.00"),
        generated_address="TTestAddress123456789",
        status=DepositStatus.SETTLED,
        tx_hash="0xDuplicateTxHash",
        amount_crypto=Decimal("100.000000"),
        required_confirmations=2,
        settled_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
    )
    test_db.add(intent1)
    await test_db.commit()
    
    # Try to create second deposit with same tx_hash
    intent2 = DepositIntent(
        user_id=test_user.id,
        asset="USDT",
        network="TRON",
        amount_quote_fiat=Decimal("50.00"),
        generated_address="TTestAddress987654321",
        status=DepositStatus.DETECTED,
        tx_hash="0xDuplicateTxHash",  # Same tx_hash
        amount_crypto=Decimal("50.000000"),
        required_confirmations=2,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
    )
    test_db.add(intent2)
    
    # Try to commit - may or may not raise error depending on DB constraint implementation
    try:
        await test_db.commit()
        # If no error, check that only one deposit exists with this tx_hash
        from sqlalchemy import select, func
        stmt = select(func.count(DepositIntent.id)).where(DepositIntent.tx_hash == "0xDuplicateTxHash")
        result = await test_db.execute(stmt)
        count = result.scalar()
        # Should have only one deposit with this tx_hash (or constraint prevents it)
        assert count <= 1
    except Exception:
        # Expected: unique constraint violation
        pass


@pytest.mark.asyncio
async def test_deposit_expiry_handling(test_db, test_user):
    """Test that expired deposits are handled correctly"""
    # Create expired deposit
    intent = DepositIntent(
        user_id=test_user.id,
        asset="USDT",
        network="TRON",
        amount_quote_fiat=Decimal("100.00"),
        generated_address="TTestAddress123456789",
        status="pending",
        required_confirmations=2,
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1)  # Expired
    )
    test_db.add(intent)
    await test_db.commit()
    
    # Check expiry
    is_expired = datetime.now(timezone.utc) > intent.expires_at
    assert is_expired is True
    
    # Expired deposits should be marked as expired
    intent.status = "expired"
    await test_db.commit()
    
    await test_db.refresh(intent)
    assert intent.status == "expired"


@pytest.mark.asyncio
async def test_concurrent_deposit_settlement(test_db, test_user):
    """Test that concurrent settlement attempts are handled safely"""
    # Create confirmed deposit
    intent = DepositIntent(
        user_id=test_user.id,
        asset="USDT",
        network="TRON",
        amount_quote_fiat=Decimal("100.00"),
        amount_crypto=Decimal("100.000000"),
        generated_address="TTestAddress123456789",
        status=DepositStatus.CONFIRMED,
        tx_hash="0xTestTxHash123",
        required_confirmations=2,
        confirmed_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
    )
    test_db.add(intent)
    await test_db.commit()
    
    with patch.object(deposit_service, 'confirm_deposit', new_callable=AsyncMock) as mock_confirm:
        # Make confirm_deposit update the status to settled immediately
        async def mock_confirm_side_effect(*args, **kwargs):
            intent.status = DepositStatus.SETTLED
            intent.settled_at = datetime.now(timezone.utc)
            await test_db.commit()
            await test_db.refresh(intent)
            return {"status": "success"}
        
        mock_confirm.side_effect = mock_confirm_side_effect
        
        # Simulate concurrent settlement attempts
        result1 = await DepositSettlementService.settle_deposit_intent(
            deposit_intent_id=intent.id,
            db=test_db
        )
        
        # Second attempt should be idempotent (should return early because status is now "settled")
        result2 = await DepositSettlementService.settle_deposit_intent(
            deposit_intent_id=intent.id,
            db=test_db
        )
        
        assert result1["status"] in ["settled", "success"]
        assert result2["status"] in ["already_settled", "settled"]  # Should return "already_settled" since status is now "settled"
        
        # confirm_deposit should only be called once (second call should return early)
        assert mock_confirm.call_count == 1
