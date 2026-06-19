"""add codigo column to item_anexo

Revision ID: add_codigo_to_item_anexo
Revises: 524de4aaae94
Create Date: 2026-06-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_codigo_to_item_anexo"
down_revision: Union[str, None] = "524de4aaae94"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    from sqlalchemy import inspect
    inspector = inspect(conn)
    columns = [c["name"] for c in inspector.get_columns("item_anexo")]
    if "codigo" not in columns:
        op.add_column("item_anexo", sa.Column("codigo", sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column("item_anexo", "codigo")
