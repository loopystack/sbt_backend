from pydantic_settings import BaseSettings
from pydantic import model_validator
from typing import Optional
from decimal import Decimal

# Default localhost IP - can be overridden by environment variable
DEFAULT_LOCALHOST_IP = "152.42.167.41"
DEFAULT_BACKEND_PORT = 5001

class Settings(BaseSettings):
    # Environment Configuration
    ENV: str = "dev"  # 'dev', 'staging', 'production'

    # Database
    DATABASE_URL: str
    TEST_DATABASE_URL: Optional[str] = None
    
    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours (much more reasonable)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30     # 30 days (extended refresh)
    
    # Email: SMTP (Gmail etc.) or SendGrid API (recommended on VPS where SMTP ports are blocked)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 465
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "Soccer Betting App"
    SENDGRID_API_KEY: Optional[str] = None  # If set, emails are sent via SendGrid Web API (no SMTP ports needed)
    
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
    
    # TRON API Configuration
    TRON_API_BASE_URL: str = "https://api.trongrid.io"  # TronGrid API base URL
    TRON_API_KEY: Optional[str] = None  # Optional API key for higher rate limits
    TRON_USDT_CONTRACT: str = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"  # USDT TRC20 contract address
    TRON_CONFIRMATIONS_REQUIRED: int = 2  # Required confirmations for deposits
    DEPOSIT_SCAN_INTERVAL_SECONDS: int = 60  # How often to scan for deposits
    DEPOSIT_INTENT_EXPIRY_HOURS: int = 24  # Deposit intent expiry time
    
    # TRON Hot Wallet Configuration (Withdrawal Execution)
    TRON_HOT_WALLET_ADDRESS: Optional[str] = None  # Hot wallet address for withdrawals
    TRON_HOT_WALLET_PRIVATE_KEY: Optional[str] = None  # Private key (hex format) - NEVER LOG THIS
    TRON_WITHDRAW_CONFIRMATIONS_REQUIRED: int = 2  # Required confirmations for withdrawals
    TRON_WITHDRAW_MIN_AMOUNT: Optional[Decimal] = None  # Minimum withdrawal amount (optional)
    TRON_WITHDRAW_MAX_AMOUNT: Optional[Decimal] = None  # Maximum withdrawal amount (optional)
    WITHDRAW_EXECUTION_INTERVAL_SECONDS: int = 60  # How often to process withdrawals
    WITHDRAWAL_AUTO_EXECUTE: bool = False  # Auto-execute approved withdrawals (default: manual)
    WITHDRAWAL_CONFIRM_TIMEOUT_MINUTES: int = 60  # Timeout for stuck transactions (On-Chain Execution)

    # Monitoring & Alerting (Production Monitoring)
    ALERTS_ENABLED: bool = True
    ALERT_EMAIL_TO: Optional[str] = None  # Email address for alerts
    ALERT_WEBHOOK_URL: Optional[str] = None  # Webhook URL for alerts

    MONITORING_INTERVAL_SECONDS: int = 60  # How often monitoring worker runs
    HEARTBEAT_STALE_THRESHOLD_MINUTES: int = 5  # When to alert on stale heartbeats

    DEPOSIT_STUCK_THRESHOLD_MINUTES: int = 30  # Alert on deposits stuck longer than this
    WITHDRAWAL_STUCK_THRESHOLD_MINUTES: int = 30  # Alert on stuck withdrawals

    HOT_WALLET_USDT_THRESHOLD: Decimal = Decimal("100.0")  # Alert when USDT balance below this
    HOT_WALLET_TRX_THRESHOLD: Decimal = Decimal("1000.0")  # Alert when TRX balance below this

    RECON_TOLERANCE_USDT: Decimal = Decimal("1.0")  # Reconciliation tolerance (ok if delta <= this)

    # Rate Limiting Configuration
    RATE_LIMITING_ENABLED: bool = True

    # Admin Security Configuration
    ADMIN_IP_ALLOWLIST: Optional[str] = None  # Comma-separated IPs, e.g., "192.168.1.100,10.0.0.1"
    # Emails that are always treated as admin (e.g. for testing). Still requires valid auth; overrides is_superuser if not set in DB.
    ADMIN_EMAILS: Optional[str] = None  # Comma-separated, e.g. "adminuser@gmail.com"

    # Environment-Specific Features
    ALLOW_ADMIN_SIMULATION: bool = True  # Allow admin deposit/withdrawal simulation (staging only)
    
    @model_validator(mode='after')
    def sync_urls_with_localhost_ip(self):
        """Update URLs to match LOCALHOST_IP if it was changed via environment variable"""
        # For local development, auto-construct URLs from LOCALHOST_IP/BACKEND_PORT
        # so you don't need to keep .env and code in sync.
        if self.LOCALHOST_IP in ("127.0.0.1", "localhost"):
            self.GOOGLE_REDIRECT_URI = f"http://{self.LOCALHOST_IP}:{self.BACKEND_PORT}/api/auth/google/callback"
            # Local dev frontend runs on Vite (5173)
            self.FRONTEND_URL = f"http://{self.LOCALHOST_IP}:5173"
        # For non-local environments (staging/production), trust explicit env vars:
        # - GOOGLE_REDIRECT_URI
        # - FRONTEND_URL
        # This lets you use HTTPS and custom domains.
        return self

    @model_validator(mode='after')
    def enforce_production_safety_rules(self):
        """Enforce safety rules for production; auto-fix values so app can start (e.g. on staging)."""
        if self.ENV == "production":
            if self.DEBUG:
                self.DEBUG = False
            if self.BLOCKCHAIN_TEST_MODE.lower() == "true":
                self.BLOCKCHAIN_TEST_MODE = "false"
            if self.PAYMENT_MODE.lower() == "test":
                self.PAYMENT_MODE = "live"
            if self.ALLOW_ADMIN_SIMULATION:
                self.ALLOW_ADMIN_SIMULATION = False
            # TRON_* and ROLLBAR_ACCESS_TOKEN are not forced; set them in env for full production.
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
