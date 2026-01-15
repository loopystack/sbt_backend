"""
Odds Comparison Tests
Verifies that client-provided odds are validated against server odds
"""
import pytest
import pytest_asyncio
from decimal import Decimal
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.user import User
from app.models.odds import Odds
from app.models.deposit import UserCryptoBalance
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
async def test_match_with_odds(test_db: AsyncSession) -> Odds:
    """Create match with specific odds"""
    future_date = date.today() + timedelta(days=1)
    match = Odds(
        home_team="Team A",
        away_team="Team B",
        league="Test League",
        country="Test Country",
        season=2024,
        date=future_date,
        odd_1=Decimal("2.50"),  # Home win
        odd_X=Decimal("3.00"),   # Draw
        odd_2=Decimal("2.80"),   # Away win
        result=None
    )
    test_db.add(match)
    await test_db.commit()
    await test_db.refresh(match)
    return match


@pytest.mark.asyncio
async def test_odds_match_server_odds_succeeds(
    test_user_with_balance: User,
    test_match_with_odds: Odds,
    test_db: AsyncSession
):
    """Test: Bet with matching server odds succeeds"""
    user_id = test_user_with_balance.id
    match = test_match_with_odds
    
    # Place bet with matching odds
    bet = await BetService.place_bet(
        user_id=user_id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.50"),  # Matches match.odd_1
        stake=Decimal("10.00"),
        db=test_db
    )
    
    assert bet is not None, "Bet with matching odds should succeed"
    assert bet.odds_decimal == Decimal("2.50"), "Bet should store correct odds"


@pytest.mark.asyncio
async def test_odds_mismatch_fails(
    test_user_with_balance: User,
    test_match_with_odds: Odds,
    test_db: AsyncSession
):
    """Test: Bet with mismatched odds fails"""
    user_id = test_user_with_balance.id
    match = test_match_with_odds
    
    # Try to place bet with different odds (odds manipulation attempt)
    with pytest.raises(ValueError, match="Odds mismatch|mismatch"):
        await BetService.place_bet(
            user_id=user_id,
            match_id=match.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("3.00"),  # Mismatch: server has 2.50
            stake=Decimal("10.00"),
            db=test_db
        )


@pytest.mark.asyncio
async def test_odds_within_tolerance_succeeds(
    test_user_with_balance: User,
    test_match_with_odds: Odds,
    test_db: AsyncSession
):
    """Test: Bet with odds within tolerance (0.01) succeeds"""
    user_id = test_user_with_balance.id
    match = test_match_with_odds
    
    # Place bet with odds slightly different (within 0.01 tolerance)
    bet = await BetService.place_bet(
        user_id=user_id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.505"),  # Within 0.01 of 2.50
        stake=Decimal("10.00"),
        db=test_db
    )
    
    assert bet is not None, "Bet with odds within tolerance should succeed"


@pytest.mark.asyncio
async def test_odds_comparison_for_all_selections(
    test_user_with_balance: User,
    test_match_with_odds: Odds,
    test_db: AsyncSession
):
    """Test: Odds comparison works for all 1x2 selections"""
    user_id = test_user_with_balance.id
    match = test_match_with_odds
    
    # Test home (odd_1 = 2.50)
    bet1 = await BetService.place_bet(
        user_id=user_id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.50"),
        stake=Decimal("10.00"),
        db=test_db
    )
    assert bet1 is not None, "Home bet should succeed"
    
    # Test draw (odd_X = 3.00)
    bet2 = await BetService.place_bet(
        user_id=user_id,
        match_id=match.id,
        market_key="1x2",
        selection_key="draw",
        odds_decimal=Decimal("3.00"),
        stake=Decimal("10.00"),
        db=test_db
    )
    assert bet2 is not None, "Draw bet should succeed"
    
    # Test away (odd_2 = 2.80)
    bet3 = await BetService.place_bet(
        user_id=user_id,
        match_id=match.id,
        market_key="1x2",
        selection_key="away",
        odds_decimal=Decimal("2.80"),
        stake=Decimal("10.00"),
        db=test_db
    )
    assert bet3 is not None, "Away bet should succeed"


@pytest.mark.asyncio
async def test_odds_comparison_skipped_if_no_server_odds(
    test_user_with_balance: User,
    test_db: AsyncSession
):
    """Test: Odds comparison is skipped if server odds are not available"""
    user_id = test_user_with_balance.id
    
    # Create match without odds (None)
    future_date = date.today() + timedelta(days=1)
    match = Odds(
        home_team="Team A",
        away_team="Team B",
        league="Test League",
        country="Test Country",
        season=2024,
        date=future_date,
        odd_1=None,  # No server odds
        odd_X=None,
        odd_2=None,
        result=None
    )
    test_db.add(match)
    await test_db.commit()
    await test_db.refresh(match)
    
    # Should be able to place bet (odds comparison skipped)
    bet = await BetService.place_bet(
        user_id=user_id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.50"),  # Any odds allowed if server has none
        stake=Decimal("10.00"),
        db=test_db
    )
    
    assert bet is not None, "Bet should succeed when server has no odds (comparison skipped)"
