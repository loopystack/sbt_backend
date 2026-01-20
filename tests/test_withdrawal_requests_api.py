"""
Withdrawal Request System - API Integration Tests
Tests withdrawal request API endpoints including authentication and validation

Covers:
- Auth enforcement (401/403)
- Ownership enforcement
- User flow: initiate -> list -> detail -> cancel (idempotent)
- Admin flow: list -> approve/reject (idempotent)
"""

from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select, func

from main import app
from app.core.database import get_db
from app.core.security import create_access_token
from app.models import Base
from app.models.user import User
from app.models.deposit import UserCryptoBalance, WithdrawalIntent
from app.models.wallet_transaction import WalletTransaction, WalletTransactionType, ReferenceType


TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
VALID_TRC20_ADDRESS = "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb"


@pytest_asyncio.fixture
async def test_db():
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
async def client(test_db):
    async def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


async def seed_user(db: AsyncSession, email: str, is_superuser: bool = False) -> User:
    u = User(
        email=email,
        username=email.split("@")[0],
        hashed_password="hashed",
        is_active=True,
        is_superuser=is_superuser,
    )
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return u


async def seed_balance(db: AsyncSession, user_id: int, available: Decimal, reserved: Decimal = Decimal("0")):
    bal = UserCryptoBalance(user_id=user_id, asset="USDT", balance=available, locked_balance=reserved)
    db.add(bal)
    await db.commit()
    return bal


async def count_ledger(db: AsyncSession, user_id: int) -> int:
    stmt = select(func.count(WalletTransaction.id)).where(WalletTransaction.user_id == user_id)
    res = await db.execute(stmt)
    return int(res.scalar() or 0)


@pytest.mark.asyncio
async def test_auth_required_for_user_endpoints(client: AsyncClient):
    r = await client.post("/api/withdrawals/initiate", json={})
    assert r.status_code in (401, 403)

    r2 = await client.get("/api/withdrawals")
    assert r2.status_code in (401, 403)

    r3 = await client.post("/api/withdrawals/1/cancel")
    assert r3.status_code in (401, 403)


