"""
Week 8 - Unit tests (Withdrawal Request System)

Focus:
- WalletService lock/unlock correctness + ledger snapshots
- AddressValidator TRC20 validation
- LimitsService withdrawal limits
- Withdrawal router "service behavior" via direct function calls (no HTTP stack)
"""

from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select, func

from app.models import Base
from app.models.user import User
from app.models.deposit import UserCryptoBalance, WithdrawalIntent
from app.models.wallet_transaction import WalletTransaction, WalletTransactionType, ReferenceType
from app.services.wallet_service import WalletService
from app.services.address_validator import AddressValidator
from app.services.limits_service import LimitsService
from app.routers.withdrawals import (
    initiate_withdrawal,
    cancel_withdrawal,
    admin_approve_withdrawal,
    admin_reject_withdrawal,
)
from app.schemas.withdrawal import WithdrawalIntentCreate, WithdrawalAdminRejectRequest, WithdrawalAdminApproveRequest


TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# Common valid TRC20 address (matches regex in AddressValidator)
VALID_TRC20_ADDRESS = "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb"


@pytest_asyncio.fixture
async def test_db() -> AsyncSession:
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False)
    async with async_session() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def user(test_db: AsyncSession) -> User:
    u = User(
        email="user@example.com",
        username="user",
        hashed_password="hashed",
        is_active=True,
        is_superuser=False,
    )
    test_db.add(u)
    await test_db.commit()
    await test_db.refresh(u)
    return u


@pytest_asyncio.fixture
async def admin(test_db: AsyncSession) -> User:
    u = User(
        email="admin@example.com",
        username="admin",
        hashed_password="hashed",
        is_active=True,
        is_superuser=True,
    )
    test_db.add(u)
    await test_db.commit()
    await test_db.refresh(u)
    return u


async def seed_balance(db: AsyncSession, user_id: int, available: Decimal, reserved: Decimal = Decimal("0")):
    bal = UserCryptoBalance(
        user_id=user_id,
        asset="USDT",
        balance=available,
        locked_balance=reserved,
    )
    db.add(bal)
    await db.commit()
    return bal


async def get_bal(db: AsyncSession, user_id: int) -> dict:
    return await WalletService.get_balance(user_id=user_id, asset="USDT", db=db)


async def ledger_count(db: AsyncSession, user_id: int) -> int:
    stmt = select(func.count(WalletTransaction.id)).where(WalletTransaction.user_id == user_id)
    res = await db.execute(stmt)
    return int(res.scalar() or 0)


def assert_money_invariants(bal: dict):
    assert bal["available"] >= 0
    assert bal["reserved"] >= 0
    assert bal["total"] == bal["available"] + bal["reserved"]


@pytest.mark.asyncio
async def test_wallet_lock_balance_moves_available_to_reserved_and_writes_ledger(test_db: AsyncSession, user: User):
    await seed_balance(test_db, user.id, available=Decimal("100.00"))
    before = await get_bal(test_db, user.id)

    entry = await WalletService.lock_balance(
        user_id=user.id,
        asset="USDT",
        amount=Decimal("10.00"),
        db=test_db,
        reference_type=ReferenceType.WITHDRAWAL,
        reference_id=123,
        description="lock test",
    )

    after = await get_bal(test_db, user.id)
    assert_money_invariants(after)

    assert after["available"] == before["available"] - Decimal("10.00")
    assert after["reserved"] == before["reserved"] + Decimal("10.00")
    assert after["total"] == before["total"]

    assert entry.type == WalletTransactionType.WITHDRAWAL_LOCK
    assert entry.reference_type == ReferenceType.WITHDRAWAL
    assert entry.reference_id == 123
    assert Decimal(str(entry.balance_before)) == before["available"]
    assert Decimal(str(entry.balance_after)) == after["available"]
    assert Decimal(str(entry.reserved_before)) == before["reserved"]
    assert Decimal(str(entry.reserved_after)) == after["reserved"]


@pytest.mark.asyncio
async def test_wallet_lock_balance_fails_if_insufficient_available(test_db: AsyncSession, user: User):
    await seed_balance(test_db, user.id, available=Decimal("5.00"))
    before = await get_bal(test_db, user.id)

    with pytest.raises(ValueError, match="Insufficient available balance"):
        await WalletService.lock_balance(
            user_id=user.id,
            asset="USDT",
            amount=Decimal("10.00"),
            db=test_db,
            reference_type=ReferenceType.WITHDRAWAL,
            reference_id=1,
        )

    after = await get_bal(test_db, user.id)
    assert after == before


