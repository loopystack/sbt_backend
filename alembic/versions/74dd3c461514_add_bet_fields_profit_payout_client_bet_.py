"""add_bet_fields_profit_payout_client_bet_id

Revision ID: 74dd3c461514
Revises: d1e2f3a4b5c6
Create Date: 2026-01-20 00:01:15.496016

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '74dd3c461514'
down_revision = 'd1e2f3a4b5c6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add profit and payout fields
    op.add_column('bets', sa.Column('profit', sa.Numeric(precision=20, scale=8), nullable=True))
    op.add_column('bets', sa.Column('payout', sa.Numeric(precision=20, scale=8), nullable=True))
    
    # Add client_bet_id for idempotency
    op.add_column('bets', sa.Column('client_bet_id', sa.String(length=100), nullable=True))
    
    # Add result_source and notes fields
    op.add_column('bets', sa.Column('result_source', sa.String(length=50), nullable=True))
    op.add_column('bets', sa.Column('notes', sa.String(length=500), nullable=True))
    
    # Add index for client_bet_id queries (optional, but useful for idempotency checks)
    op.create_index('idx_bet_user_client_id', 'bets', ['user_id', 'client_bet_id'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_bet_user_client_id', table_name='bets')
    op.drop_column('bets', 'notes')
    op.drop_column('bets', 'result_source')
    op.drop_column('bets', 'client_bet_id')
    op.drop_column('bets', 'payout')
    op.drop_column('bets', 'profit')
