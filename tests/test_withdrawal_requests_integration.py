"""
Week 8 - Integration tests (DB + wallet + withdrawal flows)

Focus:
- Money-safe balance invariants across flows
- Ledger types match reserve movements
- Idempotency safety on cancel/reject/approve
- Concurrency-ish scenarios (best-effort under SQLite)
"""

import asyncio
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
from app.schemas.withdrawal import WithdrawalIntentCreate, WithdrawalAdminApproveRequest, WithdrawalAdminRejectRequest
from app.routers.withdrawals import (
    initiate_withdrawal,
    cancel_withdrawal,
    admin_approve_withdrawal,
    admin_reject_withdrawal,
)


TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
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
    u = User(email="user@example.com", username="user", hashed_password="x", is_active=True, is_superuser=False)
    test_db.add(u)
    await test_db.commit()
    await test_db.refresh(u)
    return u


@pytest_asyncio.fixture
async def admin(test_db: AsyncSession) -> User:
    u = User(email="admin@example.com", username="admin", hashed_password="x", is_active=True, is_superuser=True)
    test_db.add(u)
    await test_db.commit()
    await test_db.refresh(u)
    return u


async def seed_balance(db: AsyncSession, user_id: int, available: Decimal):
    bal = UserCryptoBalance(user_id=user_id, asset="USDT", balance=available, locked_balance=Decimal("0"))
    db.add(bal)
    await db.commit()
    return bal


async def get_bal(db: AsyncSession, user_id: int) -> dict:
    return await WalletService.get_balance(user_id=user_id, asset="USDT", db=db)


async def ledger_types_for_withdrawal(db: AsyncSession, withdrawal_id: int):
    stmt = select(WalletTransaction.type).where(
        WalletTransaction.reference_type == ReferenceType.WITHDRAWAL,
        WalletTransaction.reference_id == withdrawal_id,
    ).order_by(WalletTransaction.id.asc())
    res = await db.execute(stmt)
    return [r[0] for r in res.all()]


def assert_money_invariants(bal: dict):
    assert bal["available"] >= 0
    assert bal["reserved"] >= 0
    assert bal["total"] == bal["available"] + bal["reserved"]


@pytest.mark.asyncio
async def test_initiate_then_approve_keeps_funds_locked(test_db: AsyncSession, user: User, admin: User):
    await seed_balance(test_db, user.id, Decimal("100.00"))
    before = await get_bal(test_db, user.id)

    w = await initiate_withdrawal(
        WithdrawalIntentCreate(
            asset="USDT",
            network="TRC20",
            amount_crypto=Decimal("20.00"),
            to_address=VALID_TRC20_ADDRESS,
            client_request_id="flow-approve",
        ),
        db=test_db,
        current_user=user,
    )

    after_initiate = await get_bal(test_db, user.id)
    assert_money_invariants(after_initiate)
    assert after_initiate["available"] == Decimal("80.00")
    assert after_initiate["reserved"] == Decimal("20.00")
    assert after_initiate["total"] == before["total"]

    out = await admin_approve_withdrawal(w.id, WithdrawalAdminApproveRequest(admin_notes="ok"), db=test_db, admin_user=admin)
    assert out["status"] == "approved"

    after_approve = await get_bal(test_db, user.id)
    assert_money_invariants(after_approve)
    assert after_approve == after_initiate  # still locked
    assert await ledger_types_for_withdrawal(test_db, w.id) == [WalletTransactionType.WITHDRAWAL_LOCK]


@pytest.mark.asyncio
async def test_initiate_then_reject_unlocks_funds_and_writes_unlock_ledger(test_db: AsyncSession, user: User, admin: User):
    await seed_balance(test_db, user.id, Decimal("100.00"))
    w = await initiate_withdrawal(
        WithdrawalIntentCreate(
            asset="USDT",
            network="TRC20",
            amount_crypto=Decimal("20.00"),
            to_address=VALID_TRC20_ADDRESS,
            client_request_id="flow-reject",
        ),
        db=test_db,
        current_user=user,
    )
    after_initiate = await get_bal(test_db, user.id)
    assert after_initiate["available"] == Decimal("80.00")
    assert after_initiate["reserved"] == Decimal("20.00")

    out = await admin_reject_withdrawal(
        w.id,
        WithdrawalAdminRejectRequest(rejection_reason="bad"),
        db=test_db,
        admin_user=admin,
    )
    assert out["status"] == "rejected"
    after_reject = await get_bal(test_db, user.id)
    assert after_reject["available"] == Decimal("100.00")
    assert after_reject["reserved"] == Decimal("0")
    assert await ledger_types_for_withdrawal(test_db, w.id) == [
        WalletTransactionType.WITHDRAWAL_LOCK,
        WalletTransactionType.WITHDRAWAL_UNLOCK,
    ]


