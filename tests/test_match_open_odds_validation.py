"""
Match Open / Odds Validation Tests
Verifies:
1. Match is not started/closed when placing bet
2. Odds passed from client are validated or compared to server odds
3. Status open enforcement using match table
"""
import pytest
import pytest_asyncio
from decimal import Decimal
from datetime import date, datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select

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
async def test_match_open(test_db: AsyncSession) -> Odds:
    """Create open match (future date, no result)"""
    future_date = date.today() + timedelta(days=1)
    match = Odds(
        home_team="Team A",
        away_team="Team B",
        league="Test League",
        country="Test Country",
        season=2024,
        date=future_date,
        odd_1=Decimal("2.50"),
        odd_X=Decimal("3.00"),
        odd_2=Decimal("2.80"),
        result=None  # No result = match is open
    )
    test_db.add(match)
    await test_db.commit()
    await test_db.refresh(match)
    return match


@pytest_asyncio.fixture
async def test_match_finished(test_db: AsyncSession) -> Odds:
    """Create finished match (has result)"""
    match = Odds(
        home_team="Team A",
        away_team="Team B",
        league="Test League",
        country="Test Country",
        season=2024,
        date=date.today() - timedelta(days=1),
        odd_1=Decimal("2.50"),
        odd_X=Decimal("3.00"),
        odd_2=Decimal("2.80"),
        result="1-0"  # Has result = match is finished
    )
    test_db.add(match)
    await test_db.commit()
    await test_db.refresh(match)
    return match


@pytest_asyncio.fixture
async def test_match_past_no_result(test_db: AsyncSession) -> Odds:
    """Create past match without result (might be postponed)"""
    past_date = date.today() - timedelta(days=1)
    match = Odds(
        home_team="Team A",
        away_team="Team B",
        league="Test League",
        country="Test Country",
        season=2024,
        date=past_date,
        odd_1=Decimal("2.50"),
        odd_X=Decimal("3.00"),
        odd_2=Decimal("2.80"),
        result=None  # No result, but date is past
    )
    test_db.add(match)
    await test_db.commit()
    await test_db.refresh(match)
    return match


@pytest.mark.asyncio
async def test_place_bet_on_open_match_succeeds(
    test_user_with_balance: User,
    test_match_open: Odds,
    test_db: AsyncSession
):
    """Test: Placing bet on open match (no result, future date) should succeed"""
    user_id = test_user_with_balance.id
    match = test_match_open
    
    # Place bet on open match
    bet = await BetService.place_bet(
        user_id=user_id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.50"),
        stake=Decimal("10.00"),
        db=test_db
    )
    
    # Verify bet was created
    assert bet is not None, "Bet should be created on open match"
    assert bet.status == BetStatus.PENDING, "Bet should be PENDING"
    assert bet.match_id == match.id, "Bet should reference correct match"


@pytest.mark.asyncio
async def test_place_bet_on_finished_match_fails(
    test_user_with_balance: User,
    test_match_finished: Odds,
    test_db: AsyncSession
):
    """Test: Placing bet on finished match (has result) should fail"""
    user_id = test_user_with_balance.id
    match = test_match_finished
    
    # Verify match has result
    assert match.result is not None, "Match should have result"
    
    # Try to place bet on finished match - should fail
    with pytest.raises(ValueError, match="finished match|Cannot place bet"):
        await BetService.place_bet(
            user_id=user_id,
            match_id=match.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=Decimal("10.00"),
            db=test_db
        )
    
    # Verify no bet was created
    stmt = select(Bet).where(Bet.user_id == user_id, Bet.match_id == match.id)
    result = await test_db.execute(stmt)
    bets = list(result.scalars().all())
    assert len(bets) == 0, "No bet should be created on finished match"


@pytest.mark.asyncio
async def test_place_bet_on_past_match_no_result_allowed(
    test_user_with_balance: User,
    test_match_past_no_result: Odds,
    test_db: AsyncSession
):
    """Test: Placing bet on past match without result is allowed (might be postponed)"""
    user_id = test_user_with_balance.id
    match = test_match_past_no_result
    
    # Verify match has no result but date is past
    assert match.result is None, "Match should have no result"
    assert match.date < date.today(), "Match date should be in the past"
    
    # Place bet on past match without result - should be allowed (with warning)
    bet = await BetService.place_bet(
        user_id=user_id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.50"),
        stake=Decimal("10.00"),
        db=test_db
    )
    
    # Verify bet was created (match might be postponed)
    assert bet is not None, "Bet should be created on past match without result"
    assert bet.status == BetStatus.PENDING, "Bet should be PENDING"


@pytest.mark.asyncio
async def test_place_bet_on_nonexistent_match_fails(
    test_user_with_balance: User,
    test_db: AsyncSession
):
    """Test: Placing bet on non-existent match should fail"""
    user_id = test_user_with_balance.id
    nonexistent_match_id = 99999
    
    # Try to place bet on non-existent match - should fail
    with pytest.raises(ValueError, match="not found|Match.*not found"):
        await BetService.place_bet(
            user_id=user_id,
            match_id=nonexistent_match_id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=Decimal("10.00"),
            db=test_db
        )


