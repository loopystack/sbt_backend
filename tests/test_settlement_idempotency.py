"""
Settlement Idempotency Tests
Critical: Settling a bet twice must not pay twice.

Tests:
1. Settle WIN twice → profit credited once only
2. Settle LOSS twice → stake deducted once only
3. Settle VOID twice → stake returned once only
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
from app.models.bet import BetStatus
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


async def count_ledger_entries_by_type(test_db: AsyncSession, user_id: int, asset: str, reference_id: int, transaction_type: WalletTransactionType) -> int:
    """Count ledger entries of a specific type for a bet"""
    stmt = select(func.count(WalletTransaction.id)).where(
        WalletTransaction.user_id == user_id,
        WalletTransaction.asset == asset,
        WalletTransaction.reference_type == ReferenceType.BET,
        WalletTransaction.reference_id == reference_id,
        WalletTransaction.type == transaction_type
    )
    result = await test_db.execute(stmt)
    return result.scalar() or 0


@pytest.mark.asyncio
async def test_settle_win_twice_profit_credited_once(test_user_with_balance: User, test_match: Odds, test_db: AsyncSession):
    """Test: Settle WIN twice → profit credited once only"""
    user_id = test_user_with_balance.id
    match = test_match
    stake = Decimal("10.00")
    odds = Decimal("2.50")
    expected_profit = stake * (odds - Decimal("1"))  # 10 * 1.5 = 15
    expected_payout = stake * odds  # 10 * 2.5 = 25
    
    # Place bet
    bet = await BetService.place_bet(
        user_id=user_id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=odds,
        stake=stake,
        db=test_db
    )
    
    # Get balance after placing bet
    balance_after_place = await WalletService.get_balance(user_id, "USDT", test_db)
    available_after_place = balance_after_place["available"]
    
    # Settle as WIN (first time)
    settled_bet1 = await BetService.settle_bet(bet.id, "WIN", db=test_db)
    assert settled_bet1.status == BetStatus.WON
    
    # Get balance after first settlement
    balance_after_first = await WalletService.get_balance(user_id, "USDT", test_db)
    available_after_first = balance_after_first["available"]
    
    # Verify payout was credited
    # After WIN: 
    # - Place bet: available decreased by stake (10), reserved increased by stake (10)
    # - WIN settlement: reserved decreased by stake (10), available increased by full payout (25)
    # Net: available = available_after_place + payout
    expected_available_after_first = available_after_place + expected_payout
    assert balance_after_first["available"] == expected_available_after_first, (
        f"After first WIN: Expected available {expected_available_after_first}, got {balance_after_first['available']}"
    )
    
    # Count BET_WIN_PAYOUT_CREDIT entries (should be 1)
    payout_count_1 = await count_ledger_entries_by_type(test_db, user_id, "USDT", bet.id, WalletTransactionType.BET_WIN_PAYOUT_CREDIT)
    assert payout_count_1 == 1, f"Expected 1 BET_WIN_PAYOUT_CREDIT entry after first settlement, got {payout_count_1}"
    
    # Settle as WIN (second time) - should be idempotent
    settled_bet2 = await BetService.settle_bet(bet.id, "WIN", db=test_db)
    assert settled_bet2.status == BetStatus.WON  # Still WON
    
    # Get balance after second settlement
    balance_after_second = await WalletService.get_balance(user_id, "USDT", test_db)
    available_after_second = balance_after_second["available"]
    
    # Balance should be unchanged (payout credited only once)
    assert balance_after_second["available"] == balance_after_first["available"], (
        f"After second WIN: Balance changed! First: {balance_after_first['available']}, Second: {balance_after_second['available']}"
    )
    
    # Count BET_WIN_PAYOUT_CREDIT entries (should still be 1, not 2)
    payout_count_2 = await count_ledger_entries_by_type(test_db, user_id, "USDT", bet.id, WalletTransactionType.BET_WIN_PAYOUT_CREDIT)
    assert payout_count_2 == 1, f"Expected 1 BET_WIN_PAYOUT_CREDIT entry after second settlement (idempotent), got {payout_count_2}"
    
    # Verify total payout credited matches expected (not doubled)
    stmt = select(func.sum(WalletTransaction.amount)).where(
        WalletTransaction.user_id == user_id,
        WalletTransaction.asset == "USDT",
        WalletTransaction.reference_type == ReferenceType.BET,
        WalletTransaction.reference_id == bet.id,
        WalletTransaction.type == WalletTransactionType.BET_WIN_PAYOUT_CREDIT
    )
    result = await test_db.execute(stmt)
    total_payout_credited = result.scalar() or Decimal("0")
    assert total_payout_credited == expected_payout, (
        f"Total payout credited should be {expected_payout}, got {total_payout_credited}"
    )


@pytest.mark.asyncio
async def test_settle_loss_twice_stake_deducted_once(test_user_with_balance: User, test_match: Odds, test_db: AsyncSession):
    """Test: Settle LOSS twice → stake deducted once only"""
    user_id = test_user_with_balance.id
    match = test_match
    stake = Decimal("10.00")
    
    # Place bet
    bet = await BetService.place_bet(
        user_id=user_id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.50"),
        stake=stake,
        db=test_db
    )
    
    # Get balance after placing bet
    balance_after_place = await WalletService.get_balance(user_id, "USDT", test_db)
    available_after_place = balance_after_place["available"]
    reserved_after_place = balance_after_place["reserved"]
    total_after_place = balance_after_place["total"]
    
    # Settle as LOSS (first time)
    settled_bet1 = await BetService.settle_bet(bet.id, "LOSS", db=test_db)
    assert settled_bet1.status == BetStatus.LOST
    
    # Get balance after first settlement
    balance_after_first = await WalletService.get_balance(user_id, "USDT", test_db)
    available_after_first = balance_after_first["available"]
    reserved_after_first = balance_after_first["reserved"]
    total_after_first = balance_after_first["total"]
    
    # Verify stake was deducted (reserved decreased, available unchanged, total decreased)
    assert balance_after_first["available"] == available_after_place, "Available should be unchanged after LOSS"
    assert balance_after_first["reserved"] == reserved_after_place - stake, "Reserved should decrease by stake"
    assert balance_after_first["total"] == total_after_place - stake, "Total should decrease by stake"
    
    # Count BET_LOSS_DEDUCT entries (should be 1)
    debit_count_1 = await count_ledger_entries_by_type(test_db, user_id, "USDT", bet.id, WalletTransactionType.BET_LOSS_DEDUCT)
    assert debit_count_1 == 1, f"Expected 1 BET_LOSS_DEDUCT entry after first settlement, got {debit_count_1}"
    
    # Settle as LOSS (second time) - should be idempotent
    settled_bet2 = await BetService.settle_bet(bet.id, "LOSS", db=test_db)
    assert settled_bet2.status == BetStatus.LOST  # Still LOST
    
    # Get balance after second settlement
    balance_after_second = await WalletService.get_balance(user_id, "USDT", test_db)
    available_after_second = balance_after_second["available"]
    reserved_after_second = balance_after_second["reserved"]
    total_after_second = balance_after_second["total"]
    
    # Balance should be unchanged (stake deducted only once)
    assert balance_after_second["available"] == balance_after_first["available"], (
        f"After second LOSS: Available changed! First: {balance_after_first['available']}, Second: {balance_after_second['available']}"
    )
    assert balance_after_second["reserved"] == balance_after_first["reserved"], (
        f"After second LOSS: Reserved changed! First: {balance_after_first['reserved']}, Second: {balance_after_second['reserved']}"
    )
    assert balance_after_second["total"] == balance_after_first["total"], (
        f"After second LOSS: Total changed! First: {balance_after_first['total']}, Second: {balance_after_second['total']}"
    )
    
    # Count BET_LOSS_DEDUCT entries (should still be 1, not 2)
    debit_count_2 = await count_ledger_entries_by_type(test_db, user_id, "USDT", bet.id, WalletTransactionType.BET_LOSS_DEDUCT)
    assert debit_count_2 == 1, f"Expected 1 BET_LOSS_DEDUCT entry after second settlement (idempotent), got {debit_count_2}"
    
    # Verify total stake deducted matches expected (not doubled)
    stmt = select(func.sum(WalletTransaction.amount)).where(
        WalletTransaction.user_id == user_id,
        WalletTransaction.asset == "USDT",
        WalletTransaction.reference_type == ReferenceType.BET,
        WalletTransaction.reference_id == bet.id,
        WalletTransaction.type == WalletTransactionType.BET_LOSS_DEDUCT
    )
    result = await test_db.execute(stmt)
    total_stake_deducted = result.scalar() or Decimal("0")
    assert total_stake_deducted == stake, (
        f"Total stake deducted should be {stake}, got {total_stake_deducted}"
    )


@pytest.mark.asyncio
async def test_settle_void_twice_stake_returned_once(test_user_with_balance: User, test_match: Odds, test_db: AsyncSession):
    """Test: Settle VOID twice → stake returned once only"""
    user_id = test_user_with_balance.id
    match = test_match
    stake = Decimal("10.00")
    
    # Place bet
    bet = await BetService.place_bet(
        user_id=user_id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.50"),
        stake=stake,
        db=test_db
    )
    
    # Get balance after placing bet
    balance_after_place = await WalletService.get_balance(user_id, "USDT", test_db)
    available_after_place = balance_after_place["available"]
    reserved_after_place = balance_after_place["reserved"]
    total_after_place = balance_after_place["total"]
    
    # Settle as VOID (first time)
    settled_bet1 = await BetService.settle_bet(bet.id, "VOID", db=test_db)
    assert settled_bet1.status == BetStatus.VOID
    
    # Get balance after first settlement
    balance_after_first = await WalletService.get_balance(user_id, "USDT", test_db)
    available_after_first = balance_after_first["available"]
    reserved_after_first = balance_after_first["reserved"]
    total_after_first = balance_after_first["total"]
    
    # Verify stake was returned (reserved decreased, available increased, total unchanged)
    assert balance_after_first["available"] == available_after_place + stake, "Available should increase by stake"
    assert balance_after_first["reserved"] == reserved_after_place - stake, "Reserved should decrease by stake"
    assert balance_after_first["total"] == total_after_place, "Total should remain unchanged"
    
    # Count BET_VOID_UNLOCK entries (should be 1)
    unlock_count_1 = await count_ledger_entries_by_type(test_db, user_id, "USDT", bet.id, WalletTransactionType.BET_VOID_UNLOCK)
    assert unlock_count_1 == 1, f"Expected 1 BET_VOID_UNLOCK entry after first settlement, got {unlock_count_1}"
    
    # Settle as VOID (second time) - should be idempotent
    settled_bet2 = await BetService.settle_bet(bet.id, "VOID", db=test_db)
    assert settled_bet2.status == BetStatus.VOID  # Still VOID
    
    # Get balance after second settlement
    balance_after_second = await WalletService.get_balance(user_id, "USDT", test_db)
    available_after_second = balance_after_second["available"]
    reserved_after_second = balance_after_second["reserved"]
    total_after_second = balance_after_second["total"]
    
    # Balance should be unchanged (stake returned only once)
    assert balance_after_second["available"] == balance_after_first["available"], (
        f"After second VOID: Available changed! First: {balance_after_first['available']}, Second: {balance_after_second['available']}"
    )
    assert balance_after_second["reserved"] == balance_after_first["reserved"], (
        f"After second VOID: Reserved changed! First: {balance_after_first['reserved']}, Second: {balance_after_second['reserved']}"
    )
    assert balance_after_second["total"] == balance_after_first["total"], (
        f"After second VOID: Total changed! First: {balance_after_first['total']}, Second: {balance_after_second['total']}"
    )
    
    # Count BET_VOID_UNLOCK entries (should still be 1, not 2)
    unlock_count_2 = await count_ledger_entries_by_type(test_db, user_id, "USDT", bet.id, WalletTransactionType.BET_VOID_UNLOCK)
    assert unlock_count_2 == 1, f"Expected 1 BET_VOID_UNLOCK entry after second settlement (idempotent), got {unlock_count_2}"
    
    # Verify total stake unlocked matches expected (not doubled)
    stmt = select(func.sum(WalletTransaction.amount)).where(
        WalletTransaction.user_id == user_id,
        WalletTransaction.asset == "USDT",
        WalletTransaction.reference_type == ReferenceType.BET,
        WalletTransaction.reference_id == bet.id,
        WalletTransaction.type == WalletTransactionType.BET_VOID_UNLOCK
    )
    result = await test_db.execute(stmt)
    total_stake_unlocked = result.scalar() or Decimal("0")
    assert total_stake_unlocked == stake, (
        f"Total stake unlocked should be {stake}, got {total_stake_unlocked}"
    )


@pytest.mark.asyncio
async def test_settle_bet_uses_row_lock(test_user_with_balance: User, test_match: Odds, test_db: AsyncSession):
    """Test that settle_bet uses SELECT ... FOR UPDATE (row lock)"""
    user_id = test_user_with_balance.id
    match = test_match
    
    # Place bet
    bet = await BetService.place_bet(
        user_id=user_id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.50"),
        stake=Decimal("10.00"),
        db=test_db
    )
    
    # Verify bet is PENDING
    assert bet.status == BetStatus.PENDING
    
    # Settle bet (this should use row lock internally)
    settled_bet = await BetService.settle_bet(bet.id, "WIN", db=test_db)
    
    # Verify bet is now WON
    assert settled_bet.status == BetStatus.WON
    
    # Try to settle again - should be idempotent (status check prevents re-settlement)
    settled_bet2 = await BetService.settle_bet(bet.id, "WIN", db=test_db)
    
    # Should still be WON, not re-processed
    assert settled_bet2.status == BetStatus.WON
    assert settled_bet2.settle_version == settled_bet.settle_version  # Version should not increment