@pytest.mark.asyncio
async def test_wallet_lock_balance_fails_if_amount_non_positive(test_db: AsyncSession, user: User):
    await seed_balance(test_db, user.id, available=Decimal("10.00"))
    with pytest.raises(ValueError, match="Lock amount must be positive"):
        await WalletService.lock_balance(
            user_id=user.id,
            asset="USDT",
            amount=Decimal("0"),
            db=test_db,
            reference_type=ReferenceType.WITHDRAWAL,
            reference_id=1,
        )


@pytest.mark.asyncio
async def test_wallet_unlock_balance_moves_reserved_to_available_and_writes_ledger(test_db: AsyncSession, user: User):
    await seed_balance(test_db, user.id, available=Decimal("90.00"), reserved=Decimal("10.00"))
    before = await get_bal(test_db, user.id)

    entry = await WalletService.unlock_balance(
        user_id=user.id,
        asset="USDT",
        amount=Decimal("10.00"),
        db=test_db,
        reference_type=ReferenceType.WITHDRAWAL,
        reference_id=456,
        description="unlock test",
    )

    after = await get_bal(test_db, user.id)
    assert_money_invariants(after)
    assert after["available"] == before["available"] + Decimal("10.00")
    assert after["reserved"] == before["reserved"] - Decimal("10.00")
    assert after["total"] == before["total"]

    assert entry.type == WalletTransactionType.WITHDRAWAL_UNLOCK
    assert entry.reference_type == ReferenceType.WITHDRAWAL
    assert entry.reference_id == 456


@pytest.mark.asyncio
async def test_wallet_unlock_balance_fails_if_insufficient_reserved(test_db: AsyncSession, user: User):
    await seed_balance(test_db, user.id, available=Decimal("100.00"), reserved=Decimal("0.00"))
    with pytest.raises(ValueError, match="Insufficient reserved balance"):
        await WalletService.unlock_balance(
            user_id=user.id,
            asset="USDT",
            amount=Decimal("1.00"),
            db=test_db,
            reference_type=ReferenceType.WITHDRAWAL,
            reference_id=1,
        )


@pytest.mark.asyncio
async def test_wallet_concurrent_locks_cannot_exceed_available_simulated(test_db: AsyncSession, user: User):
    await seed_balance(test_db, user.id, available=Decimal("30.00"))
    # Simulated "concurrency": second lock sees flushed state from first lock in same session.
    await WalletService.lock_balance(user.id, "USDT", Decimal("20.00"), test_db, ReferenceType.WITHDRAWAL, 1)
    with pytest.raises(ValueError, match="Insufficient available balance"):
        await WalletService.lock_balance(user.id, "USDT", Decimal("20.00"), test_db, ReferenceType.WITHDRAWAL, 2)


def test_address_validator_trc20_valid_and_invalid():
    ok, err = AddressValidator.validate(VALID_TRC20_ADDRESS, "TRC20")
    assert ok is True
    assert err is None

    ok2, err2 = AddressValidator.validate("not-a-tron-address", "TRC20")
    assert ok2 is False
    assert "Invalid TRC20 address format" in (err2 or "")


def test_address_validator_normalizes_whitespace():
    ok, err = AddressValidator.validate(f"  {VALID_TRC20_ADDRESS}  ", "TRC20")
    assert ok is True
    assert err is None
    assert AddressValidator.normalize_address(f" {VALID_TRC20_ADDRESS}\n", "TRC20") == VALID_TRC20_ADDRESS


