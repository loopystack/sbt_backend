"""
Load Testing Scripts for Sports Betting Platform
Uses Locust.io for performance testing

Run with:
locust -f loadtests/locustfile.py --host http://localhost:5001

Or for distributed testing:
locust -f loadtests/locustfile.py --master --host http://localhost:5001
locust -f loadtests/locustfile.py --worker --master-host=localhost
"""

import os
from locust import HttpUser, TaskSet, task, between, tag
from locust.contrib.fasthttp import FastHttpUser
import json
import random
import string


class ApiUser(FastHttpUser):
    """Base user class for API load testing"""

    # Connection settings
    wait_time = between(1, 3)  # Wait 1-3 seconds between requests
    network_timeout = 30.0
    connection_timeout = 30.0

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.auth_token = None
        self.user_id = None

    def on_start(self):
        """Login and get auth token when user starts"""
        self.login()

    def login(self):
        """Authenticate and get JWT token"""
        # Use test credentials - in real load tests, use multiple test accounts
        login_data = {
            "email": "test@example.com",
            "password": "password123"
        }

        with self.client.post("/api/auth/login",
                            json=login_data,
                            catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                self.user_id = data.get("user", {}).get("id")

                # Set authorization header for future requests
                self.client.headers.update({
                    "Authorization": f"Bearer {self.auth_token}"
                })
            else:
                # Login failed - mark as failed but continue
                response.failure(f"Login failed: {response.status_code}")

    def generate_idempotency_key(self):
        """Generate a unique idempotency key for testing"""
        return ''.join(random.choices(string.ascii_letters + string.digits, k=32))


class ReadOperations(TaskSet):
    """Task set for read-heavy operations (wallet balance, transaction history)"""

    @tag('read', 'wallet')
    @task(10)  # 10x more likely than other tasks
    def get_wallet_balance(self):
        """Test wallet balance endpoint"""
        if not self.user_id:
            return

        with self.client.get(f"/api/wallet/balance",
                           catch_response=True) as response:
            if response.status_code == 200:
                # Validate response structure
                data = response.json()
                if "available" not in data or "total" not in data:
                    response.failure("Invalid balance response structure")
            elif response.status_code == 429:
                # Rate limited - this is expected behavior
                response.success()
            else:
                response.failure(f"Unexpected status: {response.status_code}")

    @tag('read', 'transactions')
    @task(5)  # 5x weight
    def get_transaction_history(self):
        """Test transaction history endpoint with pagination"""
        if not self.user_id:
            return

        # Test with different page sizes
        limit = random.choice([10, 20, 50])
        params = {
            "limit": limit,
            "offset": random.randint(0, 100)  # Random offset for pagination testing
        }

        with self.client.get("/api/transactions",
                           params=params,
                           catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                if "transactions" not in data:
                    response.failure("Invalid transactions response structure")
                # Check pagination metadata
                if "total" not in data or "offset" not in data or "limit" not in data:
                    response.failure("Missing pagination metadata")
            elif response.status_code == 429:
                response.success()
            else:
                response.failure(f"Unexpected status: {response.status_code}")

    @tag('read', 'withdrawals')
    @task(3)
    def get_withdrawal_history(self):
        """Test withdrawal history endpoint"""
        if not self.user_id:
            return

        params = {
            "limit": 20,
            "offset": random.randint(0, 50)
        }

        with self.client.get("/api/withdrawals",
                           params=params,
                           catch_response=True) as response:
            if response.status_code in [200, 429]:
                response.success()
            else:
                response.failure(f"Unexpected status: {response.status_code}")


class WriteOperations(TaskSet):
    """Task set for write operations (withdrawals)"""

    @tag('write', 'withdrawal')
    @task
    def initiate_withdrawal(self):
        """Test withdrawal initiation with idempotency"""
        if not self.user_id:
            return

        # Generate test withdrawal data
        withdrawal_data = {
            "asset": "USDT",
            "network": "TRC20",
            "amount_crypto": round(random.uniform(10, 100), 6),  # Random amount
            "to_address": "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuW9",  # Test address
            "memo": f"Load test withdrawal {random.randint(1000, 9999)}"
        }

        # Add idempotency key to test rate limiting
        headers = {
            "Idempotency-Key": self.generate_idempotency_key()
        }

        with self.client.post("/api/withdrawals/initiate",
                            json=withdrawal_data,
                            headers=headers,
                            catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 429:
                # Rate limited - expected
                response.success()
            elif response.status_code == 400:
                # Validation error - check if it's expected
                data = response.json()
                if "insufficient balance" in data.get("detail", "").lower():
                    response.success()  # Expected for test users
                else:
                    response.failure(f"Unexpected validation error: {data}")
            else:
                response.failure(f"Unexpected status: {response.status_code}")


class HealthCheckUser(FastHttpUser):
    """User for health check endpoint testing"""

    wait_time = between(5, 15)  # Less frequent health checks
    network_timeout = 10.0

    @tag('health')
    @task
    def health_check(self):
        """Test health check endpoint"""
        with self.client.get("/api/health", catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                if "status" not in data or data["status"] != "healthy":
                    response.failure("Health check returned unhealthy status")
            else:
                response.failure(f"Health check failed: {response.status_code}")


class ReadOnlyUser(ApiUser):
    """User that only performs read operations"""
    tasks = [ReadOperations]


class WriteUser(ApiUser):
    """User that performs write operations (withdrawals)"""
    tasks = [WriteOperations]


class MixedUser(ApiUser):
    """User that performs both read and write operations"""
    tasks = [ReadOperations, WriteOperations]


# Configuration for different test scenarios
class QuickTest(MixedUser):
    """Quick smoke test - 10 users for 1 minute"""
    min_wait = 1000  # 1 second
    max_wait = 3000  # 3 seconds


class ReadLoadTest(ReadOnlyUser):
    """Read-heavy load test - simulates browsing users"""
    min_wait = 1000
    max_wait = 5000


class WriteLoadTest(WriteUser):
    """Write-heavy load test - simulates active trading users"""
    min_wait = 2000
    max_wait = 8000


class StressTest(MixedUser):
    """Full stress test with mixed operations"""
    min_wait = 500   # Faster requests
    max_wait = 2000