@pytest.mark.asyncio
async def test_initiate_list_detail_cancel_flow(client: AsyncClient, test_db: AsyncSession):
    user = await seed_user(test_db, "user1@example.com", is_superuser=False)
    await seed_balance(test_db, user.id, available=Decimal("100.00"))
    token = create_access_token({"sub": str(user.id)})
    headers = {"Authorization": f"Bearer {token}"}

    # initiate
    payload = {
        "asset": "USDT",
        "network": "TRC20",
        "amount_crypto": "20.00",
        "to_address": VALID_TRC20_ADDRESS,
        "client_request_id": "req-api-1",
    }
    r = await client.post("/api/withdrawals/initiate", json=payload, headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "pending"
    wid = body["id"]

    # list
    r_list = await client.get("/api/withdrawals?limit=20&skip=0", headers=headers)
    assert r_list.status_code == 200
    list_body = r_list.json()
    assert list_body["total"] == 1
    assert len(list_body["withdrawals"]) == 1
    assert list_body["withdrawals"][0]["id"] == wid

    # detail
    r_detail = await client.get(f"/api/withdrawals/{wid}", headers=headers)
    assert r_detail.status_code == 200
    d = r_detail.json()
    assert d["id"] == wid
    assert d["status"] == "pending"
    assert d["to_address"] == VALID_TRC20_ADDRESS

    # cancel
    ledger_before = await count_ledger(test_db, user.id)
    r_cancel = await client.post(f"/api/withdrawals/{wid}/cancel", headers=headers)
    assert r_cancel.status_code == 200
    ledger_after = await count_ledger(test_db, user.id)
    assert ledger_after == ledger_before + 1

    # cancel twice (idempotent)
    r_cancel2 = await client.post(f"/api/withdrawals/{wid}/cancel", headers=headers)
    assert r_cancel2.status_code == 200
    ledger_after2 = await count_ledger(test_db, user.id)
    assert ledger_after2 == ledger_after


@pytest.mark.asyncio
async def test_user_cannot_access_other_users_withdrawal(client: AsyncClient, test_db: AsyncSession):
    user1 = await seed_user(test_db, "u1@example.com", is_superuser=False)
    user2 = await seed_user(test_db, "u2@example.com", is_superuser=False)
    await seed_balance(test_db, user1.id, available=Decimal("100.00"))

    token1 = create_access_token({"sub": str(user1.id)})
    headers1 = {"Authorization": f"Bearer {token1}"}
    r = await client.post(
        "/api/withdrawals/initiate",
        json={
            "asset": "USDT",
            "network": "TRC20",
            "amount_crypto": "20.00",
            "to_address": VALID_TRC20_ADDRESS,
            "client_request_id": "req-own-1",
        },
        headers=headers1,
    )
    wid = r.json()["id"]

    token2 = create_access_token({"sub": str(user2.id)})
    headers2 = {"Authorization": f"Bearer {token2}"}
    r2 = await client.get(f"/api/withdrawals/{wid}", headers=headers2)
    assert r2.status_code == 404


@pytest.mark.asyncio
async def test_admin_endpoints_require_superuser(client: AsyncClient, test_db: AsyncSession):
    user = await seed_user(test_db, "notadmin@example.com", is_superuser=False)
    token = create_access_token({"sub": str(user.id)})
    headers = {"Authorization": f"Bearer {token}"}

    r = await client.get("/api/withdrawals/admin/all?limit=10&skip=0", headers=headers)
    assert r.status_code in (400, 401, 403)


@pytest.mark.asyncio
async def test_admin_approve_keeps_reserved_and_is_idempotent(client: AsyncClient, test_db: AsyncSession):
    user = await seed_user(test_db, "user2@example.com", is_superuser=False)
    admin = await seed_user(test_db, "admin2@example.com", is_superuser=True)
    await seed_balance(test_db, user.id, available=Decimal("100.00"))

    user_token = create_access_token({"sub": str(user.id)})
    admin_token = create_access_token({"sub": str(admin.id)})
    user_headers = {"Authorization": f"Bearer {user_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    r = await client.post(
        "/api/withdrawals/initiate",
        json={
            "asset": "USDT",
            "network": "TRC20",
            "amount_crypto": "20.00",
            "to_address": VALID_TRC20_ADDRESS,
            "client_request_id": "req-admin-approve",
        },
        headers=user_headers,
    )
    wid = r.json()["id"]

    # approve
    ledger_before = await count_ledger(test_db, user.id)
    r_app = await client.post(f"/api/withdrawals/admin/{wid}/approve", json={"admin_notes": "ok"}, headers=admin_headers)
    assert r_app.status_code == 200
    ledger_after = await count_ledger(test_db, user.id)
    assert ledger_after == ledger_before  # no unlock/lock ledger on approve

    # idempotent approve
    r_app2 = await client.post(f"/api/withdrawals/admin/{wid}/approve", json={}, headers=admin_headers)
    assert r_app2.status_code == 200
    ledger_after2 = await count_ledger(test_db, user.id)
    assert ledger_after2 == ledger_after


@pytest.mark.asyncio
async def test_admin_reject_unlocks_and_is_idempotent(client: AsyncClient, test_db: AsyncSession):
    user = await seed_user(test_db, "user3@example.com", is_superuser=False)
    admin = await seed_user(test_db, "admin3@example.com", is_superuser=True)
    await seed_balance(test_db, user.id, available=Decimal("100.00"))

    user_token = create_access_token({"sub": str(user.id)})
    admin_token = create_access_token({"sub": str(admin.id)})
    user_headers = {"Authorization": f"Bearer {user_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    r = await client.post(
        "/api/withdrawals/initiate",
        json={
            "asset": "USDT",
            "network": "TRC20",
            "amount_crypto": "20.00",
            "to_address": VALID_TRC20_ADDRESS,
            "client_request_id": "req-admin-reject",
        },
        headers=user_headers,
    )
    wid = r.json()["id"]

    ledger_before = await count_ledger(test_db, user.id)
    r_rej = await client.post(
        f"/api/withdrawals/admin/{wid}/reject",
        json={"rejection_reason": "bad address", "admin_notes": "no"},
        headers=admin_headers,
    )
    assert r_rej.status_code == 200
    ledger_after = await count_ledger(test_db, user.id)
    assert ledger_after == ledger_before + 1

    # idempotent reject
    r_rej2 = await client.post(
        f"/api/withdrawals/admin/{wid}/reject",
        json={"rejection_reason": "bad address"},
        headers=admin_headers,
    )
    assert r_rej2.status_code == 200
    ledger_after2 = await count_ledger(test_db, user.id)
    assert ledger_after2 == ledger_after

