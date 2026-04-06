"""Merge drop_numero_factura_servicio with add_tipo_pago_liq

Revision ID: merge_liq_and_drop_numero
Revises: drop_numero_factura_servicio, add_tipo_pago_liq
Create Date: 2026-04-06

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "merge_liq_and_drop_numero"
down_revision: Union[str, None] = (
    "drop_numero_factura_servicio",
    "add_tipo_pago_liq",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
