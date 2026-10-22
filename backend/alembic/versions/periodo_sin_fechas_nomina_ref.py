"""Periodo sin fechas y referencia desde nómina

Cambios:

- `periodo_evaluaciones` vuelve a ser un catálogo simple (nombre, descripción):
  se eliminan `fecha_inicio`/`fecha_fin`, su CHECK y la unicidad compuesta.
  El nombre vuelve a ser único.
- `nomina.periodo` (fecha) se sustituye por `nomina.periodo_id`, FK al catálogo
  compartido `periodo_evaluaciones`. Queda nullable para los lotes históricos.

Revision ID: periodo_sin_fechas_nomina_ref
Revises: periodo_evaluacion_fechas
Create Date: 2026-10-22
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "periodo_sin_fechas_nomina_ref"
down_revision: Union[str, None] = "periodo_evaluacion_fechas"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Catálogo de periodos: solo nombre + descripción (+ activo).
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

    # Nómina: la fecha suelta pasa a ser una FK al catálogo de periodos.
    op.add_column("nomina", sa.Column("periodo_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_nomina_periodo",
        "nomina",
        "periodo_evaluaciones",
        ["periodo_id"],
        ["id_periodo_evaluacion"],
        ondelete="RESTRICT",
    )
    op.drop_column("nomina", "periodo")


def downgrade() -> None:
    # Nómina: se repone la fecha, usando el inicio del lote como valor.
    op.add_column("nomina", sa.Column("periodo", sa.Date(), nullable=True))
    op.execute("UPDATE nomina SET periodo = inicio_periodo WHERE periodo IS NULL")
    op.alter_column("nomina", "periodo", existing_type=sa.Date(), nullable=False)
    op.drop_constraint("fk_nomina_periodo", "nomina", type_="foreignkey")
    op.drop_column("nomina", "periodo_id")

    # Catálogo: se reponen las fechas con la fecha de creación como rango.
    op.add_column(
        "periodo_evaluaciones", sa.Column("fecha_inicio", sa.Date(), nullable=True)
    )
    op.add_column(
        "periodo_evaluaciones", sa.Column("fecha_fin", sa.Date(), nullable=True)
    )
    op.execute(
        """
        UPDATE periodo_evaluaciones
        SET fecha_inicio = COALESCE(created_at::date, CURRENT_DATE),
            fecha_fin = COALESCE(created_at::date, CURRENT_DATE)
        """
    )
    op.alter_column(
        "periodo_evaluaciones",
        "fecha_inicio",
        existing_type=sa.Date(),
        nullable=False,
    )
    op.alter_column(
        "periodo_evaluaciones",
        "fecha_fin",
        existing_type=sa.Date(),
        nullable=False,
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
