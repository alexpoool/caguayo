"""Add codigo column to clientes

Revision ID: add_codigo_to_clientes
Revises: migrate_codes_to_new_format
Create Date: 2026-06-04

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "add_codigo_to_clientes"
down_revision: Union[str, None] = "migrate_codes_to_new_format"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("clientes", sa.Column("codigo", sa.String(50), nullable=True))
    op.execute("""
        UPDATE clientes
        SET codigo = 'CLI-' || LPAD(id_cliente::text, 6, '0')
        WHERE codigo IS NULL
    """)
    op.alter_column("clientes", "codigo", nullable=False)
    op.create_unique_constraint("uq_clientes_codigo", "clientes", ["codigo"])
    op.create_index("idx_clientes_codigo", "clientes", ["codigo"])


def downgrade() -> None:
    op.drop_index("idx_clientes_codigo", table_name="clientes")
    op.drop_constraint("uq_clientes_codigo", "clientes")
    op.drop_column("clientes", "codigo")
