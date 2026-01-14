"""add_deposit_failure_tracking_fields

Revision ID: bc91ff2443aa
Revises: 746b04caca0c
Create Date: 2025-01-13 00:00:00.000000

Add failure tracking fields (failed_at, failure_reason) to deposit_intents table
for better error handling and deposit lifecycle management.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bc91ff2443aa'
down_revision = '746b04caca0c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add failure tracking fields to deposit_intents
    op.add_column('deposit_intents', sa.Column('failed_at', sa.DateTime(), nullable=True))
    op.add_column('deposit_intents', sa.Column('failure_reason', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remove failure tracking fields
    op.drop_column('deposit_intents', 'failure_reason')
    op.drop_column('deposit_intents', 'failed_at')
