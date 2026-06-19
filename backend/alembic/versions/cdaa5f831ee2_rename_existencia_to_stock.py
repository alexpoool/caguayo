"""rename_existencia_to_stock

Revision ID: cdaa5f831ee2
Revises: add_cuenta_dependencias_table
Create Date: 2026-06-16 12:16:07.821951

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cdaa5f831ee2'
down_revision: Union[str, None] = 'add_cuenta_dependencias_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    from sqlalchemy import inspect
    inspector = inspect(conn)
    columns = [c["name"] for c in inspector.get_columns("productos")]
    if "existencia" in columns:
        op.alter_column("productos", "existencia", new_column_name="stock")


def downgrade() -> None:
    conn = op.get_bind()
    columns = [c["name"] for c in conn.dialect.get_columns(conn, "productos")]
    if "stock" in columns:
        op.alter_column("productos", "stock", new_column_name="existencia")
