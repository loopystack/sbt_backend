"""
Admin IP Filter Middleware
Restricts admin endpoints to allowed IP addresses in production
"""
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class AdminIPFilterMiddleware(BaseHTTPMiddleware):
    """Middleware to restrict admin endpoints by IP address in production"""

    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.allowed_ips = self._parse_allowed_ips()

    def _parse_allowed_ips(self) -> set:
        """Parse comma-separated IP allowlist"""
        if not settings.ADMIN_IP_ALLOWLIST:
            return set()

        return set(ip.strip() for ip in settings.ADMIN_IP_ALLOWLIST.split(',') if ip.strip())

    async def dispatch(self, request: Request, call_next):
        # Only apply IP filtering in production and when allowlist is configured
        if settings.ENV != "production" or not self.allowed_ips:
            return await call_next(request)

        # Check if this is an admin endpoint
        if not request.url.path.startswith("/api/admin/"):
            return await call_next(request)

        # Get client IP (considering X-Forwarded-For from reverse proxy)
        client_ip = self._get_client_ip(request)

        if client_ip not in self.allowed_ips:
            logger.warning(f"Blocked admin access attempt from IP: {client_ip} for path: {request.url.path}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Admin endpoints are restricted to authorized IP addresses."
            )

        return await call_next(request)

    def _get_client_ip(self, request: Request) -> str:
        """Get the real client IP, considering reverse proxy headers"""
        # Check X-Forwarded-For header first (set by reverse proxy)
        x_forwarded_for = request.headers.get("X-Forwarded-For")
        if x_forwarded_for:
            # X-Forwarded-For can contain multiple IPs, take the first one
            client_ip = x_forwarded_for.split(',')[0].strip()
            if client_ip:
                return client_ip

        # Fallback to direct remote address
        return request.client.host if request.client else "unknown"