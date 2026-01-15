"""
Money Safety Invariants Test
Verifies that all wallet operations maintain critical safety invariants:
1. Available balance never goes negative
2. Reserved balance never goes negative
3. Available + Reserved stays consistent
4. Every balance change has exactly one ledger entry
5. Bet flow equations are correct
"""
import pytest
import pytest_asyncio
from decimal import Decimal
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select, func

from app.models.user import User
from app.models.odds import Odds
from app.models.deposit import UserCryptoBalance
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
async def test_user_with_balance(test_db: AsyncSession, test_user: User):
    """Create user with 100 USDT balance"""
    balance = UserCryptoBalance(
        user_id=test_user.id,
        asset="USDT",
        balance=Decimal("100.00"),
        locked_balance=Decimal("0")
    )
    test_db.add(balance)
    await test_db.commit()
    return test_user


@pytest_asyncio.fixture
async def test_match(test_db: AsyncSession) -> Odds:
    """Create test match"""
    match = Odds(
        home_team="Team A",
        away_team="Team B",
        league="Test League",
        country="Test Country",
        season=2024,
        date=date(2024, 12, 31),
        odd_1=Decimal("2.50"),
        odd_X=Decimal("3.00"),
        odd_2=Decimal("2.80")
    )
    test_db.add(match)
    await test_db.commit()
    await test_db.refresh(match)
    return match


def assert_balance_invariants(balance_info: dict, operation_name: str):
    """Assert all money safety invariants"""
    available = balance_info["available"]
    reserved = balance_info["reserved"]
    total = balance_info["total"]
    
    # Invariant 1: Available never goes negative
    assert available >= Decimal("0"), f"{operation_name}: Available balance went negative: {available}"
    
    # Invariant 2: Reserved never goes negative
    assert reserved >= Decimal("0"), f"{operation_name}: Reserved balance went negative: {reserved}"
    
    # Invariant 3: Available + Reserved = Total
    assert available + reserved == total, (
        f"{operation_name}: Balance inconsistency. "
        f"Available ({available}) + Reserved ({reserved}) != Total ({total})"
    )


async def count_ledger_entries(test_db: AsyncSession, user_id: int, asset: str, reference_type: ReferenceType, reference_id: int) -> int:
    """Count ledger entries for a specific reference"""
    stmt = select(func.count(WalletTransaction.id)).where(
        WalletTransaction.user_id == user_id,
        WalletTransaction.asset == asset,
        WalletTransaction.reference_type == reference_type,
        WalletTransaction.reference_id == reference_id
    )
    result = await test_db.execute(stmt)
    return result.scalar() or 0


@pytest.mark.asyncio
async def test_place_bet_equation(test_user_with_balance: User, test_match: Odds, test_db: AsyncSession):
    """Test: Place bet: available -= stake, reserved += stake"""
    user = test_user_with_balance
    match = test_match
    
    initial = await WalletService.get_balance(user.id, "USDT", test_db)
    assert_balance_invariants(initial, "Initial")
    
    initial_available = initial["available"]
    initial_reserved = initial["reserved"]
    initial_total = initial["total"]
    stake = Decimal("10.00")
    
    # Place bet
    bet = await BetService.place_bet(
        user_id=user.id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.50"),
        stake=stake,
        db=test_db
    )
    
    final = await WalletService.get_balance(user.id, "USDT", test_db)
    assert_balance_invariants(final, "After place bet")
    
    # Verify equation: available -= stake, reserved += stake
    assert final["available"] == initial_available - stake, (
        f"Available should decrease by stake. Expected: {initial_available - stake}, Got: {final['available']}"
    )
    assert final["reserved"] == initial_reserved + stake, (
        f"Reserved should increase by stake. Expected: {initial_reserved + stake}, Got: {final['reserved']}"
    )
    assert final["total"] == initial_total, (
        f"Total should remain unchanged. Expected: {initial_total}, Got: {final['total']}"
    )
    
    # Verify exactly one ledger entry
    ledger_count = await count_ledger_entries(test_db, user.id, "USDT", ReferenceType.BET, bet.id)
    assert ledger_count == 1, f"Expected 1 ledger entry, got {ledger_count}"


