"""
Tests for Bet Service
Tests bet placement, settlement, and wallet integration
"""
import pytest
from decimal import Decimal
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.bet import Bet, BetStatus
from app.models.odds import Odds
from app.models.user import User
from app.models.deposit import UserCryptoBalance
from app.models.wallet_transaction import WalletTransactionType, ReferenceType
from app.services.bet_service import BetService
from app.services.wallet_service import WalletService


# Test database setup (in-memory SQLite for testing)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture
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


@pytest.fixture
async def test_match(test_db: AsyncSession) -> Odds:
    """Create a test match"""
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


@pytest.fixture
async def test_user_with_balance(test_db: AsyncSession) -> User:
    """Create a test user with USDT balance"""
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password="hashed",
        is_active=True
    )
    test_db.add(user)
    await test_db.flush()
    
    # Create balance with 100 USDT
    balance = UserCryptoBalance(
        user_id=user.id,
        asset="USDT",
        balance=Decimal("100.00"),
        locked_balance=Decimal("0")
    )
    test_db.add(balance)
    await test_db.commit()
    await test_db.refresh(user)
    return user


@pytest.mark.asyncio
async def test_place_bet_locks_balance(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test that placing a bet locks the stake in wallet"""
    user = test_user_with_balance
    match = test_match
    
    # Get initial balance
    initial_balance = await WalletService.get_balance(user.id, "USDT", test_db)
    assert initial_balance["available"] == Decimal("100.00")
    assert initial_balance["reserved"] == Decimal("0")
    
    # Place bet
    bet = await BetService.place_bet(
        user_id=user.id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.50"),
        stake=Decimal("10.00"),
        db=test_db
    )
    
    assert bet.id is not None
    assert bet.status == BetStatus.PENDING
    assert bet.stake == Decimal("10.00")
    
    # Check balance after bet
    final_balance = await WalletService.get_balance(user.id, "USDT", test_db)
    assert final_balance["available"] == Decimal("90.00")  # 100 - 10
    assert final_balance["reserved"] == Decimal("10.00")  # Locked stake
    
    # Check ledger entry
    from app.models.wallet_transaction import WalletTransaction
    from sqlalchemy import select
    stmt = select(WalletTransaction).where(
        WalletTransaction.reference_type == ReferenceType.BET,
        WalletTransaction.reference_id == bet.id
    )
    result = await test_db.execute(stmt)
    ledger_entry = result.scalar_one()
    assert ledger_entry.type == WalletTransactionType.BET_LOCK
    assert ledger_entry.amount == Decimal("10.00")


@pytest.mark.asyncio
async def test_place_bet_insufficient_balance(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test that placing a bet with insufficient balance fails"""
    user = test_user_with_balance
    match = test_match
    
    with pytest.raises(ValueError, match="Insufficient balance"):
        await BetService.place_bet(
            user_id=user.id,
            match_id=match.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=Decimal("200.00"),  # More than available
            db=test_db
        )


@pytest.mark.asyncio
async def test_place_bet_invalid_stake(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test that placing a bet with invalid stake fails"""
    user = test_user_with_balance
    match = test_match
    
    # Too small
    with pytest.raises(ValueError, match="at least"):
        await BetService.place_bet(
            user_id=user.id,
            match_id=match.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=Decimal("0.50"),
            db=test_db
        )
    
    # Too large
    with pytest.raises(ValueError, match="cannot exceed"):
        await BetService.place_bet(
            user_id=user.id,
            match_id=match.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=Decimal("20000.00"),
            db=test_db
        )


@pytest.mark.asyncio
async def test_settle_bet_win(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test settling a bet as WIN"""
    user = test_user_with_balance
    match = test_match
    
    # Place bet
    bet = await BetService.place_bet(
        user_id=user.id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.50"),
        stake=Decimal("10.00"),
        db=test_db
    )
    
    initial_balance = await WalletService.get_balance(user.id, "USDT", test_db)
    assert initial_balance["available"] == Decimal("90.00")
    assert initial_balance["reserved"] == Decimal("10.00")
    
    # Settle as WIN
    settled_bet = await BetService.settle_bet(bet.id, "WIN", db=test_db)
    
    assert settled_bet.status == BetStatus.WON
    assert settled_bet.settled_at is not None
    
    # Check balance after win
    final_balance = await WalletService.get_balance(user.id, "USDT", test_db)
    # Stake unlocked (10) + profit (10 * 1.5 = 15) = 25 added to available
    # Available: 90 + 10 (unlock) + 15 (profit) = 115
    # Reserved: 10 - 10 = 0
    assert final_balance["available"] == Decimal("115.00")
    assert final_balance["reserved"] == Decimal("0")
    
    # Check ledger entries
    from app.models.wallet_transaction import WalletTransaction
    from sqlalchemy import select
    stmt = select(WalletTransaction).where(
        WalletTransaction.reference_type == ReferenceType.BET,
        WalletTransaction.reference_id == bet.id
    ).order_by(WalletTransaction.created_at)
    result = await test_db.execute(stmt)
    entries = result.scalars().all()
    
    # Should have 3 entries: LOCK, UNLOCK, PAYOUT
    assert len(entries) == 3
    assert entries[0].type == WalletTransactionType.BET_LOCK
    assert entries[1].type == WalletTransactionType.BET_UNLOCK
    assert entries[2].type == WalletTransactionType.BET_PAYOUT
    assert entries[2].amount == Decimal("15.00")  # Profit


@pytest.mark.asyncio
async def test_settle_bet_loss(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test settling a bet as LOSS"""
    user = test_user_with_balance
    match = test_match
    
    # Place bet
    bet = await BetService.place_bet(
        user_id=user.id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.50"),
        stake=Decimal("10.00"),
        db=test_db
    )
    
    initial_balance = await WalletService.get_balance(user.id, "USDT", test_db)
    assert initial_balance["available"] == Decimal("90.00")
    assert initial_balance["reserved"] == Decimal("10.00")
    
    # Settle as LOSS
    settled_bet = await BetService.settle_bet(bet.id, "LOSS", db=test_db)
    
    assert settled_bet.status == BetStatus.LOST
    assert settled_bet.settled_at is not None
    
    # Check balance after loss
    final_balance = await WalletService.get_balance(user.id, "USDT", test_db)
    # Reserved stake deducted, available unchanged
    assert final_balance["available"] == Decimal("90.00")
    assert final_balance["reserved"] == Decimal("0")
    
    # Check ledger entries
    from app.models.wallet_transaction import WalletTransaction
    from sqlalchemy import select
    stmt = select(WalletTransaction).where(
        WalletTransaction.reference_type == ReferenceType.BET,
        WalletTransaction.reference_id == bet.id
    ).order_by(WalletTransaction.created_at)
    result = await test_db.execute(stmt)
    entries = result.scalars().all()
    
    # Should have 2 entries: LOCK, DEBIT
    assert len(entries) == 2
    assert entries[0].type == WalletTransactionType.BET_LOCK
    assert entries[1].type == WalletTransactionType.BET_DEBIT


@pytest.mark.asyncio
async def test_settle_bet_void(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test settling a bet as VOID"""
    user = test_user_with_balance
    match = test_match
    
    # Place bet
    bet = await BetService.place_bet(
        user_id=user.id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.50"),
        stake=Decimal("10.00"),
        db=test_db
    )
    
    initial_balance = await WalletService.get_balance(user.id, "USDT", test_db)
    assert initial_balance["available"] == Decimal("90.00")
    assert initial_balance["reserved"] == Decimal("10.00")
    
    # Settle as VOID
    settled_bet = await BetService.settle_bet(bet.id, "VOID", db=test_db)
    
    assert settled_bet.status == BetStatus.VOID
    assert settled_bet.settled_at is not None
    
    # Check balance after void
    final_balance = await WalletService.get_balance(user.id, "USDT", test_db)
    # Stake unlocked back to available
    assert final_balance["available"] == Decimal("100.00")
    assert final_balance["reserved"] == Decimal("0")
    
    # Check ledger entries
    from app.models.wallet_transaction import WalletTransaction
    from sqlalchemy import select
    stmt = select(WalletTransaction).where(
        WalletTransaction.reference_type == ReferenceType.BET,
        WalletTransaction.reference_id == bet.id
    ).order_by(WalletTransaction.created_at)
    result = await test_db.execute(stmt)
    entries = result.scalars().all()
    
    # Should have 2 entries: LOCK, UNLOCK
    assert len(entries) == 2
    assert entries[0].type == WalletTransactionType.BET_LOCK
    assert entries[1].type == WalletTransactionType.BET_UNLOCK


@pytest.mark.asyncio
async def test_settle_bet_idempotency(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test that settling a bet twice is idempotent"""
    user = test_user_with_balance
    match = test_match
    
    # Place bet
    bet = await BetService.place_bet(
        user_id=user.id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.50"),
        stake=Decimal("10.00"),
        db=test_db
    )
    
    # Settle as WIN
    settled_bet1 = await BetService.settle_bet(bet.id, "WIN", db=test_db)
    balance1 = await WalletService.get_balance(user.id, "USDT", test_db)
    
    # Try to settle again
    settled_bet2 = await BetService.settle_bet(bet.id, "WIN", db=test_db)
    balance2 = await WalletService.get_balance(user.id, "USDT", test_db)
    
    # Balance should be unchanged
    assert balance1["available"] == balance2["available"]
    assert balance1["reserved"] == balance2["reserved"]
    
    # Bet status should still be WON
    assert settled_bet2.status == BetStatus.WON


@pytest.mark.asyncio
async def test_get_user_bets(
    test_user_with_balance: User,
    test_match: Odds,
    test_db: AsyncSession
):
    """Test getting user's bets"""
    user = test_user_with_balance
    match = test_match
    
    # Place multiple bets
    bet1 = await BetService.place_bet(
        user_id=user.id,
        match_id=match.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.50"),
        stake=Decimal("10.00"),
        db=test_db
    )
    
    bet2 = await BetService.place_bet(
        user_id=user.id,
        match_id=match.id,
        market_key="1x2",
        selection_key="away",
        odds_decimal=Decimal("2.80"),
        stake=Decimal("5.00"),
        db=test_db
    )
    
    # Get all bets
    bets = await BetService.get_user_bets(user.id, db=test_db)
    assert len(bets) >= 2
    
    # Get pending bets only
    pending_bets = await BetService.get_user_bets(user.id, status=BetStatus.PENDING, db=test_db)
    assert len(pending_bets) >= 2
    
    # Settle one bet
    await BetService.settle_bet(bet1.id, "WIN", db=test_db)
    
    # Get pending bets again
    pending_bets_after = await BetService.get_user_bets(user.id, status=BetStatus.PENDING, db=test_db)
    assert len(pending_bets_after) == len(pending_bets) - 1
    
    # Get won bets
    won_bets = await BetService.get_user_bets(user.id, status=BetStatus.WON, db=test_db)
    assert len(won_bets) >= 1
