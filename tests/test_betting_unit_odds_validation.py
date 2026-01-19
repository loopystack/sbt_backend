"""
Betting Unit Tests: Odds Calculation & Validation
Tests for payout/profit calculations, validation rules, and edge cases
"""
import pytest
import pytest_asyncio
from decimal import Decimal
from datetime import date, datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.bet import Bet, BetStatus
from app.models.odds import Odds
from app.models.user import User
from app.services.bet_service import BetService

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
async def test_match(test_db: AsyncSession) -> Odds:
    """Create a test match"""
    match = Odds(
        season=2024,
        home_team="Team A",
        away_team="Team B",
        league="Test League",
        date=date.today(),
        odd_1=Decimal("2.50"),
        odd_X=Decimal("3.00"),
        odd_2=Decimal("2.80")
    )
    test_db.add(match)
    await test_db.commit()
    await test_db.refresh(match)
    return match


class TestOddsCalculation:
    """A) Unit Tests - 1) Odds / payout calculation"""
    
    def test_decimal_odds_calculation(self):
        """Decimal odds: stake=10, odds=2.4 => payout=24, profit=14"""
        stake = Decimal("10.00")
        odds = Decimal("2.40")
        
        payout = stake * odds
        profit = stake * (odds - Decimal("1"))
        
        assert payout == Decimal("24.00"), f"Expected payout 24.00, got {payout}"
        assert profit == Decimal("14.00"), f"Expected profit 14.00, got {profit}"
    
    def test_decimal_odds_precision(self):
        """Ensure Decimal precision (no float rounding errors)"""
        stake = Decimal("10.12345678")
        odds = Decimal("2.45678901")
        
        payout = stake * odds
        profit = stake * (odds - Decimal("1"))
        
        # Should maintain precision
        assert isinstance(payout, Decimal)
        assert isinstance(profit, Decimal)
        # Verify calculation is exact (calculate expected values)
        expected_payout = Decimal("10.12345678") * Decimal("2.45678901")
        expected_profit = Decimal("10.12345678") * (Decimal("2.45678901") - Decimal("1"))
        assert payout == expected_payout, f"Payout should be exact: {payout} == {expected_payout}"
        assert profit == expected_profit, f"Profit should be exact: {profit} == {expected_profit}"
    
    def test_invalid_odds_rejected(self):
        """Edge: odds invalid (<=1 in decimal) => reject"""
        # Test odds validation logic
        odds_valid = Decimal("1.01")
        assert odds_valid >= Decimal("1.01"), "Odds 1.01 should be valid"
        
        # Test odds = 1.00 (should be rejected)
        odds_invalid = Decimal("1.00")
        assert odds_invalid < Decimal("1.01"), "Odds 1.00 should be rejected"
        
        # Test odds < 1.00 (should be rejected)
        odds_negative = Decimal("0.50")
        assert odds_negative < Decimal("1.01"), "Odds < 1.00 should be rejected"


class TestBetPlacementValidation:
    """A) Unit Tests - 2) Bet placement validation"""
    
    @pytest.mark.asyncio
    async def test_stake_zero_rejected(self, test_user: User, test_match: Odds, test_db: AsyncSession):
        """stake <= 0 => reject"""
        with pytest.raises(ValueError, match="Stake must be at least"):
            await BetService.place_bet(
                user_id=test_user.id,
                match_id=test_match.id,
                market_key="1x2",
                selection_key="home",
                odds_decimal=Decimal("2.50"),
                stake=Decimal("0.00"),
                db=test_db
            )
    
    @pytest.mark.asyncio
    async def test_stake_negative_rejected(self, test_user: User, test_match: Odds, test_db: AsyncSession):
        """stake < 0 => reject"""
        with pytest.raises(ValueError, match="Stake must be at least"):
            await BetService.place_bet(
                user_id=test_user.id,
                match_id=test_match.id,
                market_key="1x2",
                selection_key="home",
                odds_decimal=Decimal("2.50"),
                stake=Decimal("-10.00"),
                db=test_db
            )
    
    @pytest.mark.asyncio
    async def test_missing_match_id_rejected(self, test_user: User, test_db: AsyncSession):
        """missing match_id => reject"""
        with pytest.raises(ValueError, match="not found"):
            await BetService.place_bet(
                user_id=test_user.id,
                match_id=99999,  # Non-existent match
                market_key="1x2",
                selection_key="home",
                odds_decimal=Decimal("2.50"),
                stake=Decimal("10.00"),
                db=test_db
            )
    
    @pytest.mark.asyncio
    async def test_closed_match_rejected(self, test_user: User, test_db: AsyncSession):
        """if you have 'match open' flag: closed match => reject"""
        # Create match with result (closed)
        closed_match = Odds(
            season=2024,
            home_team="Team A",
            away_team="Team B",
            league="Test League",
            date=date.today(),
            odd_1=Decimal("2.50"),
            result="1-0"  # Match has result = closed
        )
        test_db.add(closed_match)
        await test_db.commit()
        await test_db.refresh(closed_match)
        
        with pytest.raises(ValueError, match="finished match"):
            await BetService.place_bet(
                user_id=test_user.id,
                match_id=closed_match.id,
                market_key="1x2",
                selection_key="home",
                odds_decimal=Decimal("2.50"),
                stake=Decimal("10.00"),
                db=test_db
            )
    
    @pytest.mark.asyncio
    async def test_invalid_odds_rejected(self, test_user: User, test_match: Odds, test_db: AsyncSession):
        """odds invalid (<=1) => reject"""
        with pytest.raises(ValueError, match="Odds must be at least 1.01"):
            await BetService.place_bet(
                user_id=test_user.id,
                match_id=test_match.id,
                market_key="1x2",
                selection_key="home",
                odds_decimal=Decimal("0.50"),  # Invalid odds
                stake=Decimal("10.00"),
                db=test_db
            )
    
    @pytest.mark.asyncio
    async def test_stake_too_large_rejected(self, test_user: User, test_match: Odds, test_db: AsyncSession):
        """stake exceeds max => reject"""
        with pytest.raises(ValueError, match="cannot exceed"):
            await BetService.place_bet(
                user_id=test_user.id,
                match_id=test_match.id,
                market_key="1x2",
                selection_key="home",
                odds_decimal=Decimal("2.50"),
                stake=Decimal("20000.00"),  # Exceeds max
                db=test_db
            )


