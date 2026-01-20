"""
Unit tests for TronSendService (TRC20 USDT)
Mocks tronpy contract builder chain and validates:
- address validation
- amount precision (6 decimals)
- broadcast returns tx_hash
"""

from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from app.services.tron_send_service import TronSendService


VALID_TRC20_ADDRESS = "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb"


@pytest.mark.asyncio
async def test_send_usdt_trc20_builds_transfer_with_6_decimals_and_returns_tx_hash(monkeypatch):
    svc = TronSendService()

    # Avoid reading env / initializing private key
    monkeypatch.setattr(svc, "_ensure_initialized", lambda: None)
    svc.hot_wallet_address = "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb"
    svc.usdt_contract = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
    svc._private_key = MagicMock()

    # Mock tronpy contract transfer chain
    txn = MagicMock()
    txn.broadcast.return_value = {"txid": "0xabc"}

    builder = MagicMock()
    builder.with_owner.return_value = builder
    builder.fee_limit.return_value = builder
    builder.build.return_value = builder
    builder.sign.return_value = txn

    contract = MagicMock()
    contract.functions.transfer.return_value = builder

    tron = MagicMock()
    tron.get_contract.return_value = contract
    svc._tron = tron

    # Amount conversion: 1.234567 USDT -> 1234567
    result = await svc.send_usdt_trc20(to_address=VALID_TRC20_ADDRESS, amount_usdt=Decimal("1.234567"))
    assert result["tx_hash"] == "0xabc"

    contract.functions.transfer.assert_called_once()
    args = contract.functions.transfer.call_args[0]
    assert args[0] == VALID_TRC20_ADDRESS
    assert args[1] == 1234567


@pytest.mark.asyncio
async def test_send_usdt_trc20_rejects_invalid_address(monkeypatch):
    svc = TronSendService()
    monkeypatch.setattr(svc, "_ensure_initialized", lambda: None)

    with pytest.raises(ValueError, match="Invalid TRC20 address"):
        await svc.send_usdt_trc20(to_address="not-a-tron-address", amount_usdt=Decimal("1.0"))


@pytest.mark.asyncio
async def test_send_usdt_trc20_rejects_non_positive_amount(monkeypatch):
    svc = TronSendService()
    monkeypatch.setattr(svc, "_ensure_initialized", lambda: None)

    with pytest.raises(ValueError, match="Amount must be greater than zero"):
        await svc.send_usdt_trc20(to_address=VALID_TRC20_ADDRESS, amount_usdt=Decimal("0"))

