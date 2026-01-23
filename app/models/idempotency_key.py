"""
Idempotency Key Model
Stores idempotency keys to prevent duplicate API requests
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class IdempotencyKey(Base):
    """
    Idempotency key storage for API request deduplication

    Prevents duplicate processing of the same logical operation
    while allowing retries of failed requests.
    """
    __tablename__ = "idempotency_keys"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(255), nullable=False, unique=True, index=True)  # The idempotency key
    endpoint = Column(String(255), nullable=False)  # API endpoint path
    method = Column(String(10), nullable=False)  # HTTP method
    request_hash = Column(String(128), nullable=False, index=True)  # Hash of request body/params
    user_id = Column(Integer, nullable=True, index=True)  # User who made the request

    # Response storage
    status_code = Column(Integer, nullable=True)  # HTTP status code
    response_body = Column(Text, nullable=True)  # JSON response body

    # Timestamps
    created_at = Column(DateTime, default=func.now(), nullable=False)
    completed_at = Column(DateTime, nullable=True)  # When request was processed
    expires_at = Column(DateTime, nullable=False)  # When key expires and can be reused

    # Indexes for performance
    __table_args__ = (
        Index('idx_idempotency_user_endpoint', 'user_id', 'endpoint'),
        Index('idx_idempotency_expires', 'expires_at'),
        Index('idx_idempotency_completed', 'completed_at'),
    )

    @property
    def is_expired(self) -> bool:
        """Check if the idempotency key has expired"""
        from datetime import datetime, timezone
        return datetime.now(timezone.utc) > self.expires_at

    @property
    def is_completed(self) -> bool:
        """Check if the request has been completed"""
        return self.completed_at is not None