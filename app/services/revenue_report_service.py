"""
Daily revenue report service: computes GGR/NGR and cashflow from wallet ledger.
"""
import logging
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional, List

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.wallet_transaction import WalletTransaction, WalletTransactionType
from app.models.revenue_report import DailyRevenueReport

logger = logging.getLogger(__name__)


def _day_bounds(d: date):
    """Return (start_utc, end_utc) for the given calendar date in UTC."""
    start = datetime(d.year, d.month, d.day, 0, 0, 0, tzinfo=timezone.utc)
    end = datetime(d.year, d.month, d.day, 23, 59, 59, 999999, tzinfo=timezone.utc)
    return start, end


class RevenueReportService:
    """Compute and store daily GGR/NGR and cashflow from ledger."""

    @staticmethod
    async def compute_for_date(
        report_date: date,
        asset: str,
        db: AsyncSession,
    ) -> dict:
        """
        Compute metrics for a single day from wallet_transactions.
        Does not write to DB; returns a dict of values.
        """
        start_utc, end_utc = _day_bounds(report_date)

        # Sum amounts by type for this asset and date
        q = select(
            WalletTransaction.type,
            func.coalesce(func.sum(WalletTransaction.amount), 0).label("total"),
        ).where(
            and_(
                WalletTransaction.asset == asset,
                WalletTransaction.created_at >= start_utc,
                WalletTransaction.created_at <= end_utc,
            )
        ).group_by(WalletTransaction.type)

        result = await db.execute(q)
        rows = {r.type: r.total for r in result.all()}

        def _get(t: WalletTransactionType) -> Decimal:
            return Decimal(str(rows.get(t, 0) or 0))

        total_staked = _get(WalletTransactionType.BET_LOCK)
        losing_stakes = _get(WalletTransactionType.BET_LOSS_DEDUCT)
        win_deduct_stake = _get(WalletTransactionType.BET_WIN_DEDUCT_STAKE)
        win_payout = _get(WalletTransactionType.BET_WIN_PAYOUT_CREDIT)
        # Legacy types if present
        losing_stakes += _get(WalletTransactionType.BET_LOSS) + _get(WalletTransactionType.BET_DEBIT)
        win_payout += _get(WalletTransactionType.BET_WIN) + _get(WalletTransactionType.BET_PAYOUT)

        winning_profit_paid = win_payout - win_deduct_stake
        if winning_profit_paid < 0:
            winning_profit_paid = Decimal("0")

        ggr = losing_stakes - winning_profit_paid
        bonuses = Decimal("0")
        fees = Decimal("0")
        ngr = ggr - bonuses - fees

        total_deposited_onchain = _get(WalletTransactionType.DEPOSIT_CREDIT)
        total_withdrawn_onchain = _get(WalletTransactionType.WITHDRAWAL_DEBIT)
        net_inflow = total_deposited_onchain - total_withdrawn_onchain

        return {
            "report_date": report_date,
            "asset": asset,
            "total_staked": total_staked,
            "losing_stakes": losing_stakes,
            "winning_profit_paid": winning_profit_paid,
            "ggr": ggr,
            "bonuses": bonuses,
            "fees": fees,
            "ngr": ngr,
            "total_deposited_onchain": total_deposited_onchain,
            "total_withdrawn_onchain": total_withdrawn_onchain,
            "net_inflow": net_inflow,
        }

    @staticmethod
    async def compute_and_store(
        report_date: date,
        asset: str = "USDT",
        db: AsyncSession = None,
    ) -> DailyRevenueReport:
        """
        Compute metrics for the date and upsert into daily_revenue_reports.
        Caller must provide db and commit if needed.
        """
        data = await RevenueReportService.compute_for_date(report_date, asset, db)

        stmt = select(DailyRevenueReport).where(
            and_(
                DailyRevenueReport.report_date == report_date,
                DailyRevenueReport.asset == asset,
            )
        )
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            existing.total_staked = data["total_staked"]
            existing.losing_stakes = data["losing_stakes"]
            existing.winning_profit_paid = data["winning_profit_paid"]
            existing.ggr = data["ggr"]
            existing.bonuses = data["bonuses"]
            existing.fees = data["fees"]
            existing.ngr = data["ngr"]
            existing.total_deposited_onchain = data["total_deposited_onchain"]
            existing.total_withdrawn_onchain = data["total_withdrawn_onchain"]
            existing.net_inflow = data["net_inflow"]
            await db.flush()
            await db.refresh(existing)
            logger.info(f"Updated revenue report for {report_date} {asset}")
            return existing

        report = DailyRevenueReport(
            report_date=data["report_date"],
            asset=data["asset"],
            total_staked=data["total_staked"],
            losing_stakes=data["losing_stakes"],
            winning_profit_paid=data["winning_profit_paid"],
            ggr=data["ggr"],
            bonuses=data["bonuses"],
            fees=data["fees"],
            ngr=data["ngr"],
            total_deposited_onchain=data["total_deposited_onchain"],
            total_withdrawn_onchain=data["total_withdrawn_onchain"],
            net_inflow=data["net_inflow"],
        )
        db.add(report)
        await db.flush()
        await db.refresh(report)
        logger.info(f"Created revenue report for {report_date} {asset}")
        return report

    @staticmethod
    async def get_report(
        report_date: date,
        asset: str = "USDT",
        db: AsyncSession = None,
    ) -> Optional[DailyRevenueReport]:
        """Get stored report for a date (and optional asset)."""
        stmt = select(DailyRevenueReport).where(
            and_(
                DailyRevenueReport.report_date == report_date,
                DailyRevenueReport.asset == asset,
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_reports(
        from_date: date,
        to_date: date,
        asset: str = "USDT",
        limit: int = 90,
        offset: int = 0,
        db: AsyncSession = None,
    ) -> List[DailyRevenueReport]:
        """List stored reports in date range, newest first."""
        stmt = (
            select(DailyRevenueReport)
            .where(
                and_(
                    DailyRevenueReport.report_date >= from_date,
                    DailyRevenueReport.report_date <= to_date,
                    DailyRevenueReport.asset == asset,
                )
            )
            .order_by(DailyRevenueReport.report_date.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_summary(
        from_date: date,
        to_date: date,
        asset: str = "USDT",
        db: AsyncSession = None,
    ) -> dict:
        """Aggregate totals over date range from stored reports."""
        stmt = select(
            func.coalesce(func.sum(DailyRevenueReport.total_staked), 0).label("total_staked"),
            func.coalesce(func.sum(DailyRevenueReport.losing_stakes), 0).label("losing_stakes"),
            func.coalesce(func.sum(DailyRevenueReport.winning_profit_paid), 0).label("winning_profit_paid"),
            func.coalesce(func.sum(DailyRevenueReport.ggr), 0).label("ggr"),
            func.coalesce(func.sum(DailyRevenueReport.ngr), 0).label("ngr"),
            func.coalesce(func.sum(DailyRevenueReport.total_deposited_onchain), 0).label("total_deposited_onchain"),
            func.coalesce(func.sum(DailyRevenueReport.total_withdrawn_onchain), 0).label("total_withdrawn_onchain"),
            func.coalesce(func.sum(DailyRevenueReport.net_inflow), 0).label("net_inflow"),
        ).where(
            and_(
                DailyRevenueReport.report_date >= from_date,
                DailyRevenueReport.report_date <= to_date,
                DailyRevenueReport.asset == asset,
            )
        )
        result = await db.execute(stmt)
        row = result.one()
        return {
            "total_staked": row.total_staked,
            "losing_stakes": row.losing_stakes,
            "winning_profit_paid": row.winning_profit_paid,
            "ggr": row.ggr,
            "ngr": row.ngr,
            "total_deposited_onchain": row.total_deposited_onchain,
            "total_withdrawn_onchain": row.total_withdrawn_onchain,
            "net_inflow": row.net_inflow,
            "from_date": from_date.isoformat(),
            "to_date": to_date.isoformat(),
            "asset": asset,
        }


revenue_report_service = RevenueReportService()
