"""Add payment references to purchase liquidations.

Revision ID: add_liquidacion_referencias
Revises: ensure_liq_fact_cols
Create Date: 2026-11-26
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_liquidacion_referencias"
down_revision: Union[str, Sequence[str], None] = "ensure_liq_fact_cols"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns() -> set[str]:
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns("liquidacion")}


def upgrade() -> None:
    columns = _existing_columns()
    if "referencia_liquidacion" not in columns:
        op.add_column("liquidacion", sa.Column("referencia_liquidacion", sa.String(length=150), nullable=True))
    if "referencia_pago" not in columns:
        op.add_column("liquidacion", sa.Column("referencia_pago", sa.String(length=150), nullable=True))
    if "factura" not in columns:
        op.add_column("liquidacion", sa.Column("factura", sa.String(length=100), nullable=True))


def downgrade() -> None:
    # No eliminar columnas: pueden contener referencias registradas después del upgrade.
    pass
