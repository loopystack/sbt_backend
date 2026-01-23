"""
System Alert and Heartbeat Models
For monitoring system health and alerting
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON, UniqueConstraint, Index, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class SystemAlertSeverity(str):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"

    @classmethod
    def all(cls):
        return [cls.INFO, cls.WARNING, cls.CRITICAL]


class SystemAlertType(str):
    """Alert type categories"""
    DEPOSIT_STUCK = "deposit_stuck"
    WITHDRAWAL_STUCK = "withdrawal_stuck"
    HOT_WALLET_LOW = "hot_wallet_low"
    NODE_DOWN = "node_down"
    RECON_MISMATCH = "recon_mismatch"
    LEDGER_ANOMALY = "ledger_anomaly"
    WORKER_UNHEALTHY = "worker_unhealthy"
    DUPLICATE_CREDIT = "duplicate_credit"
    REFUND_ANOMALY = "refund_anomaly"

    @classmethod
    def all(cls):
        return [
            cls.DEPOSIT_STUCK, cls.WITHDRAWAL_STUCK, cls.HOT_WALLET_LOW,
            cls.NODE_DOWN, cls.RECON_MISMATCH, cls.LEDGER_ANOMALY,
            cls.WORKER_UNHEALTHY, cls.DUPLICATE_CREDIT, cls.REFUND_ANOMALY
        ]


class SystemAlertStatus(str):
    """Alert status lifecycle"""
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"

    @classmethod
    def all(cls):
        return [cls.OPEN, cls.ACKNOWLEDGED, cls.RESOLVED]


class SystemAlert(Base):
    """
    System alerts for operational monitoring

    Deduplication: Use dedupe_key to prevent spam.
    Before creating a new alert, check if an open alert with same dedupe_key exists.
    """
    __tablename__ = "system_alerts"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(50), nullable=False)  # SystemAlertType enum values
    severity = Column(String(20), nullable=False, default=SystemAlertSeverity.WARNING)
    message = Column(Text, nullable=False)
    context = Column(JSON, nullable=True)  # Additional data (withdrawal_id, tx_hash, etc.)
    status = Column(String(20), nullable=False, default=SystemAlertStatus.OPEN)
    dedupe_key = Column(String(255), nullable=False, index=True)  # For preventing duplicate alerts

    created_at = Column(DateTime, default=func.now(), nullable=False)
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    acknowledged_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # User ID who acknowledged
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # User ID who resolved

    # Relationships
    acknowledger = relationship("User", foreign_keys=[acknowledged_by])
    resolver = relationship("User", foreign_keys=[resolved_by])

    # Indexes for performance
    __table_args__ = (
        Index('idx_system_alerts_status_created', 'status', 'created_at'),
        Index('idx_system_alerts_type_severity', 'type', 'severity'),
        Index('idx_system_alerts_dedupe_open', 'dedupe_key', 'status'),  # For dedupe checking
    )


class SystemHeartbeat(Base):
    """
    Heartbeat tracking for system workers and services

    Each worker should update its heartbeat every cycle to prove it's alive.
    """
    __tablename__ = "system_heartbeats"

    id = Column(Integer, primary_key=True, index=True)
    service_name = Column(String(100), nullable=False, unique=True, index=True)
    last_heartbeat_at = Column(DateTime, nullable=False)
    meta = Column(JSON, nullable=True)  # Optional stats like scanned count, errors

    # Indexes
    __table_args__ = (
        Index('idx_system_heartbeats_last_heartbeat', 'last_heartbeat_at'),
    )


class ReconciliationReport(Base):
    """
    Daily reconciliation reports comparing internal vs on-chain balances

    Stored daily to prove financial correctness and detect discrepancies.
    """
    __tablename__ = "reconciliation_reports"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False, index=True)  # UTC date of reconciliation
    asset = Column(String(10), nullable=False, default="USDT")
    network = Column(String(20), nullable=False, default="TRC20")

    # Internal liability (what we owe users)
    total_user_available = Column(JSON, nullable=False)  # {asset: amount} for multi-asset support
    total_user_reserved = Column(JSON, nullable=False)  # {asset: amount}
    total_user_liability = Column(JSON, nullable=False)  # {asset: amount}

    # On-chain platform assets
    platform_hot_wallet_balance = Column(JSON, nullable=False)  # {asset: amount}
    platform_cold_wallet_balance = Column(JSON, nullable=True)  # {asset: amount} - optional
    platform_total_balance = Column(JSON, nullable=False)  # {asset: amount}

    # Reconciliation result
    delta = Column(JSON, nullable=False)  # {asset: delta_amount}
    status = Column(String(20), nullable=False)  # ok/warn/critical/error

    # Metadata
    created_at = Column(DateTime, default=func.now(), nullable=False)
    details = Column(JSON, nullable=True)  # Top users by balance, anomaly counts, etc.

    # Indexes
    __table_args__ = (
        Index('idx_reconciliation_reports_date_asset', 'date', 'asset'),
        Index('idx_reconciliation_reports_status', 'status'),
    )