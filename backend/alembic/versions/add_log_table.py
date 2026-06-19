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
    op.execute(
        "CREATE TABLE IF NOT EXISTS log ("
        "    id SERIAL NOT NULL,"
        "    timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL,"
        "    nivel VARCHAR(20) NOT NULL,"
        "    tipo VARCHAR(20) NOT NULL,"
        "    mensaje VARCHAR(500) NOT NULL,"
        "    detalle VARCHAR(2000),"
        "    ip VARCHAR(50),"
        "    usuario_id INTEGER,"
        "    endpoint VARCHAR(200),"
        "    method VARCHAR(10),"
        "    status_code INTEGER,"
        "    usuario_nombre VARCHAR(100),"
        "    navegador VARCHAR(100),"
        "    PRIMARY KEY (id)"
        ")"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_log_id ON log (id)"
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_log_id'), table_name='log')
    op.drop_table('log')