"""add_bets_table

Revision ID: d1e2f3a4b5c6
Revises: bc91ff2443aa
Create Date: 2024-01-15 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, None] = 'bc91ff2443aa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create bet_status enum type using raw SQL (only if it doesn't exist)
    # Use DO block to check and create atomically
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'betstatus') THEN
                CREATE TYPE betstatus AS ENUM ('pending', 'won', 'lost', 'void', 'cancelled', 'settling');
            END IF;
        END $$;
    """)
    
    # Check if table already exists
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    table_exists = 'bets' in inspector.get_table_names()
    
    if not table_exists:
        # Create bets table - reference enum by name to avoid recreation
        bet_status_enum = postgresql.ENUM(name='betstatus', create_type=False)
        
        op.create_table(
            'bets',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('match_id', sa.Integer(), nullable=False),
            sa.Column('market_key', sa.String(length=50), nullable=False),
            sa.Column('selection_key', sa.String(length=50), nullable=False),
            sa.Column('odds_decimal', sa.Numeric(precision=10, scale=4), nullable=False),
            sa.Column('stake', sa.Numeric(precision=20, scale=8), nullable=False),
            sa.Column('currency', sa.String(length=10), nullable=False, server_default='USDT'),
            sa.Column('status', bet_status_enum, nullable=False, server_default='pending'),
            sa.Column('settle_version', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('placed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('settled_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.ForeignKeyConstraint(['match_id'], ['odds.id'], ),
            sa.PrimaryKeyConstraint('id'),
            sa.CheckConstraint('stake > 0', name='check_stake_positive'),
            sa.CheckConstraint('odds_decimal >= 1.01', name='check_odds_minimum'),
        )
        
        # Create indexes (only if table was just created)
        op.create_index('ix_bets_id', 'bets', ['id'], unique=False)
        op.create_index('ix_bets_user_id', 'bets', ['user_id'], unique=False)
        op.create_index('ix_bets_match_id', 'bets', ['match_id'], unique=False)
        op.create_index('ix_bets_status', 'bets', ['status'], unique=False)
        op.create_index('idx_bet_user_status', 'bets', ['user_id', 'status'], unique=False)
        op.create_index('idx_bet_match', 'bets', ['match_id'], unique=False)
        op.create_index('idx_bet_user_match_market_selection', 'bets', ['user_id', 'match_id', 'market_key', 'selection_key', 'status'], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_bet_user_match_market_selection', table_name='bets')
    op.drop_index('idx_bet_match', table_name='bets')
    op.drop_index('idx_bet_user_status', table_name='bets')
    op.drop_index('ix_bets_status', table_name='bets')
    op.drop_index('ix_bets_match_id', table_name='bets')
    op.drop_index('ix_bets_user_id', table_name='bets')
    op.drop_index('ix_bets_id', table_name='bets')
    
    # Drop table
    op.drop_table('bets')
    
    # Drop enum type
    bet_status_enum = postgresql.ENUM(name='betstatus')
    bet_status_enum.drop(op.get_bind(), checkfirst=True)
