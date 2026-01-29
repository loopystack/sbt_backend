"""
Rate Limit Middleware
Applies rate limiting to FastAPI endpoints based on endpoint patterns
"""
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Optional

from app.security.rate_limiter import rate_limiter, get_rate_limit_config
from app.core.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware to apply rate limiting based on endpoint patterns"""

    def _is_localhost(self, request: Request) -> bool:
        """Check if request is from localhost"""
        client_host = request.client.host if request.client else None
        if not client_host:
            return False
        return client_host in ["127.0.0.1", "localhost", "::1"] or client_host.startswith("192.168.") or client_host.startswith("10.")

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks and static files
        if request.url.path in ["/api/health", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)

        # Skip OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)

        # Skip rate limiting for localhost in development
        if settings.ENV.lower() in ["dev", "development", "local"] and self._is_localhost(request):
            return await call_next(request)

        # Determine endpoint type and apply rate limiting
        endpoint_key = self._get_endpoint_key(request)

        if endpoint_key:
            config = get_rate_limit_config(endpoint_key)
            if config:
                try:
                    rate_limiter.check_rate_limit(
                        request=request,
                        key_type=config["key_type"],
                        window_seconds=config["window_seconds"],
                        max_requests=config["max_requests"]
                    )
                except HTTPException as e:
                    # Convert to proper JSON response with CORS headers
                    # Since we're returning early, CORS middleware won't process this response
                    from starlette.responses import JSONResponse
                    origin = request.headers.get("origin")
                    cors_headers = {}
                    if origin:
                        # Allow common localhost origins for development
                        allowed_origins = [
                            "http://localhost:5173",
                            "http://127.0.0.1:5173",
                            "http://localhost:3000",
                            "http://127.0.0.1:3000",
                            "http://localhost:5000",
                            "http://127.0.0.1:5000",
                        ]
                        # Also check if it matches localhost pattern
                        if origin in allowed_origins or any(origin.startswith(prefix) for prefix in ["http://localhost", "http://127.0.0.1"]):
                            cors_headers["Access-Control-Allow-Origin"] = origin
                            cors_headers["Access-Control-Allow-Credentials"] = "true"
                            cors_headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
                            cors_headers["Access-Control-Allow-Headers"] = "*"
                    return JSONResponse(
                        status_code=e.status_code,
                        content=e.detail,
                        headers={
                            **cors_headers,
                            "Retry-After": str(e.detail.get("retry_after", 60))
                        }
                    )

        # Continue with request
        response = await call_next(request)
        return response

    def _get_endpoint_key(self, request: Request) -> Optional[str]:
        """Determine which rate limit key to use based on request"""
        path = request.url.path
        method = request.method

        # Auth endpoints
        if path.startswith("/api/auth/") and method == "POST":
            if "login" in path:
                return "auth_login"
            elif "register" in path:
                return "auth_register"

        # Withdrawal endpoints
        elif path.startswith("/api/withdrawals/"):
            if path.endswith("/initiate") and method == "POST":
                return "withdraw_initiate"
            elif "/admin/" in path and method == "POST":
                if "execute" in path or "approve" in path:
                    return "withdraw_admin_execute"
                elif "retry" in path:
                    return "withdraw_admin_retry"

        # Deposit admin endpoints
        elif path.startswith("/api/deposits/admin/") and method == "POST":
            if "confirm" in path or "simulate" in path:
                return "deposit_admin_confirm"
            elif "retry" in path:
                return "deposit_admin_retry"

        # General API read limits
        elif path.startswith("/api/") and method == "GET":
            return "api_read"

        return None