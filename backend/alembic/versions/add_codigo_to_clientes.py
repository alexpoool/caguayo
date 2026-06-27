"""Add codigo column to clientes

Revision ID: add_codigo_to_clientes
Revises: migrate_codes_to_new_format
Create Date: 2026-06-04

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


revision: str = "add_codigo_to_clientes"
down_revision: Union[str, None] = "migrate_codes_to_new_format"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE clientes ADD COLUMN IF NOT EXISTS codigo VARCHAR(50)")
    op.execute("""
        UPDATE clientes
        SET codigo = 'CLI-' || LPAD(id_cliente::text, 6, '0')
        WHERE codigo IS NULL
    """)
    op.execute("ALTER TABLE clientes ALTER COLUMN codigo SET NOT NULL")
    conn = op.get_bind()
    has_uq = conn.execute(
        text(
            "SELECT conname FROM pg_constraint con "
            "JOIN pg_class rel ON rel.oid = con.conrelid "
            "WHERE rel.relname = 'clientes' AND con.conname = 'uq_clientes_codigo'"
        )
    ).fetchone()
    if not has_uq:
        op.create_unique_constraint("uq_clientes_codigo", "clientes", ["codigo"])
    op.execute("CREATE INDEX IF NOT EXISTS idx_clientes_codigo ON clientes (codigo)")


def downgrade() -> None:
    op.drop_index("idx_clientes_codigo", table_name="clientes")
    op.drop_constraint("uq_clientes_codigo", "clientes")
    op.drop_column("clientes", "codigo")
