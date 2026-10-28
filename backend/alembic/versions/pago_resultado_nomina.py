"""Nómina de origen en el pago por resultado

Cambios:

- `pago_x_resultado.nomina_id`: FK a `nomina.id` (`ON DELETE RESTRICT`) y
  UNIQUE, de modo que una nómina solo puede pagarse una vez por resultado.
- La columna queda **nullable** para conservar el pago histórico creado
  antes de existir la relación; el DTO de alta la exige.

Revision ID: pago_resultado_nomina
Revises: periodo_sin_fechas_nomina_ref
Create Date: 2026-10-22
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "pago_resultado_nomina"
down_revision: Union[str, None] = "periodo_sin_fechas_nomina_ref"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "pago_x_resultado",
        sa.Column("nomina_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_pago_resultado_nomina",
        "pago_x_resultado",
        "nomina",
        ["nomina_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_unique_constraint(
        "uq_pago_resultado_nomina",
        "pago_x_resultado",
        ["nomina_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_pago_resultado_nomina", "pago_x_resultado", type_="unique"
    )
    op.drop_constraint(
        "fk_pago_resultado_nomina", "pago_x_resultado", type_="foreignkey"
    )
    op.drop_column("pago_x_resultado", "nomina_id")