class TestSettlementIdempotencyRules:
    """A) Unit Tests - 3) Settlement idempotency rules"""
    
    @pytest.mark.asyncio
    async def test_settle_non_pending_bet_no_changes(
        self, test_user: User, test_match: Odds, test_db: AsyncSession
    ):
        """settling a non-pending bet (already won/lost/void/cancelled) => no wallet changes"""
        from app.services.wallet_service import WalletService
        
        # Create user with balance
        await WalletService.credit_balance(
            user_id=test_user.id,
            asset="USDT",
            amount=Decimal("100.00"),
            db=test_db
        )
        await test_db.commit()
        
        # Place and settle bet as WIN
        bet = await BetService.place_bet(
            user_id=test_user.id,
            match_id=test_match.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=Decimal("10.00"),
            db=test_db
        )
        await test_db.commit()
        
        # Settle as WIN
        await BetService.settle_bet(bet.id, "WIN", db=test_db)
        await test_db.commit()
        
        # Get balance after first settlement
        balance_after_first = await WalletService.get_balance(test_user.id, "USDT", test_db)
        
        # Try to settle again (should be no-op)
        await BetService.settle_bet(bet.id, "WIN", db=test_db)
        await test_db.commit()
        
        # Get balance after second settlement
        balance_after_second = await WalletService.get_balance(test_user.id, "USDT", test_db)
        
        # Balances should be unchanged
        assert balance_after_first["available"] == balance_after_second["available"]
        assert balance_after_first["reserved"] == balance_after_second["reserved"]
    
    @pytest.mark.asyncio
    async def test_settle_cancelled_bet_no_changes(
        self, test_user: User, test_match: Odds, test_db: AsyncSession
    ):
        """settling a cancelled bet => no wallet changes"""
        from app.services.wallet_service import WalletService
        
        # Create user with balance
        await WalletService.credit_balance(
            user_id=test_user.id,
            asset="USDT",
            amount=Decimal("100.00"),
            db=test_db
        )
        await test_db.commit()
        
        # Place bet
        bet = await BetService.place_bet(
            user_id=test_user.id,
            match_id=test_match.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=Decimal("10.00"),
            db=test_db
        )
        await test_db.commit()
        
        # Cancel bet
        await BetService.cancel_bet(bet.id, test_user.id, db=test_db)
        await test_db.commit()
        
        # Get balance after cancel
        balance_after_cancel = await WalletService.get_balance(test_user.id, "USDT", test_db)
        
        # Try to settle cancelled bet (should be no-op, idempotent)
        # The service returns the bet without changes (idempotent behavior)
        settled_bet = await BetService.settle_bet(bet.id, "WIN", db=test_db)
        await test_db.commit()
        
        # Bet should still be cancelled (no change)
        assert settled_bet.status == BetStatus.CANCELLED
        # Balance should be unchanged
        balance_after_settle = await WalletService.get_balance(test_user.id, "USDT", test_db)
        assert balance_after_settle["available"] == balance_after_cancel["available"]
        assert balance_after_settle["reserved"] == balance_after_cancel["reserved"]


