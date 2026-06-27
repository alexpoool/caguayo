"""add existencia column to item_anexo

Revision ID: add_existencia_to_item_anexo
Revises: add_codigo_to_item_anexo
Create Date: 2026-06-18

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_existencia_to_item_anexo"
down_revision: Union[str, None] = "add_codigo_to_item_anexo"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    from sqlalchemy import inspect

    inspector = inspect(conn)
    columns = [c["name"] for c in inspector.get_columns("item_anexo")]
    if "existencia" not in columns:
        op.add_column(
            "item_anexo",
            sa.Column("existencia", sa.Integer(), nullable=False, server_default="0"),
        )
        # Actualizar existencia con el valor calculado de cantidad - cantidad_vendida
        op.execute("UPDATE item_anexo SET existencia = cantidad - cantidad_vendida")


def downgrade() -> None:
    op.drop_column("item_anexo", "existencia")
