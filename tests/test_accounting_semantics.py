"""
Accounting Semantics Tests
Verifies correct accounting for all bet outcomes:
1. Place: BET_LOCK (available→reserved)
2. Win: BET_UNLOCK (reserved→available) + BET_PAYOUT (profit only)
3. Loss: BET_DEBIT (reserved decreases)
4. Void: BET_UNLOCK only

Also verifies profit formula: profit = stake * (decimal_odds - 1)
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


async def get_ledger_entries(test_db: AsyncSession, user_id: int, asset: str, reference_id: int):
    """Get all ledger entries for a bet"""
    stmt = select(WalletTransaction).where(
        WalletTransaction.user_id == user_id,
        WalletTransaction.asset == asset,
        WalletTransaction.reference_type == ReferenceType.BET,
        WalletTransaction.reference_id == reference_id
    ).order_by(WalletTransaction.created_at)
    result = await test_db.execute(stmt)
    return list(result.scalars().all())


@pytest.mark.asyncio
async def test_place_bet_uses_bet_lock(test_user_with_balance: User, test_match: Odds, test_db: AsyncSession):
    """Test: Place bet uses BET_LOCK (available→reserved)"""
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
    
    # Get ledger entries
    entries = await get_ledger_entries(test_db, user_id, "USDT", bet.id)
    
    # Should have exactly 1 entry: BET_LOCK
    assert len(entries) == 1, f"Expected 1 ledger entry, got {len(entries)}"
    assert entries[0].type == WalletTransactionType.BET_LOCK, (
        f"Expected BET_LOCK, got {entries[0].type}"
    )
    assert entries[0].amount == Decimal("10.00"), (
        f"Expected amount 10.00, got {entries[0].amount}"
    )
    
    # Verify balance change: available decreased, reserved increased
    assert entries[0].balance_before - entries[0].balance_after == Decimal("10.00"), (
        "Available should decrease by stake"
    )
    assert entries[0].reserved_after - entries[0].reserved_before == Decimal("10.00"), (
        "Reserved should increase by stake"
    )


@pytest.mark.asyncio
async def test_win_uses_unlock_and_payout_only_profit(test_user_with_balance: User, test_match: Odds, test_db: AsyncSession):
    """Test: WIN uses BET_UNLOCK (stake) + BET_PAYOUT (profit only) - NO double credit"""
    user_id = test_user_with_balance.id
    match = test_match
    stake = Decimal("10.00")
    odds = Decimal("2.50")
    expected_profit = stake * (odds - Decimal("1"))  # 10 * 1.5 = 15
    expected_payout = stake + expected_profit  # 10 + 15 = 25
    
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
    
    balance_after_place = await WalletService.get_balance(user_id, "USDT", test_db)
    available_after_place = balance_after_place["available"]
    
    # Settle as WIN
    await BetService.settle_bet(bet.id, "WIN", db=test_db)
    
    # Get ledger entries
    entries = await get_ledger_entries(test_db, user_id, "USDT", bet.id)
    
    # Should have 3 entries: BET_LOCK, BET_UNLOCK, BET_PAYOUT
    assert len(entries) == 3, f"Expected 3 ledger entries, got {len(entries)}"
    
    # Verify entry types
    assert entries[0].type == WalletTransactionType.BET_LOCK, "First entry should be BET_LOCK"
    assert entries[1].type == WalletTransactionType.BET_UNLOCK, "Second entry should be BET_UNLOCK"
    assert entries[2].type == WalletTransactionType.BET_PAYOUT, "Third entry should be BET_PAYOUT"
    
    # Verify BET_UNLOCK returns stake
    assert entries[1].amount == stake, (
        f"BET_UNLOCK should return stake {stake}, got {entries[1].amount}"
    )
    
    # Verify BET_PAYOUT credits ONLY profit (not full payout)
    assert entries[2].amount == expected_profit, (
        f"BET_PAYOUT should credit profit {expected_profit}, got {entries[2].amount}. "
        f"CRITICAL: Should NOT credit full payout {expected_payout}"
    )
    
    # Verify final balance
    balance_after_win = await WalletService.get_balance(user_id, "USDT", test_db)
    expected_available = available_after_place + stake + expected_profit
    assert balance_after_win["available"] == expected_available, (
        f"Final available should be {expected_available} (initial + stake + profit), "
        f"got {balance_after_win['available']}. "
        f"If this is {available_after_place + expected_payout}, there's a DOUBLE CREDIT BUG!"
    )
    
    # Calculate total credited from BET_PAYOUT entries
    payout_sum = sum(e.amount for e in entries if e.type == WalletTransactionType.BET_PAYOUT)
    assert payout_sum == expected_profit, (
        f"Total BET_PAYOUT should be profit {expected_profit}, got {payout_sum}"
    )


@pytest.mark.asyncio
async def test_profit_formula_correct(test_user_with_balance: User, test_db: AsyncSession):
    """Test: Profit formula = stake * (decimal_odds - 1)"""
    user_id = test_user_with_balance.id
    
    test_cases = [
        {"stake": Decimal("10.00"), "odds": Decimal("2.50"), "expected_profit": Decimal("15.00")},  # 10 * 1.5
        {"stake": Decimal("5.00"), "odds": Decimal("3.00"), "expected_profit": Decimal("10.00")},   # 5 * 2.0
        {"stake": Decimal("20.00"), "odds": Decimal("1.50"), "expected_profit": Decimal("10.00")},  # 20 * 0.5
        {"stake": Decimal("100.00"), "odds": Decimal("2.00"), "expected_profit": Decimal("100.00")}, # 100 * 1.0
    ]
    
    for case in test_cases:
        stake = case["stake"]
        odds = case["odds"]
        expected_profit = case["expected_profit"]
        
        # Create match without odds (to skip odds comparison)
        from datetime import date, timedelta
        match = Odds(
            home_team="Team A",
            away_team="Team B",
            league="Test League",
            country="Test Country",
            season=2024,
            date=date.today() + timedelta(days=1),
            odd_1=None,  # No server odds - comparison skipped
            odd_X=None,
            odd_2=None,
            result=None
        )
        test_db.add(match)
        await test_db.commit()
        await test_db.refresh(match)
        
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
        
        # Settle as WIN
        await BetService.settle_bet(bet.id, "WIN", db=test_db)
        
        # Get BET_PAYOUT entry
        entries = await get_ledger_entries(test_db, user_id, "USDT", bet.id)
        payout_entries = [e for e in entries if e.type == WalletTransactionType.BET_PAYOUT]
        
        assert len(payout_entries) == 1, f"Expected 1 BET_PAYOUT entry, got {len(payout_entries)}"
        actual_profit = payout_entries[0].amount
        
        assert actual_profit == expected_profit, (
            f"Profit formula incorrect! "
            f"Stake: {stake}, Odds: {odds}, "
            f"Expected profit: {expected_profit} (stake * (odds - 1) = {stake * (odds - Decimal('1'))}), "
            f"Got: {actual_profit}"
        )
        
        # Verify formula: profit = stake * (odds - 1)
        calculated_profit = stake * (odds - Decimal("1"))
        assert actual_profit == calculated_profit, (
            f"Profit should equal stake * (odds - 1) = {calculated_profit}, got {actual_profit}"
        )


@pytest.mark.asyncio
async def test_loss_uses_bet_debit(test_user_with_balance: User, test_match: Odds, test_db: AsyncSession):
    """Test: LOSS uses BET_DEBIT (reserved decreases)"""
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
    
    # Settle as LOSS
    await BetService.settle_bet(bet.id, "LOSS", db=test_db)
    
    # Get ledger entries
    entries = await get_ledger_entries(test_db, user_id, "USDT", bet.id)
    
    # Should have 2 entries: BET_LOCK, BET_DEBIT
    assert len(entries) == 2, f"Expected 2 ledger entries, got {len(entries)}"
    
    # Verify entry types
    assert entries[0].type == WalletTransactionType.BET_LOCK, "First entry should be BET_LOCK"
    assert entries[1].type == WalletTransactionType.BET_DEBIT, "Second entry should be BET_DEBIT"
    
    # Verify BET_DEBIT deducts stake from reserved
    assert entries[1].amount == stake, (
        f"BET_DEBIT should deduct stake {stake}, got {entries[1].amount}"
    )
    
    # Verify reserved decreased, available unchanged
    assert entries[1].reserved_before - entries[1].reserved_after == stake, (
        "Reserved should decrease by stake"
    )
    assert entries[1].balance_before == entries[1].balance_after, (
        "Available should remain unchanged"
    )


@pytest.mark.asyncio
async def test_void_uses_bet_unlock_only(test_user_with_balance: User, test_match: Odds, test_db: AsyncSession):
    """Test: VOID uses BET_UNLOCK only"""
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
    
    # Settle as VOID
    await BetService.settle_bet(bet.id, "VOID", db=test_db)
    
    # Get ledger entries
    entries = await get_ledger_entries(test_db, user_id, "USDT", bet.id)
    
    # Should have 2 entries: BET_LOCK, BET_UNLOCK
    assert len(entries) == 2, f"Expected 2 ledger entries, got {len(entries)}"
    
    # Verify entry types
    assert entries[0].type == WalletTransactionType.BET_LOCK, "First entry should be BET_LOCK"
    assert entries[1].type == WalletTransactionType.BET_UNLOCK, "Second entry should be BET_UNLOCK"
    
    # Verify NO BET_PAYOUT entry
    payout_entries = [e for e in entries if e.type == WalletTransactionType.BET_PAYOUT]
    assert len(payout_entries) == 0, (
        f"VOID should NOT have BET_PAYOUT entry, got {len(payout_entries)}"
    )
    
    # Verify BET_UNLOCK returns stake
    assert entries[1].amount == stake, (
        f"BET_UNLOCK should return stake {stake}, got {entries[1].amount}"
    )
    
    # Verify reserved decreased, available increased
    assert entries[1].reserved_before - entries[1].reserved_after == stake, (
        "Reserved should decrease by stake"
    )
    assert entries[1].balance_after - entries[1].balance_before == stake, (
        "Available should increase by stake"
    )


@pytest.mark.asyncio
async def test_win_no_double_credit_bug(test_user_with_balance: User, test_match: Odds, test_db: AsyncSession):
    """Test: WIN does NOT credit full payout + unlock stake (double credit bug check)"""
    user_id = test_user_with_balance.id
    match = test_match
    stake = Decimal("10.00")
    odds = Decimal("2.50")
    expected_profit = stake * (odds - Decimal("1"))  # 15
    expected_payout = stake + expected_profit  # 25
    
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
    
    balance_before = await WalletService.get_balance(user_id, "USDT", test_db)
    available_before = balance_before["available"]
    
    # Settle as WIN
    await BetService.settle_bet(bet.id, "WIN", db=test_db)
    
    balance_after = await WalletService.get_balance(user_id, "USDT", test_db)
    available_after = balance_after["available"]
    
    # Calculate what was actually credited
    actual_increase = available_after - available_before
    
    # Should be: stake (unlocked) + profit (credited) = 10 + 15 = 25
    expected_increase = stake + expected_profit
    
    assert actual_increase == expected_increase, (
        f"CRITICAL BUG: Double credit detected! "
        f"Expected increase: {expected_increase} (stake {stake} + profit {expected_profit}), "
        f"Got: {actual_increase}. "
        f"If got {expected_payout + stake} = {expected_payout + stake}, full payout was credited AND stake unlocked (DOUBLE CREDIT BUG)"
    )
    
    # Verify BET_PAYOUT is profit only, not full payout
    entries = await get_ledger_entries(test_db, user_id, "USDT", bet.id)
    payout_entries = [e for e in entries if e.type == WalletTransactionType.BET_PAYOUT]
    
    assert len(payout_entries) == 1, "Should have exactly 1 BET_PAYOUT entry"
    payout_amount = payout_entries[0].amount
    
    assert payout_amount == expected_profit, (
        f"BET_PAYOUT should be profit {expected_profit}, got {payout_amount}. "
        f"If got {expected_payout}, full payout was credited (BUG)"
    )
    assert payout_amount != expected_payout, (
        f"CRITICAL: BET_PAYOUT should NOT be full payout {expected_payout}, got {payout_amount}"
    )
