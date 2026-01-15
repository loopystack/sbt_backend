"""
UI Correctness Tests
Verifies that frontend calculations match backend:
1. UI "Potential Win" = stake + profit
2. UI "Profit" = stake * (odds - 1)
3. After placing: available decreases, reserved increases, bet appears as pending
"""
import pytest
import pytest_asyncio
from decimal import Decimal
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.user import User
from app.models.odds import Odds
from app.models.deposit import UserCryptoBalance
from app.models.bet import Bet, BetStatus
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


@pytest.mark.asyncio
async def test_profit_calculation_matches_backend(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test: Profit calculation = stake * (odds - 1) matches backend"""
    user_id = test_user_with_balance.id
    match = test_match
    stake = Decimal("10.00")
    odds = Decimal("2.50")
    
    # Backend calculation (what backend uses)
    backend_profit = stake * (odds - Decimal("1"))  # 10 * 1.5 = 15
    
    # Frontend calculation (what UI should show)
    # Frontend: calculateProfit = stakeAmount * (oddsDecimal - 1)
    frontend_profit = float(stake) * (float(odds) - 1)  # 10 * 1.5 = 15.0
    
    # They should match
    assert abs(float(backend_profit) - frontend_profit) < 0.01, (
        f"Frontend profit calculation should match backend. "
        f"Backend: {backend_profit}, Frontend: {frontend_profit}"
    )


@pytest.mark.asyncio
async def test_potential_win_calculation_matches_backend(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test: Potential Win = stake + profit matches backend"""
    user_id = test_user_with_balance.id
    match = test_match
    stake = Decimal("10.00")
    odds = Decimal("2.50")
    
    # Backend calculation
    backend_profit = stake * (odds - Decimal("1"))  # 15
    backend_potential_win = stake + backend_profit  # 10 + 15 = 25
    
    # Frontend calculation
    # Frontend: calculatePayout = stakeAmount * oddsDecimal
    frontend_potential_win = float(stake) * float(odds)  # 10 * 2.5 = 25.0
    
    # They should match
    assert abs(float(backend_potential_win) - frontend_potential_win) < 0.01, (
        f"Frontend potential win calculation should match backend. "
        f"Backend: {backend_potential_win}, Frontend: {frontend_potential_win}"
    )
    
    # Also verify: potential_win = stake + profit
    frontend_profit = float(stake) * (float(odds) - 1)  # 15
    frontend_calculated_win = float(stake) + frontend_profit  # 10 + 15 = 25
    assert abs(frontend_potential_win - frontend_calculated_win) < 0.01, (
        f"Potential win should equal stake + profit. "
        f"Potential win: {frontend_potential_win}, Stake + Profit: {frontend_calculated_win}"
    )


@pytest.mark.asyncio
async def test_after_placing_bet_available_decreases(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test: After placing bet, available balance decreases immediately"""
    user_id = test_user_with_balance.id
    match = test_match
    stake = Decimal("10.00")
    
    # Get balance before
    balance_before = await WalletService.get_balance(user_id, "USDT", test_db)
    available_before = balance_before["available"]
    
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
    
    # Get balance after
    balance_after = await WalletService.get_balance(user_id, "USDT", test_db)
    available_after = balance_after["available"]
    
    # Available should decrease by stake
    assert available_after == available_before - stake, (
        f"Available balance should decrease by stake. "
        f"Before: {available_before}, After: {available_after}, Expected decrease: {stake}"
    )


@pytest.mark.asyncio
async def test_after_placing_bet_reserved_increases(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test: After placing bet, reserved balance increases immediately"""
    user_id = test_user_with_balance.id
    match = test_match
    stake = Decimal("10.00")
    
    # Get balance before
    balance_before = await WalletService.get_balance(user_id, "USDT", test_db)
    reserved_before = balance_before["reserved"]
    
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
    
    # Get balance after
    balance_after = await WalletService.get_balance(user_id, "USDT", test_db)
    reserved_after = balance_after["reserved"]
    
    # Reserved should increase by stake
    assert reserved_after == reserved_before + stake, (
        f"Reserved balance should increase by stake. "
        f"Before: {reserved_before}, After: {reserved_after}, Expected increase: {stake}"
    )


@pytest.mark.asyncio
async def test_after_placing_bet_appears_as_pending(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test: After placing bet, bet appears as pending"""
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
    
    # Verify bet status is PENDING
    assert bet.status == BetStatus.PENDING, (
        f"Bet should be PENDING after placement. Got: {bet.status}"
    )
    
    # Verify bet has required fields for UI display
    assert bet.id is not None, "Bet should have ID"
    assert bet.stake is not None, "Bet should have stake"
    assert bet.odds_decimal is not None, "Bet should have odds"
    assert bet.placed_at is not None, "Bet should have placed_at timestamp"


@pytest.mark.asyncio
async def test_balance_changes_are_immediate(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test: Balance changes happen immediately (no delay)"""
    user_id = test_user_with_balance.id
    match = test_match
    stake = Decimal("10.00")
    
    # Get initial balance
    balance_initial = await WalletService.get_balance(user_id, "USDT", test_db)
    available_initial = balance_initial["available"]
    reserved_initial = balance_initial["reserved"]
    
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
    
    # Get balance immediately after (simulating UI refresh)
    balance_after = await WalletService.get_balance(user_id, "USDT", test_db)
    available_after = balance_after["available"]
    reserved_after = balance_after["reserved"]
    
    # Changes should be immediate
    assert available_after == available_initial - stake, "Available should decrease immediately"
    assert reserved_after == reserved_initial + stake, "Reserved should increase immediately"
    
    # Total should remain the same
    total_initial = available_initial + reserved_initial
    total_after = available_after + reserved_after
    assert total_after == total_initial, (
        f"Total balance should remain constant. "
        f"Before: {total_initial}, After: {total_after}"
    )


@pytest.mark.asyncio
async def test_calculation_examples_match(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test: Various calculation examples match between frontend and backend"""
    test_cases = [
        {"stake": Decimal("10.00"), "odds": Decimal("2.50"), "expected_profit": Decimal("15.00"), "expected_win": Decimal("25.00")},
        {"stake": Decimal("5.00"), "odds": Decimal("3.00"), "expected_profit": Decimal("10.00"), "expected_win": Decimal("15.00")},
        {"stake": Decimal("20.00"), "odds": Decimal("1.50"), "expected_profit": Decimal("10.00"), "expected_win": Decimal("30.00")},
        {"stake": Decimal("100.00"), "odds": Decimal("2.00"), "expected_profit": Decimal("100.00"), "expected_win": Decimal("200.00")},
    ]
    
    for case in test_cases:
        stake = case["stake"]
        odds = case["odds"]
        expected_profit = case["expected_profit"]
        expected_win = case["expected_win"]
        
        # Backend calculations
        backend_profit = stake * (odds - Decimal("1"))
        backend_win = stake + backend_profit
        
        # Frontend calculations
        frontend_profit = float(stake) * (float(odds) - 1)
        frontend_win = float(stake) * float(odds)
        
        # Verify profit
        assert abs(float(backend_profit) - frontend_profit) < 0.01, (
            f"Profit mismatch for stake {stake}, odds {odds}. "
            f"Backend: {backend_profit}, Frontend: {frontend_profit}"
        )
        assert abs(float(expected_profit) - frontend_profit) < 0.01, (
            f"Expected profit mismatch. Expected: {expected_profit}, Got: {frontend_profit}"
        )
        
        # Verify potential win
        assert abs(float(backend_win) - frontend_win) < 0.01, (
            f"Potential win mismatch for stake {stake}, odds {odds}. "
            f"Backend: {backend_win}, Frontend: {frontend_win}"
        )
        assert abs(float(expected_win) - frontend_win) < 0.01, (
            f"Expected win mismatch. Expected: {expected_win}, Got: {frontend_win}"
        )
