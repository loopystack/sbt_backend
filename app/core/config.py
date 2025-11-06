from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import Optional

# Default localhost IP - can be overridden by environment variable
DEFAULT_LOCALHOST_IP = "35.159.122.94"
DEFAULT_BACKEND_PORT = 5001

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    TEST_DATABASE_URL: Optional[str] = None
    
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours (much more reasonable)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30     # 30 days (extended refresh)
    
    # Email SMTP Configuration
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 465
    SMTP_USERNAME: str
    SMTP_PASSWORD: str
    SMTP_FROM_EMAIL: str
    SMTP_FROM_NAME: str = "Soccer Betting App"
    
    # IP Address Configuration
    LOCALHOST_IP: str = DEFAULT_LOCALHOST_IP
    BACKEND_PORT: int = DEFAULT_BACKEND_PORT
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = "700550723594-eepho7l9d04n0im6qs04jb03gpqivk97.apps.googleusercontent.com"
    GOOGLE_CLIENT_SECRET: str = "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"
    GOOGLE_REDIRECT_URI: str = "http://{LOCALHOST_IP}:5001/api/auth/google/callback"
    
    # Frontend URL
    FRONTEND_URL: str = "http://{LOCALHOST_IP}:5173"
    
    # App Configuration
    APP_NAME: str = "Soccer Betting Platform" 
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Payment Configuration
    PAYMENT_MODE: str = "test"  # 'test' or 'live'
    
    # Blockchain Verification
    BLOCKCHAIN_TEST_MODE: str = "false"  # 'true' or 'false'
    
    # Stripe API Keys
    STRIPE_TEST_SECRET_KEY: str = "sk_test_51Rgrh93T5FbZuPOdDCyXaP3lGcyyQ4sHINuOouajd1WWCRTYS7RFnBWiJOw5FTfCixXkhn1cyESAzpVWHzhujBG8003q0kSbOt"
    STRIPE_TEST_PUBLISHABLE_KEY: str = "pk_test_51Rgrh93T5FbZuPOdE4BCOM8K2qji0kivAxaCwK3AQwMaTLj54awtW0xsIbqcTwVDijIVTc5xw6XjdBywMPDcnMuz008Kg0KjMD"
    STRIPE_LIVE_SECRET_KEY: str = ""
    STRIPE_LIVE_PUBLISHABLE_KEY: str = ""
    
    # PayPal Configuration
    PAYPAL_CLIENT_ID: str = ""
    PAYPAL_CLIENT_SECRET: str = ""
    PAYPAL_MODE: str = "sandbox"  # 'sandbox' or 'live'
    
    # Google reCAPTCHA Configuration
    RECAPTCHA_SITE_KEY: str = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
    RECAPTCHA_SECRET_KEY: str = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"
    
    # Rollbar Error Tracking Configuration
    ROLLBAR_ACCESS_TOKEN: Optional[str] = None
    ROLLBAR_ENVIRONMENT: str = "development"
    ROLLBAR_ENABLED: bool = True
    
    @model_validator(mode='after')
    def sync_urls_with_localhost_ip(self):
        """Update URLs to match LOCALHOST_IP if it was changed via environment variable"""
        # Reconstruct URLs based on actual LOCALHOST_IP value (in case it was overridden)
        self.GOOGLE_REDIRECT_URI = f"http://{self.LOCALHOST_IP}:{self.BACKEND_PORT}/api/auth/google/callback"
        self.FRONTEND_URL = f"http://{self.LOCALHOST_IP}"
        return self
    
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
    
    @property
    def google_redirect_uri(self) -> str:
        """Get the Google OAuth redirect URI, constructing it if not set"""
        if self.GOOGLE_REDIRECT_URI:
            return self.GOOGLE_REDIRECT_URI
        return f"http://{self.LOCALHOST_IP}:{self.BACKEND_PORT}/api/auth/google/callback"
    
    @property
    def frontend_base_url(self) -> str:
        """Get the frontend base URL (localhost)"""
        return f"http://{self.LOCALHOST_IP}"
    
    @property
    def frontend_url(self) -> str:
        """Get the frontend URL, constructing it if not set"""
        if self.FRONTEND_URL:
            return self.FRONTEND_URL
        return self.frontend_base_url

    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"  # Ignore extra environment variables
    }


settings = Settings()
