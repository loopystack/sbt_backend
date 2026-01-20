"""
Reconciliation Service
Compares internal user balances vs on-chain platform wallet balances
Generates daily reports and alerts on discrepancies
"""
import logging
from decimal import Decimal
from typing import Dict, Any, Optional
from datetime import datetime, timezone, date

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import settings
from app.models.system_alert import SystemAlertType, SystemAlertSeverity, ReconciliationReport
from app.services.alert_service import alert_service
from app.services.tron_send_service import tron_send_service
from app.core.database import get_db

logger = logging.getLogger(__name__)


class ReconciliationService:
    """Service for reconciling internal balances vs on-chain platform assets"""

    @staticmethod
    async def run_daily_reconciliation(
        db: AsyncSession,
        target_date: Optional[date] = None
    ) -> ReconciliationReport:
        """
        Run daily reconciliation for all supported assets

        Args:
            db: Database session
            target_date: Date to reconcile (defaults to today)

        Returns:
            ReconciliationReport with results
        """
        if target_date is None:
            target_date = datetime.now(timezone.utc).date()

        report_date = datetime.combine(target_date, datetime.min.time().replace(tzinfo=timezone.utc))

        logger.info(f"Starting daily reconciliation for {target_date}")

        try:
            # Get internal user balances
            user_balances = await ReconciliationService._get_user_balances(db)

            # Get platform wallet balances
            platform_balances = await ReconciliationService._get_platform_balances()

            # Calculate reconciliation for each asset
            reconciliation_data = {}
            max_delta = Decimal("0")
            critical_assets = []

            for asset in user_balances.keys():
                if asset not in platform_balances:
                    logger.warning(f"No platform balance data for {asset}")
                    continue

                liability = user_balances[asset]["total_liability"]
                platform_balance = platform_balances[asset]["total_balance"]
                delta = platform_balance - liability

                # Determine status
                abs_delta = abs(delta)
                if abs_delta <= settings.RECON_TOLERANCE_USDT:
                    status = "ok"
                elif abs_delta <= Decimal("10.0"):
                    status = "warn"
                else:
                    status = "critical"
                    critical_assets.append(asset)

                reconciliation_data[asset] = {
                    "liability": liability,
                    "platform_balance": platform_balance,
                    "delta": delta,
                    "status": status
                }

                max_delta = max(max_delta, abs_delta)

            # Determine overall status
            if critical_assets:
                overall_status = "critical"
            elif any(r["status"] == "warn" for r in reconciliation_data.values()):
                overall_status = "warn"
            else:
                overall_status = "ok"

            # Create reconciliation report
            report = ReconciliationReport(
                date=report_date,
                asset="USDT",  # Primary asset for now
                network="TRC20",
                total_user_available=user_balances.get("USDT", {}).get("available", {}),
                total_user_reserved=user_balances.get("USDT", {}).get("reserved", {}),
                total_user_liability=user_balances.get("USDT", {}).get("total_liability", {}),
                platform_hot_wallet_balance=platform_balances.get("USDT", {}).get("hot_wallet", {}),
                platform_cold_wallet_balance=platform_balances.get("USDT", {}).get("cold_wallet", {}),
                platform_total_balance=platform_balances.get("USDT", {}).get("total_balance", {}),
                delta=reconciliation_data.get("USDT", {}).get("delta", Decimal("0")),
                status=overall_status,
                details={
                    "reconciliation_data": reconciliation_data,
                    "critical_assets": critical_assets,
                    "max_delta": float(max_delta),
                    "total_users": user_balances.get("USDT", {}).get("user_count", 0)
                }
            )

            db.add(report)
            await db.commit()
            await db.refresh(report)

            logger.info(f"Reconciliation completed: status={overall_status}, delta={max_delta}")

            # Create alerts if needed
            await ReconciliationService._handle_reconciliation_alerts(
                db, reconciliation_data, critical_assets
            )

            return report

        except Exception as e:
            logger.error(f"Reconciliation failed: {e}", exc_info=True)

            # Create error report
            error_report = ReconciliationReport(
                date=report_date,
                asset="USDT",
                network="TRC20",
                total_user_available={},
                total_user_reserved={},
                total_user_liability={},
                platform_hot_wallet_balance={},
                platform_cold_wallet_balance={},
                platform_total_balance={},
                delta=Decimal("0"),
                status="error",
                details={"error": str(e)}
            )

            db.add(error_report)
            await db.commit()
            await db.refresh(error_report)

            # Alert on reconciliation failure
            await alert_service.create_alert(
                db=db,
                alert_type=SystemAlertType.RECON_MISMATCH,
                severity=SystemAlertSeverity.CRITICAL,
                message=f"Daily reconciliation failed: {str(e)}",
                context={"error": str(e), "date": target_date.isoformat()},
                dedupe_key=f"recon_failure_{target_date}"
            )

            return error_report

    @staticmethod
    async def _get_user_balances(db: AsyncSession) -> Dict[str, Dict[str, Any]]:
        """
        Get total user balances across all users

        Returns:
            Dict[asset, {
                "available": total_available,
                "reserved": total_reserved,
                "total_liability": total_liability,
                "user_count": count
            }]
        """
        from app.models.deposit import UserCryptoBalance

        # Get totals by asset
        stmt = select(
            UserCryptoBalance.asset,
            func.sum(UserCryptoBalance.balance).label("total_available"),
            func.sum(UserCryptoBalance.locked_balance).label("total_reserved"),
            func.count(UserCryptoBalance.user_id.distinct()).label("user_count")
        ).group_by(UserCryptoBalance.asset)

        result = await db.execute(stmt)
        rows = result.all()

        balances = {}
        for row in rows:
            asset = row.asset
            total_available = row.total_available or Decimal("0")
            total_reserved = row.total_reserved or Decimal("0")
            total_liability = total_available + total_reserved

            balances[asset] = {
                "available": {asset: total_available},
                "reserved": {asset: total_reserved},
                "total_liability": {asset: total_liability},
                "user_count": row.user_count
            }

        return balances

    @staticmethod
    async def _get_platform_balances() -> Dict[str, Dict[str, Any]]:
        """
        Get platform wallet balances from on-chain sources

        Returns:
            Dict[asset, {
                "hot_wallet": {asset: balance},
                "cold_wallet": {asset: balance},  # Optional
                "total_balance": {asset: balance}
            }]
        """
        balances = {}

        try:
            # Get hot wallet USDT balance
            hot_wallet_balance = tron_send_service.get_hot_wallet_balance()
            balances["USDT"] = {
                "hot_wallet": {"USDT": hot_wallet_balance},
                "cold_wallet": {"USDT": Decimal("0")},  # No cold wallet yet
                "total_balance": {"USDT": hot_wallet_balance}
            }

            logger.info(f"Platform balances retrieved: USDT hot wallet = {hot_wallet_balance}")

        except Exception as e:
            logger.error(f"Failed to get platform balances: {e}")
            # Return zero balances on error
            balances["USDT"] = {
                "hot_wallet": {"USDT": Decimal("0")},
                "cold_wallet": {"USDT": Decimal("0")},
                "total_balance": {"USDT": Decimal("0")}
            }

        return balances

    @staticmethod
    async def _handle_reconciliation_alerts(
        db: AsyncSession,
        reconciliation_data: Dict[str, Dict[str, Any]],
        critical_assets: list
    ) -> None:
        """Create alerts for reconciliation issues"""
        for asset, data in reconciliation_data.items():
            delta = data["delta"]
            status = data["status"]

            if status in ["warn", "critical"]:
                severity = SystemAlertSeverity.CRITICAL if status == "critical" else SystemAlertSeverity.WARNING

                await alert_service.create_alert(
                    db=db,
                    alert_type=SystemAlertType.RECON_MISMATCH,
                    severity=severity,
                    message=f"Reconciliation mismatch for {asset}: delta = {delta}",
                    context={
                        "asset": asset,
                        "liability": float(data["liability"]),
                        "platform_balance": float(data["platform_balance"]),
                        "delta": float(delta),
                        "status": status
                    },
                    dedupe_key=f"recon_mismatch_{asset}_{status}"
                )

    @staticmethod
    async def get_latest_report(db: AsyncSession) -> Optional[ReconciliationReport]:
        """Get the most recent reconciliation report"""
        stmt = select(ReconciliationReport).order_by(ReconciliationReport.created_at.desc()).limit(1)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_reports_in_range(
        db: AsyncSession,
        start_date: date,
        end_date: date
    ) -> list[ReconciliationReport]:
        """Get reconciliation reports within date range"""
        start_dt = datetime.combine(start_date, datetime.min.time().replace(tzinfo=timezone.utc))
        end_dt = datetime.combine(end_date, datetime.max.time().replace(tzinfo=timezone.utc))

        stmt = select(ReconciliationReport).where(
            ReconciliationReport.date >= start_dt,
            ReconciliationReport.date <= end_dt
        ).order_by(ReconciliationReport.date.desc())

        result = await db.execute(stmt)
        return result.scalars().all()


# Singleton instance
reconciliation_service = ReconciliationService()