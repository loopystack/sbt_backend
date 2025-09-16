from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from google.auth.transport import requests
from google.oauth2 import id_token
from google_auth_oauthlib.flow import Flow
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User, EmailVerification
from app.services.email_service import email_service
from app.core.security import create_access_token, create_refresh_token

router = APIRouter()

# Google OAuth configuration
GOOGLE_CLIENT_CONFIG = {
    "web": {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": [settings.GOOGLE_REDIRECT_URI]
    }
}

@router.get("/google")
async def google_login():
    """Initiate Google OAuth login"""
    
    try:
        # Check if we have real Google credentials
        if settings.GOOGLE_CLIENT_ID == "your-google-client-id" or not settings.GOOGLE_CLIENT_ID:
            # Mock mode - redirect to mock callback
            mock_url = f"{settings.FRONTEND_URL}/mock-google-login"
            return {
                "authorization_url": mock_url,
                "state": "mock_state",
                "mock_mode": True
            }
        
        # Real Google OAuth flow - standard web app approach
        flow = Flow.from_client_config(
            GOOGLE_CLIENT_CONFIG,
            scopes=[
                "openid",
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/userinfo.profile"
            ],
            redirect_uri=settings.GOOGLE_REDIRECT_URI
        )
        
        # Generate authorization URL
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true'
        )
        
        return {
            "authorization_url": authorization_url,
            "state": state,
            "mock_mode": False
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate Google login: {str(e)}"
        )

@router.get("/mock-google-callback")
async def mock_google_callback(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Mock Google OAuth callback for testing"""
    try:
        # Mock user data
        google_id = "mock_google_123456789"
        email = "test.user@gmail.com"
        name = "Test User"
        picture = "https://via.placeholder.com/150"
        
        # Check if user already exists
        result = await db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        
        if user:
            # User exists, check if Google ID is linked
            if not user.google_id:
                user.google_id = google_id
                user.avatar_url = picture
                await db.commit()
        else:
            # Create new user
            user = User(
                email=email,
                username=email.split("@")[0],
                full_name=name,
                google_id=google_id,
                avatar_url=picture,
                is_verified=False,
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        
        # Generate activation token
        activation_token = secrets.token_urlsafe(32)
        activation_expires = datetime.utcnow() + timedelta(hours=24)
        
        # Delete any existing verification records for this user
        await db.execute(
            select(EmailVerification).where(EmailVerification.user_id == user.id)
        )
        existing_verifications = await db.execute(
            select(EmailVerification).where(EmailVerification.user_id == user.id)
        )
        for existing in existing_verifications.scalars().all():
            await db.delete(existing)
        
        # Create new verification record (id will be auto-generated)
        verification = EmailVerification(
            user_id=user.id,
            email=user.email,
            token=activation_token,
            expires_at=activation_expires,
            created_at=datetime.utcnow()
        )
        db.add(verification)
        
        await db.commit()
        
        # Send activation email
        await email_service.send_verification_email(
            email=user.email,
            username=user.username,
            verification_token=activation_token
        )
        
        # Redirect to frontend with success message
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/signin?message=activation_sent&mock=true",
            status_code=status.HTTP_302_FOUND
        )
        
    except Exception as e:
        print(f"Mock Google callback error: {str(e)}")
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/signin?error=mock_auth_failed",
            status_code=status.HTTP_302_FOUND
        )

@router.get("/google/callback")
async def google_callback(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Handle Google OAuth callback"""
    try:
        # Get the authorization code from the callback
        code = request.query_params.get("code")
        state = request.query_params.get("state")
        if not code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Authorization code not provided"
            )
        
        # Create OAuth flow
        flow = Flow.from_client_config(
            GOOGLE_CLIENT_CONFIG,
            scopes=[
                "openid",
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/userinfo.profile"
            ],
            redirect_uri=settings.GOOGLE_REDIRECT_URI
        )
        
        # Exchange code for token
        flow.fetch_token(code=code)
        # Get user info from Google
        credentials = flow.credentials
        id_info = id_token.verify_oauth2_token(
            credentials.id_token,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
        
        # Extract user information
        google_id = id_info.get("sub")
        email = id_info.get("email")
        name = id_info.get("name")
        picture = id_info.get("picture")
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not provided by Google"
            )
        
        # Check if user already exists
        result = await db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        
        if user:
            # User exists, check if Google ID is linked
            if not user.google_id:
                user.google_id = google_id
                user.avatar_url = picture
                await db.commit()
        else:
            # Create new user
            user = User(
                email=email,
                username=email.split("@")[0],  # Use email prefix as username
                full_name=name,
                google_id=google_id,
                avatar_url=picture,
                is_verified=False,  # Will be verified via email activation
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        
        # For Google OAuth users, mark as verified immediately (Google has already verified the email)
        user.is_verified = True
        await db.commit()
        
        # Generate JWT tokens for immediate login
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
        # Redirect directly to dashboard with tokens (no intermediate signin page)
        frontend_url = f"{settings.FRONTEND_URL}/dashboard?google_auth=success&access_token={access_token}&refresh_token={refresh_token}"
        return RedirectResponse(
            url=frontend_url,
            status_code=status.HTTP_302_FOUND
        )
        
    except Exception as e:
        print(f"Google callback error: {str(e)}")
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/signin?error=google_auth_failed",
            status_code=status.HTTP_302_FOUND
        )

@router.post("/activate")
async def activate_account(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """Activate account using token from email"""
    try:
        # Find verification record
        result = await db.execute(
            select(EmailVerification).where(EmailVerification.token == token)
        )
        verification = result.scalar_one_or_none()
        
        if not verification:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid activation token"
            )
        
        # Check if token is expired
        if verification.expires_at < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Activation token has expired"
            )
        
        # Get user
        user_result = await db.execute(
            select(User).where(User.id == verification.user_id)
        )
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User not found"
            )
        
        # Activate user
        user.is_verified = True
        user.updated_at = datetime.utcnow()
        
        # Delete verification record
        await db.delete(verification)
        await db.commit()
        
        # Generate tokens
        access_token = create_access_token(data={"sub": user.email})
        refresh_token = create_refresh_token(data={"sub": user.email})
        
        return {
            "message": "Account activated successfully",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "full_name": user.full_name,
                "is_verified": user.is_verified,
                "profile_picture": user.avatar_url
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to activate account: {str(e)}"
        )
