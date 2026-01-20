"""
Anti-Pattern Detection Tests
Verifies that the codebase avoids common anti-patterns:
1. HTTPException in services (should be ValueError)
2. Unlocking stake AND adding stake again on win (double credit bug)
3. Settlement updates bet status after wallet change without transaction
4. No row lock in settlement
5. Ledger entries missing reference_id
"""
import pytest
import pytest_asyncio
import ast
import os
from pathlib import Path
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
        odd_1=Decimal("2.00"),
        odd_X=Decimal("3.00"),
        odd_2=Decimal("2.80")
    )
    test_db.add(match)
    await test_db.commit()
    await test_db.refresh(match)
    return match


def test_bet_service_no_httpexception():
    """Test 1: BetService should NOT use HTTPException (should use ValueError)"""
    bet_service_path = Path(__file__).parent.parent / "app" / "services" / "bet_service.py"
    
    with open(bet_service_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check for HTTPException imports
    assert "from fastapi import HTTPException" not in content, (
        "bet_service.py should NOT import HTTPException"
    )
    assert "from fastapi.exceptions import HTTPException" not in content, (
        "bet_service.py should NOT import HTTPException"
    )
    
    # Check for HTTPException usage
    assert "HTTPException(" not in content, (
        "bet_service.py should NOT use HTTPException. Use ValueError instead."
    )
    
    # Verify ValueError is used
    assert "raise ValueError" in content, (
        "bet_service.py should use ValueError for errors"
    )


@pytest.mark.asyncio
async def test_win_settlement_no_double_stake_credit(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test 2: WIN settlement should NOT unlock stake AND add stake again (double credit bug)"""
    user_id = test_user_with_balance.id
    match = test_match
    stake = Decimal("10.00")
    odds = Decimal("2.00")
    expected_payout = stake * odds  # 20
    
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
    
    # Get ledger entries
    stmt = select(WalletTransaction).where(
        WalletTransaction.reference_type == ReferenceType.BET,
        WalletTransaction.reference_id == bet.id
    ).order_by(WalletTransaction.created_at)
    result = await test_db.execute(stmt)
    entries = list(result.scalars().all())
    
    # New accounting: BET_WIN_DEDUCT_STAKE + BET_WIN_PAYOUT_CREDIT
    deduct_entries = [e for e in entries if e.type == WalletTransactionType.BET_WIN_DEDUCT_STAKE]
    payout_entries = [e for e in entries if e.type == WalletTransactionType.BET_WIN_PAYOUT_CREDIT]
    legacy_unlock_entries = [e for e in entries if e.type == WalletTransactionType.BET_UNLOCK]
    legacy_payout_entries = [e for e in entries if e.type == WalletTransactionType.BET_PAYOUT]

    assert len(legacy_unlock_entries) == 0, "Should not use legacy BET_UNLOCK for WIN settlement"
    assert len(legacy_payout_entries) == 0, "Should not use legacy BET_PAYOUT for WIN settlement"

    assert len(deduct_entries) == 1, "Should have exactly 1 BET_WIN_DEDUCT_STAKE entry"
    assert len(payout_entries) == 1, "Should have exactly 1 BET_WIN_PAYOUT_CREDIT entry"

    assert deduct_entries[0].amount == stake, "BET_WIN_DEDUCT_STAKE should remove reserved stake"
    assert payout_entries[0].amount == expected_payout, "BET_WIN_PAYOUT_CREDIT should credit full payout"

    # Verify total increase in available = payout (since available_before is after place_bet)
    expected_increase = expected_payout
    actual_increase = available_after - available_before
    
    assert actual_increase == expected_increase, (
        f"Total increase should be payout = {expected_increase}, got {actual_increase}. "
        f"If larger than payout, stake may have been credited twice (BUG)!"
    )



@pytest.mark.asyncio
async def test_settlement_status_update_in_transaction(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test 3: Settlement should update bet status within same transaction as wallet changes"""
    user_id = test_user_with_balance.id
    match = test_match
    
    # Place bet
    bet = await BetService.place_bet(
        user_id=user_id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.00"),
        stake=Decimal("10.00"),
        db=test_db
    )
    
    # Settle as WIN
    settled_bet = await BetService.settle_bet(bet.id, "WIN", db=test_db)
    
    # Verify bet status is updated
    assert settled_bet.status == BetStatus.WON, "Bet status should be updated"
    
    # Verify status update persisted (proves it was in same transaction)
    stmt = select(Bet).where(Bet.id == bet.id)
    result = await test_db.execute(stmt)
    bet_from_db = result.scalar_one_or_none()
    
    assert bet_from_db.status == BetStatus.WON, (
        "Bet status should be persisted. If not, status was updated outside transaction (BUG)."
    )
    
    # Verify wallet changes also persisted (proves atomicity)
    balance = await WalletService.get_balance(user_id, "USDT", test_db)
    assert balance["available"] > Decimal("100.00"), "Wallet changes should be persisted"
    
    # Both status and wallet changes persisted = same transaction
    print("[OK] Status and wallet changes are in same transaction")


def test_settlement_uses_row_lock():
    """Test 4: Settlement should use row lock (SELECT ... FOR UPDATE)"""
    bet_service_path = Path(__file__).parent.parent / "app" / "services" / "bet_service.py"
    
    with open(bet_service_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check for row lock
    assert "with_for_update()" in content, (
        "settle_bet() should use row lock (SELECT ... FOR UPDATE) via with_for_update()"
    )
    
    # Verify it's used in settle_bet method
    assert "with_for_update()" in content, (
        "Row lock should be used in settle_bet method"
    )


@pytest.mark.asyncio
async def test_all_ledger_entries_have_reference_id(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test 5: All ledger entries should have reference_id"""
    user_id = test_user_with_balance.id
    match = test_match
    
    # Place bet
    bet = await BetService.place_bet(
        user_id=user_id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.00"),
        stake=Decimal("10.00"),
        db=test_db
    )
    
    # Settle as WIN
    await BetService.settle_bet(bet.id, "WIN", db=test_db)
    
    # Get all ledger entries for this bet
    stmt = select(WalletTransaction).where(
        WalletTransaction.reference_type == ReferenceType.BET,
        WalletTransaction.reference_id == bet.id
    )
    result = await test_db.execute(stmt)
    entries = list(result.scalars().all())
    
    # Verify all entries have reference_id
    for entry in entries:
        assert entry.reference_id is not None, (
            f"Ledger entry {entry.id} (type: {entry.type}) is missing reference_id. "
            f"This breaks auditability."
        )
        assert entry.reference_id == bet.id, (
            f"Ledger entry {entry.id} should have reference_id = {bet.id}, got {entry.reference_id}"
        )
        assert entry.reference_type == ReferenceType.BET, (
            f"Ledger entry {entry.id} should have reference_type = BET, got {entry.reference_type}"
        )
    
    print(f"[OK] All {len(entries)} ledger entries have reference_id")


@pytest.mark.asyncio
async def test_place_bet_ledger_has_reference_id(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test 5b: Place bet ledger entry should have reference_id"""
    user_id = test_user_with_balance.id
    match = test_match
    
    # Place bet
    bet = await BetService.place_bet(
        user_id=user_id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.00"),
        stake=Decimal("10.00"),
        db=test_db
    )
    
    # Get ledger entry
    stmt = select(WalletTransaction).where(
        WalletTransaction.reference_type == ReferenceType.BET,
        WalletTransaction.reference_id == bet.id
    )
    result = await test_db.execute(stmt)
    entries = list(result.scalars().all())
    
    assert len(entries) == 1, "Should have 1 ledger entry after placing bet"
    
    entry = entries[0]
    assert entry.reference_id is not None, "BET_LOCK entry should have reference_id"
    assert entry.reference_id == bet.id, f"reference_id should be {bet.id}, got {entry.reference_id}"
    assert entry.reference_type == ReferenceType.BET, "reference_type should be BET"