@pytest.mark.asyncio
async def test_odds_validation_minimum_value(
    test_user_with_balance: User,
    test_db: AsyncSession
):
    """Test: Odds must be at least 1.01"""
    user_id = test_user_with_balance.id
    
    # Create match without odds (to test minimum odds validation only)
    future_date = date.today() + timedelta(days=1)
    match = Odds(
        home_team="Team A",
        away_team="Team B",
        league="Test League",
        country="Test Country",
        season=2024,
        date=future_date,
        odd_1=None,  # No server odds - comparison skipped
        odd_X=None,
        odd_2=None,
        result=None
    )
    test_db.add(match)
    await test_db.commit()
    await test_db.refresh(match)
    
    # Try to place bet with odds < 1.01 - should fail
    with pytest.raises(ValueError, match="at least 1.01|Odds must"):
        await BetService.place_bet(
            user_id=user_id,
            match_id=match.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("1.00"),  # Invalid: too low
            stake=Decimal("10.00"),
            db=test_db
        )
    
    # Try with odds = 0.99 - should fail
    with pytest.raises(ValueError, match="at least 1.01|Odds must"):
        await BetService.place_bet(
            user_id=user_id,
            match_id=match.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("0.99"),  # Invalid: too low
            stake=Decimal("10.00"),
            db=test_db
        )
    
    # Try with odds = 1.01 - should succeed
    bet = await BetService.place_bet(
        user_id=user_id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("1.01"),  # Valid: minimum
        stake=Decimal("10.00"),
        db=test_db
    )
    assert bet is not None, "Bet with odds 1.01 should succeed"


@pytest.mark.asyncio
async def test_odds_validation_accepts_valid_odds(
    test_user_with_balance: User,
    test_db: AsyncSession
):
    """Test: Valid odds values are accepted"""
    user_id = test_user_with_balance.id
    
    # Create match without odds (to test odds validation only)
    future_date = date.today() + timedelta(days=1)
    match = Odds(
        home_team="Team A",
        away_team="Team B",
        league="Test League",
        country="Test Country",
        season=2024,
        date=future_date,
        odd_1=None,  # No server odds - comparison skipped
        odd_X=None,
        odd_2=None,
        result=None
    )
    test_db.add(match)
    await test_db.commit()
    await test_db.refresh(match)
    
    # Test various valid odds
    valid_odds = [
        Decimal("1.01"),  # Minimum
        Decimal("2.50"),  # Normal
        Decimal("10.00"),  # High
        Decimal("100.00"),  # Very high
    ]
    
    for odds in valid_odds:
        bet = await BetService.place_bet(
            user_id=user_id,
            match_id=match.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=odds,
            stake=Decimal("10.00"),
            db=test_db
        )
        assert bet is not None, f"Bet with odds {odds} should succeed"
        assert bet.odds_decimal == odds, f"Bet should store odds {odds}"


@pytest.mark.asyncio
async def test_match_result_check_prevents_betting(
    test_user_with_balance: User,
    test_db: AsyncSession
):
    """Test: Match with result cannot accept bets"""
    user_id = test_user_with_balance.id
    
    # Create match with different result formats
    result_formats = ["1-0", "2-1", "0-0", "3-2"]
    
    for result in result_formats:
        match = Odds(
            home_team="Team A",
            away_team="Team B",
            league="Test League",
            country="Test Country",
            season=2024,
            date=date.today() + timedelta(days=1),
            odd_1=Decimal("2.50"),
            odd_X=Decimal("3.00"),
            odd_2=Decimal("2.80"),
            result=result  # Has result
        )
        test_db.add(match)
        await test_db.commit()
        await test_db.refresh(match)
        
        # Try to place bet - should fail
        with pytest.raises(ValueError, match="finished match|Cannot place bet"):
            await BetService.place_bet(
                user_id=user_id,
                match_id=match.id,
                market_key="1x2",
                selection_key="home",
                odds_decimal=Decimal("2.50"),
                stake=Decimal("10.00"),
                db=test_db
            )


@pytest.mark.asyncio
async def test_match_open_check_uses_result_field(
    test_user_with_balance: User,
    test_db: AsyncSession
):
    """Test: Match open check uses result field (primary check)"""
    user_id = test_user_with_balance.id
    
    # Create match with future date but no result (open)
    future_match = Odds(
        home_team="Team A",
        away_team="Team B",
        league="Test League",
        country="Test Country",
        season=2024,
        date=date.today() + timedelta(days=7),
        odd_1=Decimal("2.50"),
        odd_X=Decimal("3.00"),
        odd_2=Decimal("2.80"),
        result=None  # No result = open
    )
    test_db.add(future_match)
    await test_db.commit()
    await test_db.refresh(future_match)
    
    # Should be able to place bet
    bet = await BetService.place_bet(
        user_id=user_id,
        match_id=future_match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.50"),
        stake=Decimal("10.00"),
        db=test_db
    )
    assert bet is not None, "Bet should succeed on open match (no result)"
    
    # Now set result and try again
    future_match.result = "1-0"
    await test_db.commit()
    await test_db.refresh(future_match)
    
    # Should fail now
    with pytest.raises(ValueError, match="finished match|Cannot place bet"):
        await BetService.place_bet(
            user_id=user_id,
            match_id=future_match.id,
            market_key="1x2",
            selection_key="away",
            odds_decimal=Decimal("2.50"),
            stake=Decimal("10.00"),
            db=test_db
        )