@pytest.mark.asyncio
async def test_limits_service_withdrawal_daily_limit_pass_and_fail(test_db: AsyncSession, user: User):
    # Ensure daily limits row exists
    from datetime import date as _date
    limits = await LimitsService.get_or_create_daily_limits(user.id, _date.today(), test_db)
    # Within daily limit
    res_ok = await LimitsService.check_withdrawal_limits(user.id, Decimal("100.00"), test_db)
    assert res_ok["allowed"] is True

    # Force near cap then exceed (must also satisfy MIN_WITHDRAWAL_USD)
    limits.withdrawals_amount_usd = LimitsService.MAX_WITHDRAWAL_DAILY_USD - Decimal("50.00")
    await test_db.commit()

    res_fail = await LimitsService.check_withdrawal_limits(user.id, Decimal("60.00"), test_db)
    assert res_fail["allowed"] is False
    assert "Daily withdrawal limit exceeded" in res_fail["reason"]

    # Edge: exactly equals remaining should pass
    res_edge = await LimitsService.check_withdrawal_limits(user.id, Decimal("50.00"), test_db)
    assert res_edge["allowed"] is True


@pytest.mark.asyncio
async def test_initiate_withdrawal_creates_intent_and_locks_funds(test_db: AsyncSession, user: User):
    await seed_balance(test_db, user.id, available=Decimal("100.00"))
    before = await get_bal(test_db, user.id)
    before_ledger = await ledger_count(test_db, user.id)

    payload = WithdrawalIntentCreate(
        asset="USDT",
        network="TRC20",
        amount_crypto=Decimal("20.00"),
        to_address=VALID_TRC20_ADDRESS,
        client_request_id="req-1",
    )

    resp = await initiate_withdrawal(payload, db=test_db, current_user=user)
    assert resp.status == "pending"
    assert resp.network == "TRC20"
    assert resp.asset == "USDT"
    assert resp.amount_crypto == Decimal("20.00")

    after = await get_bal(test_db, user.id)
    after_ledger = await ledger_count(test_db, user.id)
    assert_money_invariants(after)
    assert after["available"] == before["available"] - Decimal("20.00")
    assert after["reserved"] == before["reserved"] + Decimal("20.00")
    assert after["total"] == before["total"]
    assert after_ledger == before_ledger + 1

    stmt = select(WithdrawalIntent).where(WithdrawalIntent.user_id == user.id)
    w = (await test_db.execute(stmt)).scalars().first()
    assert w is not None
    assert w.status == "pending"

    tx_stmt = select(WalletTransaction).where(
        WalletTransaction.user_id == user.id,
        WalletTransaction.reference_type == ReferenceType.WITHDRAWAL,
        WalletTransaction.reference_id == w.id,
    ).order_by(WalletTransaction.id.desc())
    tx = (await test_db.execute(tx_stmt)).scalars().first()
    assert tx is not None
    assert tx.type == WalletTransactionType.WITHDRAWAL_LOCK


@pytest.mark.asyncio
async def test_initiate_is_idempotent_with_same_client_request_id(test_db: AsyncSession, user: User):
    await seed_balance(test_db, user.id, available=Decimal("100.00"))
    payload = WithdrawalIntentCreate(
        asset="USDT",
        network="TRC20",
        amount_crypto=Decimal("20.00"),
        to_address=VALID_TRC20_ADDRESS,
        client_request_id="req-dup",
    )

    before = await get_bal(test_db, user.id)
    before_ledger = await ledger_count(test_db, user.id)

    r1 = await initiate_withdrawal(payload, db=test_db, current_user=user)
    r2 = await initiate_withdrawal(payload, db=test_db, current_user=user)
    assert r1.id == r2.id

    after = await get_bal(test_db, user.id)
    after_ledger = await ledger_count(test_db, user.id)
    assert after["available"] == before["available"] - Decimal("20.00")
    assert after["reserved"] == before["reserved"] + Decimal("20.00")
    assert after_ledger == before_ledger + 1


@pytest.mark.asyncio
async def test_cancel_pending_unlocks_and_is_idempotent(test_db: AsyncSession, user: User):
    await seed_balance(test_db, user.id, available=Decimal("100.00"))
    payload = WithdrawalIntentCreate(
        asset="USDT",
        network="TRC20",
        amount_crypto=Decimal("20.00"),
        to_address=VALID_TRC20_ADDRESS,
        client_request_id="req-cancel",
    )
    resp = await initiate_withdrawal(payload, db=test_db, current_user=user)
    before_cancel = await get_bal(test_db, user.id)
    before_ledger = await ledger_count(test_db, user.id)

    # first cancel
    r1 = await cancel_withdrawal(resp.id, db=test_db, current_user=user)
    assert "cancelled" in r1["message"].lower()

    after1 = await get_bal(test_db, user.id)
    after1_ledger = await ledger_count(test_db, user.id)
    assert after1["available"] == Decimal("100.00")
    assert after1["reserved"] == Decimal("0")
    assert after1["total"] == Decimal("100.00")
    assert after1_ledger == before_ledger + 1

    # second cancel (idempotent)
    r2 = await cancel_withdrawal(resp.id, db=test_db, current_user=user)
    assert "already" in r2["message"].lower()
    after2 = await get_bal(test_db, user.id)
    after2_ledger = await ledger_count(test_db, user.id)
    assert after2 == after1
    assert after2_ledger == after1_ledger


