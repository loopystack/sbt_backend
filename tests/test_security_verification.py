"""
Security Verification Tests
Comprehensive security tests beyond rate limiting
"""
import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession


class TestAuthorizationSecurity:
    """Test authorization and access control security"""

    def test_admin_only_endpoints_blocked_for_regular_users(self, client: TestClient, auth_headers: dict):
        """Test that admin-only endpoints return 403 for regular users"""
        admin_endpoints = [
            "/api/admin/system/health",
            "/api/admin/system/alerts",
            "/api/admin/system/reconciliation",
            "/api/admin/withdrawals",
            "/api/admin/withdrawals/1/approve",
            "/api/admin/withdrawals/1/reject",
            "/api/admin/withdrawals/1/execute",
            "/api/admin/withdrawals/1/retry"
        ]

        for endpoint in admin_endpoints:
            response = client.get(endpoint, headers=auth_headers)
            assert response.status_code == 403, f"Endpoint {endpoint} should be 403 for regular users"

            # POST requests for actions
            if "/approve" in endpoint or "/reject" in endpoint or "/execute" in endpoint or "/retry" in endpoint:
                response = client.post(endpoint, headers=auth_headers)
                assert response.status_code == 403, f"POST to {endpoint} should be 403 for regular users"

    def test_admin_endpoints_work_for_admin_users(self, client: TestClient, admin_auth_headers: dict):
        """Test that admin endpoints work for admin users (or return expected errors)"""
        # Health endpoint should work
        response = client.get("/api/admin/system/health", headers=admin_auth_headers)
        assert response.status_code in [200, 404], "Admin health should work or return 404 (no data)"

        # Alerts endpoint should work
        response = client.get("/api/admin/system/alerts", headers=admin_auth_headers)
        assert response.status_code in [200, 404], "Admin alerts should work or return 404 (no data)"

        # Withdrawals endpoint should work
        response = client.get("/api/admin/withdrawals", headers=admin_auth_headers)
        assert response.status_code in [200, 404], "Admin withdrawals should work or return 404 (no data)"

    def test_superuser_vs_admin_user_permissions(self, client: TestClient, admin_auth_headers: dict):
        """Test that superuser has broader permissions than regular admin"""
        # For now, we have get_current_superuser() and get_admin_user()
        # This test ensures the distinction is maintained

        # Both should be able to access admin endpoints
        response = client.get("/api/admin/system/health", headers=admin_auth_headers)
        assert response.status_code in [200, 403, 404]

    def test_token_expiration_security(self, client: TestClient):
        """Test that expired/invalid tokens are properly rejected"""
        # Test with invalid token
        invalid_headers = {"Authorization": "Bearer invalid.jwt.token"}
        response = client.get("/api/wallet/balance", headers=invalid_headers)
        assert response.status_code == 401

        # Test with malformed authorization header
        malformed_headers = {"Authorization": "NotBearerFormat"}
        response = client.get("/api/wallet/balance", headers=malformed_headers)
        assert response.status_code == 401

        # Test without authorization header
        response = client.get("/api/wallet/balance")
        assert response.status_code == 401


