from fastapi import Depends, HTTPException, status
from app.core.deps import get_current_user
from app.models.user import User
from typing import Optional

async def get_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current authenticated admin user. Only is_superuser grants admin access."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

async def get_superuser(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current authenticated superuser"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser access required"
        )
    
    return current_user
