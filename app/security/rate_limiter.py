"""
Rate Limiter Middleware
Provides in-memory rate limiting for API endpoints
For production, consider using Redis-based rate limiting
"""
import time
from collections import defaultdict
from typing import Dict, Tuple, Optional
from fastapi import Request, HTTPException, status
from starlette.responses import JSONResponse

from app.core.config import settings


class RateLimiter:
    """In-memory rate limiter for API endpoints"""

    def __init__(self):
        # Storage: {(key, window): [timestamps]}
        self._storage: Dict[Tuple[str, int], list] = defaultdict(list)
        self._cleanup_interval = 300  # Clean up old entries every 5 minutes

    def _get_key(self, request: Request, key_type: str) -> str:
        """Generate rate limit key based on type"""
        if key_type == "user":
            # For authenticated endpoints, use user ID
            user = getattr(request.state, 'user', None)
            if user:
                return f"user:{user.id}"
            # Fallback to IP if no user
            return f"ip:{request.client.host}"
        elif key_type == "ip":
            return f"ip:{request.client.host}"
        else:
            return f"ip:{request.client.host}"

    def _cleanup_old_entries(self) -> None:
        """Remove old entries from storage"""
        current_time = time.time()
        cutoff = current_time - 3600  # Remove entries older than 1 hour

        keys_to_remove = []
        for key, timestamps in self._storage.items():
            # Keep only timestamps within the last hour
            self._storage[key] = [ts for ts in timestamps if ts > cutoff]
            if not self._storage[key]:
                keys_to_remove.append(key)

        for key in keys_to_remove:
            del self._storage[key]

    def _is_allowed(self, key: str, window_seconds: int, max_requests: int) -> bool:
        """Check if request is allowed under rate limit"""
        current_time = time.time()
        window_key = (key, window_seconds)

        # Clean up old entries periodically
        if int(current_time) % self._cleanup_interval == 0:
            self._cleanup_old_entries()

        # Remove old timestamps outside the window
        cutoff = current_time - window_seconds
        self._storage[window_key] = [
            ts for ts in self._storage[window_key]
            if ts > cutoff
        ]

        # Check if under limit
        if len(self._storage[window_key]) < max_requests:
            self._storage[window_key].append(current_time)
            return True

        return False

    def check_rate_limit(
        self,
        request: Request,
        key_type: str = "ip",
        window_seconds: int = 60,
        max_requests: int = 10
    ) -> None:
        """Check rate limit and raise exception if exceeded"""
        key = self._get_key(request, key_type)

        if not self._is_allowed(key, window_seconds, max_requests):
            # Calculate retry-after header
            current_time = time.time()
            window_key = (key, window_seconds)
            if self._storage[window_key]:
                oldest_timestamp = min(self._storage[window_key])
                retry_after = window_seconds - int(current_time - oldest_timestamp)
                retry_after = max(1, retry_after)
            else:
                retry_after = window_seconds

            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "Too many requests",
                    "message": f"Rate limit exceeded. Try again in {retry_after} seconds.",
                    "retry_after": retry_after
                }
            )


# Global rate limiter instance
rate_limiter = RateLimiter()


# Rate limit configurations
# In development, use more lenient limits; in production, use stricter limits
_is_dev = settings.ENV.lower() in ["dev", "development", "local"]

RATE_LIMITS = {
    # Auth endpoints - more lenient in development
    "auth_login": {"window_seconds": 60, "max_requests": 30 if _is_dev else 10, "key_type": "ip"},
    "auth_register": {"window_seconds": 60, "max_requests": 15 if _is_dev else 5, "key_type": "ip"},

    # Withdrawal endpoints
    "withdraw_initiate": {"window_seconds": 60, "max_requests": 5, "key_type": "user"},
    "withdraw_admin_execute": {"window_seconds": 60, "max_requests": 30, "key_type": "user"},
    "withdraw_admin_retry": {"window_seconds": 60, "max_requests": 30, "key_type": "user"},

    # Deposit endpoints (admin operations)
    "deposit_admin_confirm": {"window_seconds": 60, "max_requests": 30, "key_type": "user"},
    "deposit_admin_retry": {"window_seconds": 60, "max_requests": 30, "key_type": "user"},

    # General API limits
    "api_read": {"window_seconds": 60, "max_requests": 120, "key_type": "ip"},
}


def get_rate_limit_config(endpoint: str) -> Optional[Dict]:
    """Get rate limit configuration for an endpoint"""
    return RATE_LIMITS.get(endpoint)