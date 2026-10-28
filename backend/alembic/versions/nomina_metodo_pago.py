"""Método de pago por defecto en la nómina

Cambios:

- `nomina.metodo_pago_id`: FK opcional a `tipos_pago.id_tipo_pago`. Es el
  método que se propone al registrar los pagos del lote; cada empleado puede
  cambiarlo. Queda nullable para los lotes históricos.

Revision ID: nomina_metodo_pago
Revises: pago_resultado_nomina
Create Date: 2026-10-22
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "nomina_metodo_pago"
down_revision: Union[str, None] = "pago_resultado_nomina"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "nomina",
        sa.Column("metodo_pago_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_nomina_metodo_pago",
        "nomina",
        "tipos_pago",
        ["metodo_pago_id"],
        ["id_tipo_pago"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_nomina_metodo_pago", "nomina", type_="foreignkey"
    )
    op.drop_column("nomina", "metodo_pago_id")