@pytest.mark.asyncio
async def test_user_cancel_flow_unlocks_and_is_idempotent(test_db: AsyncSession, user: User):
    await seed_balance(test_db, user.id, Decimal("100.00"))
    w = await initiate_withdrawal(
        WithdrawalIntentCreate(
            asset="USDT",
            network="TRC20",
            amount_crypto=Decimal("20.00"),
            to_address=VALID_TRC20_ADDRESS,
            client_request_id="flow-cancel",
        ),
        db=test_db,
        current_user=user,
    )
    out1 = await cancel_withdrawal(w.id, db=test_db, current_user=user)
    assert "cancelled" in out1["message"].lower()
    bal1 = await get_bal(test_db, user.id)
    assert bal1["available"] == Decimal("100.00")
    assert bal1["reserved"] == Decimal("0")

    out2 = await cancel_withdrawal(w.id, db=test_db, current_user=user)
    assert "already" in out2["message"].lower()
    bal2 = await get_bal(test_db, user.id)
    assert bal2 == bal1

    assert await ledger_types_for_withdrawal(test_db, w.id) == [
        WalletTransactionType.WITHDRAWAL_LOCK,
        WalletTransactionType.WITHDRAWAL_UNLOCK,
    ]


@pytest.mark.asyncio
async def test_concurrent_initiations_two_requests_one_fails_insufficient(test_db: AsyncSession, user: User):
    await seed_balance(test_db, user.id, Decimal("30.00"))

    p1 = WithdrawalIntentCreate(
        asset="USDT",
        network="TRC20",
        amount_crypto=Decimal("20.00"),
        to_address=VALID_TRC20_ADDRESS,
        client_request_id="con-1",
    )
    p2 = WithdrawalIntentCreate(
        asset="USDT",
        network="TRC20",
        amount_crypto=Decimal("20.00"),
        to_address=VALID_TRC20_ADDRESS,
        client_request_id="con-2",
    )

    # Note: SQLite in-memory + single session isn't a perfect concurrency simulator.
    # This still verifies the core safety invariant: we cannot lock more than available.
    first = await initiate_withdrawal(p1, db=test_db, current_user=user)
    with pytest.raises(Exception):
        await initiate_withdrawal(p2, db=test_db, current_user=user)

    bal = await get_bal(test_db, user.id)
    assert_money_invariants(bal)
    assert bal["available"] in (Decimal("10.00"), Decimal("10"))  # one lock applied
    assert bal["reserved"] in (Decimal("20.00"), Decimal("20"))


@pytest.mark.asyncio
async def test_concurrent_admin_actions_only_one_final_state(test_db: AsyncSession, user: User, admin: User):
    await seed_balance(test_db, user.id, Decimal("100.00"))
    w = await initiate_withdrawal(
        WithdrawalIntentCreate(
            asset="USDT",
            network="TRC20",
            amount_crypto=Decimal("20.00"),
            to_address=VALID_TRC20_ADDRESS,
            client_request_id="con-admin",
        ),
        db=test_db,
        current_user=user,
    )

    async def do_approve():
        return await admin_approve_withdrawal(w.id, WithdrawalAdminApproveRequest(), db=test_db, admin_user=admin)

    async def do_reject():
        return await admin_reject_withdrawal(w.id, WithdrawalAdminRejectRequest(rejection_reason="no"), db=test_db, admin_user=admin)

    res = await asyncio.gather(do_approve(), do_reject(), return_exceptions=True)

    stmt = select(WithdrawalIntent).where(WithdrawalIntent.id == w.id)
    withdrawal = (await test_db.execute(stmt)).scalar_one()
    assert withdrawal.status in ("approved", "rejected")

    bal = await get_bal(test_db, user.id)
    assert_money_invariants(bal)
    if withdrawal.status == "approved":
        assert bal["reserved"] == Decimal("20.00")
        assert bal["available"] == Decimal("80.00")
    else:
        assert bal["reserved"] == Decimal("0")
        assert bal["available"] == Decimal("100.00")

