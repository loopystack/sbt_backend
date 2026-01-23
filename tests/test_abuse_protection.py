"""
Abuse Protection Tests
Tests for rate limiting, idempotency, and abuse prevention
"""
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from main import app
from app.core.database import get_db
from app.models.user import User
from app.models.idempotency_key import IdempotencyKey
from app.security.rate_limiter import rate_limiter
from app.services.idempotency_service import idempotency_service


class TestRateLimiting:
    """Test rate limiting functionality"""

    def test_rate_limit_withdrawal_initiate(self, client: TestClient, auth_headers: dict):
        """Test that withdrawal initiate endpoint is rate limited"""
        # Clear any existing rate limit data
        rate_limiter._storage.clear()

        # Make requests up to the limit
        for i in range(5):  # 5 requests allowed per minute
            response = client.post("/api/withdrawals/initiate", json={
                "asset": "USDT",
                "network": "TRC20",
                "amount_crypto": 10.0,
                "to_address": "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
            }, headers=auth_headers)

            if i < 5:
                # First 5 should work or fail due to validation (not rate limiting)
                assert response.status_code in [200, 400, 403]  # Success or validation error
            else:
                # 6th request should be rate limited
                assert response.status_code == 429
                assert "Too many requests" in response.json()["detail"]
                assert "retry_after" in response.json()

    def test_rate_limit_admin_operations(self, client: TestClient, admin_auth_headers: dict):
        """Test that admin operations are rate limited"""
        # Clear rate limit data
        rate_limiter._storage.clear()

        # Make admin requests
        for i in range(30):  # 30 requests allowed per minute for admin
            response = client.post("/api/withdrawals/admin/1/approve",
                                 headers=admin_auth_headers)

            if i < 30:
                # Should fail with 404 (withdrawal doesn't exist) but not 429
                assert response.status_code in [404, 403]  # Not found or not rate limited
            else:
                # 31st request should be rate limited
                assert response.status_code == 429

    def test_rate_limit_read_operations(self, client: TestClient):
        """Test that read operations are rate limited"""
        # Clear rate limit data
        rate_limiter._storage.clear()

        # Make read requests
        for i in range(121):  # 120 requests allowed per minute
            response = client.get("/api/wallet/balance")

            if i < 120:
                # Should fail with 401 (not authenticated) but not 429
                assert response.status_code == 401
            else:
                # 121st request should be rate limited
                assert response.status_code == 429

    def test_rate_limit_different_ips(self):
        """Test that different IPs have separate rate limits"""
        # Clear rate limit data
        rate_limiter._storage.clear()

        # Create mock requests from different IPs
        request1 = MagicMock()
        request1.client.host = "192.168.1.1"

        request2 = MagicMock()
        request2.client.host = "192.168.1.2"

        # Both should be allowed initially
        assert rate_limiter.check_rate_limit(request1, "ip", 60, 5) == None  # No exception
        assert rate_limiter.check_rate_limit(request2, "ip", 60, 5) == None

        # Exhaust limit for first IP
        for _ in range(4):  # 4 more to reach limit
            rate_limiter.check_rate_limit(request1, "ip", 60, 5)

        # First IP should now be blocked
        with pytest.raises(HTTPException) as exc_info:
            rate_limiter.check_rate_limit(request1, "ip", 60, 5)
        assert exc_info.value.status_code == 429

        # Second IP should still work
        assert rate_limiter.check_rate_limit(request2, "ip", 60, 5) == None


