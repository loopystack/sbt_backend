"""
API Tests for Bets Endpoints
Tests bet API endpoints
"""
import pytest
import pytest_asyncio
from decimal import Decimal
from datetime import date
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.models.user import User
from app.models.odds import Odds
from app.models.deposit import UserCryptoBalance
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token


# Test database setup (in-memory SQLite for testing)
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
async def client(test_db, test_user):
    """Test client with database override"""
    # Store test_db and test_user for dependency overrides
    # Note: test_db and test_user are async fixtures, but we need to access them
    # We'll use a different approach - create a sync wrapper
    
    # Override get_db dependency
    async def override_get_db():
        # Use the test_db session
        yield test_db
    
    # Override get_current_user to return test user
    async def override_get_current_user():
        return test_user
    
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    
    # Clean up overrides
    app.dependency_overrides.clear()


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
    """Create user with balance"""
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


@pytest_asyncio.fixture
async def test_user_with_balance_and_token(test_user_with_balance: User):
    """Create user with balance and auth token"""
    user = test_user_with_balance
    # Create auth token - use user.id as string for sub
    token = create_access_token(data={"sub": str(user.id)})
    return user, token


@pytest.mark.asyncio
async def test_place_bet_api(client, test_user_with_balance_and_token, test_match):
    """Test placing a bet via API"""
    user, token = test_user_with_balance_and_token
    match = test_match
    
    response = await client.post(
        "/api/bets/place",
        json={
            "match_id": match.id,
            "market_key": "1x2",
            "selection_key": "home",
            "odds_decimal": 2.50,
            "stake": 10.00,
            "currency": "USDT"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["status"] == "pending"
    assert float(data["stake"]) == 10.00
    assert float(data["odds_decimal"]) == 2.50


@pytest.mark.asyncio
async def test_place_bet_insufficient_balance(client, test_user_with_balance_and_token, test_match):
    """Test placing bet with insufficient balance"""
    user, token = test_user_with_balance_and_token
    match = test_match
    
    response = await client.post(
        "/api/bets/place",
        json={
            "match_id": match.id,
            "market_key": "1x2",
            "selection_key": "home",
            "odds_decimal": 2.50,
            "stake": 200.00,  # More than available
            "currency": "USDT"
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 400
    assert "insufficient" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_get_user_bets(client, test_user_with_balance_and_token, test_match):
    """Test getting user's bets"""
    user, token = test_user_with_balance_and_token
    match = test_match
    
    # Place a bet first
    place_response = await client.post(
        "/api/bets/place",
        json={
            "match_id": match.id,
            "market_key": "1x2",
            "selection_key": "home",
            "odds_decimal": 2.50,
            "stake": 10.00
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    assert place_response.status_code == 201
    
    # Get bets
    response = await client.get(
        "/api/bets",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "bets" in data
    assert len(data["bets"]) >= 1
    assert data["bets"][0]["user_id"] == user.id


@pytest.mark.asyncio
async def test_get_bet_by_id(client, test_user_with_balance_and_token, test_match):
    """Test getting a specific bet"""
    user, token = test_user_with_balance_and_token
    match = test_match
    
    # Place a bet
    place_response = await client.post(
        "/api/bets/place",
        json={
            "match_id": match.id,
            "market_key": "1x2",
            "selection_key": "home",
            "odds_decimal": 2.50,
            "stake": 10.00
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    bet_id = place_response.json()["id"]
    
    # Get bet
    response = await client.get(
        f"/api/bets/{bet_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == bet_id
    assert data["match_id"] == match.id


@pytest.mark.asyncio
async def test_admin_settle_bet(client, test_user_with_balance_and_token, test_match, test_db):
    """Test admin settling a bet"""
    user, token = test_user_with_balance_and_token
    match = test_match
    
    # Make user admin
    user.is_superuser = True
    await test_db.commit()
    await test_db.refresh(user)
    
    # Place a bet
    place_response = await client.post(
        "/api/bets/place",
        json={
            "match_id": match.id,
            "market_key": "1x2",
            "selection_key": "home",
            "odds_decimal": 2.50,
            "stake": 10.00
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    bet_id = place_response.json()["id"]
    
    # Settle as WIN
    response = await client.post(
        f"/api/bets/{bet_id}/settle",
        json={"outcome": "WIN"},
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "won"
    assert data["settled_at"] is not None


@pytest.mark.asyncio
async def test_admin_settle_bet_non_admin(client, test_user_with_balance_and_token, test_match):
    """Test that non-admin cannot settle bets"""
    user, token = test_user_with_balance_and_token
    match = test_match
    
    # Place a bet
    place_response = await client.post(
        "/api/bets/place",
        json={
            "match_id": match.id,
            "market_key": "1x2",
            "selection_key": "home",
            "odds_decimal": 2.50,
            "stake": 10.00
        },
        headers={"Authorization": f"Bearer {token}"}
    )
    bet_id = place_response.json()["id"]
    
    # Try to settle (should fail - not admin)
    response = await client.post(
        f"/api/bets/{bet_id}/settle",
        json={"outcome": "WIN"},
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 403
