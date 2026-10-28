"""Catálogo de periodos de evaluación y pago por resultado

Cambios:

- `periodo_evaluaciones` (catálogo): nombre único, descripción y activo.
- `evaluaciones.periodo_evaluacion_id` (FK nullable, RESTRICT a propósito):
  conserva el texto `periodo` por compatibilidad y para listados históricos.
- Se ensancha `evaluaciones.periodo` a VARCHAR(100) para que quepa el nombre
  del catálogo.
- Se siembra el catálogo con los textos ya existentes en `evaluaciones` y se
  enlazan las filas.
- `pago_x_resultado`: cabecera del lote (periodo, fechas, monto, promedio y
  suma de coeficientes calculados).
- `pago_x_resultado_empleado`: detalle con evaluación, puntuación,
  coeficiente y monto individual.

Revision ID: pago_por_resultado
Revises: pagos_por_empleado
Create Date: 2026-10-21
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "pago_por_resultado"
down_revision: Union[str, None] = "pagos_por_empleado"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Catálogo de periodos ────────────────────────────────────────────────
    op.create_table(
        "periodo_evaluaciones",
        sa.Column(
            "id_periodo_evaluacion",
            sa.Integer(),
            autoincrement=True,
            nullable=False,
        ),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column(
            "activo", sa.Boolean(), nullable=False, server_default=sa.text("true")
        ),
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
        sa.PrimaryKeyConstraint(
            "id_periodo_evaluacion", name="pk_periodo_evaluaciones"
        ),
        sa.UniqueConstraint("nombre", name="uq_periodo_evaluaciones_nombre"),
    )

    op.execute(
        """
        INSERT INTO periodo_evaluaciones (nombre, descripcion, activo)
        SELECT DISTINCT btrim(periodo), NULL, TRUE
        FROM evaluaciones
        WHERE btrim(periodo) <> ''
        ON CONFLICT (nombre) DO NOTHING
        """
    )

    op.add_column(
        "evaluaciones",
        sa.Column("periodo_evaluacion_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_evaluaciones_periodo",
        "evaluaciones",
        "periodo_evaluaciones",
        ["periodo_evaluacion_id"],
        ["id_periodo_evaluacion"],
        ondelete="RESTRICT",
    )
    op.create_index(
        "ix_evaluaciones_periodo_evaluacion_id",
        "evaluaciones",
        ["periodo_evaluacion_id"],
    )
    op.alter_column(
        "evaluaciones",
        "periodo",
        existing_type=sa.String(length=20),
        type_=sa.String(length=100),
        existing_nullable=False,
    )
    op.execute(
        """
        UPDATE evaluaciones e
        SET periodo_evaluacion_id = p.id_periodo_evaluacion
        FROM periodo_evaluaciones p
        WHERE p.nombre = btrim(e.periodo)
          AND e.periodo_evaluacion_id IS NULL
        """
    )

    # ── Lote de pago por resultado ──────────────────────────────────────────
    op.create_table(
        "pago_x_resultado",
        sa.Column(
            "id_pago_x_resultado", sa.Integer(), autoincrement=True, nullable=False
        ),
        sa.Column("periodo_evaluacion_id", sa.Integer(), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("inicio_periodo", sa.Date(), nullable=False),
        sa.Column("fin_periodo", sa.Date(), nullable=False),
        sa.Column("monto", sa.Numeric(12, 2), nullable=False),
        sa.Column(
            "promedio_general",
            sa.Numeric(8, 4),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "suma_coeficientes_empleados",
            sa.Numeric(14, 4),
            nullable=False,
            server_default=sa.text("0"),
        ),
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
        sa.CheckConstraint(
            "fin_periodo >= inicio_periodo", name="chk_pago_resultado_fechas"
        ),
        sa.CheckConstraint("monto > 0", name="chk_pago_resultado_monto"),
        sa.CheckConstraint(
            "promedio_general >= 0", name="chk_pago_resultado_promedio"
        ),
        sa.CheckConstraint(
            "suma_coeficientes_empleados >= 0",
            name="chk_pago_resultado_suma_coeficientes",
        ),
        sa.PrimaryKeyConstraint(
            "id_pago_x_resultado", name="pk_pago_x_resultado"
        ),
        sa.ForeignKeyConstraint(
            ["periodo_evaluacion_id"],
            ["periodo_evaluaciones.id_periodo_evaluacion"],
            name="fk_pago_resultado_periodo",
            ondelete="RESTRICT",
        ),
    )

    op.create_table(
        "pago_x_resultado_empleado",
        sa.Column(
            "id_pago_x_resultado_empleado",
            sa.Integer(),
            autoincrement=True,
            nullable=False,
        ),
        sa.Column("pago_x_resultado_id", sa.Integer(), nullable=False),
        sa.Column("empleado_id", sa.Integer(), nullable=False),
        sa.Column("evaluacion_id", sa.Integer(), nullable=False),
        sa.Column("puntuacion", sa.Numeric(8, 4), nullable=False),
        sa.Column("coeficiente", sa.Numeric(12, 4), nullable=False),
        sa.Column("monto_individual", sa.Numeric(12, 2), nullable=False),
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
        sa.CheckConstraint(
            "puntuacion >= 0", name="chk_pago_resultado_emp_puntuacion"
        ),
        sa.CheckConstraint(
            "coeficiente >= 0", name="chk_pago_resultado_emp_coeficiente"
        ),
        sa.CheckConstraint(
            "monto_individual >= 0", name="chk_pago_resultado_emp_monto"
        ),
        sa.PrimaryKeyConstraint(
            "id_pago_x_resultado_empleado",
            name="pk_pago_x_resultado_empleado",
        ),
        sa.ForeignKeyConstraint(
            ["pago_x_resultado_id"],
            ["pago_x_resultado.id_pago_x_resultado"],
            name="fk_pago_resultado_emp_lote",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["empleado_id"],
            ["empleados.id"],
            name="fk_pago_resultado_emp_empleado",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["evaluacion_id"],
            ["evaluaciones.id"],
            name="fk_pago_resultado_emp_evaluacion",
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "pago_x_resultado_id",
            "empleado_id",
            name="uq_pago_resultado_empleado",
        ),
    )


def downgrade() -> None:
    op.drop_table("pago_x_resultado_empleado")
    op.drop_table("pago_x_resultado")

    op.drop_index(
        "ix_evaluaciones_periodo_evaluacion_id", table_name="evaluaciones"
    )
    op.drop_constraint(
        "fk_evaluaciones_periodo", "evaluaciones", type_="foreignkey"
    )
    op.drop_column("evaluaciones", "periodo_evaluacion_id")
    op.alter_column(
        "evaluaciones",
        "periodo",
        existing_type=sa.String(length=100),
        type_=sa.String(length=20),
        existing_nullable=False,
    )
    op.drop_table("periodo_evaluaciones")
