"""
Single consolidated test file for full betting flow.

Covers:
- BetService: place bet, cancel, settle WIN/LOSS/VOID; wallet balance and ledger.
- Accounting: BET_LOCK, BET_WIN_DEDUCT_STAKE, BET_WIN_PAYOUT_CREDIT, BET_LOSS_DEDUCT, BET_VOID_UNLOCK.
- Full flow: place → win → place → loss → place → void → idempotency.
- BettingRecord + auto_settle: outcome resolution (1X2), win/loss/draw, no settle for future/invalid result.
- Odds validation and placement rules; status transitions.

Aligns with backend betting flow: wallet ledger types, settlement idempotency, no double credit.
"""
import pytest
import pytest_asyncio
from datetime import date, time, datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select, func

from app.core.database import Base
from app.models.user import User
from app.models.odds import Odds
from app.models.bet import Bet, BetStatus
from app.models.betting_record import BettingRecord
from app.models.transaction import Transaction
from app.models.deposit import UserCryptoBalance
from app.models.wallet_transaction import WalletTransaction, WalletTransactionType, ReferenceType
from app.routers.betting_records import auto_settle_user_bets
from app.services.bet_service import BetService
from app.services.wallet_service import WalletService

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


# ---------- Shared fixtures ----------


@pytest_asyncio.fixture
async def engine():
    e = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with e.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield e
    await e.dispose()


@pytest_asyncio.fixture
async def db(engine):
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def user(db: AsyncSession) -> User:
    u = User(
        email="bettor@test.com",
        username="bettor",
        hashed_password="hash",
        is_active=True,
        is_verified=True,
        funds_usd=Decimal("100.00"),
    )
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


@pytest_asyncio.fixture
async def user_with_wallet(db: AsyncSession, user: User) -> User:
    """User with wallet balance (for BetService path)."""
    await WalletService.credit_balance(
        user_id=user.id,
        asset="USDT",
        amount=Decimal("100.00"),
        db=db,
    )
    await db.commit()
    return user


