"""
Integration test for full crypto withdrawal flow.
Single end-to-end test: initiate -> approve -> execute (mock send) -> monitor (mock tx info) -> completed.
Verifies balance invariants and ledger entries (WITHDRAWAL_LOCK, WITHDRAWAL_DEBIT).
"""
from decimal import Decimal
from unittest.mock import MagicMock, patch, AsyncMock

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.models import Base
from app.models.deposit import UserCryptoBalance, WithdrawalIntent
from app.models.user import User
from app.models.wallet_transaction import WalletTransaction, WalletTransactionType, ReferenceType
from app.routers.withdrawals import (
    initiate_withdrawal,
    admin_approve_withdrawal,
)
from app.schemas.withdrawal import WithdrawalIntentCreate, WithdrawalAdminApproveRequest
from app.services.wallet_service import WalletService
from app.services.withdrawal_execution_service import WithdrawalExecutionService
from app.workers.withdrawal_monitor import WithdrawalMonitorWorker


def _make_request():
    """Minimal Request for calling router directly in tests."""
    req = MagicMock()
    req.url.path = "/api/withdrawals/initiate"
    return req


TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
VALID_TRC20_ADDRESS = "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb"
WITHDRAWAL_AMOUNT = Decimal("20.00")  # At or above MIN_WITHDRAWAL_USD (20)


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
        hashed_password="x",
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
        hashed_password="x",
        is_active=True,
        is_superuser=True,
    )
    test_db.add(u)
    await test_db.commit()
    await test_db.refresh(u)
    return u


async def _seed_balance(db: AsyncSession, user_id: int, available: Decimal) -> UserCryptoBalance:
    bal = UserCryptoBalance(
        user_id=user_id,
        asset="USDT",
        balance=available,
        locked_balance=Decimal("0"),
    )
    db.add(bal)
    await db.commit()
    return bal


async def _get_balance(db: AsyncSession, user_id: int) -> dict:
    return await WalletService.get_balance(user_id=user_id, asset="USDT", db=db)


async def _ledger_types_for_withdrawal(db: AsyncSession, withdrawal_id: int) -> list:
    """Return list of WalletTransaction types for this withdrawal (ordered by id)."""
    stmt = (
        select(WalletTransaction.type)
        .where(
            WalletTransaction.reference_type == ReferenceType.WITHDRAWAL,
            WalletTransaction.reference_id == withdrawal_id,
        )
        .order_by(WalletTransaction.id.asc())
    )
    result = await db.execute(stmt)
    return [r[0] for r in result.all()]


@pytest.mark.asyncio
async def test_complete_crypto_withdrawal_flow(
    test_db: AsyncSession,
    user: User,
    admin: User,
):
    """
    Full crypto withdrawal: initiate -> admin approve -> execute (mocked send) -> monitor (mocked confirmations) -> completed.
    Asserts balance and ledger (WITHDRAWAL_LOCK, WITHDRAWAL_DEBIT; no UNLOCK/REFUND).
    """
    # 1) Seed user balance
    await _seed_balance(test_db, user.id, Decimal("100.00"))
    balance_before = await _get_balance(test_db, user.id)
    assert balance_before["available"] == Decimal("100.00")
    assert balance_before["reserved"] == Decimal("0")

    # 2) Initiate withdrawal
    w = await initiate_withdrawal(
        WithdrawalIntentCreate(
            asset="USDT",
            network="TRC20",
            amount_crypto=WITHDRAWAL_AMOUNT,
            to_address=VALID_TRC20_ADDRESS,
            client_request_id="e2e-full-withdrawal",
        ),
        _make_request(),
        None,  # idempotency_key
        test_db,
        user,
    )
    assert w.id is not None
    assert w.status == "pending"

    balance_after_initiate = await _get_balance(test_db, user.id)
    assert balance_after_initiate["available"] == Decimal("80.00")
    assert balance_after_initiate["reserved"] == Decimal("20.00")
    assert balance_after_initiate["total"] == balance_before["total"]

    # 3) Admin approve
    out = await admin_approve_withdrawal(
        w.id,
        WithdrawalAdminApproveRequest(admin_notes="e2e approve"),
        db=test_db,
        admin_user=admin,
    )
    assert out["status"] == "approved"

    balance_after_approve = await _get_balance(test_db, user.id)
    assert balance_after_approve["available"] == Decimal("80.00")
    assert balance_after_approve["reserved"] == Decimal("20.00")

    # 4) Execute withdrawal (mock TRON send; real WalletService so debit is written)
    tx_hash_sent = "0xe2e_tx_hash_abcdef"
    with patch("app.services.withdrawal_execution_service.tron_send_service") as mock_tron:
        mock_tron.send_usdt_trc20 = AsyncMock(
            return_value={"tx_hash": tx_hash_sent, "raw": {}}
        )
        mock_tron.get_hot_wallet_balance = MagicMock(return_value=Decimal("1000.0"))
        mock_tron.check_hot_wallet_trx_balance = MagicMock(return_value=Decimal("200.0"))

        tx_hash = await WithdrawalExecutionService.execute_withdrawal(
            withdrawal_id=w.id,
            db=test_db,
        )
    assert tx_hash == tx_hash_sent

    # Re-fetch ORM model (router returns WithdrawalIntentResponse, not the model)
    result = await test_db.execute(select(WithdrawalIntent).where(WithdrawalIntent.id == w.id))
    withdrawal = result.scalar_one()
    assert withdrawal.status == "processing"
    assert withdrawal.tx_hash == tx_hash_sent
    assert withdrawal.processed_at is not None

    balance_after_execute = await _get_balance(test_db, user.id)
    assert balance_after_execute["available"] == Decimal("80.00")
    assert balance_after_execute["reserved"] == Decimal("0")
    assert balance_after_execute["total"] == Decimal("80.00")

    # 5) Monitor: mock tx info with enough confirmations -> completed
    with patch("app.workers.withdrawal_monitor.tron_client") as mock_client:
        from datetime import datetime, timezone

        mock_client.get_tx_info = AsyncMock(
            return_value={
                "block_number": 100,
                "confirmations": 3,
                "success": True,
                "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
            }
        )

        worker = WithdrawalMonitorWorker()
        stats = await worker.run_once(test_db)

    assert stats["scanned"] == 1
    assert stats["confirmed"] == 1
    assert stats["failed"] == 0
    assert stats["refunded"] == 0

    result = await test_db.execute(select(WithdrawalIntent).where(WithdrawalIntent.id == w.id))
    withdrawal = result.scalar_one()
    assert withdrawal.status == "completed"
    assert withdrawal.completed_at is not None
    assert withdrawal.confirmations == 3

    # 6) Final balance and ledger
    balance_final = await _get_balance(test_db, user.id)
    assert balance_final["available"] == Decimal("80.00")
    assert balance_final["reserved"] == Decimal("0")
    assert balance_final["total"] == Decimal("80.00")

    ledger_types = await _ledger_types_for_withdrawal(test_db, withdrawal.id)
    assert ledger_types == [
        WalletTransactionType.WITHDRAWAL_LOCK,
        WalletTransactionType.WITHDRAWAL_DEBIT,
    ]
