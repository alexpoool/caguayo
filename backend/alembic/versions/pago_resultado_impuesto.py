"""Impuesto y neto en el pago por resultado

Cambios:

- `pago_x_resultado.porcentaje_impuesto`: porcentaje de impuesto del lote
  (0–100). Se aplica sobre el devengado de cada empleado.
- `pago_x_resultado_empleado.monto_individual` pasa a llamarse `devengado`.
- Se añaden `impuesto` y `neto_a_cobrar` por empleado:
  `impuesto = devengado × porcentaje / 100` y
  `neto_a_cobrar = devengado − impuesto`.
- Los lotes existentes quedan con impuesto 0 y neto = devengado.

Revision ID: pago_resultado_impuesto
Revises: nomina_metodo_pago
Create Date: 2026-10-22
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "pago_resultado_impuesto"
down_revision: Union[str, None] = "nomina_metodo_pago"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "pago_x_resultado",
        sa.Column(
            "porcentaje_impuesto",
            sa.Numeric(5, 2),
            nullable=False,
            server_default="0",
        ),
    )
    op.create_check_constraint(
        "chk_pago_resultado_porcentaje",
        "pago_x_resultado",
        "porcentaje_impuesto >= 0 AND porcentaje_impuesto <= 100",
    )

    op.drop_constraint(
        "chk_pago_resultado_emp_monto",
        "pago_x_resultado_empleado",
        type_="check",
    )
    op.alter_column(
        "pago_x_resultado_empleado",
        "monto_individual",
        new_column_name="devengado",
    )
    op.create_check_constraint(
        "chk_pago_resultado_emp_devengado",
        "pago_x_resultado_empleado",
        "devengado >= 0",
    )

    op.add_column(
        "pago_x_resultado_empleado",
        sa.Column(
            "impuesto",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "pago_x_resultado_empleado",
        sa.Column(
            "neto_a_cobrar",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0",
        ),
    )
    op.execute(
        "UPDATE pago_x_resultado_empleado SET neto_a_cobrar = devengado"
    )
    op.create_check_constraint(
        "chk_pago_resultado_emp_impuesto",
        "pago_x_resultado_empleado",
        "impuesto >= 0",
    )
    op.create_check_constraint(
        "chk_pago_resultado_emp_neto",
        "pago_x_resultado_empleado",
        "neto_a_cobrar >= 0",
    )


def downgrade() -> None:
    op.drop_constraint(
        "chk_pago_resultado_emp_neto",
        "pago_x_resultado_empleado",
        type_="check",
    )
    op.drop_constraint(
        "chk_pago_resultado_emp_impuesto",
        "pago_x_resultado_empleado",
        type_="check",
    )
    op.drop_column("pago_x_resultado_empleado", "neto_a_cobrar")
    op.drop_column("pago_x_resultado_empleado", "impuesto")

    op.drop_constraint(
        "chk_pago_resultado_emp_devengado",
        "pago_x_resultado_empleado",
        type_="check",
    )
    op.alter_column(
        "pago_x_resultado_empleado",
        "devengado",
        new_column_name="monto_individual",
    )
    op.create_check_constraint(
        "chk_pago_resultado_emp_monto",
        "pago_x_resultado_empleado",
        "monto_individual >= 0",
    )

    op.drop_constraint(
        "chk_pago_resultado_porcentaje",
        "pago_x_resultado",
        type_="check",
    )
    op.drop_column("pago_x_resultado", "porcentaje_impuesto")