@pytest.mark.asyncio
async def test_win_equation(test_user_with_balance: User, test_match: Odds, test_db: AsyncSession):
    """Test: Win: reserved -= stake, available += stake + profit"""
    user = test_user_with_balance
    match = test_match
    stake = Decimal("10.00")
    odds = Decimal("2.50")
    expected_profit = stake * (odds - Decimal("1"))  # 10 * 1.5 = 15
    
    # Place bet
    bet = await BetService.place_bet(
        user_id=user.id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=odds,
        stake=stake,
        db=test_db
    )
    
    after_place = await WalletService.get_balance(user.id, "USDT", test_db)
    assert_balance_invariants(after_place, "After place bet")
    
    available_after_place = after_place["available"]
    reserved_after_place = after_place["reserved"]
    total_after_place = after_place["total"]
    
    # Settle as WIN
    await BetService.settle_bet(bet.id, "WIN", db=test_db)
    
    after_win = await WalletService.get_balance(user.id, "USDT", test_db)
    assert_balance_invariants(after_win, "After win")
    
    # Verify equation: reserved -= stake, available += stake + profit
    assert after_win["reserved"] == reserved_after_place - stake, (
        f"Reserved should decrease by stake. Expected: {reserved_after_place - stake}, Got: {after_win['reserved']}"
    )
    assert after_win["available"] == available_after_place + stake + expected_profit, (
        f"Available should increase by stake + profit. "
        f"Expected: {available_after_place + stake + expected_profit}, Got: {after_win['available']}"
    )
    assert after_win["total"] == total_after_place + expected_profit, (
        f"Total should increase by profit. Expected: {total_after_place + expected_profit}, Got: {after_win['total']}"
    )
    
    # Verify ledger entries: LOCK, UNLOCK, PAYOUT (3 entries)
    ledger_count = await count_ledger_entries(test_db, user.id, "USDT", ReferenceType.BET, bet.id)
    assert ledger_count == 3, f"Expected 3 ledger entries (LOCK, UNLOCK, PAYOUT), got {ledger_count}"


@pytest.mark.asyncio
async def test_loss_equation(test_user_with_balance: User, test_match: Odds, test_db: AsyncSession):
    """Test: Loss: reserved -= stake, available unchanged"""
    user = test_user_with_balance
    match = test_match
    stake = Decimal("10.00")
    
    # Place bet
    bet = await BetService.place_bet(
        user_id=user.id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.50"),
        stake=stake,
        db=test_db
    )
    
    after_place = await WalletService.get_balance(user.id, "USDT", test_db)
    assert_balance_invariants(after_place, "After place bet")
    
    available_after_place = after_place["available"]
    reserved_after_place = after_place["reserved"]
    total_after_place = after_place["total"]
    
    # Settle as LOSS
    await BetService.settle_bet(bet.id, "LOSS", db=test_db)
    
    after_loss = await WalletService.get_balance(user.id, "USDT", test_db)
    assert_balance_invariants(after_loss, "After loss")
    
    # Verify equation: reserved -= stake, available unchanged
    assert after_loss["reserved"] == reserved_after_place - stake, (
        f"Reserved should decrease by stake. Expected: {reserved_after_place - stake}, Got: {after_loss['reserved']}"
    )
    assert after_loss["available"] == available_after_place, (
        f"Available should remain unchanged. Expected: {available_after_place}, Got: {after_loss['available']}"
    )
    assert after_loss["total"] == total_after_place - stake, (
        f"Total should decrease by stake. Expected: {total_after_place - stake}, Got: {after_loss['total']}"
    )
    
    # Verify ledger entries: LOCK, DEBIT (2 entries)
    ledger_count = await count_ledger_entries(test_db, user.id, "USDT", ReferenceType.BET, bet.id)
    assert ledger_count == 2, f"Expected 2 ledger entries (LOCK, DEBIT), got {ledger_count}"


