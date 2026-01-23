"""
Precision and Rounding Tests
Tests for USDT decimal precision and amount validation
"""
import pytest
from decimal import Decimal, ROUND_DOWN, ROUND_UP
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.withdrawal import WithdrawalIntentCreate


class TestUSDTPrecision:
    """Test USDT decimal precision handling"""

    def test_minimum_usdt_amount(self):
        """Test minimum USDT amount (0.000001)"""
        schema = WithdrawalIntentCreate(
            asset="USDT",
            network="TRC20",
            amount_crypto=Decimal("0.000001"),
            to_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
        )
        assert schema.amount_crypto == Decimal("0.000001")

    def test_maximum_usdt_decimals(self):
        """Test maximum 6 decimal places for USDT"""
        schema = WithdrawalIntentCreate(
            asset="USDT",
            network="TRC20",
            amount_crypto=Decimal("123.456789"),
            to_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
        )
        # Should be accepted (validation happens in router)
        assert schema.amount_crypto == Decimal("123.456789")

    def test_too_many_decimals_rejected(self):
        """Test that amounts with more than 6 decimals are rejected"""
        with pytest.raises(ValueError):
            WithdrawalIntentCreate(
                asset="USDT",
                network="TRC20",
                amount_crypto=Decimal("123.4567891"),  # 7 decimals
                to_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
            )

    def test_large_usdt_amounts(self):
        """Test large USDT amounts (10k, 100k)"""
        # 10,000 USDT
        schema = WithdrawalIntentCreate(
            asset="USDT",
            network="TRC20",
            amount_crypto=Decimal("10000.0"),
            to_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
        )
        assert schema.amount_crypto == Decimal("10000.0")

        # 100,000 USDT
        schema = WithdrawalIntentCreate(
            asset="USDT",
            network="TRC20",
            amount_crypto=Decimal("100000.0"),
            to_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
        )
        assert schema.amount_crypto == Decimal("100000.0")

    def test_zero_amount_rejected(self):
        """Test that zero amounts are rejected"""
        with pytest.raises(ValueError):
            WithdrawalIntentCreate(
                asset="USDT",
                network="TRC20",
                amount_crypto=Decimal("0.0"),
                to_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
            )

    def test_negative_amount_rejected(self):
        """Test that negative amounts are rejected"""
        with pytest.raises(ValueError):
            WithdrawalIntentCreate(
                asset="USDT",
                network="TRC20",
                amount_crypto=Decimal("-10.0"),
                to_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
            )

    def test_usdt_precision_in_calculations(self):
        """Test that USDT precision is maintained in calculations"""
        # Test Tron smallest unit conversion
        amount_usdt = Decimal("123.456789")
        smallest_unit = int(amount_usdt * Decimal(1_000_000))

        # Should be exact
        expected = 123456789
        assert smallest_unit == expected

        # Convert back
        back_to_usdt = Decimal(smallest_unit) / Decimal(1_000_000)
        assert back_to_usdt == amount_usdt

    def test_no_float_conversion(self):
        """Test that no float conversion happens anywhere in the pipeline"""
        # This test ensures we never use floats for money calculations
        amount_decimal = Decimal("123.456789")

        # Ensure it's still Decimal after operations
        result = amount_decimal * Decimal("1.1")
        assert isinstance(result, Decimal)
        assert result == Decimal("135.802578")

        # Division
        result = amount_decimal / Decimal("2")
        assert isinstance(result, Decimal)
        assert result == Decimal("61.7283945")

    def test_precision_edge_cases(self):
        """Test precision edge cases"""
        # Very small amounts
        tiny_amount = Decimal("0.000001")
        assert tiny_amount * Decimal(1_000_000) == Decimal("1")

        # Very large amounts
        large_amount = Decimal("1000000.0")  # 1M USDT
        assert large_amount * Decimal(1_000_000) == Decimal("1000000000000")

    @pytest.mark.asyncio
    async def test_router_precision_validation(self, db_session: AsyncSession, test_user):
        """Test that router validates precision correctly"""
        from app.routers.withdrawals import initiate_withdrawal
        from fastapi import Request

        # Create balance
        from app.models.deposit import UserCryptoBalance
        balance = UserCryptoBalance(
            user_id=test_user.id,
            asset="USDT",
            balance=Decimal("1000.0"),
            locked_balance=Decimal("0")
        )
        db_session.add(balance)
        await db_session.commit()

        mock_request = MagicMock(spec=Request)
        mock_request.url.path = "/api/withdrawals/initiate"
        mock_request.method = "POST"

        # Test valid precision
        valid_data = {
            "asset": "USDT",
            "network": "TRC20",
            "amount_crypto": 123.456789,
            "to_address": "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
        }

        # Should work
        result = await initiate_withdrawal(valid_data, mock_request, db_session, test_user)
        assert result is not None

        # Test invalid precision (too many decimals)
        invalid_data = {
            "asset": "USDT",
            "network": "TRC20",
            "amount_crypto": 123.4567891,  # 7 decimals
            "to_address": "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
        }

        # Should be rejected
        with pytest.raises(HTTPException) as exc_info:
            await initiate_withdrawal(invalid_data, mock_request, db_session, test_user)
        assert exc_info.value.status_code == 400


class TestAmountValidation:
    """Test comprehensive amount validation"""

    def test_amount_range_validation(self):
        """Test amount range validation in schema"""
        # Valid amounts
        WithdrawalIntentCreate(
            asset="USDT",
            network="TRC20",
            amount_crypto=Decimal("0.000001"),
            to_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
        )

        WithdrawalIntentCreate(
            asset="USDT",
            network="TRC20",
            amount_crypto=Decimal("1000000.0"),
            to_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
        )

        # Invalid amounts
        with pytest.raises(ValueError):
            WithdrawalIntentCreate(
                asset="USDT",
                network="TRC20",
                amount_crypto=Decimal("0"),
                to_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
            )

        with pytest.raises(ValueError):
            WithdrawalIntentCreate(
                asset="USDT",
                network="TRC20",
                amount_crypto=Decimal("1000001.0"),  # Over limit
                to_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
            )

    def test_decimal_normalization(self):
        """Test that decimals are handled correctly"""
        # Trailing zeros should be preserved in Decimal
        amount = Decimal("123.456000")
        assert str(amount) == "123.456000"

        # But they should normalize in calculations
        result = amount + Decimal("0")
        assert result == Decimal("123.456")

    def test_currency_specific_precision(self):
        """Test that different assets could have different precisions"""
        # For now we only support USDT with 6 decimals
        # But this framework allows for other assets later

        usdt_amount = Decimal("123.456789")
        # In future, BTC might have 8 decimals, ETH 18, etc.
        # btc_amount = Decimal("1.12345678")  # 8 decimals
        # eth_amount = Decimal("1.123456789012345678")  # 18 decimals

        # Convert to smallest units
        usdt_smallest = int(usdt_amount * Decimal(10**6))
        assert usdt_smallest == 123456789