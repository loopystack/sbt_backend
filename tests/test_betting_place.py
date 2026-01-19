"""
Betting Place Operations Tests
Tests for placing bets, balance changes, and insufficient balance scenarios
"""
import pytest
import pytest_asyncio
from decimal import Decimal
from datetime import date, datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select, func

from app.models.bet import Bet, BetStatus
from app.models.odds import Odds
from app.models.user import User
from app.models.wallet_transaction import WalletTransaction, WalletTransactionType, ReferenceType
from app.services.bet_service import BetService
from app.services.wallet_service import WalletService

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
async def test_user_with_balance(test_db: AsyncSession, test_user: User) -> User:
    """Create a test user with initial balance"""
    # Credit initial balance
    await WalletService.credit_balance(
        user_id=test_user.id,
        asset="USDT",
        amount=Decimal("100.00"),
        db=test_db
    )
    await test_db.commit()
    return test_user


@pytest_asyncio.fixture
async def test_match(test_db: AsyncSession) -> Odds:
    """Create a test match"""
    match = Odds(
        home_team="Team A",
        away_team="Team B",
        league="Test League",
        country="Test Country",
        season=2024,
        date=date.today(),
        odd_1=Decimal("2.50"),
        odd_X=Decimal("3.00"),
        odd_2=Decimal("2.80")
    )
    test_db.add(match)
    await test_db.commit()
    await test_db.refresh(match)
    return match


class TestPlaceBet:
    """Tests for placing bets"""
    
    @pytest.mark.asyncio
    async def test_place_bet_reserved_increases_available_decreases(
        self, test_db: AsyncSession, test_user_with_balance: User, test_match: Odds
    ):
        """Place bet → reserved increases, available decreases"""
        user = test_user_with_balance
        
        # Get initial balance
        balance_before = await WalletService.get_balance(user.id, "USDT", test_db)
        initial_available = balance_before["available"]
        initial_reserved = balance_before["reserved"]
        
        stake = Decimal("10.00")
        
        # Place bet
        bet = await BetService.place_bet(
            user_id=user.id,
            match_id=test_match.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=stake,
            currency="USDT",
            db=test_db
        )
        
        # Get balance after
        balance_after = await WalletService.get_balance(user.id, "USDT", test_db)
        
        # Verify balance changes
        assert balance_after["available"] == initial_available - stake, "Available should decrease by stake"
        assert balance_after["reserved"] == initial_reserved + stake, "Reserved should increase by stake"
        assert balance_after["total"] == balance_before["total"], "Total should remain unchanged"
        
        # Verify bet was created
        assert bet.id is not None
        assert bet.status == BetStatus.PENDING
        assert bet.stake == stake
        
        # Verify ledger entry
        stmt = select(WalletTransaction).where(
            WalletTransaction.reference_type == ReferenceType.BET,
            WalletTransaction.reference_id == bet.id,
            WalletTransaction.type == WalletTransactionType.BET_LOCK
        )
        result = await test_db.execute(stmt)
        ledger_entry = result.scalar_one_or_none()
        assert ledger_entry is not None, "Should have BET_LOCK ledger entry"
        assert ledger_entry.amount == stake
        assert ledger_entry.reference_id == bet.id
    
    @pytest.mark.asyncio
    async def test_insufficient_balance_cannot_place_bet(
        self, test_db: AsyncSession, test_user: User, test_match: Odds
    ):
        """Insufficient balance cannot place bet"""
        user = test_user
        user_id = user.id  # Store ID before any operations that might rollback
        
        # User has no balance (or very little)
        # Try to place bet with more than available
        stake = Decimal("100.00")
        
        with pytest.raises(ValueError, match="Insufficient"):
            await BetService.place_bet(
                user_id=user_id,
                match_id=test_match.id,
                market_key="1x2",
                selection_key="home",
                odds_decimal=Decimal("2.50"),
                stake=stake,
                currency="USDT",
                db=test_db
            )
        
        await test_db.rollback()
        
        # Verify no bet was created (use stored user_id)
        stmt = select(func.count(Bet.id)).where(Bet.user_id == user_id)
        result = await test_db.execute(stmt)
        bet_count = result.scalar() or 0
        assert bet_count == 0, "No bet should be created with insufficient balance"
        
        # Verify no ledger entry
        stmt = select(func.count(WalletTransaction.id)).where(
            WalletTransaction.user_id == user_id
        )
        result = await test_db.execute(stmt)
        ledger_count = result.scalar() or 0
        assert ledger_count == 0, "No ledger entry should be created"
    
    @pytest.mark.asyncio
    async def test_place_bet_atomic_transaction(
        self, test_db: AsyncSession, test_user_with_balance: User, test_match: Odds
    ):
        """Place bet must be atomic - if lock fails, bet should not be created"""
        user = test_user_with_balance
        
        # Get initial bet count
        stmt = select(func.count(Bet.id)).where(Bet.user_id == user.id)
        result = await test_db.execute(stmt)
        initial_bet_count = result.scalar() or 0
        
        # Place a bet that will succeed
        stake = Decimal("10.00")
        bet = await BetService.place_bet(
            user_id=user.id,
            match_id=test_match.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=stake,
            currency="USDT",
            db=test_db
        )
        
        # Verify bet was created
        assert bet.id is not None
        
        # Verify bet count increased
        stmt = select(func.count(Bet.id)).where(Bet.user_id == user.id)
        result = await test_db.execute(stmt)
        bet_count = result.scalar() or 0
        assert bet_count == initial_bet_count + 1
        
        # Verify ledger entry exists
        stmt = select(WalletTransaction).where(
            WalletTransaction.reference_id == bet.id
        )
        result = await test_db.execute(stmt)
        ledger_entry = result.scalar_one_or_none()
        assert ledger_entry is not None, "Ledger entry should exist for bet"


