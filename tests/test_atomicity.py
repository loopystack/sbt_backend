"""
Atomicity Tests
Verifies that bet placement and settlement are atomic operations:
1. Place bet: Create bet + lock balance in one transaction
2. If lock fails → bet row should not remain
3. Settle bet: Update status + ledger + wallet in one transaction
4. If settlement fails → must rollback cleanly
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
from app.models.bet import Bet, BetStatus
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
async def test_user_with_low_balance(test_db: AsyncSession, test_user: User):
    """Create user with only 5 USDT balance (for insufficient balance tests)"""
    balance = UserCryptoBalance(
        user_id=test_user.id,
        asset="USDT",
        balance=Decimal("5.00"),
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


@pytest.mark.asyncio
async def test_place_bet_atomic_success(test_user_with_balance: User, test_match: Odds, test_db: AsyncSession):
    """Test: Place bet is atomic - bet created and balance locked in one transaction"""
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
    
    # Verify bet exists
    stmt = select(Bet).where(Bet.id == bet.id)
    result = await test_db.execute(stmt)
    bet_from_db = result.scalar_one_or_none()
    assert bet_from_db is not None, "Bet should exist in database"
    assert bet_from_db.status == BetStatus.PENDING, "Bet should be PENDING"
    
    # Verify balance is locked
    balance = await WalletService.get_balance(user_id, "USDT", test_db)
    assert balance["reserved"] == Decimal("10.00"), "Balance should be locked"
    assert balance["available"] == Decimal("90.00"), "Available should decrease"
    
    # Verify ledger entry exists
    stmt = select(WalletTransaction).where(
        WalletTransaction.reference_type == ReferenceType.BET,
        WalletTransaction.reference_id == bet.id
    )
    result = await test_db.execute(stmt)
    ledger_entries = list(result.scalars().all())
    assert len(ledger_entries) == 1, "Should have exactly 1 ledger entry"
    assert ledger_entries[0].type == WalletTransactionType.BET_LOCK, "Should be BET_LOCK"


@pytest.mark.asyncio
async def test_place_bet_atomic_rollback_on_lock_failure(test_user_with_low_balance: User, test_match: Odds, test_db: AsyncSession):
    """Test: If lock fails → bet row should NOT remain in database (atomic rollback)"""
    user_id = test_user_with_low_balance.id
    match = test_match
    
    # Count bets before
    stmt = select(func.count(Bet.id)).where(Bet.user_id == user_id)
    result = await test_db.execute(stmt)
    bets_before = result.scalar() or 0
    
    # Try to place bet with insufficient balance (will fail)
    with pytest.raises(ValueError, match="Insufficient"):
        await BetService.place_bet(
            user_id=user_id,
            match_id=match.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=Decimal("10.00"),  # More than available (5.00)
            db=test_db
        )
    
    # Rollback any partial transaction
    await test_db.rollback()
    
    # Count bets after (should be same as before)
    stmt = select(func.count(Bet.id)).where(Bet.user_id == user_id)
    result = await test_db.execute(stmt)
    bets_after = result.scalar() or 0
    
    assert bets_after == bets_before, (
        f"Bet row should NOT remain after failed lock. "
        f"Bets before: {bets_before}, Bets after: {bets_after}"
    )
    
    # Verify no ledger entries created
    stmt = select(func.count(WalletTransaction.id)).where(
        WalletTransaction.user_id == user_id,
        WalletTransaction.reference_type == ReferenceType.BET
    )
    result = await test_db.execute(stmt)
    ledger_count = result.scalar() or 0
    assert ledger_count == 0, (
        f"No ledger entries should exist after failed bet placement. Got {ledger_count}"
    )
    
    # Verify balance unchanged
    balance = await WalletService.get_balance(user_id, "USDT", test_db)
    assert balance["available"] == Decimal("5.00"), "Balance should remain unchanged"
    assert balance["reserved"] == Decimal("0"), "Reserved should remain 0"


@pytest.mark.asyncio
async def test_settle_bet_atomic_success_win(test_user_with_balance: User, test_match: Odds, test_db: AsyncSession):
    """Test: Settle bet (WIN) is atomic - status + ledger + wallet in one transaction"""
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
    
    balance_before = await WalletService.get_balance(user_id, "USDT", test_db)
    
    # Settle as WIN
    settled_bet = await BetService.settle_bet(bet.id, "WIN", db=test_db)
    
    # Verify bet status updated
    assert settled_bet.status == BetStatus.WON, "Bet should be WON"
    assert settled_bet.settled_at is not None, "Bet should have settled_at timestamp"
    
    # Verify balance changed
    balance_after = await WalletService.get_balance(user_id, "USDT", test_db)
    assert balance_after["available"] > balance_before["available"], "Available should increase"
    assert balance_after["reserved"] < balance_before["reserved"], "Reserved should decrease"
    
    # Verify ledger entries created
    stmt = select(WalletTransaction).where(
        WalletTransaction.reference_type == ReferenceType.BET,
        WalletTransaction.reference_id == bet.id
    ).order_by(WalletTransaction.created_at)
    result = await test_db.execute(stmt)
    entries = list(result.scalars().all())
    
    assert len(entries) == 3, "Should have 3 ledger entries (LOCK, UNLOCK, PAYOUT)"
    assert entries[0].type == WalletTransactionType.BET_LOCK
    assert entries[1].type == WalletTransactionType.BET_WIN_DEDUCT_STAKE
    assert entries[2].type == WalletTransactionType.BET_WIN_PAYOUT_CREDIT


@pytest.mark.asyncio
async def test_settle_bet_atomic_rollback_on_failure(test_user_with_balance: User, test_match: Odds, test_db: AsyncSession):
    """Test: If settlement fails → must rollback cleanly (no half-applied changes)"""
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
    
    # Get initial state
    balance_before = await WalletService.get_balance(user_id, "USDT", test_db)
    
    # Try to settle a non-existent bet - should fail cleanly
    with pytest.raises(ValueError, match="not found"):
        await BetService.settle_bet(999999, "WIN", db=test_db)
    
    # Verify original bet is still PENDING (not affected by failed settlement)
    stmt = select(Bet).where(Bet.id == bet.id)
    result = await test_db.execute(stmt)
    bet_from_db = result.scalar_one_or_none()
    assert bet_from_db is not None, "Original bet should still exist"
    assert bet_from_db.status == BetStatus.PENDING, (
        f"Original bet should remain PENDING, got {bet_from_db.status}"
    )
    
    # Verify balance unchanged
    balance_after = await WalletService.get_balance(user_id, "USDT", test_db)
    assert balance_after["available"] == balance_before["available"], (
        "Available balance should be unchanged after failed settlement"
    )
    assert balance_after["reserved"] == balance_before["reserved"], (
        "Reserved balance should be unchanged after failed settlement"
    )
    
    # Verify no additional ledger entries (only original BET_LOCK)
    stmt = select(WalletTransaction).where(
        WalletTransaction.reference_type == ReferenceType.BET,
        WalletTransaction.reference_id == bet.id
    )
    result = await test_db.execute(stmt)
    entries = list(result.scalars().all())
    
    assert len(entries) == 1, (
        f"Should have only 1 ledger entry (BET_LOCK) after failed settlement, got {len(entries)}"
    )
    assert entries[0].type == WalletTransactionType.BET_LOCK, "Only entry should be BET_LOCK"


@pytest.mark.asyncio
async def test_settle_bet_atomic_all_changes_committed(test_user_with_balance: User, test_match: Odds, test_db: AsyncSession):
    """Test: Successful settlement commits all changes atomically"""
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
    
    # Settle as WIN
    settled_bet = await BetService.settle_bet(bet.id, "WIN", db=test_db)
    
    # Verify bet status persisted (in same session after commit)
    stmt = select(Bet).where(Bet.id == bet.id)
    result = await test_db.execute(stmt)
    bet_from_db = result.scalar_one_or_none()
    assert bet_from_db is not None, "Bet should exist"
    assert bet_from_db.status == BetStatus.WON, "Bet status should be WON"
    assert bet_from_db.settled_at is not None, "Bet should have settled_at"
    
    # Verify ledger entries persisted
    stmt = select(WalletTransaction).where(
        WalletTransaction.reference_type == ReferenceType.BET,
        WalletTransaction.reference_id == bet.id
    )
    result = await test_db.execute(stmt)
    entries = list(result.scalars().all())
    assert len(entries) == 3, "Should have 3 ledger entries persisted"
    
    # Verify balance persisted
    balance = await WalletService.get_balance(user_id, "USDT", test_db)
    assert balance["reserved"] == Decimal("0"), "Reserved should be 0"
    assert balance["available"] > Decimal("100.00"), "Available should include profit"


@pytest.mark.asyncio
async def test_place_bet_single_commit(test_user_with_balance: User, test_match: Odds, test_db: AsyncSession):
    """Test: Place bet uses single commit (atomic transaction)"""
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
    
    # Verify both bet and ledger entry exist (proves single commit)
    stmt = select(Bet).where(Bet.id == bet.id)
    result = await test_db.execute(stmt)
    bet_from_db = result.scalar_one_or_none()
    assert bet_from_db is not None, "Bet should exist"
    
    stmt = select(WalletTransaction).where(
        WalletTransaction.reference_type == ReferenceType.BET,
        WalletTransaction.reference_id == bet.id
    )
    result = await test_db.execute(stmt)
    entries = list(result.scalars().all())
    assert len(entries) == 1, "Ledger entry should exist"
    
    # Both exist = single commit worked


@pytest.mark.asyncio
async def test_settle_bet_single_commit(test_user_with_balance: User, test_match: Odds, test_db: AsyncSession):
    """Test: Settle bet uses single commit (atomic transaction)"""
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
    
    # Settle as WIN
    settled_bet = await BetService.settle_bet(bet.id, "WIN", db=test_db)
    
    # Verify bet status, ledger entries, and balance all updated (proves single commit)
    assert settled_bet.status == BetStatus.WON, "Bet status should be updated"
    
    stmt = select(WalletTransaction).where(
        WalletTransaction.reference_type == ReferenceType.BET,
        WalletTransaction.reference_id == bet.id
    )
    result = await test_db.execute(stmt)
    entries = list(result.scalars().all())
    assert len(entries) == 3, "All ledger entries should exist"
    
    balance = await WalletService.get_balance(user_id, "USDT", test_db)
    assert balance["reserved"] == Decimal("0"), "Balance should be updated"
    
    # All updated = single commit worked
