from fastapi import Depends, HTTPException, status
from app.core.deps import get_current_user
from app.core.config import settings
from app.models.user import User
from typing import Optional, Set

def _admin_emails_set() -> Set[str]:
    """Parse ADMIN_EMAILS (comma-separated) into a set of lowercased emails."""
    if not settings.ADMIN_EMAILS or not settings.ADMIN_EMAILS.strip():
        return set()
    return {e.strip().lower() for e in settings.ADMIN_EMAILS.split(",") if e.strip()}


async def get_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current authenticated admin user. Admin if is_superuser or email in ADMIN_EMAILS."""
    if current_user.is_superuser:
        return current_user
    if current_user.email and current_user.email.lower() in _admin_emails_set():
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin access required"
    )


async def get_superuser(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current authenticated superuser. Superuser if is_superuser or email in ADMIN_EMAILS."""
    if current_user.is_superuser:
        return current_user
    if current_user.email and current_user.email.lower() in _admin_emails_set():
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Superuser access required"
    )