@pytest.mark.asyncio
async def test_void_equation(test_user_with_balance: User, test_match: Odds, test_db: AsyncSession):
    """Test: Void: reserved -= stake, available += stake"""
    user = test_user_with_balance
    match = test_match
    stake = Decimal("10.00")
    
    # Place bet
    bet = await BetService.place_bet(
        user_id=user.id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.50"),
        stake=stake,
        db=test_db
    )
    
    after_place = await WalletService.get_balance(user.id, "USDT", test_db)
    assert_balance_invariants(after_place, "After place bet")
    
    available_after_place = after_place["available"]
    reserved_after_place = after_place["reserved"]
    total_after_place = after_place["total"]
    
    # Settle as VOID
    await BetService.settle_bet(bet.id, "VOID", db=test_db)
    
    after_void = await WalletService.get_balance(user.id, "USDT", test_db)
    assert_balance_invariants(after_void, "After void")
    
    # Verify equation: reserved -= stake, available += stake
    assert after_void["reserved"] == reserved_after_place - stake, (
        f"Reserved should decrease by stake. Expected: {reserved_after_place - stake}, Got: {after_void['reserved']}"
    )
    assert after_void["available"] == available_after_place + stake, (
        f"Available should increase by stake. Expected: {available_after_place + stake}, Got: {after_void['available']}"
    )
    assert after_void["total"] == total_after_place, (
        f"Total should remain unchanged. Expected: {total_after_place}, Got: {after_void['total']}"
    )
    
    # Verify ledger entries: LOCK, UNLOCK (2 entries)
    ledger_count = await count_ledger_entries(test_db, user.id, "USDT", ReferenceType.BET, bet.id)
    assert ledger_count == 2, f"Expected 2 ledger entries (LOCK, UNLOCK), got {ledger_count}"


@pytest.mark.asyncio
async def test_insufficient_balance_prevents_negative(test_user_with_balance: User, test_match: Odds, test_db: AsyncSession):
    """Test that attempting to place bet with insufficient balance raises error and doesn't create negative balance"""
    user_id = test_user_with_balance.id
    match_id = test_match.id
    
    initial = await WalletService.get_balance(user_id, "USDT", test_db)
    assert_balance_invariants(initial, "Initial")
    initial_available = initial["available"]
    initial_reserved = initial["reserved"]
    
    # Try to place bet with more than available
    with pytest.raises(ValueError, match="Insufficient"):
        await BetService.place_bet(
            user_id=user_id,
            match_id=match_id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=initial_available + Decimal("1.00"),  # More than available
            db=test_db
        )
    
    # Rollback any partial transaction
    await test_db.rollback()
    
    # Verify balance unchanged (use user_id directly to avoid lazy loading issues)
    final = await WalletService.get_balance(user_id, "USDT", test_db)
    assert_balance_invariants(final, "After failed bet attempt")
    assert final["available"] == initial_available, "Balance should remain unchanged after failed bet"
    assert final["reserved"] == initial_reserved, "Reserved should remain unchanged"


@pytest.mark.asyncio
async def test_all_operations_create_ledger_entry(test_user_with_balance: User, test_db: AsyncSession):
    """Test that every wallet operation creates exactly one ledger entry"""
    user = test_user_with_balance
    
    # Get initial ledger count
    stmt = select(func.count(WalletTransaction.id)).where(
        WalletTransaction.user_id == user.id,
        WalletTransaction.asset == "USDT"
    )
    result = await test_db.execute(stmt)
    initial_count = result.scalar() or 0
    
    # Credit balance
    await WalletService.credit_balance(
        user_id=user.id,
        asset="USDT",
        amount=Decimal("50.00"),
        db=test_db,
        reference_type=ReferenceType.MANUAL,
        reference_id=1
    )
    
    # Check ledger count increased by 1
    result = await test_db.execute(stmt)
    new_count = result.scalar() or 0
    assert new_count == initial_count + 1, f"Expected {initial_count + 1} ledger entries, got {new_count}"
    
    # Lock balance
    await WalletService.lock_balance(
        user_id=user.id,
        asset="USDT",
        amount=Decimal("20.00"),
        db=test_db,
        reference_type=ReferenceType.MANUAL,
        reference_id=2
    )
    
    # Check ledger count increased by 1
    result = await test_db.execute(stmt)
    new_count = result.scalar() or 0
    assert new_count == initial_count + 2, f"Expected {initial_count + 2} ledger entries, got {new_count}"
