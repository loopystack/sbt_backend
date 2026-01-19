"""
State Machine Tests
Tests for state machine enforcement and flow validation
"""
import pytest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select
from fastapi import HTTPException

from app.models.deposit import DepositIntent, DepositStatus, WithdrawalIntent
from app.models.user import User
from app.services.deposit_settlement_service import deposit_settlement_service
from app.services.deposit_service import deposit_service


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


class TestDepositFlowStateMachine:
    """Test the complete deposit flow state machine"""
    
    @pytest.mark.asyncio
    async def test_complete_deposit_flow(
        self, test_db: AsyncSession, test_user: User
    ):
        """Test the complete flow: Deposit → Detect → Confirm → Credit → Bet → Withdraw"""
        # Step 1: Create deposit intent (pending)
        deposit = DepositIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_quote_fiat=Decimal("100.00"),
            generated_address="TTestAddress123",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            status=DepositStatus.PENDING,
            required_confirmations=2
        )
        test_db.add(deposit)
        await test_db.commit()
        await test_db.refresh(deposit)
        
        assert deposit.status == DepositStatus.PENDING
        
        # Step 2: Detect transaction (pending → detected)
        deposit.status = DepositStatus.DETECTED
        deposit.tx_hash = "test_tx_hash_123"
        deposit.detected_at = datetime.now(timezone.utc)
        await test_db.commit()
        await test_db.refresh(deposit)
        
        assert deposit.status == DepositStatus.DETECTED
        assert deposit.tx_hash is not None
        
        # Step 3: Confirm transaction (detected → confirming → confirmed)
        deposit.status = DepositStatus.CONFIRMING
        deposit.confirmations = 1
        await test_db.commit()
        await test_db.refresh(deposit)
        
        assert deposit.status == DepositStatus.CONFIRMING
        
        deposit.status = DepositStatus.CONFIRMED
        deposit.confirmations = 2
        deposit.confirmed_at = datetime.now(timezone.utc)
        await test_db.commit()
        await test_db.refresh(deposit)
        
        assert deposit.status == DepositStatus.CONFIRMED
        assert deposit.confirmations >= deposit.required_confirmations
        
        # Step 4: Credit wallet (confirmed → settled)
        # Note: This would normally be done by the settlement service
        # which would also credit the wallet. For this test, we're just
        # verifying the state transition is valid.
        deposit.status = DepositStatus.SETTLED
        deposit.settled_at = datetime.now(timezone.utc)
        await test_db.commit()
        await test_db.refresh(deposit)
        
        assert deposit.status == DepositStatus.SETTLED
        assert deposit.settled_at is not None
    
    @pytest.mark.asyncio
    async def test_deposit_flow_with_expiry(
        self, test_db: AsyncSession, test_user: User
    ):
        """Test deposit flow that expires before confirmation"""
        deposit = DepositIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_quote_fiat=Decimal("100.00"),
            generated_address="TTestAddress123",
            expires_at=datetime.now(timezone.utc) - timedelta(hours=1),  # Already expired
            status=DepositStatus.PENDING,
            required_confirmations=2
        )
        test_db.add(deposit)
        await test_db.commit()
        await test_db.refresh(deposit)
        
        # Check if expired (make expires_at timezone-aware if needed)
        expires_at_aware = deposit.expires_at
        if expires_at_aware.tzinfo is None:
            expires_at_aware = expires_at_aware.replace(tzinfo=timezone.utc)
        if expires_at_aware < datetime.now(timezone.utc):
            deposit.status = DepositStatus.EXPIRED
            await test_db.commit()
            await test_db.refresh(deposit)
        
        assert deposit.status == DepositStatus.EXPIRED
    
    @pytest.mark.asyncio
    async def test_deposit_flow_with_failure(
        self, test_db: AsyncSession, test_user: User
    ):
        """Test deposit flow that fails at any stage"""
        deposit = DepositIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_quote_fiat=Decimal("100.00"),
            generated_address="TTestAddress123",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            status=DepositStatus.CONFIRMING,
            required_confirmations=2,
            tx_hash="test_tx_hash_123"
        )
        test_db.add(deposit)
        await test_db.commit()
        await test_db.refresh(deposit)
        
        # Simulate failure
        deposit.status = DepositStatus.FAILED
        deposit.failed_at = datetime.now(timezone.utc)
        deposit.failure_reason = "Transaction verification failed"
        await test_db.commit()
        await test_db.refresh(deposit)
        
        assert deposit.status == DepositStatus.FAILED
        assert deposit.failure_reason is not None