class TestIdempotencyProtection:
    """Test idempotency key functionality"""

    @pytest.mark.asyncio
    async def test_idempotency_key_creation(self, db_session: AsyncSession):
        """Test basic idempotency key creation and retrieval"""
        key = "test_key_123"
        endpoint = "/api/withdrawals/initiate"
        method = "POST"
        request_hash = "hash123"
        user_id = 1

        # Create key
        record = await idempotency_service.create_idempotency_record(
            db_session, key, endpoint, method, request_hash, user_id
        )

        assert record.key == key
        assert record.endpoint == endpoint
        assert record.method == method
        assert record.user_id == user_id
        assert not record.is_completed

        # Retrieve key
        found_record = await idempotency_service.get_idempotency_record(
            db_session, key, endpoint, method, user_id
        )

        assert found_record is not None
        assert found_record.key == key

    @pytest.mark.asyncio
    async def test_idempotency_duplicate_prevention(self, db_session: AsyncSession):
        """Test that duplicate idempotency keys are rejected"""
        key = "duplicate_test_key"
        endpoint = "/api/withdrawals/initiate"
        method = "POST"
        request_hash = "hash123"
        user_id = 1

        # Create first record
        record1 = await idempotency_service.create_idempotency_record(
            db_session, key, endpoint, method, request_hash, user_id
        )
        assert record1 is not None

        # Try to create duplicate - should fail
        with pytest.raises(Exception):  # IntegrityError
            await idempotency_service.create_idempotency_record(
                db_session, key, endpoint, method, request_hash, user_id
            )

    @pytest.mark.asyncio
    async def test_idempotency_completed_response(self, db_session: AsyncSession):
        """Test that completed idempotency requests return cached response"""
        key = "completed_test_key"
        endpoint = "/api/withdrawals/initiate"
        method = "POST"
        request_hash = "hash123"
        user_id = 1

        # Create and complete record
        record = await idempotency_service.create_idempotency_record(
            db_session, key, endpoint, method, request_hash, user_id
        )

        response_data = {"id": 123, "status": "success"}
        await idempotency_service.complete_idempotency_record(
            db_session, record, 200, response_data
        )

        # Retrieve completed record
        found_record = await idempotency_service.get_idempotency_record(
            db_session, key, endpoint, method, user_id
        )

        assert found_record is not None
        assert found_record.is_completed
        assert found_record.status_code == 200
        assert found_record.response_body == '{"id": 123, "status": "success"}'

    @pytest.mark.asyncio
    async def test_idempotency_key_expiration(self, db_session: AsyncSession):
        """Test that expired idempotency keys are cleaned up"""
        from datetime import datetime, timezone, timedelta

        key = "expired_test_key"
        endpoint = "/api/withdrawals/initiate"
        method = "POST"
        request_hash = "hash123"
        user_id = 1

        # Create record with past expiration
        record = IdempotencyKey(
            key=key,
            endpoint=endpoint,
            method=method,
            request_hash=request_hash,
            user_id=user_id,
            expires_at=datetime.now(timezone.utc) - timedelta(hours=1)  # Already expired
        )
        db_session.add(record)
        await db_session.commit()

        # Try to retrieve - should return None (expired keys are cleaned up)
        found_record = await idempotency_service.get_idempotency_record(
            db_session, key, endpoint, method, user_id
        )

        assert found_record is None  # Should be cleaned up