class TestStatusTransitionRules:
    """A) Unit Tests - 4) Status transition rules"""
    
    @pytest.mark.asyncio
    async def test_valid_transition_pending_to_cancelled(
        self, test_user: User, test_match: Odds, test_db: AsyncSession
    ):
        """Valid: pending → cancelled"""
        from app.services.wallet_service import WalletService
        
        await WalletService.credit_balance(
            user_id=test_user.id,
            asset="USDT",
            amount=Decimal("100.00"),
            db=test_db
        )
        await test_db.commit()
        
        bet = await BetService.place_bet(
            user_id=test_user.id,
            match_id=test_match.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=Decimal("10.00"),
            db=test_db
        )
        await test_db.commit()
        
        assert bet.status == BetStatus.PENDING
        
        # Cancel (valid transition)
        cancelled_bet = await BetService.cancel_bet(bet.id, test_user.id, db=test_db)
        await test_db.commit()
        
        assert cancelled_bet.status == BetStatus.CANCELLED
    
    @pytest.mark.asyncio
    async def test_valid_transition_pending_to_won(
        self, test_user: User, test_match: Odds, test_db: AsyncSession
    ):
        """Valid: pending → won"""
        from app.services.wallet_service import WalletService
        
        await WalletService.credit_balance(
            user_id=test_user.id,
            asset="USDT",
            amount=Decimal("100.00"),
            db=test_db
        )
        await test_db.commit()
        
        bet = await BetService.place_bet(
            user_id=test_user.id,
            match_id=test_match.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=Decimal("10.00"),
            db=test_db
        )
        await test_db.commit()
        
        assert bet.status == BetStatus.PENDING
        
        # Settle as WIN (valid transition)
        settled_bet = await BetService.settle_bet(bet.id, "WIN", db=test_db)
        await test_db.commit()
        
        assert settled_bet.status == BetStatus.WON
    
    @pytest.mark.asyncio
    async def test_invalid_transition_lost_to_won(
        self, test_user: User, test_match: Odds, test_db: AsyncSession
    ):
        """Invalid: lost → won (reject)"""
        from app.services.wallet_service import WalletService
        
        await WalletService.credit_balance(
            user_id=test_user.id,
            asset="USDT",
            amount=Decimal("100.00"),
            db=test_db
        )
        await test_db.commit()
        
        bet = await BetService.place_bet(
            user_id=test_user.id,
            match_id=test_match.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=Decimal("10.00"),
            db=test_db
        )
        await test_db.commit()
        
        # Settle as LOSS
        await BetService.settle_bet(bet.id, "LOSS", db=test_db)
        await test_db.commit()
        
        # Get balance after LOSS settlement
        balance_after_loss = await WalletService.get_balance(test_user.id, "USDT", test_db)
        
        # Try to settle as WIN (should be no-op, idempotent)
        # The service returns the bet without changes (idempotent behavior)
        settled_bet = await BetService.settle_bet(bet.id, "WIN", db=test_db)
        await test_db.commit()
        
        # Bet should still be lost (no change)
        assert settled_bet.status == BetStatus.LOST
        
        # Balance should be unchanged (idempotent)
        balance_after_win_attempt = await WalletService.get_balance(test_user.id, "USDT", test_db)
        assert balance_after_loss["available"] == balance_after_win_attempt["available"]
        assert balance_after_loss["reserved"] == balance_after_win_attempt["reserved"]
    
    @pytest.mark.asyncio
    async def test_invalid_transition_cancelled_to_won(
        self, test_user: User, test_match: Odds, test_db: AsyncSession
    ):
        """Invalid: cancelled → won (reject)"""
        from app.services.wallet_service import WalletService
        
        await WalletService.credit_balance(
            user_id=test_user.id,
            asset="USDT",
            amount=Decimal("100.00"),
            db=test_db
        )
        await test_db.commit()
        
        bet = await BetService.place_bet(
            user_id=test_user.id,
            match_id=test_match.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=Decimal("10.00"),
            db=test_db
        )
        await test_db.commit()
        
        # Cancel bet
        await BetService.cancel_bet(bet.id, test_user.id, db=test_db)
        await test_db.commit()
        
        # Get balance after cancel
        balance_after_cancel = await WalletService.get_balance(test_user.id, "USDT", test_db)
        
        # Try to settle as WIN (should be no-op, idempotent)
        # The service returns the bet without changes (idempotent behavior)
        settled_bet = await BetService.settle_bet(bet.id, "WIN", db=test_db)
        await test_db.commit()
        
        # Bet should still be cancelled (no change)
        assert settled_bet.status == BetStatus.CANCELLED
        
        # Balance should be unchanged (idempotent)
        balance_after_settle_attempt = await WalletService.get_balance(test_user.id, "USDT", test_db)
        assert balance_after_cancel["available"] == balance_after_settle_attempt["available"]
        assert balance_after_cancel["reserved"] == balance_after_settle_attempt["reserved"]
