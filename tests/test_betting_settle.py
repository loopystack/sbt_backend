"""
Betting Settle Operations Tests
Tests for settling bets (WIN, LOSS, VOID), balance changes, and idempotency
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


@pytest_asyncio.fixture
async def pending_bet(test_db: AsyncSession, test_user_with_balance: User, test_match: Odds) -> Bet:
    """Create a pending bet"""
    bet = await BetService.place_bet(
        user_id=test_user_with_balance.id,
        match_id=test_match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.50"),
        stake=Decimal("20.00"),
        currency="USDT",
        db=test_db
    )
    return bet


class TestSettleLoss:
    """Tests for settling bets as LOSS"""
    
    @pytest.mark.asyncio
    async def test_settle_lost_reserved_decreases_no_credit(
        self, test_db: AsyncSession, test_user_with_balance: User, pending_bet: Bet
    ):
        """Settle lost → reserved decreases, no credit"""
        user = test_user_with_balance
        bet = pending_bet
        
        # Get balance before settlement
        balance_before = await WalletService.get_balance(user.id, "USDT", test_db)
        available_before = balance_before["available"]
        reserved_before = balance_before["reserved"]
        total_before = balance_before["total"]
        
        # Settle as LOSS
        settled_bet = await BetService.settle_bet(
            bet_id=bet.id,
            outcome="LOSS",
            db=test_db
        )
        
        # Get balance after
        balance_after = await WalletService.get_balance(user.id, "USDT", test_db)
        
        # Verify balance changes
        assert balance_after["available"] == available_before, "Available should not change"
        assert balance_after["reserved"] == reserved_before - bet.stake, "Reserved should decrease by stake"
        assert balance_after["total"] == total_before - bet.stake, "Total should decrease by stake"
        
        # Verify bet status
        assert settled_bet.status == BetStatus.LOST
        assert settled_bet.settled_at is not None
        assert settled_bet.profit == Decimal("0")
        
        # Verify ledger entry
        stmt = select(WalletTransaction).where(
            WalletTransaction.reference_type == ReferenceType.BET,
            WalletTransaction.reference_id == bet.id,
            WalletTransaction.type == WalletTransactionType.BET_LOSS_DEDUCT
        )
        result = await test_db.execute(stmt)
        ledger_entry = result.scalar_one_or_none()
        assert ledger_entry is not None, "Should have BET_LOSS_DEDUCT ledger entry"
        assert ledger_entry.amount == bet.stake


class TestSettleVoid:
    """Tests for settling bets as VOID"""
    
    @pytest.mark.asyncio
    async def test_settle_void_reserved_returns_to_available(
        self, test_db: AsyncSession, test_user_with_balance: User, pending_bet: Bet
    ):
        """Settle void → reserved returns to available"""
        user = test_user_with_balance
        bet = pending_bet
        
        # Get balance before settlement
        balance_before = await WalletService.get_balance(user.id, "USDT", test_db)
        available_before = balance_before["available"]
        reserved_before = balance_before["reserved"]
        total_before = balance_before["total"]
        
        # Settle as VOID
        settled_bet = await BetService.settle_bet(
            bet_id=bet.id,
            outcome="VOID",
            db=test_db
        )
        
        # Get balance after
        balance_after = await WalletService.get_balance(user.id, "USDT", test_db)
        
        # Verify balance changes
        assert balance_after["available"] == available_before + bet.stake, "Available should increase by stake"
        assert balance_after["reserved"] == reserved_before - bet.stake, "Reserved should decrease by stake"
        assert balance_after["total"] == total_before, "Total should remain unchanged"
        
        # Verify bet status
        assert settled_bet.status == BetStatus.VOID
        assert settled_bet.settled_at is not None
        assert settled_bet.profit == Decimal("0")
        
        # Verify ledger entry
        stmt = select(WalletTransaction).where(
            WalletTransaction.reference_type == ReferenceType.BET,
            WalletTransaction.reference_id == bet.id,
            WalletTransaction.type == WalletTransactionType.BET_VOID_UNLOCK
        )
        result = await test_db.execute(stmt)
        ledger_entry = result.scalar_one_or_none()
        assert ledger_entry is not None, "Should have BET_VOID_UNLOCK ledger entry"
        assert ledger_entry.amount == bet.stake


class TestSettleWin:
    """Tests for settling bets as WIN"""
    
    @pytest.mark.asyncio
    async def test_settle_win_reserved_deducted_payout_credited(
        self, test_db: AsyncSession, test_user_with_balance: User, pending_bet: Bet
    ):
        """Settle win → reserved deducted, payout credited"""
        user = test_user_with_balance
        bet = pending_bet
        
        # Calculate expected payout and profit
        expected_profit = bet.stake * (bet.odds_decimal - Decimal("1"))
        expected_payout = bet.stake * bet.odds_decimal
        
        # Get balance before settlement
        balance_before = await WalletService.get_balance(user.id, "USDT", test_db)
        available_before = balance_before["available"]
        reserved_before = balance_before["reserved"]
        total_before = balance_before["total"]
        
        # Settle as WIN
        settled_bet = await BetService.settle_bet(
            bet_id=bet.id,
            outcome="WIN",
            db=test_db
        )
        
        # Get balance after
        balance_after = await WalletService.get_balance(user.id, "USDT", test_db)
        
        # Verify balance changes
        # Available should increase by payout (stake + profit)
        assert balance_after["available"] == available_before + expected_payout, "Available should increase by payout"
        # Reserved should decrease by stake
        assert balance_after["reserved"] == reserved_before - bet.stake, "Reserved should decrease by stake"
        # Total should increase by profit
        assert balance_after["total"] == total_before + expected_profit, "Total should increase by profit"
        
        # Verify bet status
        assert settled_bet.status == BetStatus.WON
        assert settled_bet.settled_at is not None
        assert settled_bet.profit == expected_profit
        assert settled_bet.payout == expected_payout
        
        # Verify ledger entries
        # Should have two entries: BET_WIN_DEDUCT_STAKE and BET_WIN_PAYOUT_CREDIT
        stmt = select(WalletTransaction).where(
            WalletTransaction.reference_type == ReferenceType.BET,
            WalletTransaction.reference_id == bet.id
        ).order_by(WalletTransaction.created_at)
        result = await test_db.execute(stmt)
        ledger_entries = result.scalars().all()
        
        assert len(ledger_entries) >= 2, "Should have at least 2 ledger entries (deduct + credit)"
        
        # Find the two win-related entries
        deduct_entry = next((e for e in ledger_entries if e.type == WalletTransactionType.BET_WIN_DEDUCT_STAKE), None)
        credit_entry = next((e for e in ledger_entries if e.type == WalletTransactionType.BET_WIN_PAYOUT_CREDIT), None)
        
        assert deduct_entry is not None, "Should have BET_WIN_DEDUCT_STAKE entry"
        assert deduct_entry.amount == bet.stake
        
        assert credit_entry is not None, "Should have BET_WIN_PAYOUT_CREDIT entry"
        assert credit_entry.amount == expected_payout


class TestSettleIdempotency:
    """Tests for settlement idempotency"""
    
    @pytest.mark.asyncio
    async def test_settle_same_bet_twice_does_not_double_credit(
        self, test_db: AsyncSession, test_user_with_balance: User, pending_bet: Bet
    ):
        """Idempotency: settle same bet twice does not double credit"""
        user = test_user_with_balance
        bet = pending_bet
        
        # Get balance before
        balance_before = await WalletService.get_balance(user.id, "USDT", test_db)
        
        # Settle as WIN first time
        settled_bet1 = await BetService.settle_bet(
            bet_id=bet.id,
            outcome="WIN",
            db=test_db
        )
        
        balance_after_first = await WalletService.get_balance(user.id, "USDT", test_db)
        
        # Get ledger count after first settlement
        stmt = select(func.count(WalletTransaction.id)).where(
            WalletTransaction.reference_type == ReferenceType.BET,
            WalletTransaction.reference_id == bet.id
        )
        result = await test_db.execute(stmt)
        ledger_count_after_first = result.scalar() or 0
        
        # Settle again (should be idempotent)
        settled_bet2 = await BetService.settle_bet(
            bet_id=bet.id,
            outcome="WIN",
            db=test_db
        )
        
        balance_after_second = await WalletService.get_balance(user.id, "USDT", test_db)
        
        # Verify balance did not change
        assert balance_after_second["available"] == balance_after_first["available"], "Available should not change on second settlement"
        assert balance_after_second["reserved"] == balance_after_first["reserved"], "Reserved should not change on second settlement"
        
        # Verify ledger count did not increase
        result = await test_db.execute(stmt)
        ledger_count_after_second = result.scalar() or 0
        assert ledger_count_after_second == ledger_count_after_first, "Ledger count should not increase on second settlement"
        
        # Verify bet status is still WON
        assert settled_bet2.status == BetStatus.WON
    
    @pytest.mark.asyncio
    async def test_settle_loss_twice_idempotent(
        self, test_db: AsyncSession, test_user_with_balance: User, pending_bet: Bet
    ):
        """Settle LOSS twice should be idempotent"""
        user = test_user_with_balance
        bet = pending_bet
        
        # Settle as LOSS first time
        await BetService.settle_bet(
            bet_id=bet.id,
            outcome="LOSS",
            db=test_db
        )
        
        balance_after_first = await WalletService.get_balance(user.id, "USDT", test_db)
        
        # Settle again
        await BetService.settle_bet(
            bet_id=bet.id,
            outcome="LOSS",
            db=test_db
        )
        
        balance_after_second = await WalletService.get_balance(user.id, "USDT", test_db)
        
        # Verify balance did not change
        assert balance_after_second["available"] == balance_after_first["available"]
        assert balance_after_second["reserved"] == balance_after_first["reserved"]
    
    @pytest.mark.asyncio
    async def test_settle_void_twice_idempotent(
        self, test_db: AsyncSession, test_user_with_balance: User, pending_bet: Bet
    ):
        """Settle VOID twice should be idempotent"""
        user = test_user_with_balance
        bet = pending_bet
        
        # Settle as VOID first time
        await BetService.settle_bet(
            bet_id=bet.id,
            outcome="VOID",
            db=test_db
        )
        
        balance_after_first = await WalletService.get_balance(user.id, "USDT", test_db)
        
        # Settle again
        await BetService.settle_bet(
            bet_id=bet.id,
            outcome="VOID",
            db=test_db
        )
        
        balance_after_second = await WalletService.get_balance(user.id, "USDT", test_db)
        
        # Verify balance did not change
        assert balance_after_second["available"] == balance_after_first["available"]
        assert balance_after_second["reserved"] == balance_after_first["reserved"]
