from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base


class ClickEvent(Base):
    """Track click-through rates on various elements"""
    __tablename__ = "click_events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    element_type = Column(String, index=True)  # 'button', 'link', 'banner', 'cta', etc.
    element_id = Column(String)  # Unique identifier for the element
    page_path = Column(String)  # URL path where the click occurred
    session_id = Column(String, index=True)
    ip_address = Column(String)
    user_agent = Column(String)
    meta_data = Column(JSON)  # Additional data about the click
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    user = relationship("User", back_populates="click_events")


class PageView(Base):
    """Track page views for analytics"""
    __tablename__ = "page_views"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    page_path = Column(String, index=True)
    page_title = Column(String)
    session_id = Column(String, index=True)
    referrer = Column(String)
    duration_seconds = Column(Float)
    ip_address = Column(String)
    user_agent = Column(String)
    meta_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    user = relationship("User", back_populates="page_views")


class ConversionEvent(Base):
    """Track conversion events (sign-ups, deposits, bets)"""
    __tablename__ = "conversion_events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    event_type = Column(String, index=True)  # 'signup', 'deposit', 'first_bet', etc.
    element_id = Column(String, index=True)  # Which element led to conversion
    page_path = Column(String)
    value = Column(Float)  # Monetary value if applicable
    session_id = Column(String, index=True)
    meta_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    user = relationship("User", back_populates="conversion_events")


class RegionalRestriction(Base):
    """Manage country/region-based restrictions"""
    __tablename__ = "regional_restrictions"
    
    id = Column(Integer, primary_key=True, index=True)
    country_code = Column(String, unique=True, index=True)  # ISO 3166-1 alpha-2
    country_name = Column(String)
    is_restricted = Column(Boolean, default=False, index=True)
    restriction_type = Column(String)  # 'full_block', 'payment_block', 'betting_block', etc.
    restricted_features = Column(JSON)  # List of features blocked
    notes = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserCompliance(Base):
    """Track responsible gaming compliance for users"""
    __tablename__ = "user_compliance"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    # Deposit limits
    daily_deposit_limit = Column(Float, default=1000.0)
    weekly_deposit_limit = Column(Float, default=5000.0)
    monthly_deposit_limit = Column(Float, default=20000.0)
    
    # Session management
    max_session_duration_minutes = Column(Integer, default=240)  # 4 hours default
    max_session_loss = Column(Float, default=1000.0)
    
    # Cooling off periods
    cooling_off_hours = Column(Integer, default=24)
    last_cooling_off = Column(DateTime, nullable=True)
    
    # Self-exclusion
    is_self_excluded = Column(Boolean, default=False)
    self_exclusion_until = Column(DateTime, nullable=True)
    self_exclusion_reason = Column(String, nullable=True)
    
    # Betting limits
    max_bet_amount = Column(Float, default=500.0)
    max_daily_bet_limit = Column(Float, default=2000.0)
    
    # Activity tracking
    current_daily_deposits = Column(Float, default=0.0)
    current_weekly_deposits = Column(Float, default=0.0)
    current_monthly_deposits = Column(Float, default=0.0)
    
    session_start_time = Column(DateTime, nullable=True)
    session_warnings_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="compliance")


class ComplianceAlert(Base):
    """Track compliance alerts and warnings"""
    __tablename__ = "compliance_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    alert_type = Column(String, index=True)  # 'limit_exceeded', 'session_timeout', 'cooling_off', etc.
    severity = Column(String)  # 'info', 'warning', 'critical'
    message = Column(String)
    meta_data = Column(JSON)
    acknowledged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    user = relationship("User", back_populates="compliance_alerts")

