"""
Daily revenue and cashflow report (GGR/NGR from ledger).
One row per calendar date per asset; used for admin reporting and dashboards.
"""
from sqlalchemy import Column, Integer, String, DateTime, Numeric, Date, Index
from sqlalchemy.sql import func
from app.core.database import Base


class DailyRevenueReport(Base):
    """
    Daily snapshot of betting performance and crypto cashflow.

    Betting (ledger):
    - total_staked: sum of BET_LOCK for the day
    - losing_stakes: sum of BET_LOSS_DEDUCT (house keeps)
    - winning_profit_paid: sum of (BET_WIN_PAYOUT_CREDIT - BET_WIN_DEDUCT_STAKE) = profit paid to winners
    - ggr: Gross Gaming Revenue = losing_stakes - winning_profit_paid
    - ngr: Net Gaming Revenue = ggr - bonuses - fees

    Cashflow (on-chain movement):
    - total_deposited_onchain: sum of DEPOSIT_CREDIT for the day
    - total_withdrawn_onchain: sum of WITHDRAWAL_DEBIT for the day
    - net_inflow: total_deposited_onchain - total_withdrawn_onchain
    """
    __tablename__ = "daily_revenue_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_date = Column(Date, nullable=False, index=True)
    asset = Column(String(10), nullable=False, default="USDT", index=True)

    # Betting performance (from wallet ledger)
    total_staked = Column(Numeric(20, 8), nullable=False, default=0)
    losing_stakes = Column(Numeric(20, 8), nullable=False, default=0)
    winning_profit_paid = Column(Numeric(20, 8), nullable=False, default=0)
    ggr = Column(Numeric(20, 8), nullable=False, default=0)  # Gross Gaming Revenue
    bonuses = Column(Numeric(20, 8), nullable=False, default=0)
    fees = Column(Numeric(20, 8), nullable=False, default=0)
    ngr = Column(Numeric(20, 8), nullable=False, default=0)  # Net Gaming Revenue

    # Cashflow (crypto movement)
    total_deposited_onchain = Column(Numeric(20, 8), nullable=False, default=0)
    total_withdrawn_onchain = Column(Numeric(20, 8), nullable=False, default=0)
    net_inflow = Column(Numeric(20, 8), nullable=False, default=0)

    created_at = Column(DateTime, default=func.now(), nullable=False)

    __table_args__ = (
        Index("idx_daily_revenue_report_date_asset", "report_date", "asset", unique=True),
    )
