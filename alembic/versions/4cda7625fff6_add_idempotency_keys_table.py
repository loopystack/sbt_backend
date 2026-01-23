"""add_idempotency_keys_table

Revision ID: 4cda7625fff6
Revises: 9fe7ab167cbe
Create Date: 2026-01-23 05:32:45.440568

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4cda7625fff6'
down_revision = '9fe7ab167cbe'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create idempotency_keys table
    op.create_table('idempotency_keys',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(length=255), nullable=False),
        sa.Column('endpoint', sa.String(length=255), nullable=False),
        sa.Column('method', sa.String(length=10), nullable=False),
        sa.Column('request_hash', sa.String(length=128), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('status_code', sa.Integer(), nullable=True),
        sa.Column('response_body', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('ix_idempotency_keys_id', 'idempotency_keys', ['id'], unique=False)
    op.create_index('ix_idempotency_keys_key', 'idempotency_keys', ['key'], unique=True)
    op.create_index('ix_idempotency_keys_request_hash', 'idempotency_keys', ['request_hash'], unique=False)
    op.create_index('ix_idempotency_keys_user_id', 'idempotency_keys', ['user_id'], unique=False)
    op.create_index('ix_idempotency_keys_expires_at', 'idempotency_keys', ['expires_at'], unique=False)
    op.create_index('ix_idempotency_keys_completed_at', 'idempotency_keys', ['completed_at'], unique=False)
    op.create_index('idx_idempotency_user_endpoint', 'idempotency_keys', ['user_id', 'endpoint'], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_idempotency_user_endpoint', table_name='idempotency_keys')
    op.drop_index('ix_idempotency_keys_completed_at', table_name='idempotency_keys')
    op.drop_index('ix_idempotency_keys_expires_at', table_name='idempotency_keys')
    op.drop_index('ix_idempotency_keys_user_id', table_name='idempotency_keys')
    op.drop_index('ix_idempotency_keys_request_hash', table_name='idempotency_keys')
    op.drop_index('ix_idempotency_keys_key', table_name='idempotency_keys')
    op.drop_index('ix_idempotency_keys_id', table_name='idempotency_keys')

    # Drop table
    op.drop_table('idempotency_keys')
