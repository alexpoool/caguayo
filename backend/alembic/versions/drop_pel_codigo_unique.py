"""Allow repeated base codes in productos_en_liquidacion.

Revision ID: drop_pel_codigo_unique
Revises: add_tipo_factura_venta
Create Date: 2026-11-26
"""

from typing import Sequence, Union

from alembic import op


revision: str = "drop_pel_codigo_unique"
down_revision: Union[str, Sequence[str], None] = "add_tipo_factura_venta"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint(
        "productos_en_liquidacion_codigo_key",
        "productos_en_liquidacion",
        type_="unique",
    )


def downgrade() -> None:
    # This downgrade requires codigo values to be unique again.
    op.create_unique_constraint(
        "productos_en_liquidacion_codigo_key",
        "productos_en_liquidacion",
        ["codigo"],
    )
