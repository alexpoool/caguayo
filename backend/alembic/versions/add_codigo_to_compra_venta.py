"""Add codigo columns to compra/venta tables

Revision ID: add_codigo_to_compra_venta
Revises: add_codigo_to_clientes
Create Date: 2026-06-04

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "add_codigo_to_compra_venta"
down_revision: Union[str, None] = "add_codigo_to_clientes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("suplemento", sa.Column("codigo", sa.String(100), nullable=True))
    op.add_column("item_factura", sa.Column("codigo", sa.String(100), nullable=True))
    op.add_column("venta_efectivo", sa.Column("codigo", sa.String(100), nullable=True))
    op.add_column("item_venta_efectivo", sa.Column("codigo", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("item_venta_efectivo", "codigo")
    op.drop_column("venta_efectivo", "codigo")
    op.drop_column("item_factura", "codigo")
    op.drop_column("suplemento", "codigo")
