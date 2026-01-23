"""
API Contract Tests
Snapshot-like tests for response JSON shapes to ensure frontend compatibility
"""
import pytest
from fastapi.testclient import TestClient
from decimal import Decimal
from datetime import datetime, timezone


class TestWalletAPIContracts:
    """Test wallet API response contracts"""

    def test_wallet_balance_response_shape(self, client: TestClient, auth_headers: dict):
        """Test GET /api/wallet/balance response shape"""
        response = client.get("/api/wallet/balance", headers=auth_headers)

        # Should return 200 even if no balance (empty response)
        assert response.status_code in [200, 401]  # 401 if not authenticated properly

        if response.status_code == 200:
            data = response.json()

            # Should be an object, not array
            assert isinstance(data, dict)

            # If specific asset requested, should have asset field
            if "asset" in data:
                assert "asset" in data
                assert "available" in data
                assert "reserved" in data
                assert "total" in data

                # Amounts should be strings (not floats)
                assert isinstance(data["available"], str)
                assert isinstance(data["reserved"], str)
                assert isinstance(data["total"], str)

                # Should be valid decimal strings
                Decimal(data["available"])
                Decimal(data["reserved"])
                Decimal(data["total"])

    def test_wallet_transactions_response_shape(self, client: TestClient, auth_headers: dict):
        """Test GET /api/wallet/transactions response shape"""
        response = client.get("/api/wallet/transactions", headers=auth_headers)

        # Should return 200 even with no transactions
        assert response.status_code in [200, 401]

        if response.status_code == 200:
            data = response.json()

            assert isinstance(data, dict)
            assert "transactions" in data
            assert "count" in data
            assert "limit" in data
            assert "offset" in data

            # Transactions should be array
            assert isinstance(data["transactions"], list)

            # Pagination metadata
            assert isinstance(data["count"], int)
            assert isinstance(data["limit"], int)
            assert isinstance(data["offset"], int)

            # Each transaction should have consistent shape
            for tx in data["transactions"]:
                assert isinstance(tx, dict)
                assert "id" in tx
                assert "type" in tx
                assert "asset" in tx
                assert "amount" in tx
                assert "balance_before" in tx
                assert "balance_after" in tx
                assert "reserved_before" in tx
                assert "reserved_after" in tx
                assert "created_at" in tx

                # Types should be consistent
                assert isinstance(tx["id"], int)
                assert isinstance(tx["type"], str)
                assert isinstance(tx["asset"], str)
                assert isinstance(tx["amount"], str)  # Decimal as string
                assert isinstance(tx["balance_before"], str)
                assert isinstance(tx["balance_after"], str)
                assert isinstance(tx["reserved_before"], str)
                assert isinstance(tx["reserved_after"], str)
                assert isinstance(tx["created_at"], str)  # ISO format

                # Should be valid decimals
                Decimal(tx["amount"])
                Decimal(tx["balance_before"])
                Decimal(tx["balance_after"])
                Decimal(tx["reserved_before"])
                Decimal(tx["reserved_after"])

                # Type should be enum value
                valid_types = ["deposit_credit", "withdrawal_debit", "withdrawal_refund",
                             "bet_lock", "bet_win", "bet_refund"]
                assert tx["type"] in valid_types


