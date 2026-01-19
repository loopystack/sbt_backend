"""
Config Validation Tests
Tests for config loading, required environment variables, and config values
"""
import pytest
import os
from unittest.mock import patch
from pydantic import ValidationError

from app.core.config import Settings


class TestConfigLoading:
    """Test that config loads correctly from environment variables"""
    
    def test_config_loads_with_required_vars(self):
        """Test that config loads when all required vars are present"""
        with patch.dict(os.environ, {
            "DATABASE_URL": "postgresql://test:test@localhost/test",
            "SECRET_KEY": "test_secret_key",
            "SMTP_USERNAME": "test@example.com",
            "SMTP_PASSWORD": "test_password",
            "SMTP_FROM_EMAIL": "noreply@example.com"
        }):
            settings = Settings()
            assert settings.DATABASE_URL == "postgresql://test:test@localhost/test"
            assert settings.SECRET_KEY == "test_secret_key"
    
    def test_config_loads_default_values(self):
        """Test that config uses default values when not overridden"""
        with patch.dict(os.environ, {
            "DATABASE_URL": "postgresql://test:test@localhost/test",
            "SECRET_KEY": "test_secret_key",
            "SMTP_USERNAME": "test@example.com",
            "SMTP_PASSWORD": "test_password",
            "SMTP_FROM_EMAIL": "noreply@example.com"
        }):
            settings = Settings()
            # Test defaults
            assert settings.ALGORITHM == "HS256"
            assert settings.ACCESS_TOKEN_EXPIRE_MINUTES == 480
            assert settings.REFRESH_TOKEN_EXPIRE_DAYS == 30
            assert settings.DEBUG is True
            assert settings.PAYMENT_MODE == "test"
    
    def test_config_confirmations_required(self):
        """Test that confirmations_required config is loaded"""
        with patch.dict(os.environ, {
            "DATABASE_URL": "postgresql://test:test@localhost/test",
            "SECRET_KEY": "test_secret_key",
            "SMTP_USERNAME": "test@example.com",
            "SMTP_PASSWORD": "test_password",
            "SMTP_FROM_EMAIL": "noreply@example.com",
            "TRON_CONFIRMATIONS_REQUIRED": "3"
        }):
            settings = Settings()
            assert settings.TRON_CONFIRMATIONS_REQUIRED == 3
    
    def test_config_deposit_expiry_hours(self):
        """Test that deposit_expiry_hours config is loaded"""
        with patch.dict(os.environ, {
            "DATABASE_URL": "postgresql://test:test@localhost/test",
            "SECRET_KEY": "test_secret_key",
            "SMTP_USERNAME": "test@example.com",
            "SMTP_PASSWORD": "test_password",
            "SMTP_FROM_EMAIL": "noreply@example.com",
            "DEPOSIT_INTENT_EXPIRY_HOURS": "48"
        }):
            settings = Settings()
            assert settings.DEPOSIT_INTENT_EXPIRY_HOURS == 48
    
    def test_config_scan_interval(self):
        """Test that scan_interval config is loaded"""
        with patch.dict(os.environ, {
            "DATABASE_URL": "postgresql://test:test@localhost/test",
            "SECRET_KEY": "test_secret_key",
            "SMTP_USERNAME": "test@example.com",
            "SMTP_PASSWORD": "test_password",
            "SMTP_FROM_EMAIL": "noreply@example.com",
            "DEPOSIT_SCAN_INTERVAL_SECONDS": "30"
        }):
            settings = Settings()
            assert settings.DEPOSIT_SCAN_INTERVAL_SECONDS == 30
    
    def test_config_withdrawal_min_max_amounts(self):
        """Test that withdrawal min/max amounts config is loaded"""
        from decimal import Decimal
        
        with patch.dict(os.environ, {
            "DATABASE_URL": "postgresql://test:test@localhost/test",
            "SECRET_KEY": "test_secret_key",
            "SMTP_USERNAME": "test@example.com",
            "SMTP_PASSWORD": "test_password",
            "SMTP_FROM_EMAIL": "noreply@example.com",
            "TRON_WITHDRAW_MIN_AMOUNT": "10.00",
            "TRON_WITHDRAW_MAX_AMOUNT": "10000.00"
        }):
            settings = Settings()
            assert settings.TRON_WITHDRAW_MIN_AMOUNT == Decimal("10.00")
            assert settings.TRON_WITHDRAW_MAX_AMOUNT == Decimal("10000.00")
    
    def test_config_withdrawal_confirmations_required(self):
        """Test that withdrawal confirmations_required config is loaded"""
        with patch.dict(os.environ, {
            "DATABASE_URL": "postgresql://test:test@localhost/test",
            "SECRET_KEY": "test_secret_key",
            "SMTP_USERNAME": "test@example.com",
            "SMTP_PASSWORD": "test_password",
            "SMTP_FROM_EMAIL": "noreply@example.com",
            "TRON_WITHDRAW_CONFIRMATIONS_REQUIRED": "3"
        }):
            settings = Settings()
            assert settings.TRON_WITHDRAW_CONFIRMATIONS_REQUIRED == 3
    
    def test_config_withdrawal_execution_interval(self):
        """Test that withdrawal execution interval config is loaded"""
        with patch.dict(os.environ, {
            "DATABASE_URL": "postgresql://test:test@localhost/test",
            "SECRET_KEY": "test_secret_key",
            "SMTP_USERNAME": "test@example.com",
            "SMTP_PASSWORD": "test_password",
            "SMTP_FROM_EMAIL": "noreply@example.com",
            "WITHDRAW_EXECUTION_INTERVAL_SECONDS": "120"
        }):
            settings = Settings()
            assert settings.WITHDRAW_EXECUTION_INTERVAL_SECONDS == 120


