from datetime import datetime, timedelta, timezone
from typing import Any, Union, Optional
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings
import secrets
import string
import logging

# Password hashing
logger = logging.getLogger(__name__)

# Initialize password context with better error handling
try:
    # Use pbkdf2_sha256 as primary scheme due to bcrypt compatibility issues
    pwd_context = CryptContext(
        schemes=["pbkdf2_sha256"],
        deprecated="auto",
        pbkdf2_sha256__default_rounds=200000,  # High security rounds
        pbkdf2_sha256__min_rounds=100000,
        pbkdf2_sha256__max_rounds=1000000
    )
    logger.info("Password context initialized successfully with pbkdf2_sha256")
except Exception as e:
    logger.error(f"Failed to initialize pbkdf2_sha256 password context: {e}")
    try:
        # Fallback to bcrypt with minimal settings
        pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        logger.info("Fallback to bcrypt password context")
    except Exception as fallback_e:
        logger.error(f"Failed to initialize bcrypt password context: {fallback_e}")
        raise RuntimeError("Unable to initialize any password hashing scheme")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str, token_type: str = "access") -> Optional[dict]:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != token_type:
            return None
        return payload
    except JWTError:
        return None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    try:
        # Ensure password is a string
        if isinstance(plain_password, bytes):
            plain_password = plain_password.decode('utf-8')
        
        # Basic length validation (reasonable limits)
        if len(plain_password) > 1000:  # Reasonable upper limit
            logger.warning("Password length exceeds 1000 characters, rejecting")
            return False
        
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Password verification failed: {e}")
        return False


def get_password_hash(password: str) -> str:
    """Hash a password"""
    try:
        # Ensure password is a string
        if isinstance(password, bytes):
            password = password.decode('utf-8')
        
        # Basic length validation (reasonable limits)
        if len(password) > 1000:  # Reasonable upper limit
            raise ValueError("Password too long (max 1000 characters)")
        
        return pwd_context.hash(password)
    except ValueError as ve:
        logger.error(f"Password validation failed: {ve}")
        raise ve
    except Exception as e:
        logger.error(f"Password hashing failed: {e}")
        raise RuntimeError(f"Unable to hash password: {e}")


def generate_random_token(length: int = 32) -> str:
    """Generate a random token for email verification/password reset"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def generate_verification_token() -> str:
    """Generate email verification token"""
    return generate_random_token(48)


def generate_reset_token() -> str:
    """Generate password reset token"""
    return generate_random_token(64)