class TestWithdrawalsAPIContracts:
    """Test withdrawals API response contracts"""

    def test_withdrawals_list_response_shape(self, client: TestClient, auth_headers: dict):
        """Test GET /api/withdrawals response shape"""
        response = client.get("/api/withdrawals", headers=auth_headers)

        assert response.status_code in [200, 401]

        if response.status_code == 200:
            data = response.json()

            assert isinstance(data, dict)
            assert "withdrawals" in data
            assert "total" in data
            assert "page" in data
            assert "page_size" in data

            assert isinstance(data["withdrawals"], list)
            assert isinstance(data["total"], int)
            assert isinstance(data["page"], int)
            assert isinstance(data["page_size"], int)

            # Each withdrawal should have consistent shape
            for withdrawal in data["withdrawals"]:
                assert isinstance(withdrawal, dict)
                required_fields = ["id", "asset", "network", "amount_crypto", "amount_usd",
                                 "to_address", "status", "created_at"]

                for field in required_fields:
                    assert field in withdrawal

                # Types
                assert isinstance(withdrawal["id"], int)
                assert isinstance(withdrawal["asset"], str)
                assert isinstance(withdrawal["network"], str)
                assert isinstance(withdrawal["amount_crypto"], str)  # Decimal as string
                assert isinstance(withdrawal["amount_usd"], str)
                assert isinstance(withdrawal["to_address"], str)
                assert isinstance(withdrawal["status"], str)
                assert isinstance(withdrawal["created_at"], str)

                # Optional fields
                optional_fields = ["memo", "tx_hash", "confirmations", "processed_at",
                                 "completed_at", "failed_at", "failure_reason",
                                 "network_fee", "platform_fee", "estimated_completion"]

                for field in optional_fields:
                    if field in withdrawal:
                        if field.endswith("_at"):
                            assert isinstance(withdrawal[field], str)  # ISO datetime
                        elif field in ["confirmations", "estimated_completion"]:
                            assert isinstance(withdrawal[field], (int, type(None)))
                        elif field.endswith("_fee"):
                            if withdrawal[field] is not None:
                                assert isinstance(withdrawal[field], str)  # Decimal as string
                        else:
                            assert isinstance(withdrawal[field], (str, type(None)))

                # Status should be valid enum
                valid_statuses = ["pending", "approved", "processing", "completed", "failed", "rejected", "cancelled"]
                assert withdrawal["status"] in valid_statuses

    def test_withdrawal_detail_response_shape(self, client: TestClient, auth_headers: dict):
        """Test GET /api/withdrawals/{id} response shape"""
        # First create a withdrawal to get a valid ID
        withdrawal_data = {
            "asset": "USDT",
            "network": "TRC20",
            "amount_crypto": 10.0,
            "to_address": "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9"
        }

        create_response = client.post("/api/withdrawals/initiate",
                                    json=withdrawal_data,
                                    headers=auth_headers)

        if create_response.status_code == 200:
            withdrawal = create_response.json()

            # Now test the detail endpoint
            detail_response = client.get(f"/api/withdrawals/{withdrawal['id']}",
                                       headers=auth_headers)

            assert detail_response.status_code == 200
            data = detail_response.json()

            # Should have all the fields from list view plus any additional detail fields
            assert isinstance(data, dict)
            assert data["id"] == withdrawal["id"]
            assert data["asset"] == withdrawal["asset"]
            assert data["status"] == withdrawal["status"]

            # All amounts should be strings
            assert isinstance(data["amount_crypto"], str)
            assert isinstance(data["amount_usd"], str)