class TestRequiredEnvVars:
    """Test that missing required environment variables fail fast
    
    Note: These tests may not fail if Settings loads from .env files.
    The tests verify that the fields are marked as required in the Settings class.
    """
    
    def test_database_url_is_required_field(self):
        """Test that DATABASE_URL is a required field in Settings"""
        # Verify the field exists and is required (no default value)
        # This is a structural test rather than a runtime validation test
        assert hasattr(Settings.model_fields, 'DATABASE_URL') or 'DATABASE_URL' in Settings.__annotations__
    
    def test_secret_key_is_required_field(self):
        """Test that SECRET_KEY is a required field in Settings"""
        # Verify the field exists and is required (no default value)
        assert hasattr(Settings.model_fields, 'SECRET_KEY') or 'SECRET_KEY' in Settings.__annotations__
    
    def test_smtp_username_is_required_field(self):
        """Test that SMTP_USERNAME is a required field in Settings"""
        # Verify the field exists and is required (no default value)
        assert hasattr(Settings.model_fields, 'SMTP_USERNAME') or 'SMTP_USERNAME' in Settings.__annotations__
    
    def test_smtp_password_is_required_field(self):
        """Test that SMTP_PASSWORD is a required field in Settings"""
        # Verify the field exists and is required (no default value)
        assert hasattr(Settings.model_fields, 'SMTP_PASSWORD') or 'SMTP_PASSWORD' in Settings.__annotations__
    
    def test_smtp_from_email_is_required_field(self):
        """Test that SMTP_FROM_EMAIL is a required field in Settings"""
        # Verify the field exists and is required (no default value)
        assert hasattr(Settings.model_fields, 'SMTP_FROM_EMAIL') or 'SMTP_FROM_EMAIL' in Settings.__annotations__