@pytest.mark.asyncio
async def test_admin_approve_pending_sets_approved_keeps_reserved(test_db: AsyncSession, user: User, admin: User):
    await seed_balance(test_db, user.id, available=Decimal("100.00"))
    payload = WithdrawalIntentCreate(
        asset="USDT",
        network="TRC20",
        amount_crypto=Decimal("20.00"),
        to_address=VALID_TRC20_ADDRESS,
        client_request_id="req-approve",
    )
    resp = await initiate_withdrawal(payload, db=test_db, current_user=user)
    bal_before = await get_bal(test_db, user.id)
    ledger_before = await ledger_count(test_db, user.id)

    out = await admin_approve_withdrawal(
        resp.id,
        WithdrawalAdminApproveRequest(admin_notes="ok"),
        db=test_db,
        admin_user=admin,
    )
    assert out["status"] == "approved"
    bal_after = await get_bal(test_db, user.id)
    ledger_after = await ledger_count(test_db, user.id)
    assert bal_after == bal_before
    assert ledger_after == ledger_before  # no unlock / extra ledger in Week 8 approve


@pytest.mark.asyncio
async def test_admin_approve_is_idempotent(test_db: AsyncSession, user: User, admin: User):
    await seed_balance(test_db, user.id, available=Decimal("100.00"))
    payload = WithdrawalIntentCreate(
        asset="USDT",
        network="TRC20",
        amount_crypto=Decimal("20.00"),
        to_address=VALID_TRC20_ADDRESS,
        client_request_id="req-approve-dup",
    )
    resp = await initiate_withdrawal(payload, db=test_db, current_user=user)
    out1 = await admin_approve_withdrawal(resp.id, WithdrawalAdminApproveRequest(), db=test_db, admin_user=admin)
    out2 = await admin_approve_withdrawal(resp.id, WithdrawalAdminApproveRequest(), db=test_db, admin_user=admin)
    assert "approved" in out1["status"]
    assert "approved" in out2["status"]


@pytest.mark.asyncio
async def test_admin_reject_pending_unlocks_and_is_idempotent(test_db: AsyncSession, user: User, admin: User):
    await seed_balance(test_db, user.id, available=Decimal("100.00"))
    payload = WithdrawalIntentCreate(
        asset="USDT",
        network="TRC20",
        amount_crypto=Decimal("20.00"),
        to_address=VALID_TRC20_ADDRESS,
        client_request_id="req-reject",
    )
    resp = await initiate_withdrawal(payload, db=test_db, current_user=user)
    bal_before = await get_bal(test_db, user.id)
    ledger_before = await ledger_count(test_db, user.id)

    out1 = await admin_reject_withdrawal(
        resp.id,
        WithdrawalAdminRejectRequest(rejection_reason="nope", admin_notes="bad"),
        db=test_db,
        admin_user=admin,
    )
    assert out1["status"] == "rejected"
    bal_after1 = await get_bal(test_db, user.id)
    ledger_after1 = await ledger_count(test_db, user.id)
    assert bal_after1["available"] == Decimal("100.00")
    assert bal_after1["reserved"] == Decimal("0")
    assert ledger_after1 == ledger_before + 1  # unlock ledger

    out2 = await admin_reject_withdrawal(
        resp.id,
        WithdrawalAdminRejectRequest(rejection_reason="nope"),
        db=test_db,
        admin_user=admin,
    )
    assert out2["status"] == "rejected"
    bal_after2 = await get_bal(test_db, user.id)
    ledger_after2 = await ledger_count(test_db, user.id)
    assert bal_after2 == bal_after1
    assert ledger_after2 == ledger_after1

