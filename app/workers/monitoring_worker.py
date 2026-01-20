"""
Monitoring Worker
Continuously monitors system health and creates alerts
Checks for stuck deposits/withdrawals, hot wallet balances, worker heartbeats
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import select, and_, or_, func

from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.models.deposit import DepositIntent, WithdrawalIntent, UserCryptoBalance
from app.models.system_alert import (
    SystemAlert, SystemAlertType, SystemAlertSeverity,
    SystemHeartbeat, SystemAlertStatus
)
from app.models.wallet_transaction import WalletTransaction, WalletTransactionType, ReferenceType
from app.services.alert_service import alert_service
from app.services.tron_send_service import tron_send_service
from app.core.database import get_db

logger = logging.getLogger(__name__)


class MonitoringWorker:
    """Worker that monitors system health and creates alerts"""

    def __init__(self):
        self.monitor_interval = settings.MONITORING_INTERVAL_SECONDS or 60
        self.heartbeat_stale_threshold = settings.HEARTBEAT_STALE_THRESHOLD_MINUTES or 5
        self.deposit_stuck_threshold = settings.DEPOSIT_STUCK_THRESHOLD_MINUTES or 30
        self.withdrawal_stuck_threshold = settings.WITHDRAWAL_STUCK_THRESHOLD_MINUTES or 30
        self.hot_wallet_usdt_threshold = settings.HOT_WALLET_USDT_THRESHOLD or Decimal("100.0")
        self.hot_wallet_trx_threshold = settings.HOT_WALLET_TRX_THRESHOLD or Decimal("1000.0")

    async def run_once(self, db: AsyncSession) -> dict:
        """
        Run one monitoring cycle

        Returns:
            Dictionary with monitoring statistics
        """
        stats = {
            "alerts_created": 0,
            "alerts_resolved": 0,
            "checks_performed": 0,
            "errors": 0
        }

        try:
            # Check worker heartbeats
            await self._check_worker_heartbeats(db, stats)

            # Check stuck deposits
            await self._check_stuck_deposits(db, stats)

            # Check stuck withdrawals
            await self._check_stuck_withdrawals(db, stats)

            # Check hot wallet balances
            await self._check_hot_wallet_balances(db, stats)

            # Check for duplicate credits
            await self._check_duplicate_credits(db, stats)

            # Check for refund anomalies
            await self._check_refund_anomalies(db, stats)

            # Update our own heartbeat
            await self._update_heartbeat(db, "monitoring_worker", stats)

            await db.commit()

        except Exception as e:
            logger.error(f"Monitoring cycle failed: {e}", exc_info=True)
            stats["errors"] += 1
            await db.rollback()

        return stats

    async def _check_worker_heartbeats(self, db: AsyncSession, stats: dict) -> None:
        """Check if workers have sent recent heartbeats"""
        stats["checks_performed"] += 1

        expected_workers = [
            "deposit_monitor",
            "withdrawal_monitor",
            "monitoring_worker"
        ]

        stale_threshold = datetime.now(timezone.utc) - timedelta(minutes=self.heartbeat_stale_threshold)

        for worker_name in expected_workers:
            # Check if heartbeat exists and is recent
            stmt = select(SystemHeartbeat).where(SystemHeartbeat.service_name == worker_name)
            result = await db.execute(stmt)
            heartbeat = result.scalar_one_or_none()

            if not heartbeat or heartbeat.last_heartbeat_at < stale_threshold:
                await alert_service.create_alert(
                    db=db,
                    alert_type=SystemAlertType.WORKER_UNHEALTHY,
                    severity=SystemAlertSeverity.CRITICAL,
                    message=f"Worker {worker_name} heartbeat is stale or missing",
                    context={
                        "worker_name": worker_name,
                        "last_heartbeat": heartbeat.last_heartbeat_at.isoformat() if heartbeat else None,
                        "threshold_minutes": self.heartbeat_stale_threshold
                    },
                    dedupe_key=f"worker_unhealthy_{worker_name}"
                )
                stats["alerts_created"] += 1

    async def _check_stuck_deposits(self, db: AsyncSession, stats: dict) -> None:
        """Check for deposits that have been stuck too long"""
        stats["checks_performed"] += 1

        stuck_threshold = datetime.now(timezone.utc) - timedelta(minutes=self.deposit_stuck_threshold)

        # Find deposits in pending/detected states that are too old
        stmt = select(func.count(DepositIntent.id)).where(
            and_(
                DepositIntent.status.in_(["pending", "detected"]),
                DepositIntent.created_at < stuck_threshold
            )
        )

        result = await db.execute(stmt)
        stuck_count = result.scalar() or 0

        if stuck_count > 0:
            # Get details of stuck deposits
            detail_stmt = select(DepositIntent).where(
                and_(
                    DepositIntent.status.in_(["pending", "detected"]),
                    DepositIntent.created_at < stuck_threshold
                )
            ).limit(5)  # Just get first few for context

            result = await db.execute(detail_stmt)
            stuck_deposits = result.scalars().all()

            context = {
                "stuck_count": stuck_count,
                "threshold_minutes": self.deposit_stuck_threshold,
                "sample_deposits": [
                    {
                        "id": d.id,
                        "status": d.status,
                        "created_at": d.created_at.isoformat(),
                        "amount": float(d.amount_crypto or 0)
                    } for d in stuck_deposits
                ]
            }

            await alert_service.create_alert(
                db=db,
                alert_type=SystemAlertType.DEPOSIT_STUCK,
                severity=SystemAlertSeverity.WARNING,
                message=f"{stuck_count} deposits stuck in pending/detected state for >{self.deposit_stuck_threshold} minutes",
                context=context,
                dedupe_key=f"stuck_deposits_{stuck_count}"
            )
            stats["alerts_created"] += 1

    async def _check_stuck_withdrawals(self, db: AsyncSession, stats: dict) -> None:
        """Check for withdrawals that have been processing too long"""
        stats["checks_performed"] += 1

        stuck_threshold = datetime.now(timezone.utc) - timedelta(minutes=settings.WITHDRAWAL_CONFIRM_TIMEOUT_MINUTES)

        # Find withdrawals in processing state that are too old
        stmt = select(func.count(WithdrawalIntent.id)).where(
            and_(
                WithdrawalIntent.status == "processing",
                WithdrawalIntent.processed_at < stuck_threshold
            )
        )

        result = await db.execute(stmt)
        stuck_count = result.scalar() or 0

        if stuck_count > 0:
            # Get details of stuck withdrawals
            detail_stmt = select(WithdrawalIntent).where(
                and_(
                    WithdrawalIntent.status == "processing",
                    WithdrawalIntent.processed_at < stuck_threshold
                )
            ).limit(5)

            result = await db.execute(detail_stmt)
            stuck_withdrawals = result.scalars().all()

            context = {
                "stuck_count": stuck_count,
                "timeout_minutes": settings.WITHDRAWAL_CONFIRM_TIMEOUT_MINUTES,
                "sample_withdrawals": [
                    {
                        "id": w.id,
                        "tx_hash": w.tx_hash,
                        "processed_at": w.processed_at.isoformat() if w.processed_at else None,
                        "amount": float(w.amount_crypto)
                    } for w in stuck_withdrawals
                ]
            }

            await alert_service.create_alert(
                db=db,
                alert_type=SystemAlertType.WITHDRAWAL_STUCK,
                severity=SystemAlertSeverity.CRITICAL,
                message=f"{stuck_count} withdrawals stuck in processing state for >{settings.WITHDRAWAL_CONFIRM_TIMEOUT_MINUTES} minutes",
                context=context,
                dedupe_key=f"stuck_withdrawals_{stuck_count}"
            )
            stats["alerts_created"] += 1

    async def _check_hot_wallet_balances(self, db: AsyncSession, stats: dict) -> None:
        """Check hot wallet balances and alert if low"""
        stats["checks_performed"] += 1

        try:
            # Check USDT balance
            usdt_balance = tron_send_service.get_hot_wallet_balance()

            if usdt_balance < self.hot_wallet_usdt_threshold:
                await alert_service.create_alert(
                    db=db,
                    alert_type=SystemAlertType.HOT_WALLET_LOW,
                    severity=SystemAlertSeverity.CRITICAL,
                    message=f"Hot wallet USDT balance is critically low: {usdt_balance} USDT",
                    context={
                        "balance": float(usdt_balance),
                        "threshold": float(self.hot_wallet_usdt_threshold),
                        "asset": "USDT"
                    },
                    dedupe_key=f"hot_wallet_low_usdt_{usdt_balance}"
                )
                stats["alerts_created"] += 1

            # Check TRX balance
            trx_balance = tron_send_service.check_hot_wallet_trx_balance()

            if trx_balance is not None and trx_balance < self.hot_wallet_trx_threshold:
                await alert_service.create_alert(
                    db=db,
                    alert_type=SystemAlertType.HOT_WALLET_LOW,
                    severity=SystemAlertSeverity.WARNING,
                    message=f"Hot wallet TRX balance is low: {trx_balance} TRX",
                    context={
                        "balance": float(trx_balance),
                        "threshold": float(self.hot_wallet_trx_threshold),
                        "asset": "TRX"
                    },
                    dedupe_key=f"hot_wallet_low_trx_{trx_balance}"
                )
                stats["alerts_created"] += 1

        except Exception as e:
            logger.error(f"Failed to check hot wallet balances: {e}")
            await alert_service.create_alert(
                db=db,
                alert_type=SystemAlertType.NODE_DOWN,
                severity=SystemAlertSeverity.CRITICAL,
                message=f"Failed to check hot wallet balances: {str(e)}",
                context={"error": str(e)},
                dedupe_key="hot_wallet_check_failed"
            )
            stats["alerts_created"] += 1

    async def _check_duplicate_credits(self, db: AsyncSession, stats: dict) -> None:
        """Check for duplicate deposit credits (should never happen)"""
        stats["checks_performed"] += 1

        # Find tx_hashes with multiple DEPOSIT_CREDIT entries
        stmt = select(
            WalletTransaction.reference_id,
            func.count(WalletTransaction.id).label("credit_count")
        ).where(
            and_(
                WalletTransaction.type == WalletTransactionType.DEPOSIT_CREDIT,
                WalletTransaction.reference_type == ReferenceType.DEPOSIT
            )
        ).group_by(WalletTransaction.reference_id).having(func.count(WalletTransaction.id) > 1)

        result = await db.execute(stmt)
        duplicates = result.all()

        if duplicates:
            context = {
                "duplicate_count": len(duplicates),
                "duplicates": [
                    {
                        "deposit_id": dup.reference_id,
                        "credit_count": dup.credit_count
                    } for dup in duplicates
                ]
            }

            await alert_service.create_alert(
                db=db,
                alert_type=SystemAlertType.DUPLICATE_CREDIT,
                severity=SystemAlertSeverity.CRITICAL,
                message=f"Found {len(duplicates)} deposits with duplicate credit entries",
                context=context,
                dedupe_key=f"duplicate_credits_{len(duplicates)}"
            )
            stats["alerts_created"] += 1

    async def _check_refund_anomalies(self, db: AsyncSession, stats: dict) -> None:
        """Check for refund anomalies (WITHDRAWAL_REFUND without WITHDRAWAL_DEBIT)"""
        stats["checks_performed"] += 1

        # Find WITHDRAWAL_REFUND entries without corresponding WITHDRAWAL_DEBIT
        refund_stmt = select(WalletTransaction.reference_id).where(
            and_(
                WalletTransaction.type == WalletTransactionType.WITHDRAWAL_REFUND,
                WalletTransaction.reference_type == ReferenceType.WITHDRAWAL
            )
        )

        result = await db.execute(refund_stmt)
        refund_ids = [row[0] for row in result.all()]

        anomalies = []
        for withdrawal_id in refund_ids:
            # Check if there's a corresponding DEBIT entry
            debit_stmt = select(WalletTransaction.id).where(
                and_(
                    WalletTransaction.reference_type == ReferenceType.WITHDRAWAL,
                    WalletTransaction.reference_id == withdrawal_id,
                    WalletTransaction.type == WalletTransactionType.WITHDRAWAL_DEBIT
                )
            )
            debit_result = await db.execute(debit_stmt)
            debit_entry = debit_result.scalar_one_or_none()

            if not debit_entry:
                anomalies.append(withdrawal_id)

        if anomalies:
            context = {
                "anomaly_count": len(anomalies),
                "withdrawal_ids": anomalies[:10]  # Limit for context
            }

            await alert_service.create_alert(
                db=db,
                alert_type=SystemAlertType.REFUND_ANOMALY,
                severity=SystemAlertSeverity.CRITICAL,
                message=f"Found {len(anomalies)} withdrawal refunds without corresponding debit entries",
                context=context,
                dedupe_key=f"refund_anomalies_{len(anomalies)}"
            )
            stats["alerts_created"] += 1

    async def _update_heartbeat(self, db: AsyncSession, service_name: str, meta: dict) -> None:
        """Update heartbeat for this service"""
        # Upsert heartbeat
        stmt = select(SystemHeartbeat).where(SystemHeartbeat.service_name == service_name)
        result = await db.execute(stmt)
        heartbeat = result.scalar_one_or_none()

        if heartbeat:
            heartbeat.last_heartbeat_at = datetime.now(timezone.utc)
            heartbeat.meta = meta
        else:
            heartbeat = SystemHeartbeat(
                service_name=service_name,
                last_heartbeat_at=datetime.now(timezone.utc),
                meta=meta
            )
            db.add(heartbeat)

    async def run_forever(self):
        """Run the monitoring worker continuously"""
        logger.info("Starting monitoring worker...")
        logger.info(f"Check interval: {self.monitor_interval} seconds")
        logger.info(f"Heartbeat stale threshold: {self.heartbeat_stale_threshold} minutes")

        while True:
            async with AsyncSessionLocal() as db:
                try:
                    stats = await self.run_once(db)

                    if stats["checks_performed"] > 0:
                        logger.info(
                            f"Monitoring cycle: checks={stats['checks_performed']}, "
                            f"alerts_created={stats['alerts_created']}, errors={stats['errors']}"
                        )

                except Exception as e:
                    logger.error(f"Error in monitoring loop: {e}", exc_info=True)

            await asyncio.sleep(self.monitor_interval)


# Singleton instance
monitoring_worker = MonitoringWorker()