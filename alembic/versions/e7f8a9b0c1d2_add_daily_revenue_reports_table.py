"""add_daily_revenue_reports_table

Revision ID: e7f8a9b0c1d2
Revises: 4cda7625fff6
Create Date: 2026-02-04

"""
from alembic import op
import sqlalchemy as sa


revision = "e7f8a9b0c1d2"
down_revision = "4cda7625fff6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "daily_revenue_reports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("report_date", sa.Date(), nullable=False),
        sa.Column("asset", sa.String(length=10), nullable=False),
        sa.Column("total_staked", sa.Numeric(20, 8), nullable=False),
        sa.Column("losing_stakes", sa.Numeric(20, 8), nullable=False),
        sa.Column("winning_profit_paid", sa.Numeric(20, 8), nullable=False),
        sa.Column("ggr", sa.Numeric(20, 8), nullable=False),
        sa.Column("bonuses", sa.Numeric(20, 8), nullable=False),
        sa.Column("fees", sa.Numeric(20, 8), nullable=False),
        sa.Column("ngr", sa.Numeric(20, 8), nullable=False),
        sa.Column("total_deposited_onchain", sa.Numeric(20, 8), nullable=False),
        sa.Column("total_withdrawn_onchain", sa.Numeric(20, 8), nullable=False),
        sa.Column("net_inflow", sa.Numeric(20, 8), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "idx_daily_revenue_report_date_asset",
        "daily_revenue_reports",
        ["report_date", "asset"],
        unique=True,
    )
    op.create_index(op.f("ix_daily_revenue_reports_report_date"), "daily_revenue_reports", ["report_date"], unique=False)
    op.create_index(op.f("ix_daily_revenue_reports_asset"), "daily_revenue_reports", ["asset"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_daily_revenue_reports_asset"), table_name="daily_revenue_reports")
    op.drop_index(op.f("ix_daily_revenue_reports_report_date"), table_name="daily_revenue_reports")
    op.drop_index("idx_daily_revenue_report_date_asset", table_name="daily_revenue_reports")
    op.drop_table("daily_revenue_reports")