class TestCancelBet:
    """Tests for canceling bets"""
    
    @pytest.mark.asyncio
    async def test_cancel_bet_reserved_returns_to_available(
        self, test_db: AsyncSession, test_user_with_balance: User, test_match: Odds
    ):
        """Cancel bet → reserved returns to available"""
        user = test_user_with_balance
        
        # Place a bet
        stake = Decimal("15.00")
        bet = await BetService.place_bet(
            user_id=user.id,
            match_id=test_match.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=stake,
            currency="USDT",
            db=test_db
        )
        
        # Get balance after placing bet
        balance_after_place = await WalletService.get_balance(user.id, "USDT", test_db)
        available_after_place = balance_after_place["available"]
        reserved_after_place = balance_after_place["reserved"]
        
        # Cancel bet
        cancelled_bet = await BetService.cancel_bet(
            bet_id=bet.id,
            user_id=user.id,
            db=test_db
        )
        
        # Get balance after cancel
        balance_after_cancel = await WalletService.get_balance(user.id, "USDT", test_db)
        
        # Verify balance changes
        assert balance_after_cancel["available"] == available_after_place + stake, "Available should increase by stake"
        assert balance_after_cancel["reserved"] == reserved_after_place - stake, "Reserved should decrease by stake"
        assert balance_after_cancel["total"] == balance_after_place["total"], "Total should remain unchanged"
        
        # Verify bet status
        assert cancelled_bet.status == BetStatus.CANCELLED
        assert cancelled_bet.settled_at is not None
        
        # Verify ledger entry
        stmt = select(WalletTransaction).where(
            WalletTransaction.reference_type == ReferenceType.BET,
            WalletTransaction.reference_id == bet.id,
            WalletTransaction.type == WalletTransactionType.BET_CANCEL_UNLOCK
        )
        result = await test_db.execute(stmt)
        ledger_entry = result.scalar_one_or_none()
        assert ledger_entry is not None, "Should have BET_CANCEL_UNLOCK ledger entry"
        assert ledger_entry.amount == stake
    
    @pytest.mark.asyncio
    async def test_cancel_bet_only_pending(
        self, test_db: AsyncSession, test_user_with_balance: User, test_match: Odds
    ):
        """Cannot cancel bet that is not pending"""
        user = test_user_with_balance
        
        # Place and settle a bet
        stake = Decimal("10.00")
        bet = await BetService.place_bet(
            user_id=user.id,
            match_id=test_match.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=stake,
            currency="USDT",
            db=test_db
        )
        
        # Settle as lost
        await BetService.settle_bet(
            bet_id=bet.id,
            outcome="LOSS",
            db=test_db
        )
        
        # Try to cancel - should fail
        with pytest.raises(ValueError, match="Cannot cancel"):
            await BetService.cancel_bet(
                bet_id=bet.id,
                user_id=user.id,
                db=test_db
            )
        
        await test_db.rollback()
        
        # Verify bet is still lost
        await test_db.refresh(bet)
        assert bet.status == BetStatus.LOST
