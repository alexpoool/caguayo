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
    op.execute("ALTER TABLE suplemento ADD COLUMN IF NOT EXISTS codigo VARCHAR(100)")
    op.execute("ALTER TABLE item_factura ADD COLUMN IF NOT EXISTS codigo VARCHAR(100)")
    op.execute("ALTER TABLE venta_efectivo ADD COLUMN IF NOT EXISTS codigo VARCHAR(100)")
    op.execute("ALTER TABLE item_venta_efectivo ADD COLUMN IF NOT EXISTS codigo VARCHAR(100)")


def downgrade() -> None:
    op.drop_column("item_venta_efectivo", "codigo")
    op.drop_column("venta_efectivo", "codigo")
    op.drop_column("item_factura", "codigo")
    op.drop_column("suplemento", "codigo")