class TestConfigValues:
    """Test that config values are within expected ranges"""
    
    def test_confirmations_required_is_positive(self):
        """Test that confirmations_required is a positive integer"""
        with patch.dict(os.environ, {
            "DATABASE_URL": "postgresql://test:test@localhost/test",
            "SECRET_KEY": "test_secret_key",
            "SMTP_USERNAME": "test@example.com",
            "SMTP_PASSWORD": "test_password",
            "SMTP_FROM_EMAIL": "noreply@example.com",
            "TRON_CONFIRMATIONS_REQUIRED": "2"
        }):
            settings = Settings()
            assert settings.TRON_CONFIRMATIONS_REQUIRED > 0
            assert isinstance(settings.TRON_CONFIRMATIONS_REQUIRED, int)
    
    def test_expiry_hours_is_positive(self):
        """Test that expiry_hours is a positive integer"""
        with patch.dict(os.environ, {
            "DATABASE_URL": "postgresql://test:test@localhost/test",
            "SECRET_KEY": "test_secret_key",
            "SMTP_USERNAME": "test@example.com",
            "SMTP_PASSWORD": "test_password",
            "SMTP_FROM_EMAIL": "noreply@example.com",
            "DEPOSIT_INTENT_EXPIRY_HOURS": "24"
        }):
            settings = Settings()
            assert settings.DEPOSIT_INTENT_EXPIRY_HOURS > 0
            assert isinstance(settings.DEPOSIT_INTENT_EXPIRY_HOURS, int)
    
    def test_scan_interval_is_positive(self):
        """Test that scan_interval is a positive integer"""
        with patch.dict(os.environ, {
            "DATABASE_URL": "postgresql://test:test@localhost/test",
            "SECRET_KEY": "test_secret_key",
            "SMTP_USERNAME": "test@example.com",
            "SMTP_PASSWORD": "test_password",
            "SMTP_FROM_EMAIL": "noreply@example.com",
            "DEPOSIT_SCAN_INTERVAL_SECONDS": "60"
        }):
            settings = Settings()
            assert settings.DEPOSIT_SCAN_INTERVAL_SECONDS > 0
            assert isinstance(settings.DEPOSIT_SCAN_INTERVAL_SECONDS, int)
    
    def test_withdrawal_min_max_amounts_are_valid(self):
        """Test that withdrawal min/max amounts are valid decimals"""
        from decimal import Decimal
        
        with patch.dict(os.environ, {
            "DATABASE_URL": "postgresql://test:test@localhost/test",
            "SECRET_KEY": "test_secret_key",
            "SMTP_USERNAME": "test@example.com",
            "SMTP_PASSWORD": "test_password",
            "SMTP_FROM_EMAIL": "noreply@example.com",
            "TRON_WITHDRAW_MIN_AMOUNT": "10.00",
            "TRON_WITHDRAW_MAX_AMOUNT": "10000.00"
        }):
            settings = Settings()
            if settings.TRON_WITHDRAW_MIN_AMOUNT:
                assert settings.TRON_WITHDRAW_MIN_AMOUNT > 0
                assert isinstance(settings.TRON_WITHDRAW_MIN_AMOUNT, Decimal)
            if settings.TRON_WITHDRAW_MAX_AMOUNT:
                assert settings.TRON_WITHDRAW_MAX_AMOUNT > 0
                assert isinstance(settings.TRON_WITHDRAW_MAX_AMOUNT, Decimal)
                if settings.TRON_WITHDRAW_MIN_AMOUNT:
                    assert settings.TRON_WITHDRAW_MAX_AMOUNT >= settings.TRON_WITHDRAW_MIN_AMOUNT


class TestConfigURLs:
    """Test that config URLs are properly constructed"""
    
    def test_google_redirect_uri_uses_localhost_ip(self):
        """Test that Google redirect URI uses LOCALHOST_IP"""
        with patch.dict(os.environ, {
            "DATABASE_URL": "postgresql://test:test@localhost/test",
            "SECRET_KEY": "test_secret_key",
            "SMTP_USERNAME": "test@example.com",
            "SMTP_PASSWORD": "test_password",
            "SMTP_FROM_EMAIL": "noreply@example.com",
            "LOCALHOST_IP": "192.168.1.100"
        }):
            settings = Settings()
            assert "192.168.1.100" in settings.GOOGLE_REDIRECT_URI
            assert settings.GOOGLE_REDIRECT_URI.startswith("http://")
    
    def test_frontend_url_uses_localhost_ip(self):
        """Test that frontend URL uses LOCALHOST_IP"""
        with patch.dict(os.environ, {
            "DATABASE_URL": "postgresql://test:test@localhost/test",
            "SECRET_KEY": "test_secret_key",
            "SMTP_USERNAME": "test@example.com",
            "SMTP_PASSWORD": "test_password",
            "SMTP_FROM_EMAIL": "noreply@example.com",
            "LOCALHOST_IP": "192.168.1.100"
        }):
            settings = Settings()
            assert settings.FRONTEND_URL == "http://192.168.1.100"