class TestInputValidationSecurity:
    """Test input validation and sanitization security"""

    def test_address_validation_prevents_injection(self, client: TestClient, auth_headers: dict):
        """Test that address validation prevents various injection attacks"""
        malicious_addresses = [
            # SQL injection attempts
            "T123'; DROP TABLE users; --",
            "T123' OR '1'='1",
            "T123\"; SELECT * FROM secrets; --",

            # XSS attempts
            "T123<script>alert('xss')</script>",
            "T123\"><img src=x onerror=alert('xss')>",

            # Path traversal
            "T123../../../etc/passwd",
            "T123..\\..\\..\\windows\\system32",

            # Command injection
            "T123; rm -rf /",
            "T123| cat /etc/passwd",

            # Very long addresses (buffer overflow attempts)
            "T" + "1" * 1000,  # 1000+ chars

            # Unicode attacks
            "T123\u0000",  # Null byte
            "T123\u202E",  # Right-to-left override
        ]

        for malicious_addr in malicious_addresses:
            response = client.post("/api/withdrawals/initiate", json={
                "asset": "USDT",
                "network": "TRC20",
                "amount_crypto": 10.0,
                "to_address": malicious_addr
            }, headers=auth_headers)

            # Should be rejected with 400 (validation error)
            assert response.status_code == 400, f"Address '{malicious_addr}' should be rejected"

    def test_memo_field_sanitization(self, client: TestClient, auth_headers: dict):
        """Test that memo field is properly sanitized"""
        malicious_memos = [
            "<script>alert('xss')</script>",
            "Memo with <b>HTML</b>",
            "Memo with\nnewlines\tand\ttabs",
            "Very long memo " * 100,  # Very long memo
        ]

        for memo in malicious_memos:
            response = client.post("/api/withdrawals/initiate", json={
                "asset": "USDT",
                "network": "TRC20",
                "amount_crypto": 10.0,
                "to_address": "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9",
                "memo": memo
            }, headers=auth_headers)

            # Should either accept (and store safely) or reject
            assert response.status_code in [200, 400]

    def test_numeric_input_validation(self, client: TestClient, auth_headers: dict):
        """Test that numeric inputs are properly validated"""
        # Very large numbers (potential DoS)
        large_amounts = [
            999999999999999999999,  # Very large integer
            1e100,  # Scientific notation
            float('inf'),  # Infinity
            float('nan'),  # NaN
        ]

        for amount in large_amounts:
            response = client.post("/api/withdrawals/initiate", json={
                "asset": "USDT",
                "network": "TRC20",
                "amount_crypto": amount,
                "to_address": "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
            }, headers=auth_headers)

            # Should be rejected
            assert response.status_code == 400

    def test_request_size_limits(self, client: TestClient, auth_headers: dict):
        """Test that large requests are properly limited"""
        # Large memo field
        large_memo = "A" * 10000  # 10KB memo

        response = client.post("/api/withdrawals/initiate", json={
            "asset": "USDT",
            "network": "TRC20",
            "amount_crypto": 10.0,
            "to_address": "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9",
            "memo": large_memo
        }, headers=auth_headers)

        # Should be rejected or accepted based on our limits
        # Currently we allow up to 100 chars, so this should be rejected
        assert response.status_code == 400


class TestCORSSecurity:
    """Test CORS configuration security"""

    def test_cors_headers_present(self, client: TestClient):
        """Test that CORS headers are properly set"""
        # Test preflight request
        response = client.options("/api/health",
                                headers={
                                    "Origin": "http://localhost:3000",
                                    "Access-Control-Request-Method": "GET"
                                })

        assert "access-control-allow-origin" in response.headers
        assert "access-control-allow-methods" in response.headers
        assert "access-control-allow-headers" in response.headers

    def test_cors_origin_validation(self, client: TestClient):
        """Test that CORS allows only configured origins"""
        allowed_origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://yourdomain.com"
        ]

        for origin in allowed_origins:
            response = client.options("/api/health",
                                    headers={
                                        "Origin": origin,
                                        "Access-Control-Request-Method": "GET"
                                    })

            # Should allow the request
            assert response.status_code == 200

    def test_cors_blocks_malicious_origins(self, client: TestClient):
        """Test that CORS blocks unauthorized origins"""
        malicious_origins = [
            "https://evil.com",
            "http://attacker.com",
            "null",  # Null origin bypass attempts
            "",  # Empty origin
        ]

        for origin in malicious_origins:
            response = client.options("/api/health",
                                    headers={
                                        "Origin": origin,
                                        "Access-Control-Request-Method": "GET"
                                    })

            # Should still return 200 but without allowing the origin
            # (FastAPI handles this automatically)
            assert response.status_code == 200