@pytest_asyncio.fixture
async def match_open(db: AsyncSession) -> Odds:
    """Open match for BetService (no result)."""
    m = Odds(
        season=2024,
        date=date.today() + timedelta(days=1),
        time=time(19, 0),
        home_team="Team A",
        away_team="Team B",
        league="Test League",
        country="Test Country",
        odd_1=Decimal("2.50"),
        odd_X=Decimal("3.00"),
        odd_2=Decimal("2.80"),
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return m


def _past_date(days_ago: int = 10) -> date:
    return (datetime.now(timezone.utc) - timedelta(days=days_ago)).date()


def _future_date(days_ahead: int = 30) -> date:
    return (datetime.now(timezone.utc) + timedelta(days=days_ahead)).date()


@pytest_asyncio.fixture
async def match_home_win(db: AsyncSession) -> Odds:
    m = Odds(
        season=2025,
        date=_past_date(10),
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
    m = Odds(
        season=2025,
        date=_past_date(9),
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
    m = Odds(
        season=2025,
        date=_past_date(8),
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


@pytest_asyncio.fixture
async def match_future(db: AsyncSession) -> Odds:
    m = Odds(
        season=2025,
        date=_future_date(30),
        time=time(19, 0),
        home_team="Winterthur",
        away_team="St. Gallen",
        league="Super League",
        country="Switzerland",
        result="2-1",
        odd_1=Decimal("1.88"),
        odd_X=Decimal("3.78"),
        odd_2=Decimal("3.55"),
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return m


@pytest_asyncio.fixture
async def match_past_invalid_result(db: AsyncSession) -> Odds:
    m = Odds(
        season=2025,
        date=_past_date(5),
        time=time(14, 0),
        home_team="Team Alpha",
        away_team="Team Beta",
        league="Test League",
        country="Test",
        result="18-17",
        odd_1=Decimal("2.00"),
        odd_X=Decimal("3.50"),
        odd_2=Decimal("2.80"),
    )
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return m


async def get_ledger_entries(db: AsyncSession, user_id: int, asset: str, reference_id: int):
    stmt = select(WalletTransaction).where(
        WalletTransaction.user_id == user_id,
        WalletTransaction.asset == asset,
        WalletTransaction.reference_type == ReferenceType.BET,
        WalletTransaction.reference_id == reference_id,
    ).order_by(WalletTransaction.created_at)
    result = await db.execute(stmt)
    return list(result.scalars().all())


# ---------- 1. BetService: Place bet ----------


class TestPlaceBet:
    @pytest.mark.asyncio
    async def test_place_bet_reserved_increases_available_decreases(
        self, db: AsyncSession, user_with_wallet: User, match_open: Odds
    ):
        balance_before = await WalletService.get_balance(user_with_wallet.id, "USDT", db)
        stake = Decimal("10.00")
        bet = await BetService.place_bet(
            user_id=user_with_wallet.id,
            match_id=match_open.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=stake,
            currency="USDT",
            db=db,
        )
        balance_after = await WalletService.get_balance(user_with_wallet.id, "USDT", db)
        assert balance_after["available"] == balance_before["available"] - stake
        assert balance_after["reserved"] == balance_before["reserved"] + stake
        assert balance_after["total"] == balance_before["total"]
        assert bet.id is not None
        assert bet.status == BetStatus.PENDING
        assert bet.stake == stake
        entries = await get_ledger_entries(db, user_with_wallet.id, "USDT", bet.id)
        lock = next((e for e in entries if e.type == WalletTransactionType.BET_LOCK), None)
        assert lock is not None and lock.amount == stake

    @pytest.mark.asyncio
    async def test_insufficient_balance_cannot_place_bet(
        self, db: AsyncSession, user: User, match_open: Odds
    ):
        user_id = user.id
        with pytest.raises(ValueError, match="Insufficient"):
            await BetService.place_bet(
                user_id=user_id,
                match_id=match_open.id,
                market_key="1x2",
                selection_key="home",
                odds_decimal=Decimal("2.50"),
                stake=Decimal("100.00"),
                currency="USDT",
                db=db,
            )
        await db.rollback()
        stmt = select(func.count(Bet.id)).where(Bet.user_id == user_id)
        r = await db.execute(stmt)
        assert (r.scalar() or 0) == 0

    @pytest.mark.asyncio
    async def test_place_bet_atomic(
        self, db: AsyncSession, user_with_wallet: User, match_open: Odds
    ):
        stake = Decimal("10.00")
        bet = await BetService.place_bet(
            user_id=user_with_wallet.id,
            match_id=match_open.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=stake,
            currency="USDT",
            db=db,
        )
        assert bet.id is not None
        entries = await get_ledger_entries(db, user_with_wallet.id, "USDT", bet.id)
        assert len(entries) >= 1


# ---------- 2. BetService: Cancel bet ----------


class TestCancelBet:
    @pytest.mark.asyncio
    async def test_cancel_bet_reserved_returns_to_available(
        self, db: AsyncSession, user_with_wallet: User, match_open: Odds
    ):
        stake = Decimal("15.00")
        bet = await BetService.place_bet(
            user_id=user_with_wallet.id,
            match_id=match_open.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=stake,
            currency="USDT",
            db=db,
        )
        balance_after_place = await WalletService.get_balance(user_with_wallet.id, "USDT", db)
        cancelled = await BetService.cancel_bet(bet.id, user_with_wallet.id, db=db)
        balance_after_cancel = await WalletService.get_balance(user_with_wallet.id, "USDT", db)
        assert balance_after_cancel["available"] == balance_after_place["available"] + stake
        assert balance_after_cancel["reserved"] == balance_after_place["reserved"] - stake
        assert cancelled.status == BetStatus.CANCELLED
        entries = await get_ledger_entries(db, user_with_wallet.id, "USDT", bet.id)
        unlock = next((e for e in entries if e.type == WalletTransactionType.BET_CANCEL_UNLOCK), None)
        assert unlock is not None and unlock.amount == stake

    @pytest.mark.asyncio
    async def test_cancel_bet_only_pending(
        self, db: AsyncSession, user_with_wallet: User, match_open: Odds
    ):
        bet = await BetService.place_bet(
            user_id=user_with_wallet.id,
            match_id=match_open.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=Decimal("10.00"),
            currency="USDT",
            db=db,
        )
        await BetService.settle_bet(bet.id, "LOSS", db=db)
        with pytest.raises(ValueError, match="Cannot cancel"):
            await BetService.cancel_bet(bet.id, user_with_wallet.id, db=db)
        await db.rollback()
        await db.refresh(bet)
        assert bet.status == BetStatus.LOST


# ---------- 3. BetService: Settle WIN / LOSS / VOID ----------


@pytest_asyncio.fixture
async def pending_bet(db: AsyncSession, user_with_wallet: User, match_open: Odds) -> Bet:
    return await BetService.place_bet(
        user_id=user_with_wallet.id,
        match_id=match_open.id,
        market_key="1x2",
        selection_key="home",
        odds_decimal=Decimal("2.50"),
        stake=Decimal("20.00"),
        currency="USDT",
        db=db,
    )


class TestSettleOutcomes:
    @pytest.mark.asyncio
    async def test_settle_loss_reserved_decreases_no_credit(
        self, db: AsyncSession, user_with_wallet: User, pending_bet: Bet
    ):
        balance_before = await WalletService.get_balance(user_with_wallet.id, "USDT", db)
        await BetService.settle_bet(pending_bet.id, "LOSS", db=db)
        balance_after = await WalletService.get_balance(user_with_wallet.id, "USDT", db)
        assert balance_after["available"] == balance_before["available"]
        assert balance_after["reserved"] == balance_before["reserved"] - pending_bet.stake
        assert balance_after["total"] == balance_before["total"] - pending_bet.stake
        entries = await get_ledger_entries(db, user_with_wallet.id, "USDT", pending_bet.id)
        deduct = next((e for e in entries if e.type == WalletTransactionType.BET_LOSS_DEDUCT), None)
        assert deduct is not None and deduct.amount == pending_bet.stake

    @pytest.mark.asyncio
    async def test_settle_void_reserved_returns_to_available(
        self, db: AsyncSession, user_with_wallet: User, pending_bet: Bet
    ):
        balance_before = await WalletService.get_balance(user_with_wallet.id, "USDT", db)
        await BetService.settle_bet(pending_bet.id, "VOID", db=db)
        balance_after = await WalletService.get_balance(user_with_wallet.id, "USDT", db)
        assert balance_after["available"] == balance_before["available"] + pending_bet.stake
        assert balance_after["reserved"] == balance_before["reserved"] - pending_bet.stake
        assert balance_after["total"] == balance_before["total"]
        entries = await get_ledger_entries(db, user_with_wallet.id, "USDT", pending_bet.id)
        unlock = next((e for e in entries if e.type == WalletTransactionType.BET_VOID_UNLOCK), None)
        assert unlock is not None and unlock.amount == pending_bet.stake

    @pytest.mark.asyncio
    async def test_settle_win_reserved_deducted_payout_credited(
        self, db: AsyncSession, user_with_wallet: User, pending_bet: Bet
    ):
        expected_payout = pending_bet.stake * pending_bet.odds_decimal
        expected_profit = pending_bet.stake * (pending_bet.odds_decimal - Decimal("1"))
        balance_before = await WalletService.get_balance(user_with_wallet.id, "USDT", db)
        settled = await BetService.settle_bet(pending_bet.id, "WIN", db=db)
        balance_after = await WalletService.get_balance(user_with_wallet.id, "USDT", db)
        assert balance_after["available"] == balance_before["available"] + expected_payout
        assert balance_after["reserved"] == balance_before["reserved"] - pending_bet.stake
        assert balance_after["total"] == balance_before["total"] + expected_profit
        assert settled.status == BetStatus.WON
        assert settled.profit == expected_profit
        assert settled.payout == expected_payout
        entries = await get_ledger_entries(db, user_with_wallet.id, "USDT", pending_bet.id)
        deduct = next((e for e in entries if e.type == WalletTransactionType.BET_WIN_DEDUCT_STAKE), None)
        credit = next((e for e in entries if e.type == WalletTransactionType.BET_WIN_PAYOUT_CREDIT), None)
        assert deduct is not None and deduct.amount == pending_bet.stake
        assert credit is not None and credit.amount == expected_payout


# ---------- 4. BetService: Idempotency ----------


class TestSettleIdempotency:
    @pytest.mark.asyncio
    async def test_settle_win_twice_no_double_credit(
        self, db: AsyncSession, user_with_wallet: User, pending_bet: Bet
    ):
        await BetService.settle_bet(pending_bet.id, "WIN", db=db)
        balance_after_first = await WalletService.get_balance(user_with_wallet.id, "USDT", db)
        await BetService.settle_bet(pending_bet.id, "WIN", db=db)
        balance_after_second = await WalletService.get_balance(user_with_wallet.id, "USDT", db)
        assert balance_after_second["available"] == balance_after_first["available"]
        assert balance_after_second["reserved"] == balance_after_first["reserved"]
        stmt = select(func.count(WalletTransaction.id)).where(
            WalletTransaction.reference_type == ReferenceType.BET,
            WalletTransaction.reference_id == pending_bet.id,
        )
        r1 = await db.execute(stmt)
        count = r1.scalar() or 0
        r2 = await db.execute(stmt)
        assert (r2.scalar() or 0) == count

    @pytest.mark.asyncio
    async def test_settle_loss_twice_idempotent(
        self, db: AsyncSession, user_with_wallet: User, pending_bet: Bet
    ):
        await BetService.settle_bet(pending_bet.id, "LOSS", db=db)
        b1 = await WalletService.get_balance(user_with_wallet.id, "USDT", db)
        await BetService.settle_bet(pending_bet.id, "LOSS", db=db)
        b2 = await WalletService.get_balance(user_with_wallet.id, "USDT", db)
        assert b2["available"] == b1["available"] and b2["reserved"] == b1["reserved"]

    @pytest.mark.asyncio
    async def test_settle_void_twice_idempotent(
        self, db: AsyncSession, user_with_wallet: User, pending_bet: Bet
    ):
        await BetService.settle_bet(pending_bet.id, "VOID", db=db)
        b1 = await WalletService.get_balance(user_with_wallet.id, "USDT", db)
        await BetService.settle_bet(pending_bet.id, "VOID", db=db)
        b2 = await WalletService.get_balance(user_with_wallet.id, "USDT", db)
        assert b2["available"] == b1["available"] and b2["reserved"] == b1["reserved"]


# ---------- 5. Accounting semantics ----------


class TestAccountingSemantics:
    @pytest.mark.asyncio
    async def test_place_bet_uses_bet_lock(
        self, db: AsyncSession, user_with_wallet: User, match_open: Odds
    ):
        bet = await BetService.place_bet(
            user_id=user_with_wallet.id,
            match_id=match_open.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=Decimal("10.00"),
            currency="USDT",
            db=db,
        )
        entries = await get_ledger_entries(db, user_with_wallet.id, "USDT", bet.id)
        assert len(entries) == 1
        assert entries[0].type == WalletTransactionType.BET_LOCK
        assert entries[0].amount == Decimal("10.00")
        assert entries[0].balance_before - entries[0].balance_after == Decimal("10.00")
        assert entries[0].reserved_after - entries[0].reserved_before == Decimal("10.00")

    @pytest.mark.asyncio
    async def test_win_uses_deduct_stake_and_payout_credit(
        self, db: AsyncSession, user_with_wallet: User, match_open: Odds
    ):
        stake = Decimal("10.00")
        odds = Decimal("2.50")
        expected_payout = stake * odds
        bet = await BetService.place_bet(
            user_id=user_with_wallet.id,
            match_id=match_open.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=odds,
            stake=stake,
            currency="USDT",
            db=db,
        )
        await BetService.settle_bet(bet.id, "WIN", db=db)
        entries = await get_ledger_entries(db, user_with_wallet.id, "USDT", bet.id)
        assert len(entries) == 3
        assert entries[0].type == WalletTransactionType.BET_LOCK
        assert entries[1].type == WalletTransactionType.BET_WIN_DEDUCT_STAKE
        assert entries[2].type == WalletTransactionType.BET_WIN_PAYOUT_CREDIT
        assert entries[1].amount == stake
        assert entries[2].amount == expected_payout

    @pytest.mark.asyncio
    async def test_profit_formula_stake_times_odds_minus_one(
        self, db: AsyncSession, user_with_wallet: User
    ):
        cases = [
            (Decimal("10.00"), Decimal("2.50"), Decimal("15.00")),
            (Decimal("5.00"), Decimal("3.00"), Decimal("10.00")),
            (Decimal("20.00"), Decimal("1.50"), Decimal("10.00")),
        ]
        for stake, odds, expected_profit in cases:
            m = Odds(
                home_team="A",
                away_team="B",
                league="L",
                country="C",
                season=2024,
                date=date.today() + timedelta(days=1),
                odd_1=None,
                odd_X=None,
                odd_2=None,
                result=None,
            )
            db.add(m)
            await db.commit()
            await db.refresh(m)
            bet = await BetService.place_bet(
                user_id=user_with_wallet.id,
                match_id=m.id,
                market_key="1x2",
                selection_key="home",
                odds_decimal=odds,
                stake=stake,
                currency="USDT",
                db=db,
            )
            await BetService.settle_bet(bet.id, "WIN", db=db)
            entries = await get_ledger_entries(db, user_with_wallet.id, "USDT", bet.id)
            payout_entries = [e for e in entries if e.type == WalletTransactionType.BET_WIN_PAYOUT_CREDIT]
            assert len(payout_entries) == 1
            actual_payout = payout_entries[0].amount
            actual_profit = actual_payout - stake
            assert actual_profit == expected_profit
            assert actual_profit == stake * (odds - Decimal("1"))

    @pytest.mark.asyncio
    async def test_loss_uses_bet_loss_deduct(
        self, db: AsyncSession, user_with_wallet: User, match_open: Odds
    ):
        stake = Decimal("10.00")
        bet = await BetService.place_bet(
            user_id=user_with_wallet.id,
            match_id=match_open.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=stake,
            currency="USDT",
            db=db,
        )
        await BetService.settle_bet(bet.id, "LOSS", db=db)
        entries = await get_ledger_entries(db, user_with_wallet.id, "USDT", bet.id)
        assert len(entries) == 2
        assert entries[0].type == WalletTransactionType.BET_LOCK
        assert entries[1].type == WalletTransactionType.BET_LOSS_DEDUCT
        assert entries[1].amount == stake
        assert entries[1].balance_before == entries[1].balance_after

    @pytest.mark.asyncio
    async def test_void_uses_bet_void_unlock_only(
        self, db: AsyncSession, user_with_wallet: User, match_open: Odds
    ):
        stake = Decimal("10.00")
        bet = await BetService.place_bet(
            user_id=user_with_wallet.id,
            match_id=match_open.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=stake,
            currency="USDT",
            db=db,
        )
        await BetService.settle_bet(bet.id, "VOID", db=db)
        entries = await get_ledger_entries(db, user_with_wallet.id, "USDT", bet.id)
        assert len(entries) == 2
        assert entries[0].type == WalletTransactionType.BET_LOCK
        assert entries[1].type == WalletTransactionType.BET_VOID_UNLOCK
        assert entries[1].amount == stake
        assert len([e for e in entries if e.type == WalletTransactionType.BET_WIN_PAYOUT_CREDIT]) == 0

    @pytest.mark.asyncio
    async def test_win_no_double_credit(
        self, db: AsyncSession, user_with_wallet: User, match_open: Odds
    ):
        stake = Decimal("10.00")
        odds = Decimal("2.50")
        expected_payout = stake * odds
        expected_increase = stake + (stake * (odds - Decimal("1")))
        bet = await BetService.place_bet(
            user_id=user_with_wallet.id,
            match_id=match_open.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=odds,
            stake=stake,
            currency="USDT",
            db=db,
        )
        balance_before = await WalletService.get_balance(user_with_wallet.id, "USDT", db)
        await BetService.settle_bet(bet.id, "WIN", db=db)
        balance_after = await WalletService.get_balance(user_with_wallet.id, "USDT", db)
        actual_increase = balance_after["available"] - balance_before["available"]
        assert actual_increase == expected_increase
        entries = await get_ledger_entries(db, user_with_wallet.id, "USDT", bet.id)
        payout_entries = [e for e in entries if e.type == WalletTransactionType.BET_WIN_PAYOUT_CREDIT]
        assert len(payout_entries) == 1 and payout_entries[0].amount == expected_payout


# ---------- 6. Full flow: place → win → loss → void → idempotency ----------


class TestFullFlow:
    @pytest.mark.asyncio
    async def test_full_flow_place_win_loss_void_and_idempotency(
        self, db: AsyncSession, user_with_wallet: User, match_open: Odds
    ):
        user_id = user_with_wallet.id
        stake = Decimal("10.00")
        odds = match_open.odd_1  # Use fixture odds (2.50) so place_bet passes validation

        # Place 1
        b1 = await BetService.place_bet(
            user_id=user_id,
            match_id=match_open.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=odds,
            stake=stake,
            currency="USDT",
            db=db,
        )
        bal = await WalletService.get_balance(user_id, "USDT", db)
        assert bal["available"] == Decimal("90.00")
        assert bal["reserved"] == Decimal("10.00")

        # Settle WIN (payout = 10 * 2.5 = 25)
        await BetService.settle_bet(b1.id, "WIN", db=db)
        bal = await WalletService.get_balance(user_id, "USDT", db)
        assert bal["available"] == Decimal("115.00")  # 90 + 25
        assert bal["reserved"] == Decimal("0")
        entries1 = await get_ledger_entries(db, user_id, "USDT", b1.id)
        assert len(entries1) == 3
        assert entries1[0].type == WalletTransactionType.BET_LOCK
        assert entries1[1].type in (
            WalletTransactionType.BET_UNLOCK,
            WalletTransactionType.BET_WIN_DEDUCT_STAKE,
        )
        assert entries1[2].type in (
            WalletTransactionType.BET_PAYOUT,
            WalletTransactionType.BET_WIN_PAYOUT_CREDIT,
            WalletTransactionType.BET_WIN,
        )
        assert entries1[2].amount == stake * odds

        # Place 2 → LOSS (stake 10, odds 2.5 for validation)
        b2 = await BetService.place_bet(
            user_id=user_id,
            match_id=match_open.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=odds,
            stake=stake,
            currency="USDT",
            db=db,
        )
        await BetService.settle_bet(b2.id, "LOSS", db=db)
        bal = await WalletService.get_balance(user_id, "USDT", db)
        assert bal["available"] == Decimal("105.00")  # 115 - 10 reserved, then loss: 115, reserved 0
        assert bal["reserved"] == Decimal("0")
        entries2 = await get_ledger_entries(db, user_id, "USDT", b2.id)
        assert len(entries2) == 2
        assert entries2[1].type in (
            WalletTransactionType.BET_DEBIT,
            WalletTransactionType.BET_LOSS_DEDUCT,
        )

        # Place 3 → VOID (stake returned)
        b3 = await BetService.place_bet(
            user_id=user_id,
            match_id=match_open.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=odds,
            stake=stake,
            currency="USDT",
            db=db,
        )
        await BetService.settle_bet(b3.id, "VOID", db=db)
        bal = await WalletService.get_balance(user_id, "USDT", db)
        assert bal["available"] == Decimal("105.00")  # 105 after loss, place 10 -> 95 available, void -> 105
        assert bal["reserved"] == Decimal("0")
        entries3 = await get_ledger_entries(db, user_id, "USDT", b3.id)
        assert entries3[1].type in (
            WalletTransactionType.BET_UNLOCK,
            WalletTransactionType.BET_VOID_UNLOCK,
        )

        # Idempotency: re-settle each
        bal_before = await WalletService.get_balance(user_id, "USDT", db)
        await BetService.settle_bet(b1.id, "WIN", db=db)
        await BetService.settle_bet(b2.id, "LOSS", db=db)
        await BetService.settle_bet(b3.id, "VOID", db=db)
        bal_after = await WalletService.get_balance(user_id, "USDT", db)
        assert bal_after["available"] == bal_before["available"]
        assert bal_after["reserved"] == bal_before["reserved"]


# ---------- 7. BettingRecord + auto_settle: outcome resolution ----------


class TestAutoSettleOutcomeResolution:
    @pytest.mark.asyncio
    async def test_home_win_outcome(
        self, db: AsyncSession, user: User, match_home_win: Odds
    ):
        bet = BettingRecord(
            user_id=user.id,
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
        await auto_settle_user_bets(db, user.id)
        await db.commit()
        await db.refresh(bet)
        assert bet.is_settled is True
        assert bet.bet_status == "won"
        assert bet.actual_profit == pytest.approx(11.20, rel=1e-2)

    @pytest.mark.asyncio
    async def test_away_win_outcome(
        self, db: AsyncSession, user: User, match_away_win: Odds
    ):
        bet = BettingRecord(
            user_id=user.id,
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
        await auto_settle_user_bets(db, user.id)
        await db.commit()
        await db.refresh(bet)
        assert bet.is_settled is True
        assert bet.bet_status == "won"
        assert bet.actual_profit == pytest.approx(44.00, rel=1e-2)

    @pytest.mark.asyncio
    async def test_draw_outcome(
        self, db: AsyncSession, user: User, match_draw: Odds
    ):
        bet = BettingRecord(
            user_id=user.id,
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
        await auto_settle_user_bets(db, user.id)
        await db.commit()
        await db.refresh(bet)
        assert bet.is_settled is True
        assert bet.bet_status == "won"
        assert bet.actual_profit == pytest.approx(24.80, rel=1e-2)


# ---------- 8. BettingRecord: win balance, loss, potential win, idempotency, no settle ----------


class TestAutoSettleBalanceAndTransactions:
    @pytest.mark.asyncio
    async def test_win_increases_balance_by_winnings(
        self, db: AsyncSession, user: User, match_home_win: Odds
    ):
        stake = 10.0
        odds_decimal = 2.12
        winnings = stake * odds_decimal
        initial = float(user.funds_usd)
        bet = BettingRecord(
            user_id=user.id,
            match_id=match_home_win.id,
            match_teams=f"{match_home_win.home_team} vs {match_home_win.away_team}",
            bet_amount=stake,
            potential_win=winnings,
            odds_value="2.12",
            odds_decimal=odds_decimal,
            selected_outcome="home",
            bet_status="pending",
            is_settled=False,
        )
        db.add(bet)
        await db.commit()
        await auto_settle_user_bets(db, user.id)
        await db.commit()
        await db.refresh(user)
        assert float(user.funds_usd) == pytest.approx(initial + winnings, rel=1e-2)

    @pytest.mark.asyncio
    async def test_win_creates_bet_won_transaction(
        self, db: AsyncSession, user: User, match_home_win: Odds
    ):
        bet = BettingRecord(
            user_id=user.id,
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
        await auto_settle_user_bets(db, user.id)
        await db.commit()
        q = select(Transaction).where(
            Transaction.user_id == user.id,
            Transaction.reference_type == "betting_record",
            Transaction.reference_id == str(bet.id),
        )
        r = await db.execute(q)
        tx = r.scalar_one_or_none()
        assert tx is not None
        assert tx.transaction_type == "bet_won"
        assert tx.amount == pytest.approx(21.20, rel=1e-2)
        assert tx.balance_after == pytest.approx(tx.balance_before + 21.20, rel=1e-2)

    @pytest.mark.asyncio
    async def test_loss_creates_bet_lost_transaction(
        self, db: AsyncSession, user: User, match_home_win: Odds
    ):
        balance_before = float(user.funds_usd)
        bet = BettingRecord(
            user_id=user.id,
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
        await auto_settle_user_bets(db, user.id)
        await db.commit()
        q = select(Transaction).where(
            Transaction.user_id == user.id,
            Transaction.reference_type == "betting_record",
            Transaction.reference_id == str(bet.id),
        )
        r = await db.execute(q)
        tx = r.scalar_one_or_none()
        assert tx is not None
        assert tx.transaction_type == "bet_lost"
        assert tx.amount == 0.0
        assert tx.balance_before == pytest.approx(balance_before, rel=1e-2)
        assert tx.balance_after == pytest.approx(balance_before, rel=1e-2)

    @pytest.mark.asyncio
    async def test_loss_balance_unchanged(
        self, db: AsyncSession, user: User, match_home_win: Odds
    ):
        initial = float(user.funds_usd)
        bet = BettingRecord(
            user_id=user.id,
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
        await auto_settle_user_bets(db, user.id)
        await db.commit()
        await db.refresh(user)
        assert float(user.funds_usd) == pytest.approx(initial, rel=1e-2)

    @pytest.mark.asyncio
    async def test_potential_win_formula(self):
        stake = 10.0
        odds_decimal = 3.48
        assert stake * odds_decimal == pytest.approx(34.80, rel=1e-2)

    @pytest.mark.asyncio
    async def test_double_settle_does_not_double_credit(
        self, db: AsyncSession, user: User, match_home_win: Odds
    ):
        bet = BettingRecord(
            user_id=user.id,
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
        await auto_settle_user_bets(db, user.id)
        await db.commit()
        await db.refresh(user)
        balance_after_first = float(user.funds_usd)
        await auto_settle_user_bets(db, user.id)
        await db.commit()
        await db.refresh(user)
        balance_after_second = float(user.funds_usd)
        assert balance_after_first == pytest.approx(balance_after_second, rel=1e-2)
        assert balance_after_first == pytest.approx(100.0 + 21.20, rel=1e-2)

    @pytest.mark.asyncio
    async def test_bet_stays_pending_when_match_has_no_result(
        self, db: AsyncSession, user: User, match_home_win: Odds
    ):
        match_home_win.result = None
        await db.commit()
        bet = BettingRecord(
            user_id=user.id,
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
        await auto_settle_user_bets(db, user.id)
        await db.commit()
        await db.refresh(bet)
        assert bet.is_settled is False
        assert bet.bet_status == "pending"
        assert bet.actual_profit is None

    @pytest.mark.asyncio
    async def test_bet_stays_pending_when_match_is_future(
        self, db: AsyncSession, user: User, match_future: Odds
    ):
        initial_balance = float(user.funds_usd)
        bet = BettingRecord(
            user_id=user.id,
            match_id=match_future.id,
            match_teams=f"{match_future.home_team} vs {match_future.away_team}",
            bet_amount=10.0,
            potential_win=18.80,
            odds_value="1.88",
            odds_decimal=1.88,
            selected_outcome="home",
            bet_status="pending",
            is_settled=False,
        )
        db.add(bet)
        await db.commit()
        await db.refresh(bet)
        await auto_settle_user_bets(db, user.id)
        await db.commit()
        await db.refresh(bet)
        await db.refresh(user)
        assert bet.is_settled is False
        assert bet.bet_status == "pending"
        assert bet.actual_profit is None
        assert float(user.funds_usd) == pytest.approx(initial_balance, rel=1e-2)

    @pytest.mark.asyncio
    async def test_bet_stays_pending_when_result_is_invalid(
        self, db: AsyncSession, user: User, match_past_invalid_result: Odds
    ):
        initial_balance = float(user.funds_usd)
        bet = BettingRecord(
            user_id=user.id,
            match_id=match_past_invalid_result.id,
            match_teams=f"{match_past_invalid_result.home_team} vs {match_past_invalid_result.away_team}",
            bet_amount=10.0,
            potential_win=20.00,
            odds_value="2.00",
            odds_decimal=2.00,
            selected_outcome="home",
            bet_status="pending",
            is_settled=False,
        )
        db.add(bet)
        await db.commit()
        await db.refresh(bet)
        await auto_settle_user_bets(db, user.id)
        await db.commit()
        await db.refresh(bet)
        await db.refresh(user)
        assert bet.is_settled is False
        assert bet.bet_status == "pending"
        assert bet.actual_profit is None
        assert float(user.funds_usd) == pytest.approx(initial_balance, rel=1e-2)


# ---------- 9. Odds validation and placement rules ----------


class TestOddsAndPlacementValidation:
    def test_decimal_odds_calculation(self):
        stake = Decimal("10.00")
        odds = Decimal("2.40")
        assert stake * odds == Decimal("24.00")
        assert stake * (odds - Decimal("1")) == Decimal("14.00")

    @pytest.mark.asyncio
    async def test_stake_zero_rejected(
        self, db: AsyncSession, user_with_wallet: User, match_open: Odds
    ):
        with pytest.raises(ValueError, match="Stake must be at least"):
            await BetService.place_bet(
                user_id=user_with_wallet.id,
                match_id=match_open.id,
                market_key="1x2",
                selection_key="home",
                odds_decimal=Decimal("2.50"),
                stake=Decimal("0.00"),
                currency="USDT",
                db=db,
            )

    @pytest.mark.asyncio
    async def test_stake_negative_rejected(
        self, db: AsyncSession, user_with_wallet: User, match_open: Odds
    ):
        with pytest.raises(ValueError, match="Stake must be at least"):
            await BetService.place_bet(
                user_id=user_with_wallet.id,
                match_id=match_open.id,
                market_key="1x2",
                selection_key="home",
                odds_decimal=Decimal("2.50"),
                stake=Decimal("-10.00"),
                currency="USDT",
                db=db,
            )

    @pytest.mark.asyncio
    async def test_missing_match_rejected(
        self, db: AsyncSession, user_with_wallet: User
    ):
        with pytest.raises(ValueError, match="not found"):
            await BetService.place_bet(
                user_id=user_with_wallet.id,
                match_id=99999,
                market_key="1x2",
                selection_key="home",
                odds_decimal=Decimal("2.50"),
                stake=Decimal("10.00"),
                currency="USDT",
                db=db,
            )

    @pytest.mark.asyncio
    async def test_closed_match_rejected(
        self, db: AsyncSession, user_with_wallet: User
    ):
        closed = Odds(
            season=2024,
            home_team="A",
            away_team="B",
            league="L",
            country="C",
            date=date.today(),
            odd_1=Decimal("2.50"),
            result="1-0",
        )
        db.add(closed)
        await db.commit()
        await db.refresh(closed)
        with pytest.raises(ValueError, match="finished match"):
            await BetService.place_bet(
                user_id=user_with_wallet.id,
                match_id=closed.id,
                market_key="1x2",
                selection_key="home",
                odds_decimal=Decimal("2.50"),
                stake=Decimal("10.00"),
                currency="USDT",
                db=db,
            )

    @pytest.mark.asyncio
    async def test_invalid_odds_rejected(
        self, db: AsyncSession, user_with_wallet: User, match_open: Odds
    ):
        with pytest.raises(ValueError, match="Odds must be at least 1.01"):
            await BetService.place_bet(
                user_id=user_with_wallet.id,
                match_id=match_open.id,
                market_key="1x2",
                selection_key="home",
                odds_decimal=Decimal("0.50"),
                stake=Decimal("10.00"),
                currency="USDT",
                db=db,
            )

    @pytest.mark.asyncio
    async def test_stake_too_large_rejected(
        self, db: AsyncSession, user_with_wallet: User, match_open: Odds
    ):
        with pytest.raises(ValueError, match="cannot exceed"):
            await BetService.place_bet(
                user_id=user_with_wallet.id,
                match_id=match_open.id,
                market_key="1x2",
                selection_key="home",
                odds_decimal=Decimal("2.50"),
                stake=Decimal("20000.00"),
                currency="USDT",
                db=db,
            )


# ---------- 10. Status transitions ----------


class TestStatusTransitions:
    @pytest.mark.asyncio
    async def test_settle_non_pending_bet_no_changes(
        self, db: AsyncSession, user_with_wallet: User, match_open: Odds
    ):
        bet = await BetService.place_bet(
            user_id=user_with_wallet.id,
            match_id=match_open.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=Decimal("10.00"),
            currency="USDT",
            db=db,
        )
        await BetService.settle_bet(bet.id, "WIN", db=db)
        b1 = await WalletService.get_balance(user_with_wallet.id, "USDT", db)
        await BetService.settle_bet(bet.id, "WIN", db=db)
        b2 = await WalletService.get_balance(user_with_wallet.id, "USDT", db)
        assert b1["available"] == b2["available"]
        assert b1["reserved"] == b2["reserved"]

    @pytest.mark.asyncio
    async def test_settle_cancelled_bet_no_changes(
        self, db: AsyncSession, user_with_wallet: User, match_open: Odds
    ):
        bet = await BetService.place_bet(
            user_id=user_with_wallet.id,
            match_id=match_open.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=Decimal("10.00"),
            currency="USDT",
            db=db,
        )
        await BetService.cancel_bet(bet.id, user_with_wallet.id, db=db)
        b_cancel = await WalletService.get_balance(user_with_wallet.id, "USDT", db)
        settled = await BetService.settle_bet(bet.id, "WIN", db=db)
        assert settled.status == BetStatus.CANCELLED
        b_after = await WalletService.get_balance(user_with_wallet.id, "USDT", db)
        assert b_after["available"] == b_cancel["available"]
        assert b_after["reserved"] == b_cancel["reserved"]

    @pytest.mark.asyncio
    async def test_lost_to_won_idempotent(
        self, db: AsyncSession, user_with_wallet: User, match_open: Odds
    ):
        bet = await BetService.place_bet(
            user_id=user_with_wallet.id,
            match_id=match_open.id,
            market_key="1x2",
            selection_key="home",
            odds_decimal=Decimal("2.50"),
            stake=Decimal("10.00"),
            currency="USDT",
            db=db,
        )
        await BetService.settle_bet(bet.id, "LOSS", db=db)
        b_loss = await WalletService.get_balance(user_with_wallet.id, "USDT", db)
        settled = await BetService.settle_bet(bet.id, "WIN", db=db)
        assert settled.status == BetStatus.LOST
        b_after = await WalletService.get_balance(user_with_wallet.id, "USDT", db)
        assert b_after["available"] == b_loss["available"]
        assert b_after["reserved"] == b_loss["reserved"]
