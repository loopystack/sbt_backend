from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Any
import httpx
from google.auth.transport import requests
from google.oauth2 import id_token
from decimal import Decimal

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_verified_user
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    verify_token,
    generate_verification_token,
    generate_reset_token
)
from app.core.config import settings
from app.models.user import User, EmailVerification, PasswordReset
from app.schemas.auth import (
    Token,
    ForgotPassword,
    ResetPassword,
    EmailVerification as EmailVerificationSchema,
    RefreshTokenRequest,
    ChangePassword,
    ResendVerificationEmail,
    GoogleAuthResponse
)
from app.schemas.user import UserCreate, UserResponse
from app.services.email_service import email_service
from app.services.transaction_service import TransactionService

router = APIRouter()


@router.get("/test")
async def get_test():
    print('root')
    return {"message": "Soccer Betting API"}

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Register a new user"""
    # Check if user already exists
    stmt = select(User).where(
        (User.email == user_data.email) | (User.username == user_data.username)
    )
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        if existing_user.email == user_data.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        is_active=True,
        is_verified=False
    )
    
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    
    # Create email verification token
    verification_token = generate_verification_token()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    
    email_verification = EmailVerification(
        user_id=db_user.id,
        email=db_user.email,
        token=verification_token,
        expires_at=expires_at
    )
    
    db.add(email_verification)
    await db.commit()
    
    # Send verification email
    await email_service.send_verification_email(
        email=db_user.email,
        username=db_user.username,
        verification_token=verification_token
    )
    
    return db_user


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Login user and return access token"""
    # Find user by email or username
    stmt = select(User).where(
        (User.email == form_data.username) | (User.username == form_data.username)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Update last login
    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    
    # Create tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/refresh", response_model=Token)
async def refresh_access_token(
    refresh_data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token"""
    payload = verify_token(refresh_data.refresh_token, "refresh")
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Verify user exists and is active
    stmt = select(User).where(User.id == int(user_id), User.is_active == True)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Create new tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }


@router.post("/verify-email")
async def verify_email(
    verification_data: EmailVerificationSchema,
    db: AsyncSession = Depends(get_db)
):
    """Verify user email with token"""
    # Find verification record
    stmt = select(EmailVerification).where(
        and_(
            EmailVerification.token == verification_data.token,
            EmailVerification.is_used == False,
            EmailVerification.expires_at > datetime.now(timezone.utc)
        )
    )
    result = await db.execute(stmt)
    verification = result.scalar_one_or_none()
    
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    # Find user and update verification status
    stmt = select(User).where(User.id == verification.user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update user verification status
    user.is_verified = True
    verification.is_used = True
    
    await db.commit()
    
    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
async def resend_verification_email(
    resend_data: ResendVerificationEmail,
    db: AsyncSession = Depends(get_db)
):
    """Resend email verification"""
    # Find user
    stmt = select(User).where(User.email == resend_data.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        # Don't reveal if email exists
        return {"message": "If the email exists, a verification email has been sent"}
    
    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already verified"
        )
    
    # Create new verification token
    verification_token = generate_verification_token()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    
    email_verification = EmailVerification(
        user_id=user.id,
        email=user.email,
        token=verification_token,
        expires_at=expires_at
    )
    
    db.add(email_verification)
    await db.commit()
    
    # Send verification email
    await email_service.send_verification_email(
        email=user.email,
        username=user.username,
        verification_token=verification_token
    )
    
    return {"message": "Verification email sent"}


@router.post("/forgot-password")
async def forgot_password(
    forgot_data: ForgotPassword,
    db: AsyncSession = Depends(get_db)
):
    """Send password reset email"""
    # Find user
    stmt = select(User).where(User.email == forgot_data.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        # Don't reveal if email exists
        return {"message": "If the email exists, a password reset email has been sent"}
    
    # Create password reset token
    reset_token = generate_reset_token()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    password_reset = PasswordReset(
        user_id=user.id,
        email=user.email,
        token=reset_token,
        expires_at=expires_at
    )
    
    db.add(password_reset)
    await db.commit()
    
    # Send password reset email
    await email_service.send_password_reset_email(
        email=user.email,
        username=user.username,
        reset_token=reset_token
    )
    
    return {"message": "Password reset email sent"}


@router.post("/reset-password")
async def reset_password(
    reset_data: ResetPassword,
    db: AsyncSession = Depends(get_db)
):
    """Reset password with token"""
    # Find password reset record
    stmt = select(PasswordReset).where(
        and_(
            PasswordReset.token == reset_data.token,
            PasswordReset.is_used == False,
            PasswordReset.expires_at > datetime.now(timezone.utc)
        )
    )
    result = await db.execute(stmt)
    reset_record = result.scalar_one_or_none()
    
    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Find user and update password
    stmt = select(User).where(User.id == reset_record.user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update password
    user.hashed_password = get_password_hash(reset_data.new_password)
    reset_record.is_used = True
    
    await db.commit()
    
    return {"message": "Password reset successfully"}


@router.post("/change-password")
async def change_password(
    password_data: ChangePassword,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Change user password"""
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    
    # Update password
    current_user.hashed_password = get_password_hash(password_data.new_password)
    await db.commit()
    
    return {"message": "Password changed successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    return current_user


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user profile information"""
    try:
        # Extract data from the request
        username = profile_data.get('username')
        full_name = profile_data.get('full_name')
        avatar = profile_data.get('avatar')
        
        # Validate username uniqueness if provided
        if username and username != current_user.username:
            stmt = select(User).where(User.username == username)
            result = await db.execute(stmt)
            existing_user = result.scalar_one_or_none()
            
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )
        
        # Update user fields
        if username is not None:
            current_user.username = username
        if full_name is not None:
            current_user.full_name = full_name
        if avatar is not None:
            current_user.avatar = avatar
        
        # Save changes to database
        await db.commit()
        await db.refresh(current_user)
        
        return current_user
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}"
        )


@router.get("/funds")
async def get_user_funds(
    current_user: User = Depends(get_current_user)
):
    """Get current user's funds in USD"""
    return {
        "funds_usd": float(current_user.funds_usd),
        "formatted_funds": f"${float(current_user.funds_usd):,.2f}"
    }


# Simple rate limiting for funds/add endpoint
user_last_funds_add = {}

@router.post("/funds/add")
async def add_funds(
    amount_data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add funds to user account (for testing/admin purposes)"""
    import logging
    import time
    
    logger = logging.getLogger(__name__)
    call_id = str(int(time.time() * 1000))[-6:]  # Last 6 digits of timestamp
    
    try:
        amount = float(amount_data.get('amount', 0))
        
        # Rate limiting: prevent multiple calls within 2 seconds
        current_time = time.time()
        user_id = current_user.id
        if user_id in user_last_funds_add:
            time_since_last = current_time - user_last_funds_add[user_id]
            if time_since_last < 2.0:  # 2 seconds cooldown
                logger.warning(f"[{call_id}] Rate limit: User {user_id} tried to add funds too quickly ({time_since_last:.2f}s ago)")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Please wait before adding funds again"
                )
        
        user_last_funds_add[user_id] = current_time
        
        logger.info(f"[{call_id}] Funds add request for user {user_id}: ${amount}")
        logger.info(f"[{call_id}] Current balance before: ${current_user.funds_usd}")
        
        if amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amount must be greater than 0"
            )
        
        # Create transaction record first
        await TransactionService.create_deposit_transaction(
            db=db,
            user_id=current_user.id,
            amount=amount,
            payment_method="admin_add",  # This is for testing/admin purposes
            extra_data={
                "admin_action": True,
                "call_id": call_id,
                "original_balance": float(current_user.funds_usd)
            }
        )
        
        # Add funds to user account
        current_user.funds_usd += Decimal(str(amount))
        await db.commit()
        await db.refresh(current_user)
        
        logger.info(f"[{call_id}] New balance after: ${current_user.funds_usd}")
        
        return {
            "message": f"Successfully added ${amount:.2f} to your account",
            "new_balance": float(current_user.funds_usd),
            "formatted_balance": f"${float(current_user.funds_usd):,.2f}"
        }
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid amount format"
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add funds: {str(e)}"
        )


@router.post("/funds/deduct")
async def deduct_funds(
    amount_data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Deduct funds from user account (for betting/purchases)"""
    try:
        amount = float(amount_data.get('amount', 0))
        
        if amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Amount must be greater than 0"
            )
        
        if current_user.funds_usd < amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient funds"
            )
        
        # Note: We don't create a transaction here anymore
        # The betting record creation will handle the transaction
        # This prevents duplicate transactions for the same bet
        
        # Deduct funds from user account
        current_user.funds_usd -= Decimal(str(amount))
        await db.commit()
        await db.refresh(current_user)
        
        return {
            "message": f"Successfully deducted ${amount:.2f} from your account",
            "new_balance": float(current_user.funds_usd),
            "formatted_balance": f"${float(current_user.funds_usd):,.2f}"
        }
        
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid amount format"
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to deduct funds: {str(e)}"
        )


@router.post("/google", response_model=GoogleAuthResponse)
async def google_auth(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Google OAuth authentication"""
    try:
        # Get the ID token from request body
        body = await request.json()
        id_token_str = body.get("id_token")
        
        if not id_token_str:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ID token is required"
            )
        
        # Verify the Google ID token
        idinfo = id_token.verify_oauth2_token(
            id_token_str, 
            requests.Request(), 
            settings.GOOGLE_CLIENT_ID
        )
        
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token issuer"
            )
        
        google_id = idinfo['sub']
        email = idinfo['email']
        name = idinfo.get('name', '')
        picture = idinfo.get('picture', '')
        
        # Check if user exists with this Google ID
        stmt = select(User).where(User.google_id == google_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            # Check if user exists with this email
            stmt = select(User).where(User.email == email)
            result = await db.execute(stmt)
            user = result.scalar_one_or_none()
            
            if user:
                # Link Google account to existing user
                user.google_id = google_id
                user.avatar_url = picture
                user.is_verified = True  # Google accounts are pre-verified
            else:
                # Create new user
                # Generate a unique username from email
                base_username = email.split('@')[0]
                username = base_username
                counter = 1
                
                while True:
                    stmt = select(User).where(User.username == username)
                    result = await db.execute(stmt)
                    existing = result.scalar_one_or_none()
                    if not existing:
                        break
                    username = f"{base_username}{counter}"
                    counter += 1
                
                user = User(
                    email=email,
                    username=username,
                    full_name=name,
                    google_id=google_id,
                    avatar_url=picture,
                    is_active=True,
                    is_verified=True,  # Google accounts are pre-verified
                    hashed_password=None  # No password for OAuth users
                )
                db.add(user)
        
        # Update last login
        user.last_login = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(user)
        
        # Create tokens
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "full_name": user.full_name,
                "avatar_url": user.avatar_url,
                "is_verified": user.is_verified
            }
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Google token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Google authentication failed: {str(e)}"
        )