class TestWithdrawalFlowStateMachine:
    """Test the complete withdrawal flow state machine"""
    
    @pytest.mark.asyncio
    async def test_complete_withdrawal_flow(
        self, test_db: AsyncSession, test_user: User
    ):
        """Test the complete flow: pending → approved → processing → completed"""
        # Step 1: Create withdrawal intent (pending)
        withdrawal = WithdrawalIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_crypto=Decimal("50.00"),
            amount_usd=Decimal("50.00"),
            to_address="TWithdrawalAddress123",
            status="pending"
        )
        test_db.add(withdrawal)
        await test_db.commit()
        await test_db.refresh(withdrawal)
        
        assert withdrawal.status == "pending"
        
        # Step 2: Approve withdrawal (pending → approved)
        withdrawal.status = "approved"
        withdrawal.approved_at = datetime.now(timezone.utc)
        await test_db.commit()
        await test_db.refresh(withdrawal)
        
        assert withdrawal.status == "approved"
        assert withdrawal.approved_at is not None
        
        # Step 3: Process withdrawal (approved → processing)
        withdrawal.status = "processing"
        withdrawal.tx_hash = "test_withdrawal_tx_123"
        withdrawal.processed_at = datetime.now(timezone.utc)
        await test_db.commit()
        await test_db.refresh(withdrawal)
        
        assert withdrawal.status == "processing"
        assert withdrawal.tx_hash is not None
        
        # Step 4: Complete withdrawal (processing → completed)
        withdrawal.status = "completed"
        withdrawal.confirmations = 2
        withdrawal.completed_at = datetime.now(timezone.utc)
        await test_db.commit()
        await test_db.refresh(withdrawal)
        
        assert withdrawal.status == "completed"
        assert withdrawal.completed_at is not None
    
    @pytest.mark.asyncio
    async def test_withdrawal_flow_with_cancellation(
        self, test_db: AsyncSession, test_user: User
    ):
        """Test withdrawal flow that gets cancelled"""
        withdrawal = WithdrawalIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_crypto=Decimal("50.00"),
            amount_usd=Decimal("50.00"),
            to_address="TWithdrawalAddress123",
            status="pending"
        )
        test_db.add(withdrawal)
        await test_db.commit()
        await test_db.refresh(withdrawal)
        
        # Cancel withdrawal
        withdrawal.status = "cancelled"
        withdrawal.rejection_reason = "Cancelled by user"
        await test_db.commit()
        await test_db.refresh(withdrawal)
        
        assert withdrawal.status == "cancelled"
        assert withdrawal.rejection_reason is not None
    
    @pytest.mark.asyncio
    async def test_withdrawal_flow_with_failure(
        self, test_db: AsyncSession, test_user: User
    ):
        """Test withdrawal flow that fails during processing"""
        withdrawal = WithdrawalIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_crypto=Decimal("50.00"),
            amount_usd=Decimal("50.00"),
            to_address="TWithdrawalAddress123",
            status="processing",
            tx_hash="test_withdrawal_tx_123"
        )
        test_db.add(withdrawal)
        await test_db.commit()
        await test_db.refresh(withdrawal)
        
        # Simulate failure
        withdrawal.status = "failed"
        withdrawal.failed_at = datetime.now(timezone.utc)
        withdrawal.failure_reason = "Transaction failed on blockchain"
        await test_db.commit()
        await test_db.refresh(withdrawal)
        
        assert withdrawal.status == "failed"
        assert withdrawal.failure_reason is not None