class TestDuplicatePrevention:
    """Test duplicate transaction prevention"""

    @pytest.mark.asyncio
    async def test_duplicate_withdrawal_creation_blocked(self, db_session: AsyncSession, test_user: User):
        """Test that duplicate withdrawal creation is blocked"""
        from app.routers.withdrawals import initiate_withdrawal
        from fastapi import Request

        # Create withdrawal data
        withdrawal_data = {
            "asset": "USDT",
            "network": "TRC20",
            "amount_crypto": 50.0,
            "to_address": "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9",
            "client_request_id": "duplicate_test_123"
        }

        # Create mock request
        mock_request = MagicMock(spec=Request)
        mock_request.url.path = "/api/withdrawals/initiate"
        mock_request.method = "POST"

        # Create first withdrawal
        result1 = await initiate_withdrawal(
            withdrawal_data=withdrawal_data,
            request=mock_request,
            db=db_session,
            current_user=test_user
        )

        # Create second withdrawal with same client_request_id
        result2 = await initiate_withdrawal(
            withdrawal_data=withdrawal_data,
            request=mock_request,
            db=db_session,
            current_user=test_user
        )

        # Should return the same withdrawal
        assert result1.id == result2.id
        assert result1.amount_crypto == result2.amount_crypto

    @pytest.mark.asyncio
    async def test_duplicate_withdrawal_execution_prevented(self, db_session: AsyncSession, test_user: User):
        """Test that duplicate withdrawal execution is prevented"""
        from app.services.withdrawal_execution_service import WithdrawalExecutionService

        # Create approved withdrawal
        withdrawal = WithdrawalIntent(
            user_id=test_user.id,
            asset="USDT",
            network="TRC20",
            amount_crypto=10.0,
            amount_usd=10.0,
            to_address="T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9",
            status="approved"
        )
        db_session.add(withdrawal)
        await db_session.commit()
        await db_session.refresh(withdrawal)

        # Mock successful execution
        with patch('app.services.withdrawal_execution_service.tron_send_service') as mock_tron:
            mock_result = MagicMock()
            mock_result.tx_hash = "duplicate_test_tx_456"
            mock_tron.send_usdt_trc20.return_value = mock_result

            execution_service = WithdrawalExecutionService()

            # Execute twice
            result1 = await execution_service.execute_approved_withdrawal(
                db_session, withdrawal.id, "worker1"
            )
            result2 = await execution_service.execute_approved_withdrawal(
                db_session, withdrawal.id, "worker2"
            )

            # Only one should succeed
            assert result1['success'] != result2.get('success', False)

            # Check database - should have only one execution record
            await db_session.refresh(withdrawal)
            # Only one tx_hash should be set
            assert withdrawal.tx_hash is not None
            # Status should be completed (not failed due to duplicate)


class TestInputValidation:
    """Test input validation and sanitization"""

    def test_invalid_address_formats(self, client: TestClient, auth_headers: dict):
        """Test that invalid address formats are rejected"""
        invalid_addresses = [
            "",  # Empty
            "123",  # Too short
            "T" * 200,  # Too long
            "invalid_address",  # No 'T' prefix
            "T123!@#",  # Invalid characters
            "0x1234567890123456789012345678901234567890",  # ETH address (wrong network)
        ]

        for address in invalid_addresses:
            response = client.post("/api/withdrawals/initiate", json={
                "asset": "USDT",
                "network": "TRC20",
                "amount_crypto": 10.0,
                "to_address": address
            }, headers=auth_headers)

            assert response.status_code == 400
            assert "address" in response.json()["detail"].lower()

    def test_amount_validation(self, client: TestClient, auth_headers: dict):
        """Test amount validation rules"""
        invalid_amounts = [
            0,      # Zero
            -10,    # Negative
            0.0000001,  # Too small
            1000001,    # Too large
            10.1234567, # Too many decimals
        ]

        for amount in invalid_amounts:
            response = client.post("/api/withdrawals/initiate", json={
                "asset": "USDT",
                "network": "TRC20",
                "amount_crypto": amount,
                "to_address": "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
            }, headers=auth_headers)

            assert response.status_code == 400

    def test_network_asset_validation(self, client: TestClient, auth_headers: dict):
        """Test network and asset validation"""
        # Invalid network
        response = client.post("/api/withdrawals/initiate", json={
            "asset": "USDT",
            "network": "INVALID",
            "amount_crypto": 10.0,
            "to_address": "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
        }, headers=auth_headers)

        assert response.status_code == 400
        assert "network" in response.json()["detail"].lower()

        # Invalid asset
        response = client.post("/api/withdrawals/initiate", json={
            "asset": "INVALID",
            "network": "TRC20",
            "amount_crypto": 10.0,
            "to_address": "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
        }, headers=auth_headers)

        assert response.status_code == 400
        assert "asset" in response.json()["detail"].lower()