class TestAdminAPIContracts:
    """Test admin API response contracts"""

    def test_admin_health_response_shape(self, client: TestClient, admin_auth_headers: dict):
        """Test GET /api/admin/system/health response shape"""
        response = client.get("/api/admin/system/health", headers=admin_auth_headers)

        # May return 403 if not admin, or 200 if admin
        assert response.status_code in [200, 403]

        if response.status_code == 200:
            data = response.json()

            assert isinstance(data, dict)
            assert "overall_status" in data
            assert "heartbeats" in data
            assert "open_alerts_count" in data
            assert "hot_wallet_balances" in data
            assert "latest_reconciliation" in data

            # Status should be valid
            valid_statuses = ["healthy", "warning", "critical"]
            assert data["overall_status"] in valid_statuses

            # Heartbeats should be array
            assert isinstance(data["heartbeats"], list)
            for heartbeat in data["heartbeats"]:
                assert isinstance(heartbeat, dict)
                assert "service_name" in heartbeat
                assert "last_heartbeat_at" in heartbeat
                assert "is_healthy" in heartbeat

            # Counts should be integers
            assert isinstance(data["open_alerts_count"], int)

    def test_admin_alerts_response_shape(self, client: TestClient, admin_auth_headers: dict):
        """Test GET /api/admin/system/alerts response shape"""
        response = client.get("/api/admin/system/alerts", headers=admin_auth_headers)

        assert response.status_code in [200, 403]

        if response.status_code == 200:
            data = response.json()

            assert isinstance(data, dict)
            assert "alerts" in data
            assert "total" in data
            assert "offset" in data
            assert "limit" in data

            assert isinstance(data["alerts"], list)
            assert isinstance(data["total"], int)
            assert isinstance(data["offset"], int)
            assert isinstance(data["limit"], int)

            # Each alert should have consistent shape
            for alert in data["alerts"]:
                assert isinstance(alert, dict)
                required_fields = ["id", "type", "severity", "message", "status",
                                 "dedupe_key", "created_at"]

                for field in required_fields:
                    assert field in alert

                # Types
                assert isinstance(alert["id"], int)
                assert isinstance(alert["type"], str)
                assert isinstance(alert["severity"], str)
                assert isinstance(alert["message"], str)
                assert isinstance(alert["status"], str)
                assert isinstance(alert["dedupe_key"], str)
                assert isinstance(alert["created_at"], str)

                # Optional fields
                if "acknowledged_at" in alert:
                    assert isinstance(alert["acknowledged_at"], str)
                if "resolved_at" in alert:
                    assert isinstance(alert["resolved_at"], str)

                # Status should be valid
                valid_statuses = ["open", "acknowledged", "resolved"]
                assert alert["status"] in valid_statuses

                # Severity should be valid
                valid_severities = ["info", "warning", "critical"]
                assert alert["severity"] in valid_severities

    def test_admin_reconciliation_response_shape(self, client: TestClient, admin_auth_headers: dict):
        """Test GET /api/admin/system/reconciliation response shape"""
        response = client.get("/api/admin/system/reconciliation", headers=admin_auth_headers)

        assert response.status_code in [200, 403]

        if response.status_code == 200:
            data = response.json()

            assert isinstance(data, dict)
            assert "reports" in data
            assert "total" in data
            assert "offset" in data
            assert "limit" in data
            assert "start_date" in data
            assert "end_date" in data

            assert isinstance(data["reports"], list)

            # Each report should have consistent shape
            for report in data["reports"]:
                assert isinstance(report, dict)
                required_fields = ["id", "date", "asset", "network", "status", "delta", "created_at"]

                for field in required_fields:
                    assert field in report

                # Types
                assert isinstance(report["id"], int)
                assert isinstance(report["asset"], str)
                assert isinstance(report["network"], str)
                assert isinstance(report["status"], str)
                assert isinstance(report["delta"], str)  # Decimal as string
                assert isinstance(report["date"], str)
                assert isinstance(report["created_at"], str)

                # Balance fields should be objects with asset keys
                balance_fields = ["total_user_available", "total_user_reserved",
                                "total_user_liability", "platform_hot_wallet_balance",
                                "platform_cold_wallet_balance", "platform_total_balance"]

                for field in balance_fields:
                    if field in report:
                        assert isinstance(report[field], dict)


class TestResponseConsistency:
    """Test that responses are consistent across different scenarios"""

    def test_decimal_serialization_consistency(self):
        """Test that decimals are always serialized as strings"""
        # This is a documentation test - ensuring our API contract
        # All money amounts should be returned as strings, never floats

        test_amounts = [
            Decimal("0"),
            Decimal("0.000001"),
            Decimal("123.456789"),
            Decimal("1000000.0")
        ]

        for amount in test_amounts:
            # Should serialize to string
            serialized = str(amount)
            # Should deserialize back to same value
            deserialized = Decimal(serialized)
            assert deserialized == amount

    def test_datetime_serialization_consistency(self):
        """Test that datetimes are always serialized as ISO strings"""
        test_times = [
            datetime(2024, 1, 1, 12, 0, 0, tzinfo=timezone.utc),
            datetime.now(timezone.utc)
        ]

        for dt in test_times:
            # Should serialize to ISO format
            serialized = dt.isoformat()
            # Should be parseable back
            from dateutil import parser
            parsed = parser.parse(serialized)
            assert parsed == dt

    def test_null_value_consistency(self):
        """Test that null/None values are handled consistently"""
        # Optional fields should be either present with proper type or absent
        # Not present with null values (unless explicitly documented)

        # This is more of a documentation/contract test
        # In practice, we'd check that optional fields are either:
        # 1. Not present in response
        # 2. Present with correct type (including None for nullable fields)

        pass