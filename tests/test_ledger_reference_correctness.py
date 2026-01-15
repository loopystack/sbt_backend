"""
Ledger Reference Correctness and Auditability Tests
Verifies:
1. Every ledger entry related to bet has reference_type = BET and reference_id = bet.id
2. Complete ledger chain for each outcome:
   - Bet placed → BET_LOCK exists
   - WIN: BET_UNLOCK + BET_PAYOUT
   - LOSS: BET_DEBIT
   - VOID: BET_UNLOCK
3. Auditability: Can trace all money movements for any bet
"""
import pytest
import pytest_asyncio
from decimal import Decimal
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select

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


async def get_bet_ledger_entries(test_db: AsyncSession, bet_id: int) -> list[WalletTransaction]:
    """Get all ledger entries for a specific bet"""
    stmt = select(WalletTransaction).where(
        WalletTransaction.reference_type == ReferenceType.BET,
        WalletTransaction.reference_id == bet_id
    ).order_by(WalletTransaction.created_at)
    result = await test_db.execute(stmt)
    return list(result.scalars().all())


@pytest.mark.asyncio
async def test_place_bet_creates_bet_lock_with_references(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test: Bet placement creates BET_LOCK with correct reference_type and reference_id"""
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
    
    # Get ledger entries for this bet
    entries = await get_bet_ledger_entries(test_db, bet.id)
    
    # Should have exactly 1 entry: BET_LOCK
    assert len(entries) == 1, f"Should have 1 ledger entry, got {len(entries)}"
    
    entry = entries[0]
    
    # Verify reference correctness
    assert entry.reference_type == ReferenceType.BET, (
        f"reference_type should be BET, got {entry.reference_type}"
    )
    assert entry.reference_id == bet.id, (
        f"reference_id should be {bet.id}, got {entry.reference_id}"
    )
    assert entry.type == WalletTransactionType.BET_LOCK, (
        f"Entry type should be BET_LOCK, got {entry.type}"
    )
    assert entry.user_id == user_id, "Entry should reference correct user"
    assert entry.asset == "USDT", "Entry should reference correct asset"


@pytest.mark.asyncio
async def test_win_settlement_creates_complete_ledger_chain(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test: WIN settlement creates BET_UNLOCK + BET_PAYOUT with correct references"""
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
    await BetService.settle_bet(bet.id, "WIN", db=test_db)
    
    # Get all ledger entries for this bet
    entries = await get_bet_ledger_entries(test_db, bet.id)
    
    # Should have 3 entries: BET_LOCK, BET_UNLOCK, BET_PAYOUT
    assert len(entries) == 3, f"Should have 3 ledger entries for WIN, got {len(entries)}"
    
    # Verify all entries have correct references
    for entry in entries:
        assert entry.reference_type == ReferenceType.BET, (
            f"Entry {entry.id} should have reference_type = BET, got {entry.reference_type}"
        )
        assert entry.reference_id == bet.id, (
            f"Entry {entry.id} should have reference_id = {bet.id}, got {entry.reference_id}"
        )
        assert entry.user_id == user_id, f"Entry {entry.id} should reference correct user"
    
    # Verify entry types in order
    assert entries[0].type == WalletTransactionType.BET_LOCK, "First entry should be BET_LOCK"
    assert entries[1].type == WalletTransactionType.BET_UNLOCK, "Second entry should be BET_UNLOCK"
    assert entries[2].type == WalletTransactionType.BET_PAYOUT, "Third entry should be BET_PAYOUT"
    
    # Verify complete chain
    lock_entry = entries[0]
    unlock_entry = entries[1]
    payout_entry = entries[2]
    
    assert lock_entry.amount == Decimal("10.00"), "BET_LOCK should lock stake"
    assert unlock_entry.amount == Decimal("10.00"), "BET_UNLOCK should unlock stake"
    assert payout_entry.amount == Decimal("15.00"), "BET_PAYOUT should credit profit (10 * 1.5)"


@pytest.mark.asyncio
async def test_loss_settlement_creates_complete_ledger_chain(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test: LOSS settlement creates BET_DEBIT with correct references"""
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
    
    # Settle as LOSS
    await BetService.settle_bet(bet.id, "LOSS", db=test_db)
    
    # Get all ledger entries for this bet
    entries = await get_bet_ledger_entries(test_db, bet.id)
    
    # Should have 2 entries: BET_LOCK, BET_DEBIT
    assert len(entries) == 2, f"Should have 2 ledger entries for LOSS, got {len(entries)}"
    
    # Verify all entries have correct references
    for entry in entries:
        assert entry.reference_type == ReferenceType.BET, (
            f"Entry {entry.id} should have reference_type = BET, got {entry.reference_type}"
        )
        assert entry.reference_id == bet.id, (
            f"Entry {entry.id} should have reference_id = {bet.id}, got {entry.reference_id}"
        )
        assert entry.user_id == user_id, f"Entry {entry.id} should reference correct user"
    
    # Verify entry types
    assert entries[0].type == WalletTransactionType.BET_LOCK, "First entry should be BET_LOCK"
    assert entries[1].type == WalletTransactionType.BET_DEBIT, "Second entry should be BET_DEBIT"
    
    # Verify complete chain
    lock_entry = entries[0]
    debit_entry = entries[1]
    
    assert lock_entry.amount == Decimal("10.00"), "BET_LOCK should lock stake"
    assert debit_entry.amount == Decimal("10.00"), "BET_DEBIT should deduct stake"


@pytest.mark.asyncio
async def test_void_settlement_creates_complete_ledger_chain(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test: VOID settlement creates BET_UNLOCK with correct references"""
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
    
    # Settle as VOID
    await BetService.settle_bet(bet.id, "VOID", db=test_db)
    
    # Get all ledger entries for this bet
    entries = await get_bet_ledger_entries(test_db, bet.id)
    
    # Should have 2 entries: BET_LOCK, BET_UNLOCK
    assert len(entries) == 2, f"Should have 2 ledger entries for VOID, got {len(entries)}"
    
    # Verify all entries have correct references
    for entry in entries:
        assert entry.reference_type == ReferenceType.BET, (
            f"Entry {entry.id} should have reference_type = BET, got {entry.reference_type}"
        )
        assert entry.reference_id == bet.id, (
            f"Entry {entry.id} should have reference_id = {bet.id}, got {entry.reference_id}"
        )
        assert entry.user_id == user_id, f"Entry {entry.id} should reference correct user"
    
    # Verify entry types
    assert entries[0].type == WalletTransactionType.BET_LOCK, "First entry should be BET_LOCK"
    assert entries[1].type == WalletTransactionType.BET_UNLOCK, "Second entry should be BET_UNLOCK"
    
    # Verify complete chain
    lock_entry = entries[0]
    unlock_entry = entries[1]
    
    assert lock_entry.amount == Decimal("10.00"), "BET_LOCK should lock stake"
    assert unlock_entry.amount == Decimal("10.00"), "BET_UNLOCK should unlock stake"
    
    # Verify NO BET_PAYOUT for VOID
    payout_entries = [e for e in entries if e.type == WalletTransactionType.BET_PAYOUT]
    assert len(payout_entries) == 0, "VOID should NOT have BET_PAYOUT entry"


@pytest.mark.asyncio
async def test_auditability_trace_all_money_movements(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test: Can audit any bet and see all money movements"""
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
    await BetService.settle_bet(bet.id, "WIN", db=test_db)
    
    # Audit: Get all ledger entries for this bet
    entries = await get_bet_ledger_entries(test_db, bet.id)
    
    # Verify auditability: All entries reference this bet
    for entry in entries:
        assert entry.reference_type == ReferenceType.BET, "All entries should reference BET"
        assert entry.reference_id == bet.id, f"All entries should reference bet {bet.id}"
        assert entry.user_id == user_id, "All entries should reference correct user"
        assert entry.asset == "USDT", "All entries should reference correct asset"
    
    # Verify complete audit trail
    assert len(entries) == 3, "Should have 3 entries for complete audit trail"
    
    # Calculate net balance change from audit trail
    net_change = Decimal("0")
    for entry in entries:
        if entry.type == WalletTransactionType.BET_LOCK:
            net_change -= entry.amount  # Locked (decreased available)
        elif entry.type == WalletTransactionType.BET_UNLOCK:
            net_change += entry.amount  # Unlocked (increased available)
        elif entry.type == WalletTransactionType.BET_PAYOUT:
            net_change += entry.amount  # Profit credited (increased available)
        elif entry.type == WalletTransactionType.BET_DEBIT:
            net_change -= entry.amount  # Debit (decreased reserved)
    
    # For WIN: -10 (lock) + 10 (unlock) + 15 (payout) = +15 (profit)
    expected_net = Decimal("15.00")
    assert net_change == expected_net, (
        f"Net balance change from audit trail should be {expected_net}, got {net_change}"
    )


@pytest.mark.asyncio
async def test_multiple_bets_have_separate_ledger_entries(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test: Multiple bets have separate, correctly referenced ledger entries"""
    user_id = test_user_with_balance.id
    match = test_match
    
    # Place first bet
    bet1 = await BetService.place_bet(
        user_id=user_id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.50"),
        stake=Decimal("10.00"),
        db=test_db
    )
    
    # Place second bet
    bet2 = await BetService.place_bet(
        user_id=user_id,
        match_id=match.id,
        market_key="1x2",
        selection_key="away",
        odds_decimal=Decimal("2.80"),
        stake=Decimal("5.00"),
        db=test_db
    )
    
    # Get ledger entries for each bet
    entries1 = await get_bet_ledger_entries(test_db, bet1.id)
    entries2 = await get_bet_ledger_entries(test_db, bet2.id)
    
    # Verify each bet has its own entries
    assert len(entries1) == 1, "Bet1 should have 1 entry (BET_LOCK)"
    assert len(entries2) == 1, "Bet2 should have 1 entry (BET_LOCK)"
    
    # Verify entries reference correct bets
    for entry in entries1:
        assert entry.reference_id == bet1.id, "Bet1 entries should reference bet1"
    
    for entry in entries2:
        assert entry.reference_id == bet2.id, "Bet2 entries should reference bet2"
    
    # Verify no cross-contamination
    assert all(e.reference_id == bet1.id for e in entries1), "All bet1 entries should reference bet1"
    assert all(e.reference_id == bet2.id for e in entries2), "All bet2 entries should reference bet2"


@pytest.mark.asyncio
async def test_ledger_entries_have_complete_metadata(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test: Ledger entries have complete metadata for auditability"""
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
    entries = await get_bet_ledger_entries(test_db, bet.id)
    
    # Verify each entry has complete metadata
    for entry in entries:
        assert entry.reference_type is not None, "Entry should have reference_type"
        assert entry.reference_id is not None, "Entry should have reference_id"
        assert entry.user_id is not None, "Entry should have user_id"
        assert entry.asset is not None, "Entry should have asset"
        assert entry.type is not None, "Entry should have type"
        assert entry.amount is not None, "Entry should have amount"
        assert entry.balance_before is not None, "Entry should have balance_before"
        assert entry.balance_after is not None, "Entry should have balance_after"
        assert entry.reserved_before is not None, "Entry should have reserved_before"
        assert entry.reserved_after is not None, "Entry should have reserved_after"
        assert entry.description is not None, "Entry should have description"
        assert entry.created_at is not None, "Entry should have created_at timestamp"
        
        # Verify reference correctness
        assert entry.reference_type == ReferenceType.BET, "reference_type should be BET"
        assert entry.reference_id == bet.id, "reference_id should match bet.id"
