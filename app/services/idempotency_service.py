"""
Idempotency Service
Handles idempotency key storage and retrieval for API request deduplication
"""
import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.exc import IntegrityError

from app.models.idempotency_key import IdempotencyKey
from app.core.database import get_db

logger = logging.getLogger(__name__)


class IdempotencyService:
    """Service for managing idempotency keys"""

    IDEMPOTENCY_KEY_TTL_HOURS = 24  # Keys expire after 24 hours

    @staticmethod
    def _calculate_request_hash(endpoint: str, method: str, body: Optional[Dict[str, Any]] = None) -> str:
        """Calculate hash of request for comparison"""
        data = {
            "endpoint": endpoint,
            "method": method,
            "body": body or {}
        }
        # Sort keys for consistent hashing
        data_str = json.dumps(data, sort_keys=True)
        return hashlib.sha256(data_str.encode()).hexdigest()

    @staticmethod
    async def get_idempotency_record(
        db: AsyncSession,
        key: str,
        endpoint: str,
        method: str,
        user_id: Optional[int] = None
    ) -> Optional[IdempotencyKey]:
        """
        Get existing idempotency record if it exists and is still valid

        Returns None if:
        - Key doesn't exist
        - Key exists but is expired
        - Key exists but request details don't match
        """
        # Clean up expired keys first
        await IdempotencyService._cleanup_expired_keys(db)

        stmt = select(IdempotencyKey).where(
            IdempotencyKey.key == key,
            IdempotencyKey.endpoint == endpoint,
            IdempotencyKey.method == method
        )

        if user_id:
            stmt = stmt.where(IdempotencyKey.user_id == user_id)

        result = await db.execute(stmt)
        record = result.scalar_one_or_none()

        if record and record.is_expired:
            # Expired, can be reused
            await db.delete(record)
            await db.commit()
            return None

        return record

    @staticmethod
    async def create_idempotency_record(
        db: AsyncSession,
        key: str,
        endpoint: str,
        method: str,
        request_hash: str,
        user_id: Optional[int] = None
    ) -> IdempotencyKey:
        """
        Create a new idempotency record

        Raises IntegrityError if key already exists
        """
        expires_at = datetime.now(timezone.utc) + timedelta(hours=IdempotencyService.IDEMPOTENCY_KEY_TTL_HOURS)

        record = IdempotencyKey(
            key=key,
            endpoint=endpoint,
            method=method,
            request_hash=request_hash,
            user_id=user_id,
            expires_at=expires_at
        )

        db.add(record)
        try:
            await db.flush()
            await db.refresh(record)
            return record
        except IntegrityError:
            await db.rollback()
            raise

    @staticmethod
    async def complete_idempotency_record(
        db: AsyncSession,
        record: IdempotencyKey,
        status_code: int,
        response_body: Dict[str, Any]
    ) -> None:
        """Mark idempotency record as completed with response"""
        record.status_code = status_code
        record.response_body = json.dumps(response_body)
        record.completed_at = datetime.now(timezone.utc)

        await db.commit()

    @staticmethod
    async def process_idempotent_request(
        db: AsyncSession,
        idempotency_key: str,
        endpoint: str,
        method: str,
        request_body: Optional[Dict[str, Any]],
        user_id: Optional[int],
        request_processor: callable
    ) -> Tuple[int, Dict[str, Any]]:
        """
        Process a request with idempotency guarantees

        Args:
            db: Database session
            idempotency_key: The idempotency key from header
            endpoint: API endpoint path
            method: HTTP method
            request_body: Request body data
            user_id: User ID if authenticated
            request_processor: Async function that processes the actual request

        Returns:
            Tuple of (status_code, response_body)
        """
        request_hash = IdempotencyService._calculate_request_hash(endpoint, method, request_body)

        # Check for existing record
        existing_record = await IdempotencyService.get_idempotency_record(
            db, idempotency_key, endpoint, method, user_id
        )

        if existing_record:
            if existing_record.is_completed:
                # Return cached response
                logger.info(f"Returning cached response for idempotency key: {idempotency_key}")
                return existing_record.status_code, json.loads(existing_record.response_body)
            else:
                # Request is in progress, reject duplicate
                logger.warning(f"Duplicate request with idempotency key: {idempotency_key}")
                return 409, {
                    "error": "Conflict",
                    "message": "Request with this idempotency key is already being processed"
                }

        # Create new idempotency record
        try:
            record = await IdempotencyService.create_idempotency_record(
                db, idempotency_key, endpoint, method, request_hash, user_id
            )
        except IntegrityError:
            # Race condition - another request created the record
            existing_record = await IdempotencyService.get_idempotency_record(
                db, idempotency_key, endpoint, method, user_id
            )
            if existing_record and existing_record.is_completed:
                return existing_record.status_code, json.loads(existing_record.response_body)
            else:
                return 409, {
                    "error": "Conflict",
                    "message": "Request with this idempotency key is already being processed"
                }

        # Process the actual request
        try:
            status_code, response_body = await request_processor()
        except Exception as e:
            logger.error(f"Request processing failed for idempotency key {idempotency_key}: {e}")
            # Don't complete the record on failure - allow retry
            await db.rollback()
            raise

        # Complete the idempotency record
        await IdempotencyService.complete_idempotency_record(
            db, record, status_code, response_body
        )

        return status_code, response_body

    @staticmethod
    async def _cleanup_expired_keys(db: AsyncSession) -> None:
        """Clean up expired idempotency keys"""
        cutoff = datetime.now(timezone.utc)
        stmt = delete(IdempotencyKey).where(IdempotencyKey.expires_at < cutoff)

        result = await db.execute(stmt)
        deleted_count = result.rowcount

        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} expired idempotency keys")


# Singleton instance
idempotency_service = IdempotencyService()