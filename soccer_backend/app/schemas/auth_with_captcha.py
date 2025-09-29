from pydantic import BaseModel, EmailStr
from typing import Optional


class UserRegisterWithCaptcha(BaseModel):
    """Enhanced user registration schema with CAPTCHA"""
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    captcha_challenge_id: str
    captcha_answer: str


class UserLoginWithCaptcha(BaseModel):
    """Enhanced user login schema with CAPTCHA"""
    email: EmailStr
    password: str
    captcha_challenge_id: str
    captcha_answer: str


class PasswordResetWithCaptcha(BaseModel):
    """Enhanced password reset schema with CAPTCHA"""
    email: EmailStr
    captcha_challenge_id: str
    captcha_answer: str


class ForgotPasswordWithCaptcha(BaseModel):
    """Enhanced forgot password schema with CAPTCHA"""
    email: EmailStr
    captcha_challenge_id: str
    captcha_answer: str
