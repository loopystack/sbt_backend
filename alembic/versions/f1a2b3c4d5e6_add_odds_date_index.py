"""add_odds_date_index

Revision ID: f1a2b3c4d5e6
Revises: e7f8a9b0c1d2
Create Date: 2026-02-04

"""
from alembic import op


revision = "f1a2b3c4d5e6"
down_revision = "e7f8a9b0c1d2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("idx_odds_date", "odds", ["date"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_odds_date", table_name="odds")
