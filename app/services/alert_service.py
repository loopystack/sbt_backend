"""
Alert Service
Handles delivery of system alerts via email and webhooks
Includes deduplication logic to prevent alert spam
"""
import logging
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime, timezone

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.models.system_alert import SystemAlert, SystemAlertType, SystemAlertSeverity, SystemAlertStatus
from app.core.database import get_db

logger = logging.getLogger(__name__)


class AlertService:
    """Service for managing system alerts and notifications"""

    @staticmethod
    async def create_alert(
        db: AsyncSession,
        alert_type: str,
        severity: str,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        dedupe_key: Optional[str] = None
    ) -> Optional[SystemAlert]:
        """
        Create a new alert with deduplication.

        Args:
            db: Database session
            alert_type: Type of alert (SystemAlertType enum)
            severity: Severity level (SystemAlertSeverity enum)
            message: Alert message
            context: Additional context data (withdrawal_id, tx_hash, etc.)
            dedupe_key: Key for deduplication (auto-generated if None)

        Returns:
            SystemAlert if created, None if deduplicated
        """
        # Generate dedupe key if not provided
        if dedupe_key is None:
            dedupe_key = f"{alert_type}:{message[:100]}"

        # Check for existing open alert with same dedupe key
        existing_stmt = select(SystemAlert).where(
            SystemAlert.dedupe_key == dedupe_key,
            SystemAlert.status == SystemAlertStatus.OPEN
        )
        result = await db.execute(existing_stmt)
        existing_alert = result.scalar_one_or_none()

        if existing_alert:
            logger.debug(f"Alert deduplicated: {dedupe_key}")
            return None

        # Create new alert
        alert = SystemAlert(
            type=alert_type,
            severity=severity,
            message=message,
            context=context or {},
            dedupe_key=dedupe_key,
            status=SystemAlertStatus.OPEN,
            created_at=datetime.now(timezone.utc)
        )

        db.add(alert)
        await db.flush()
        await db.refresh(alert)

        logger.info(f"Created alert: {alert_type} ({severity}) - {message}")

        # Send notifications if enabled
        if settings.ALERTS_ENABLED:
            await AlertService._deliver_alert(alert)

        return alert

    @staticmethod
    async def acknowledge_alert(
        db: AsyncSession,
        alert_id: int,
        user_id: int
    ) -> bool:
        """Mark alert as acknowledged"""
        stmt = select(SystemAlert).where(SystemAlert.id == alert_id)
        result = await db.execute(stmt)
        alert = result.scalar_one_or_none()

        if not alert:
            return False

        alert.status = SystemAlertStatus.ACKNOWLEDGED
        alert.acknowledged_at = datetime.now(timezone.utc)
        alert.acknowledged_by = user_id

        await db.commit()
        logger.info(f"Alert {alert_id} acknowledged by user {user_id}")
        return True

    @staticmethod
    async def resolve_alert(
        db: AsyncSession,
        alert_id: int,
        user_id: int
    ) -> bool:
        """Mark alert as resolved"""
        stmt = select(SystemAlert).where(SystemAlert.id == alert_id)
        result = await db.execute(stmt)
        alert = result.scalar_one_or_none()

        if not alert:
            return False

        alert.status = SystemAlertStatus.RESOLVED
        alert.resolved_at = datetime.now(timezone.utc)
        alert.resolved_by = user_id

        await db.commit()
        logger.info(f"Alert {alert_id} resolved by user {user_id}")
        return True

    @staticmethod
    async def _deliver_alert(alert: SystemAlert) -> None:
        """Deliver alert via configured channels"""
        try:
            # Send email if configured
            if settings.ALERT_EMAIL_TO:
                await AlertService._send_email_alert(alert)

            # Send webhook if configured
            if settings.ALERT_WEBHOOK_URL:
                await AlertService._send_webhook_alert(alert)

        except Exception as e:
            logger.error(f"Failed to deliver alert {alert.id}: {e}")

    @staticmethod
    async def _send_email_alert(alert: SystemAlert) -> None:
        """Send alert via email"""
        if not settings.ALERT_EMAIL_TO or not settings.SMTP_USERNAME:
            return

        try:
            from app.core.email import send_email

            subject = f"[{alert.severity.upper()}] {alert.type.replace('_', ' ').title()}"
            body = f"""
System Alert - {alert.severity.upper()}

Type: {alert.type}
Message: {alert.message}

Context: {alert.context if alert.context else 'None'}

Time: {alert.created_at}

This is an automated alert from the Sports Betting Platform.
Please check the admin dashboard for more details.
"""

            await send_email(
                to_email=settings.ALERT_EMAIL_TO,
                subject=subject,
                body=body
            )

            logger.info(f"Email alert sent to {settings.ALERT_EMAIL_TO}")

        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")

    @staticmethod
    async def _send_webhook_alert(alert: SystemAlert) -> None:
        """Send alert via webhook"""
        if not settings.ALERT_WEBHOOK_URL:
            return

        try:
            payload = {
                "alert_id": alert.id,
                "type": alert.type,
                "severity": alert.severity,
                "message": alert.message,
                "context": alert.context,
                "created_at": alert.created_at.isoformat(),
                "dedupe_key": alert.dedupe_key
            }

            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    settings.ALERT_WEBHOOK_URL,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                response.raise_for_status()

            logger.info(f"Webhook alert sent to {settings.ALERT_WEBHOOK_URL}")

        except Exception as e:
            logger.error(f"Failed to send webhook alert: {e}")

    @staticmethod
    async def send_daily_report(
        db: AsyncSession,
        subject: str,
        report_data: Dict[str, Any]
    ) -> None:
        """Send daily reconciliation report via email"""
        if not settings.ALERT_EMAIL_TO:
            return

        try:
            from app.core.email import send_email

            body = f"""
Daily Reconciliation Report - {datetime.now(timezone.utc).date()}

{report_data.get('summary', '')}

Key Metrics:
- Total User Liability: {report_data.get('total_liability', 'N/A')}
- Platform Balance: {report_data.get('platform_balance', 'N/A')}
- Delta: {report_data.get('delta', 'N/A')}
- Status: {report_data.get('status', 'N/A')}

Active Alerts: {report_data.get('active_alerts', 0)}
Stuck Deposits: {report_data.get('stuck_deposits', 0)}
Stuck Withdrawals: {report_data.get('stuck_withdrawals', 0)}

Please check the admin dashboard for detailed reports.

This is an automated daily report from the Sports Betting Platform.
"""

            await send_email(
                to_email=settings.ALERT_EMAIL_TO,
                subject=subject,
                body=body
            )

            logger.info(f"Daily report email sent to {settings.ALERT_EMAIL_TO}")

        except Exception as e:
            logger.error(f"Failed to send daily report email: {e}")


# Singleton instance
alert_service = AlertService()