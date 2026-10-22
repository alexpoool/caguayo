"""Fechas del periodo de evaluación y pago único por periodo

Cambios:

- `periodo_evaluaciones.fecha_inicio` / `fecha_fin`: identifican sin ambigüedad
  dos periodos con el mismo nombre (p. ej. dos «semanal»).
- La unicidad del catálogo pasa de `nombre` a
  `(nombre, fecha_inicio, fecha_fin)`.
- `pago_x_resultado.periodo_evaluacion_id` queda UNIQUE: un periodo solo puede
  pagarse una vez por resultado.

Revision ID: periodo_evaluacion_fechas
Revises: pago_por_resultado
Create Date: 2026-10-22
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "periodo_evaluacion_fechas"
down_revision: Union[str, None] = "pago_por_resultado"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "periodo_evaluaciones",
        sa.Column("fecha_inicio", sa.Date(), nullable=True),
    )
    op.add_column(
        "periodo_evaluaciones",
        sa.Column("fecha_fin", sa.Date(), nullable=True),
    )

    # Backfill desde las evaluaciones enlazadas al periodo. Si un periodo no
    # tuviera evaluaciones, se usa la fecha de creación como rango de un día.
    op.execute(
        """
        UPDATE periodo_evaluaciones AS p
        SET fecha_inicio = m.min_inicio,
            fecha_fin = m.max_fin
        FROM (
            SELECT periodo_evaluacion_id,
                   MIN(inicio_periodo) AS min_inicio,
                   MAX(fin_periodo) AS max_fin
            FROM evaluaciones
            WHERE periodo_evaluacion_id IS NOT NULL
            GROUP BY periodo_evaluacion_id
        ) AS m
        WHERE p.id_periodo_evaluacion = m.periodo_evaluacion_id
        """
    )
    op.execute(
        """
        UPDATE periodo_evaluaciones
        SET fecha_inicio = COALESCE(fecha_inicio, created_at::date, CURRENT_DATE),
            fecha_fin = COALESCE(fecha_fin, created_at::date, CURRENT_DATE)
        """
    )

    op.alter_column(
        "periodo_evaluaciones", "fecha_inicio", existing_type=sa.Date(), nullable=False
    )
    op.alter_column(
        "periodo_evaluaciones", "fecha_fin", existing_type=sa.Date(), nullable=False
    )

    op.drop_constraint(
        "uq_periodo_evaluaciones_nombre", "periodo_evaluaciones", type_="unique"
    )
    op.create_unique_constraint(
        "uq_periodo_evaluaciones_nombre_fechas",
        "periodo_evaluaciones",
        ["nombre", "fecha_inicio", "fecha_fin"],
    )
    op.create_check_constraint(
        "chk_periodo_evaluacion_fechas",
        "periodo_evaluaciones",
        "fecha_fin >= fecha_inicio",
    )

    op.create_unique_constraint(
        "uq_pago_resultado_periodo",
        "pago_x_resultado",
        ["periodo_evaluacion_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_pago_resultado_periodo", "pago_x_resultado", type_="unique"
    )
    op.drop_constraint(
        "chk_periodo_evaluacion_fechas", "periodo_evaluaciones", type_="check"
    )
    op.drop_constraint(
        "uq_periodo_evaluaciones_nombre_fechas",
        "periodo_evaluaciones",
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_periodo_evaluaciones_nombre", "periodo_evaluaciones", ["nombre"]
    )
    op.drop_column("periodo_evaluaciones", "fecha_fin")
    op.drop_column("periodo_evaluaciones", "fecha_inicio")
