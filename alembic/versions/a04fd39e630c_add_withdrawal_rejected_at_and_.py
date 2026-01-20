"""add_withdrawal_rejected_at_and_idempotency_fields

Revision ID: a04fd39e630c
Revises: 74dd3c461514
Create Date: 2026-01-20 06:47:11.413606

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a04fd39e630c'
down_revision = '74dd3c461514'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add rejected_at timestamp for rejected withdrawals
    op.add_column('withdrawal_intents', sa.Column('rejected_at', sa.DateTime(), nullable=True))
    
    # Add client_request_id for idempotency (optional, allows client to prevent duplicate requests)
    op.add_column('withdrawal_intents', sa.Column('client_request_id', sa.String(length=100), nullable=True))
    
    # Create combined index for (user_id, status, created_at) as required by Week 8
    op.create_index(
        'idx_withdrawal_user_status_created',
        'withdrawal_intents',
        ['user_id', 'status', 'created_at'],
        unique=False
    )
    
    # Create index for client_request_id to support idempotency lookups
    op.create_index(
        'idx_withdrawal_client_request_id',
        'withdrawal_intents',
        ['user_id', 'client_request_id'],
        unique=False
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_withdrawal_client_request_id', table_name='withdrawal_intents')
    op.drop_index('idx_withdrawal_user_status_created', table_name='withdrawal_intents')
    
    # Drop columns
    op.drop_column('withdrawal_intents', 'client_request_id')
    op.drop_column('withdrawal_intents', 'rejected_at')
