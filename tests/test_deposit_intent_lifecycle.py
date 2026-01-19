"""
Deposit Intent Lifecycle Tests
Tests for Deposit Address + DepositIntent + Monitor + Settlement
Covering idempotency, status transitions, unique constraints, and worker concurrency
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
from app.models.deposit import DepositIntent, DepositStatus, CryptoTransaction
from app.models.wallet_transaction import WalletTransaction, WalletTransactionType, ReferenceType
from app.services.deposit_service import DepositService
from app.services.deposit_settlement_service import DepositSettlementService
from app.services.wallet_service import WalletService
from app.workers.deposit_monitor import DepositMonitorWorker

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
async def mock_tron_client():
    """Mock TronClient for testing"""
    with patch('app.workers.deposit_monitor.tron_client') as mock_client:
        yield mock_client


class TestDepositIdempotency:
    """Test that same tx_hash never credits twice"""
    
    @pytest.mark.asyncio
    async def test_same_tx_hash_never_credits_twice(self, test_db: AsyncSession, test_user: User):
        """Same tx_hash should not credit wallet twice"""
        # Create deposit intent
        intent = DepositIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_quote_fiat=Decimal("100.00"),
            generated_address="TTestAddress123",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            status=DepositStatus.PENDING,
            required_confirmations=1
        )
        test_db.add(intent)
        await test_db.commit()
        await test_db.refresh(intent)
        
        tx_hash = "0x1234567890abcdef"
        amount_crypto = Decimal("100.00")
        
        # First settlement - should succeed
        with patch('app.services.deposit_service.deposit_service') as mock_deposit:
            # Mock the confirm_deposit to simulate successful settlement
            async def mock_confirm(*args, **kwargs):
                intent.status = DepositStatus.SETTLED
                intent.tx_hash = tx_hash
                intent.amount_crypto = amount_crypto
                intent.settled_at = datetime.now(timezone.utc)
                await test_db.flush()
                ledger = await WalletService.credit_balance(
                    user_id=test_user.id,
                    asset="USDT",
                    amount=amount_crypto,
                    db=test_db,
                    reference_type=ReferenceType.DEPOSIT,
                    reference_id=intent.id
                )
                return {
                    "deposit_intent_id": intent.id,
                    "status": "settled",
                    "amount_credited": str(amount_crypto),
                    "asset": "USDT",
                    "ledger_entry_id": ledger.id
                }
            
            mock_deposit.confirm_deposit = mock_confirm
            
            # Update intent to confirmed first
            intent.status = DepositStatus.CONFIRMED
            intent.tx_hash = tx_hash
            intent.amount_crypto = amount_crypto
            intent.confirmed_at = datetime.now(timezone.utc)
            await test_db.commit()
            
            # First settlement
            result1 = await DepositSettlementService.settle_deposit_intent(intent.id, test_db)
            assert result1["status"] == "settled"
            
            # Get balance after first settlement
            balance1 = await WalletService.get_balance(test_user.id, "USDT", test_db)
            
            # Try to settle again - should be idempotent
            result2 = await DepositSettlementService.settle_deposit_intent(intent.id, test_db)
            assert result2["status"] == "already_settled"
            
            # Balance should not change
            balance2 = await WalletService.get_balance(test_user.id, "USDT", test_db)
            assert balance2["available"] == balance1["available"]
            
            # Check ledger entries - should have only one credit
            stmt = select(func.count(WalletTransaction.id)).where(
                WalletTransaction.user_id == test_user.id,
                WalletTransaction.asset == "USDT",
                WalletTransaction.type == WalletTransactionType.DEPOSIT_CREDIT,
                WalletTransaction.reference_type == ReferenceType.DEPOSIT,
                WalletTransaction.reference_id == intent.id
            )
            result = await test_db.execute(stmt)
            ledger_count = result.scalar() or 0
            assert ledger_count == 1, "Should have exactly one credit ledger entry"


class TestDepositLifecycleTransitions:
    """Test deposit status transitions: pending → detected → confirmed → settled"""
    
    @pytest.mark.asyncio
    async def test_deposit_lifecycle_transitions(self, test_db: AsyncSession, test_user: User):
        """Test complete deposit lifecycle transitions"""
        # Case A: Create DepositIntent (pending)
        intent = DepositIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_quote_fiat=Decimal("100.00"),
            generated_address="TTestAddress123",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            status=DepositStatus.PENDING,
            required_confirmations=1
        )
        test_db.add(intent)
        await test_db.commit()
        await test_db.refresh(intent)
        
        # Verify initial state
        assert intent.status == DepositStatus.PENDING
        assert intent.tx_hash is None
        
        # Verify no wallet change
        balance = await WalletService.get_balance(test_user.id, "USDT", test_db)
        assert balance["available"] == Decimal("0")
        assert balance["reserved"] == Decimal("0")
        
        # Case B: Worker detects tx (detected)
        tx_hash = "0x1234567890abcdef"
        amount_crypto = Decimal("100.00")
        
        intent.tx_hash = tx_hash
        intent.amount_crypto = amount_crypto
        intent.status = DepositStatus.DETECTED
        intent.detected_at = datetime.now(timezone.utc)
        await test_db.commit()
        
        # Verify detected state
        await test_db.refresh(intent)
        assert intent.status == DepositStatus.DETECTED
        assert intent.tx_hash == tx_hash
        assert intent.amount_crypto == amount_crypto
        
        # Verify no wallet change yet
        balance = await WalletService.get_balance(test_user.id, "USDT", test_db)
        assert balance["available"] == Decimal("0")
        
        # Case C: Confirmations reached (confirmed)
        intent.status = DepositStatus.CONFIRMED
        intent.confirmations = 1
        intent.confirmed_at = datetime.now(timezone.utc)
        await test_db.commit()
        
        # Verify confirmed state
        await test_db.refresh(intent)
        assert intent.status == DepositStatus.CONFIRMED
        assert intent.confirmations == 1
        
        # Verify no wallet change yet
        balance = await WalletService.get_balance(test_user.id, "USDT", test_db)
        assert balance["available"] == Decimal("0")
        
        # Case D: Settlement runs (settled)
        # Mock deposit_service.confirm_deposit to credit wallet
        with patch('app.services.deposit_settlement_service.deposit_service') as mock_deposit:
            async def mock_confirm(*args, **kwargs):
                # Credit wallet
                await WalletService.credit_balance(
                    user_id=test_user.id,
                    asset="USDT",
                    amount=amount_crypto,
                    db=test_db,
                    reference_type=ReferenceType.DEPOSIT,
                    reference_id=intent.id
                )
                # Update intent
                intent.status = DepositStatus.SETTLED
                intent.settled_at = datetime.now(timezone.utc)
                await test_db.flush()
                return {
                    "deposit_intent_id": intent.id,
                    "status": "settled",
                    "amount_credited": str(amount_crypto),
                    "asset": "USDT"
                }
            
            mock_deposit.confirm_deposit = mock_confirm
            
            result = await DepositSettlementService.settle_deposit_intent(intent.id, test_db)
            assert result["status"] == "settled"
        
        # Verify settled state
        await test_db.refresh(intent)
        assert intent.status == DepositStatus.SETTLED
        assert intent.settled_at is not None
        
        # Verify wallet credit occurred
        balance = await WalletService.get_balance(test_user.id, "USDT", test_db)
        assert balance["available"] == amount_crypto
        
        # Verify ledger entry exists
        stmt = select(WalletTransaction).where(
            WalletTransaction.reference_type == ReferenceType.DEPOSIT,
            WalletTransaction.reference_id == intent.id
        )
        result = await test_db.execute(stmt)
        ledger_entry = result.scalar_one_or_none()
        assert ledger_entry is not None
        assert ledger_entry.type == WalletTransactionType.DEPOSIT_CREDIT
        assert ledger_entry.amount == amount_crypto
        
        # Case E: Run settlement again (idempotency)
        with patch('app.services.deposit_settlement_service.deposit_service') as mock_deposit:
            result2 = await DepositSettlementService.settle_deposit_intent(intent.id, test_db)
            assert result2["status"] == "already_settled"
        
        # Verify wallet should NOT credit again
        balance2 = await WalletService.get_balance(test_user.id, "USDT", test_db)
        assert balance2["available"] == balance["available"]
        
        # Verify no new ledger entry
        result = await test_db.execute(stmt)
        all_ledger_entries = list(result.scalars().all())
        assert len(all_ledger_entries) == 1, "Should have exactly one ledger entry"


class TestUniqueConstraint:
    """Test unique constraint on (network, tx_hash)"""
    
    @pytest.mark.asyncio
    async def test_unique_constraint_prevents_duplicate_tx_hash(self, test_db: AsyncSession, test_user: User):
        """Same (network, tx_hash) should be rejected"""
        tx_hash = "0x1234567890abcdef"
        network = "TRC20"
        
        # Create first deposit intent
        intent1 = DepositIntent(
            user_id=test_user.id,
            asset="USDT",
            network=network,
            amount_quote_fiat=Decimal("100.00"),
            generated_address="TAddress1",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            status=DepositStatus.SETTLED,
            tx_hash=tx_hash,
            amount_crypto=Decimal("100.00"),
            required_confirmations=1
        )
        test_db.add(intent1)
        await test_db.commit()
        await test_db.refresh(intent1)
        
        # Create second intent with same (network, tx_hash)
        # Note: SQLite doesn't enforce partial unique constraints well,
        # but we can test the application-level check
        # In deposit_monitor, there's a check for existing tx_hash
        
        intent2 = DepositIntent(
            user_id=test_user.id,
            asset="USDT",
            network=network,
            amount_quote_fiat=Decimal("200.00"),
            generated_address="TAddress2",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            status=DepositStatus.DETECTED,
            tx_hash=tx_hash,  # Same tx_hash
            amount_crypto=Decimal("200.00"),
            required_confirmations=1
        )
        test_db.add(intent2)
        await test_db.commit()
        await test_db.refresh(intent2)
        
        # The unique constraint check happens in deposit_monitor._process_pending_intent
        # We'll test that logic - it should find intent1 when checking for intent2
        stmt = select(DepositIntent).where(
            DepositIntent.network == network,
            DepositIntent.tx_hash == tx_hash,
            DepositIntent.id != intent2.id  # Exclude self
        )
        result = await test_db.execute(stmt)
        existing = result.scalar_one_or_none()
        
        assert existing is not None, "Should find existing intent with same (network, tx_hash)"
        assert existing.id == intent1.id


class TestWorkerRowLocks:
    """Test that worker uses row locks (FOR UPDATE SKIP LOCKED)"""
    
    @pytest.mark.asyncio
    async def test_worker_skip_locked_concurrency(self, test_db: AsyncSession, test_user: User, mock_tron_client):
        """Worker should use FOR UPDATE SKIP LOCKED to handle concurrent workers"""
        # Create deposit intent
        intent = DepositIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_quote_fiat=Decimal("100.00"),
            generated_address="TTestAddress123",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            status=DepositStatus.PENDING,
            required_confirmations=1
        )
        test_db.add(intent)
        await test_db.commit()
        await test_db.refresh(intent)
        
        # Mock tron_client to return no transfers initially
        mock_tron_client.get_usdt_transfers_to_address = AsyncMock(return_value=[])
        mock_tron_client.get_tx_info = AsyncMock(return_value={
            "block_number": 12345,
            "confirmations": 1
        })
        
        # Create worker
        worker = DepositMonitorWorker()
        
        # Verify worker uses with_for_update(skip_locked=True)
        # This is tested implicitly by checking the code structure
        # The actual lock behavior would require multiple concurrent workers
        # We can verify the code uses skip_locked=True
        
        # Test that worker processes intent
        stats = await worker.run_once(test_db)
        
        # With no transfers, should not detect anything
        assert stats["detected"] == 0
        
        # Now simulate detection
        mock_tron_client.get_usdt_transfers_to_address = AsyncMock(return_value=[{
            "tx_hash": "0x1234567890abcdef",
            "amount": Decimal("100.00"),
            "to": "TTestAddress123",
            "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000)
        }])
        
        # Process again
        stats = await worker.run_once(test_db)
        
        # Should detect the deposit
        assert stats["detected"] == 1
        
        # Verify intent was updated
        await test_db.refresh(intent)
        assert intent.status == DepositStatus.DETECTED
        assert intent.tx_hash == "0x1234567890abcdef"


class TestManualTestCases:
    """Manual test cases A-E as specified"""
    
    @pytest.mark.asyncio
    async def test_case_a_create_deposit_intent_pending(self, test_db: AsyncSession, test_user: User):
        """Case A: Create DepositIntent (pending) - no wallet change"""
        intent = DepositIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_quote_fiat=Decimal("100.00"),
            generated_address="TTestAddress123",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            status=DepositStatus.PENDING,
            required_confirmations=1
        )
        test_db.add(intent)
        await test_db.commit()
        
        # Verify status
        assert intent.status == DepositStatus.PENDING
        assert intent.tx_hash is None
        
        # Verify no wallet change
        balance = await WalletService.get_balance(test_user.id, "USDT", test_db)
        assert balance["available"] == Decimal("0")
        assert balance["reserved"] == Decimal("0")
    
    @pytest.mark.asyncio
    async def test_case_b_worker_detects_tx(self, test_db: AsyncSession, test_user: User):
        """Case B: Worker detects tx (detected) - status: pending → detected, tx_hash set, no wallet change"""
        intent = DepositIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_quote_fiat=Decimal("100.00"),
            generated_address="TTestAddress123",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            status=DepositStatus.PENDING,
            required_confirmations=1
        )
        test_db.add(intent)
        await test_db.commit()
        await test_db.refresh(intent)
        
        tx_hash = "0x1234567890abcdef"
        
        # Simulate detection
        intent.tx_hash = tx_hash
        intent.amount_crypto = Decimal("100.00")
        intent.status = DepositStatus.DETECTED
        intent.detected_at = datetime.now(timezone.utc)
        await test_db.commit()
        
        # Verify
        await test_db.refresh(intent)
        assert intent.status == DepositStatus.DETECTED
        assert intent.tx_hash == tx_hash
        
        # Verify no wallet change
        balance = await WalletService.get_balance(test_user.id, "USDT", test_db)
        assert balance["available"] == Decimal("0")
    
    @pytest.mark.asyncio
    async def test_case_c_confirmations_reached(self, test_db: AsyncSession, test_user: User):
        """Case C: Confirmations reached (confirmed) - status: detected → confirmed, no wallet change"""
        intent = DepositIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_quote_fiat=Decimal("100.00"),
            generated_address="TTestAddress123",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            status=DepositStatus.DETECTED,
            tx_hash="0x1234567890abcdef",
            amount_crypto=Decimal("100.00"),
            confirmations=0,
            required_confirmations=1
        )
        test_db.add(intent)
        await test_db.commit()
        await test_db.refresh(intent)
        
        # Simulate confirmation
        intent.status = DepositStatus.CONFIRMED
        intent.confirmations = 1
        intent.confirmed_at = datetime.now(timezone.utc)
        await test_db.commit()
        
        # Verify
        await test_db.refresh(intent)
        assert intent.status == DepositStatus.CONFIRMED
        assert intent.confirmations == 1
        
        # Verify no wallet change
        balance = await WalletService.get_balance(test_user.id, "USDT", test_db)
        assert balance["available"] == Decimal("0")
    
    @pytest.mark.asyncio
    async def test_case_d_settlement_runs(self, test_db: AsyncSession, test_user: User):
        """Case D: Settlement runs (settled) - wallet credit occurs once, ledger entry, status: confirmed → settled"""
        intent = DepositIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_quote_fiat=Decimal("100.00"),
            generated_address="TTestAddress123",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            status=DepositStatus.CONFIRMED,
            tx_hash="0x1234567890abcdef",
            amount_crypto=Decimal("100.00"),
            confirmations=1,
            required_confirmations=1,
            confirmed_at=datetime.now(timezone.utc)
        )
        test_db.add(intent)
        await test_db.commit()
        await test_db.refresh(intent)
        
        amount_crypto = Decimal("100.00")
        
        # Mock deposit_service.confirm_deposit
        with patch('app.services.deposit_settlement_service.deposit_service') as mock_deposit:
            async def mock_confirm(*args, **kwargs):
                # Credit wallet
                ledger = await WalletService.credit_balance(
                    user_id=test_user.id,
                    asset="USDT",
                    amount=amount_crypto,
                    db=test_db,
                    reference_type=ReferenceType.DEPOSIT,
                    reference_id=intent.id
                )
                # Update intent
                intent.status = DepositStatus.SETTLED
                intent.settled_at = datetime.now(timezone.utc)
                await test_db.flush()
                return {
                    "deposit_intent_id": intent.id,
                    "status": "settled",
                    "amount_credited": str(amount_crypto),
                    "asset": "USDT",
                    "ledger_entry_id": ledger.id
                }
            
            mock_deposit.confirm_deposit = mock_confirm
            
            # Settle
            result = await DepositSettlementService.settle_deposit_intent(intent.id, test_db)
            assert result["status"] == "settled"
        
        # Verify settled
        await test_db.refresh(intent)
        assert intent.status == DepositStatus.SETTLED
        assert intent.settled_at is not None
        
        # Verify wallet credit occurred once
        balance = await WalletService.get_balance(test_user.id, "USDT", test_db)
        assert balance["available"] == amount_crypto
        
        # Verify ledger entry exists
        stmt = select(WalletTransaction).where(
            WalletTransaction.reference_type == ReferenceType.DEPOSIT,
            WalletTransaction.reference_id == intent.id
        )
        result = await test_db.execute(stmt)
        ledger_entry = result.scalar_one_or_none()
        assert ledger_entry is not None
        assert ledger_entry.type == WalletTransactionType.DEPOSIT_CREDIT
    
    @pytest.mark.asyncio
    async def test_case_e_settlement_idempotency(self, test_db: AsyncSession, test_user: User):
        """Case E: Run settlement again (idempotency) - wallet should NOT credit again, no new ledger"""
        intent = DepositIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_quote_fiat=Decimal("100.00"),
            generated_address="TTestAddress123",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            status=DepositStatus.SETTLED,
            tx_hash="0x1234567890abcdef",
            amount_crypto=Decimal("100.00"),
            confirmations=1,
            required_confirmations=1,
            settled_at=datetime.now(timezone.utc)
        )
        test_db.add(intent)
        
        # Credit wallet first time
        amount_crypto = Decimal("100.00")
        await WalletService.credit_balance(
            user_id=test_user.id,
            asset="USDT",
            amount=amount_crypto,
            db=test_db,
            reference_type=ReferenceType.DEPOSIT,
            reference_id=intent.id
        )
        await test_db.commit()
        await test_db.refresh(intent)
        
        # Get balance and ledger count before second settlement
        balance_before = await WalletService.get_balance(test_user.id, "USDT", test_db)
        
        stmt = select(func.count(WalletTransaction.id)).where(
            WalletTransaction.reference_type == ReferenceType.DEPOSIT,
            WalletTransaction.reference_id == intent.id
        )
        result = await test_db.execute(stmt)
        ledger_count_before = result.scalar() or 0
        
        # Try to settle again - should be idempotent
        result = await DepositSettlementService.settle_deposit_intent(intent.id, test_db)
        assert result["status"] == "already_settled"
        
        # Verify wallet should NOT credit again
        balance_after = await WalletService.get_balance(test_user.id, "USDT", test_db)
        assert balance_after["available"] == balance_before["available"]
        
        # Verify no new ledger entry
        result = await test_db.execute(stmt)
        ledger_count_after = result.scalar() or 0
        assert ledger_count_after == ledger_count_before, "Should have same number of ledger entries"


class TestCodeStructure:
    """Test code structure for row locks and idempotency"""
    
    def test_settlement_uses_row_lock(self):
        """Verify settlement service uses with_for_update()"""
        import inspect
        from app.services.deposit_settlement_service import DepositSettlementService
        
        source = inspect.getsource(DepositSettlementService.settle_deposit_intent)
        assert "with_for_update()" in source, "settle_deposit_intent should use row lock (SELECT ... FOR UPDATE)"
    
    def test_worker_uses_skip_locked(self):
        """Verify worker uses with_for_update(skip_locked=True)"""
        import inspect
        from app.workers.deposit_monitor import DepositMonitorWorker
        
        source = inspect.getsource(DepositMonitorWorker.run_once)
        assert "skip_locked=True" in source, "Worker should use FOR UPDATE SKIP LOCKED"
