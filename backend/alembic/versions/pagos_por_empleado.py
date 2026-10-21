"""Pago por empleado en `nomina_empleados`

Cambios decididos:

- Se elimina la tabla `pagos`: el pago ya no cubre la nómina completa.
- `nomina_empleados` gana `fecha_pago`, `monto`, `metodo_id` (FK a
  `tipos_pago.id_tipo_pago`) y `referencia`.
- Un empleado está pagado cuando tiene `fecha_pago` y `monto`; el monto es
  libre (puede no coincidir con el neto).

La tabla `pagos` estaba vacía, así que no se pierden datos.

Revision ID: pagos_por_empleado
Revises: nomina_lote_empleados
Create Date: 2026-10-21
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "pagos_por_empleado"
down_revision: Union[str, None] = "nomina_lote_empleados"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NUM = sa.Numeric(12, 2)


def upgrade() -> None:
    op.drop_table("pagos")

    op.add_column(
        "nomina_empleados", sa.Column("fecha_pago", sa.Date(), nullable=True)
    )
    op.add_column("nomina_empleados", sa.Column("monto", NUM, nullable=True))
    op.add_column(
        "nomina_empleados", sa.Column("metodo_id", sa.Integer(), nullable=True)
    )
    op.add_column(
        "nomina_empleados",
        sa.Column("referencia", sa.String(50), nullable=True),
    )
    op.create_foreign_key(
        "fk_nomina_emp_metodo",
        "nomina_empleados",
        "tipos_pago",
        ["metodo_id"],
        ["id_tipo_pago"],
        ondelete="RESTRICT",
    )
    op.create_check_constraint(
        "chk_nomina_emp_monto",
        "nomina_empleados",
        "monto IS NULL OR monto > 0",
    )
    op.create_index(
        "idx_nomina_empleados_fecha_pago",
        "nomina_empleados",
        ["fecha_pago"],
    )
    op.create_index(
        "idx_nomina_empleados_metodo",
        "nomina_empleados",
        ["metodo_id"],
    )


def downgrade() -> None:
    op.drop_index("idx_nomina_empleados_metodo", table_name="nomina_empleados")
    op.drop_index(
        "idx_nomina_empleados_fecha_pago", table_name="nomina_empleados"
    )
    op.drop_constraint(
        "chk_nomina_emp_monto", "nomina_empleados", type_="check"
    )
    op.drop_constraint(
        "fk_nomina_emp_metodo", "nomina_empleados", type_="foreignkey"
    )
    op.drop_column("nomina_empleados", "referencia")
    op.drop_column("nomina_empleados", "metodo_id")
    op.drop_column("nomina_empleados", "monto")
    op.drop_column("nomina_empleados", "fecha_pago")

    op.create_table(
        "pagos",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("nomina_id", sa.Integer(), nullable=False),
        sa.Column(
            "fecha_pago",
            sa.Date(),
            nullable=False,
            server_default=sa.text("CURRENT_DATE"),
        ),
        sa.Column("monto", NUM, nullable=False),
        sa.Column("metodo_id", sa.Integer(), nullable=False),
        sa.Column("referencia", sa.String(50), nullable=True),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(
            ["nomina_id"],
            ["nomina.id"],
            name="fk_pagos_nomina",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["metodo_id"],
            ["tipos_pago.id_tipo_pago"],
            name="fk_pagos_metodo",
            ondelete="RESTRICT",
        ),
        sa.CheckConstraint("monto > 0", name="chk_pagos_monto"),
    )
    op.create_index("idx_pagos_nomina", "pagos", ["nomina_id"])
    op.create_index("idx_pagos_fecha", "pagos", ["fecha_pago"])
    op.create_index("idx_pagos_metodo", "pagos", ["metodo_id"])
