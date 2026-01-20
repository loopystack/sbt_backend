"""add_unique_withdrawal_client_request_id

Revision ID: 9b0990e66fba
Revises: a04fd39e630c
Create Date: 2026-01-20 07:18:31.099700

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9b0990e66fba'
down_revision = 'a04fd39e630c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Enforce idempotency key uniqueness per user (nulls allowed)
    op.create_unique_constraint(
        "uq_withdrawal_user_client_request_id",
        "withdrawal_intents",
        ["user_id", "client_request_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_withdrawal_user_client_request_id",
        "withdrawal_intents",
        type_="unique",
    )