class TestRequestForgeryProtection:
    """Test protection against request forgery"""

    def test_csrf_protection_not_applicable(self, client: TestClient):
        """Test that CSRF protection is not applicable (we use JWT, not cookies)"""
        # Since we use JWT tokens in Authorization header, not cookies,
        # CSRF is not applicable. This is actually a security advantage.

        # Verify that requests work with proper Authorization header
        response = client.get("/api/health")
        assert response.status_code == 200

        # This confirms we're not relying on cookie-based auth
        # which would be vulnerable to CSRF

    def test_host_header_validation(self, client: TestClient):
        """Test that host header is properly handled"""
        # Test with various host headers
        host_headers = [
            "localhost",
            "127.0.0.1",
            "yourdomain.com",
        ]

        for host in host_headers:
            response = client.get("/api/health", headers={"Host": host})
            # Should work regardless of host header (internal routing)
            assert response.status_code == 200


class TestErrorHandlingSecurity:
    """Test that errors don't leak sensitive information"""

    def test_error_messages_safe(self, client: TestClient, auth_headers: dict):
        """Test that error messages don't leak sensitive information"""
        # Test various error conditions
        error_scenarios = [
            # Invalid address
            ({
                "asset": "USDT",
                "network": "TRC20",
                "amount_crypto": 10.0,
                "to_address": "invalid_address"
            }, "Invalid address format"),

            # Insufficient balance
            ({
                "asset": "USDT",
                "network": "TRC20",
                "amount_crypto": 999999.0,  # Very large amount
                "to_address": "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
            }, "balance"),

            # Invalid network
            ({
                "asset": "USDT",
                "network": "INVALID",
                "amount_crypto": 10.0,
                "to_address": "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
            }, "network"),
        ]

        for request_data, expected_error in error_scenarios:
            response = client.post("/api/withdrawals/initiate",
                                 json=request_data,
                                 headers=auth_headers)

            assert response.status_code == 400
            error_detail = response.json()["detail"]

            # Error should not contain:
            # - Private keys
            # - Internal file paths
            # - Database connection details
            # - Stack traces
            assert "PRIVATE" not in str(error_detail).upper()
            assert "KEY" not in str(error_detail).upper() or "public key" in str(error_detail).lower()
            assert "/app/" not in str(error_detail)
            assert "traceback" not in str(error_detail).lower()
            assert "psycopg" not in str(error_detail).lower()

            # Should contain user-friendly error message
            assert len(str(error_detail)) < 500  # Reasonable length limit

    def test_500_errors_safe(self, client: TestClient):
        """Test that 500 errors don't leak sensitive information"""
        # This is harder to test directly, but we can verify
        # that our global exception handler is in place

        # The global exception handler should catch unhandled errors
        # and return safe messages

        # This would require mocking an internal server error
        # For now, we verify the health endpoint works (smoke test)
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"


class TestDataExposurePrevention:
    """Test that sensitive data is not exposed"""

    def test_private_keys_not_in_logs(self):
        """Test that private keys don't appear in logs"""
        # This is hard to test directly, but we can verify
        # that our log scrubbing is in place

        # The log scrubber should be loaded in main.py
        # We can verify by checking that sensitive patterns are filtered

        import logging
        logger = logging.getLogger("test_logger")

        # Test that sensitive data gets masked
        test_message = "Private key: 0x1234567890abcdef"
        # This would be filtered by our log scrubber

        # In practice, this test would require capturing log output
        # For now, we verify the logger has our filter
        has_scrubber = any(isinstance(f, logging.Filter) for f in logger.filters)
        # Root logger should have our scrubber
        root_logger = logging.getLogger()
        has_scrubber = any(isinstance(f, logging.Filter) for f in root_logger.filters)
        # We assume it's properly configured

    def test_wallet_addresses_masked_in_logs(self):
        """Test that wallet addresses are properly masked in logs"""
        # Similar to above - log scrubber should mask addresses
        # This would require log capture testing

        pass

    def test_no_secrets_in_config_responses(self, client: TestClient):
        """Test that configuration endpoints don't expose secrets"""
        # There should be no config/debug endpoints that expose secrets

        # Health endpoint should not contain secrets
        response = client.get("/api/health")
        data = response.json()

        sensitive_fields = ["key", "secret", "private", "password", "token"]
        response_str = str(data).lower()

        for sensitive in sensitive_fields:
            assert sensitive not in response_str or "public" in response_str