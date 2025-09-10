from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    TEST_DATABASE_URL: Optional[str] = None
    
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Email SMTP Configuration
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str
    SMTP_PASSWORD: str
    SMTP_FROM_EMAIL: str
    SMTP_FROM_NAME: str = "Soccer Betting App"
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"
    
    # Frontend URL
    FRONTEND_URL: str = "http://localhost:3000"
    
    # App Configuration
    APP_NAME: str = "Soccer Betting API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Payment Configuration
    PAYMENT_MODE: str = "test"  # 'test' or 'live'
    
    # Blockchain Verification
    BLOCKCHAIN_TEST_MODE: str = "false"  # 'true' or 'false'
    
    # Stripe API Keys
    STRIPE_TEST_SECRET_KEY: str = ""
    STRIPE_TEST_PUBLISHABLE_KEY: str = ""
    STRIPE_LIVE_SECRET_KEY: str = ""
    STRIPE_LIVE_PUBLISHABLE_KEY: str = ""
    
    # PayPal Configuration
    PAYPAL_CLIENT_ID: str = ""
    PAYPAL_CLIENT_SECRET: str = ""
    PAYPAL_MODE: str = "sandbox"  # 'sandbox' or 'live'
    
    @property
    def stripe_secret_key(self) -> str:
        """Get the appropriate Stripe secret key based on payment mode"""
        if self.PAYMENT_MODE == "live":
            return self.STRIPE_LIVE_SECRET_KEY
        else:
            return self.STRIPE_TEST_SECRET_KEY
    
    @property
    def stripe_publishable_key(self) -> str:
        """Get the appropriate Stripe publishable key based on payment mode"""
        if self.PAYMENT_MODE == "live":
            return self.STRIPE_LIVE_PUBLISHABLE_KEY
        else:
            return self.STRIPE_TEST_PUBLISHABLE_KEY

    model_config = {
        "env_file": ".env",
        "case_sensitive": True
    }


settings = Settings()
