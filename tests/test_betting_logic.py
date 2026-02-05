"""
Betting logic tests: win, loss, draw, potential win, and settlement.
Asserts outcome resolution, balance changes, bet_status, actual_profit, and transactions.
Uses BettingRecord + User.funds_usd + Transaction + Odds (same as /api/betting).
"""
import pytest
import pytest_asyncio
from datetime import date, time, datetime
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select

from app.core.database import Base
from app.models.user import User
from app.models.odds import Odds
from app.models.betting_record import BettingRecord
from app.models.transaction import Transaction
from app.routers.betting_records import auto_settle_user_bets

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def engine():
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db(engine):
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def user_with_balance(db: AsyncSession) -> User:
    user = User(
        email="bettor@test.com",
        username="bettor",
        hashed_password="hash",
        is_active=True,
        is_verified=True,
        funds_usd=Decimal("100.00"),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def match_home_win(db: AsyncSession) -> Odds:
    """Match with result: home wins 2-1."""
    m = Odds(
        season=2025,
        date=date(2026, 2, 6),
        time=time(19, 30),
        home_team="Union Berlin",
        away_team="Eintracht Frankfurt",
        league="Bundesliga",
        country="Germany",
        result="2-1",
        odd_1=Decimal("2.12"),
        odd_X=Decimal("3.48"),
        odd_2=Decimal("3.41"),
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return m


@pytest_asyncio.fixture
async def match_away_win(db: AsyncSession) -> Odds:
    """Match with result: away wins 0-1."""
    m = Odds(
        season=2025,
        date=date(2026, 2, 7),
        time=time(15, 0),
        home_team="Team A",
        away_team="Team B",
        league="Test League",
        country="Test",
        result="0-1",
        odd_1=Decimal("2.00"),
        odd_X=Decimal("3.50"),
        odd_2=Decimal("3.20"),
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return m


@pytest_asyncio.fixture
async def match_draw(db: AsyncSession) -> Odds:
    """Match with result: draw 1-1."""
    m = Odds(
        season=2025,
        date=date(2026, 2, 8),
        time=time(20, 0),
        home_team="Team X",
        away_team="Team Y",
        league="Test League",
        country="Test",
        result="1-1",
        odd_1=Decimal("2.50"),
        odd_X=Decimal("3.48"),
        odd_2=Decimal("2.60"),
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return m


# ---------- Outcome resolution (1X2) ----------


class TestOutcomeResolution:
    """Assert correct outcome (home/away/draw) from match result string."""

    @pytest.mark.asyncio
    async def test_home_win_outcome(self, db: AsyncSession, user_with_balance: User, match_home_win: Odds):
        """Result 2-1 → actual_outcome is 'home'; bet on home at 2.12 → profit = 10*2.12 - 10."""
        bet = BettingRecord(
            user_id=user_with_balance.id,
            match_id=match_home_win.id,
            match_teams=f"{match_home_win.home_team} vs {match_home_win.away_team}",
            bet_amount=10.0,
            potential_win=21.20,
            odds_value="2.12",
            odds_decimal=2.12,
            selected_outcome="home",
            bet_status="pending",
            is_settled=False,
        )
        db.add(bet)
        await db.commit()
        await db.refresh(bet)

        await auto_settle_user_bets(db, user_with_balance.id)
        await db.commit()
        await db.refresh(bet)

        assert bet.is_settled is True
        assert bet.bet_status == "won"
        assert bet.actual_profit == pytest.approx(11.20, rel=1e-2)  # 10 * 2.12 - 10

    @pytest.mark.asyncio
    async def test_away_win_outcome(self, db: AsyncSession, user_with_balance: User, match_away_win: Odds):
        """Result 0-1 → actual_outcome is 'away'."""
        bet = BettingRecord(
            user_id=user_with_balance.id,
            match_id=match_away_win.id,
            match_teams=f"{match_away_win.home_team} vs {match_away_win.away_team}",
            bet_amount=20.0,
            potential_win=64.00,
            odds_value="3.20",
            odds_decimal=3.20,
            selected_outcome="away",
            bet_status="pending",
            is_settled=False,
        )
        db.add(bet)
        await db.commit()
        await db.refresh(bet)

        await auto_settle_user_bets(db, user_with_balance.id)
        await db.commit()
        await db.refresh(bet)

        assert bet.is_settled is True
        assert bet.bet_status == "won"
        assert bet.actual_profit == pytest.approx(44.00, rel=1e-2)  # 20 * 3.20 - 20

    @pytest.mark.asyncio
    async def test_draw_outcome(self, db: AsyncSession, user_with_balance: User, match_draw: Odds):
        """Result 1-1 → actual_outcome is 'draw'."""
        bet = BettingRecord(
            user_id=user_with_balance.id,
            match_id=match_draw.id,
            match_teams=f"{match_draw.home_team} vs {match_draw.away_team}",
            bet_amount=10.0,
            potential_win=34.80,
            odds_value="3.48",
            odds_decimal=3.48,
            selected_outcome="draw",
            bet_status="pending",
            is_settled=False,
        )
        db.add(bet)
        await db.commit()
        await db.refresh(bet)

        await auto_settle_user_bets(db, user_with_balance.id)
        await db.commit()
        await db.refresh(bet)

        assert bet.is_settled is True
        assert bet.bet_status == "won"
        assert bet.actual_profit == pytest.approx(24.80, rel=1e-2)  # 10 * 3.48 - 10


# ---------- Win: balance and transaction ----------


class TestBetWon:
    """When user's selection matches result: bet_status=won, balance += winnings, bet_won transaction."""

    @pytest.mark.asyncio
    async def test_win_increases_balance_by_winnings(
        self, db: AsyncSession, user_with_balance: User, match_home_win: Odds
    ):
        """Bet on home at 2.12, result 2-1 → balance increases by stake * odds."""
        stake = 10.0
        odds_decimal = 2.12
        winnings = stake * odds_decimal
        initial = float(user_with_balance.funds_usd)

        bet = BettingRecord(
            user_id=user_with_balance.id,
            match_id=match_home_win.id,
            match_teams=f"{match_home_win.home_team} vs {match_home_win.away_team}",
            bet_amount=stake,
            potential_win=stake * odds_decimal,
            odds_value="2.12",
            odds_decimal=odds_decimal,
            selected_outcome="home",
            bet_status="pending",
            is_settled=False,
        )
        db.add(bet)
        await db.commit()

        await auto_settle_user_bets(db, user_with_balance.id)
        await db.commit()

        await db.refresh(user_with_balance)
        new_balance = float(user_with_balance.funds_usd)
        assert new_balance == pytest.approx(initial + winnings, rel=1e-2)
        assert new_balance == pytest.approx(initial + 21.20, rel=1e-2)  # 10 * 2.12

    @pytest.mark.asyncio
    async def test_win_actual_profit_equals_winnings_minus_stake(
        self, db: AsyncSession, user_with_balance: User, match_draw: Odds
    ):
        """Draw bet won: actual_profit = (stake * odds) - stake."""
        stake = 10.0
        odds_decimal = 3.48
        expected_profit = (stake * odds_decimal) - stake

        bet = BettingRecord(
            user_id=user_with_balance.id,
            match_id=match_draw.id,
            match_teams=f"{match_draw.home_team} vs {match_draw.away_team}",
            bet_amount=stake,
            potential_win=stake * odds_decimal,
            odds_value="3.48",
            odds_decimal=odds_decimal,
            selected_outcome="draw",
            bet_status="pending",
            is_settled=False,
        )
        db.add(bet)
        await db.commit()
        await db.refresh(bet)

        await auto_settle_user_bets(db, user_with_balance.id)
        await db.commit()
        await db.refresh(bet)

        assert bet.bet_status == "won"
        assert bet.actual_profit is not None
        assert bet.actual_profit == pytest.approx(expected_profit, rel=1e-2)

    @pytest.mark.asyncio
    async def test_win_creates_bet_won_transaction(
        self, db: AsyncSession, user_with_balance: User, match_home_win: Odds
    ):
        """Settlement creates a bet_won transaction with correct amount."""
        bet = BettingRecord(
            user_id=user_with_balance.id,
            match_id=match_home_win.id,
            match_teams=f"{match_home_win.home_team} vs {match_home_win.away_team}",
            bet_amount=10.0,
            potential_win=21.20,
            odds_value="2.12",
            odds_decimal=2.12,
            selected_outcome="home",
            bet_status="pending",
            is_settled=False,
        )
        db.add(bet)
        await db.commit()
        await db.refresh(bet)

        await auto_settle_user_bets(db, user_with_balance.id)
        await db.commit()

        q = select(Transaction).where(
            Transaction.user_id == user_with_balance.id,
            Transaction.reference_type == "betting_record",
            Transaction.reference_id == str(bet.id),
        )
        res = await db.execute(q)
        tx = res.scalar_one_or_none()
        assert tx is not None
        assert tx.transaction_type == "bet_won"
        assert tx.amount == pytest.approx(21.20, rel=1e-2)  # winnings = 10 * 2.12
        assert tx.balance_after == pytest.approx(tx.balance_before + 21.20, rel=1e-2)


# ---------- Loss: no balance credit, bet_lost transaction ----------


class TestBetLost:
    """When user's selection does not match result: bet_status=lost, balance unchanged, bet_lost transaction."""

    @pytest.mark.asyncio
    async def test_loss_balance_unchanged(
        self, db: AsyncSession, user_with_balance: User, match_home_win: Odds
    ):
        """Bet on away, result 2-1 (home win) → balance unchanged."""
        initial = float(user_with_balance.funds_usd)

        bet = BettingRecord(
            user_id=user_with_balance.id,
            match_id=match_home_win.id,
            match_teams=f"{match_home_win.home_team} vs {match_home_win.away_team}",
            bet_amount=15.0,
            potential_win=51.15,
            odds_value="3.41",
            odds_decimal=3.41,
            selected_outcome="away",
            bet_status="pending",
            is_settled=False,
        )
        db.add(bet)
        await db.commit()

        await auto_settle_user_bets(db, user_with_balance.id)
        await db.commit()

        await db.refresh(user_with_balance)
        assert float(user_with_balance.funds_usd) == pytest.approx(initial, rel=1e-2)

    @pytest.mark.asyncio
    async def test_loss_actual_profit_negative_stake(
        self, db: AsyncSession, user_with_balance: User, match_draw: Odds
    ):
        """Bet on home, result 1-1 (draw) → actual_profit = -stake."""
        stake = 25.0
        bet = BettingRecord(
            user_id=user_with_balance.id,
            match_id=match_draw.id,
            match_teams=f"{match_draw.home_team} vs {match_draw.away_team}",
            bet_amount=stake,
            potential_win=62.50,
            odds_value="2.50",
            odds_decimal=2.50,
            selected_outcome="home",
            bet_status="pending",
            is_settled=False,
        )
        db.add(bet)
        await db.commit()
        await db.refresh(bet)

        await auto_settle_user_bets(db, user_with_balance.id)
        await db.commit()
        await db.refresh(bet)

        assert bet.bet_status == "lost"
        assert bet.actual_profit is not None
        assert bet.actual_profit == pytest.approx(-stake, rel=1e-2)

    @pytest.mark.asyncio
    async def test_loss_creates_bet_lost_transaction(
        self, db: AsyncSession, user_with_balance: User, match_home_win: Odds
    ):
        """Settlement creates bet_lost transaction, amount 0, balance unchanged."""
        balance_before = float(user_with_balance.funds_usd)
        bet = BettingRecord(
            user_id=user_with_balance.id,
            match_id=match_home_win.id,
            match_teams=f"{match_home_win.home_team} vs {match_home_win.away_team}",
            bet_amount=10.0,
            potential_win=34.80,
            odds_value="3.48",
            odds_decimal=3.48,
            selected_outcome="draw",
            bet_status="pending",
            is_settled=False,
        )
        db.add(bet)
        await db.commit()
        await db.refresh(bet)

        await auto_settle_user_bets(db, user_with_balance.id)
        await db.commit()

        q = select(Transaction).where(
            Transaction.user_id == user_with_balance.id,
            Transaction.reference_type == "betting_record",
            Transaction.reference_id == str(bet.id),
        )
        res = await db.execute(q)
        tx = res.scalar_one_or_none()
        assert tx is not None
        assert tx.transaction_type == "bet_lost"
        assert tx.amount == 0.0
        assert tx.balance_before == pytest.approx(balance_before, rel=1e-2)
        assert tx.balance_after == pytest.approx(balance_before, rel=1e-2)


# ---------- Potential win formula ----------


class TestPotentialWin:
    """potential_win = bet_amount * odds_decimal (stake * decimal odds)."""

    @pytest.mark.asyncio
    async def test_potential_win_formula(self):
        """Assert potential_win = stake * odds_decimal."""
        stake = 10.0
        odds_decimal = 3.48
        expected_potential = stake * odds_decimal
        assert expected_potential == pytest.approx(34.80, rel=1e-2)

    @pytest.mark.asyncio
    async def test_actual_winnings_match_potential_on_win(
        self, db: AsyncSession, user_with_balance: User, match_draw: Odds
    ):
        """When bet wins, balance increase equals potential_win (stake * odds)."""
        stake = 10.0
        odds_decimal = 3.48
        potential_win = stake * odds_decimal
        initial = float(user_with_balance.funds_usd)

        bet = BettingRecord(
            user_id=user_with_balance.id,
            match_id=match_draw.id,
            match_teams=f"{match_draw.home_team} vs {match_draw.away_team}",
            bet_amount=stake,
            potential_win=potential_win,
            odds_value="3.48",
            odds_decimal=odds_decimal,
            selected_outcome="draw",
            bet_status="pending",
            is_settled=False,
        )
        db.add(bet)
        await db.commit()

        await auto_settle_user_bets(db, user_with_balance.id)
        await db.commit()

        await db.refresh(user_with_balance)
        balance_increase = float(user_with_balance.funds_usd) - initial
        assert balance_increase == pytest.approx(potential_win, rel=1e-2)


# ---------- Settlement idempotency (no double credit) ----------


class TestSettlementIdempotency:
    """Settling the same bet again does not double-credit or duplicate transactions."""

    @pytest.mark.asyncio
    async def test_double_settle_does_not_double_credit(
        self, db: AsyncSession, user_with_balance: User, match_home_win: Odds
    ):
        """Call auto_settle twice: balance only increased once by winnings."""
        bet = BettingRecord(
            user_id=user_with_balance.id,
            match_id=match_home_win.id,
            match_teams=f"{match_home_win.home_team} vs {match_home_win.away_team}",
            bet_amount=10.0,
            potential_win=21.20,
            odds_value="2.12",
            odds_decimal=2.12,
            selected_outcome="home",
            bet_status="pending",
            is_settled=False,
        )
        db.add(bet)
        await db.commit()

        await auto_settle_user_bets(db, user_with_balance.id)
        await db.commit()
        await db.refresh(user_with_balance)
        balance_after_first = float(user_with_balance.funds_usd)

        await auto_settle_user_bets(db, user_with_balance.id)
        await db.commit()
        await db.refresh(user_with_balance)
        balance_after_second = float(user_with_balance.funds_usd)

        assert balance_after_first == pytest.approx(balance_after_second, rel=1e-2)
        assert balance_after_first == pytest.approx(100.0 + 21.20, rel=1e-2)  # winnings 10*2.12


# ---------- Unsettled bet (no result) ----------


class TestUnsettledBet:
    """Bet remains pending when match has no result or match not found."""

    @pytest.mark.asyncio
    async def test_bet_stays_pending_when_match_has_no_result(
        self, db: AsyncSession, user_with_balance: User, match_home_win: Odds
    ):
        """Match with result=None: bet is not settled."""
        match_home_win.result = None
        await db.commit()

        bet = BettingRecord(
            user_id=user_with_balance.id,
            match_id=match_home_win.id,
            match_teams=f"{match_home_win.home_team} vs {match_home_win.away_team}",
            bet_amount=10.0,
            potential_win=21.20,
            odds_value="2.12",
            odds_decimal=2.12,
            selected_outcome="home",
            bet_status="pending",
            is_settled=False,
        )
        db.add(bet)
        await db.commit()
        await db.refresh(bet)

        await auto_settle_user_bets(db, user_with_balance.id)
        await db.commit()
        await db.refresh(bet)

        assert bet.is_settled is False
        assert bet.bet_status == "pending"
        assert bet.actual_profit is None
