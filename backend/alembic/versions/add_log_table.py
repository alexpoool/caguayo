"""Create log table for system logging

Revision ID: add_log_table
Revises: 
Create Date: 2026-05-03

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = 'add_log_table'
down_revision = 'a9d239ce0765'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'log',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('nivel', sa.String(length=20), nullable=False),
        sa.Column('tipo', sa.String(length=20), nullable=False),
        sa.Column('mensaje', sa.String(length=500), nullable=False),
        sa.Column('detalle', sa.String(length=2000), nullable=True),
        sa.Column('ip', sa.String(length=50), nullable=True),
        sa.Column('usuario_id', sa.Integer(), nullable=True),
        sa.Column('endpoint', sa.String(length=200), nullable=True),
        sa.Column('method', sa.String(length=10), nullable=True),
        sa.Column('status_code', sa.Integer(), nullable=True),
        sa.Column('usuario_nombre', sa.String(length=100), nullable=True),
        sa.Column('navegador', sa.String(length=100), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_log_id'), 'log', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_log_id'), table_name='log')
    op.drop_table('log')