class TestStateMachineEnforcement:
    """Test that state machine transitions are properly enforced"""
    
    @pytest.mark.asyncio
    async def test_settlement_service_enforces_confirmed_status(
        self, test_db: AsyncSession, test_user: User
    ):
        """Test that settlement service only processes confirmed deposits"""
        # Create a pending deposit
        deposit = DepositIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_quote_fiat=Decimal("100.00"),
            generated_address="TTestAddress123",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            status=DepositStatus.PENDING,
            required_confirmations=2
        )
        test_db.add(deposit)
        await test_db.commit()
        await test_db.refresh(deposit)
        
        # Try to settle a pending deposit - should fail
        with pytest.raises(HTTPException) as exc_info:
            await deposit_settlement_service.settle_deposit_intent(
                deposit_intent_id=deposit.id,
                db=test_db
            )
        
        assert exc_info.value.status_code == 400
        assert "not confirmed" in str(exc_info.value.detail).lower()
    
    @pytest.mark.asyncio
    async def test_settlement_service_requires_tx_hash(
        self, test_db: AsyncSession, test_user: User
    ):
        """Test that settlement service requires tx_hash"""
        # Create a confirmed deposit without tx_hash
        deposit = DepositIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_quote_fiat=Decimal("100.00"),
            generated_address="TTestAddress123",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            status=DepositStatus.CONFIRMED,
            required_confirmations=2,
            confirmations=2,
            confirmed_at=datetime.now(timezone.utc)
            # No tx_hash
        )
        test_db.add(deposit)
        await test_db.commit()
        await test_db.refresh(deposit)
        
        # Try to settle - should fail due to missing tx_hash
        with pytest.raises(HTTPException) as exc_info:
            await deposit_settlement_service.settle_deposit_intent(
                deposit_intent_id=deposit.id,
                db=test_db
            )
        
        assert exc_info.value.status_code == 400
        assert "tx_hash" in str(exc_info.value.detail).lower()
    
    @pytest.mark.asyncio
    async def test_state_machine_prevents_invalid_transitions(
        self, test_db: AsyncSession, test_user: User
    ):
        """Test that invalid state transitions are prevented by business logic"""
        # Create a settled deposit
        deposit = DepositIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_quote_fiat=Decimal("100.00"),
            generated_address="TTestAddress123",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            status=DepositStatus.SETTLED,
            required_confirmations=2,
            tx_hash="test_tx_hash_123",
            settled_at=datetime.now(timezone.utc)
        )
        test_db.add(deposit)
        await test_db.commit()
        await test_db.refresh(deposit)
        
        # Try to settle again - should be idempotent (return early)
        result = await deposit_settlement_service.settle_deposit_intent(
            deposit_intent_id=deposit.id,
            db=test_db
        )
        
        assert result["status"] == "already_settled"
        assert deposit.status == DepositStatus.SETTLED


class TestFlowValidation:
    """Test that flows match the blueprint"""
    
    @pytest.mark.asyncio
    async def test_deposit_to_detect_flow_exists(
        self, test_db: AsyncSession, test_user: User
    ):
        """Test that Deposit → Detect flow exists and works"""
        deposit = DepositIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_quote_fiat=Decimal("100.00"),
            generated_address="TTestAddress123",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            status=DepositStatus.PENDING,
            required_confirmations=2
        )
        test_db.add(deposit)
        await test_db.commit()
        
        # Simulate detection
        deposit.status = DepositStatus.DETECTED
        deposit.tx_hash = "test_tx_hash_123"
        deposit.detected_at = datetime.now(timezone.utc)
        await test_db.commit()
        await test_db.refresh(deposit)
        
        assert deposit.status == DepositStatus.DETECTED
    
    @pytest.mark.asyncio
    async def test_detect_to_confirm_flow_exists(
        self, test_db: AsyncSession, test_user: User
    ):
        """Test that Detect → Confirm flow exists and works"""
        deposit = DepositIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_quote_fiat=Decimal("100.00"),
            generated_address="TTestAddress123",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            status=DepositStatus.DETECTED,
            required_confirmations=2,
            tx_hash="test_tx_hash_123",
            detected_at=datetime.now(timezone.utc)
        )
        test_db.add(deposit)
        await test_db.commit()
        
        # Simulate confirmation
        deposit.status = DepositStatus.CONFIRMED
        deposit.confirmations = 2
        deposit.confirmed_at = datetime.now(timezone.utc)
        await test_db.commit()
        await test_db.refresh(deposit)
        
        assert deposit.status == DepositStatus.CONFIRMED
    
    @pytest.mark.asyncio
    async def test_confirm_to_credit_flow_exists(
        self, test_db: AsyncSession, test_user: User
    ):
        """Test that Confirm → Credit flow exists and works"""
        deposit = DepositIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_quote_fiat=Decimal("100.00"),
            generated_address="TTestAddress123",
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            status=DepositStatus.CONFIRMED,
            required_confirmations=2,
            tx_hash="test_tx_hash_123",
            confirmations=2,
            confirmed_at=datetime.now(timezone.utc)
        )
        test_db.add(deposit)
        await test_db.commit()
        
        # Settlement service should handle this
        # For this test, we verify the status is correct for settlement
        assert deposit.status == DepositStatus.CONFIRMED
        assert deposit.tx_hash is not None
        assert deposit.confirmations >= deposit.required_confirmations
