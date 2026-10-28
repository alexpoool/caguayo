"""Nómina como lote: cabecera + detalle por empleado

Cambios decididos:

- `nomina` deja de ser una fila por empleado y pasa a ser la cabecera del
  lote: descripción, periodo, rango, moneda, tasa y porcentaje de impuesto.
  Se eliminan `empleado_id`, `salario_base`, `horas_extras`, `deducciones`,
  `bonificaciones` y `salario_neto`.
- Nueva tabla `nomina_empleados` con los importes congelados por empleado.
- Estados del lote: `pre_nomina` y `nomina`.
- Se eliminan las tablas puente `nomina_deducciones` / `nomina_bonificaciones`
  (las deducciones y bonificaciones ya cuelgan del empleado).
- Los datos existentes son residuales de pruebas (fechas 2098): se borran.

Revision ID: nomina_lote_empleados
Revises: drop_evaluacion_estado
Create Date: 2026-10-20
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "nomina_lote_empleados"
down_revision: Union[str, None] = "drop_evaluacion_estado"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NUM = sa.Numeric(12, 2)


def upgrade() -> None:
    # Residuales del modelo viejo (nóminas de prueba). Los pagos y las tablas
    # puente cuelgan de `nomina` con CASCADE, pero se borran explícitamente.
    op.execute("DELETE FROM pagos")
    op.execute("DELETE FROM nomina_deducciones")
    op.execute("DELETE FROM nomina_bonificaciones")
    op.execute("DELETE FROM nomina")

    op.drop_table("nomina_deducciones")
    op.drop_table("nomina_bonificaciones")

    for constraint in (
        "chk_neto_coherente",
        "nomina_salario_base_check",
        "nomina_horas_extras_check",
        "nomina_deducciones_check",
        "nomina_bonificaciones_check",
        "nomina_salario_neto_check",
        "nomina_estado_check",
    ):
        op.drop_constraint(constraint, "nomina", type_="check")
    op.drop_constraint("uq_nomina_empleado_periodo", "nomina", type_="unique")
    op.drop_constraint("nomina_empleado_id_fkey", "nomina", type_="foreignkey")
    op.drop_index("idx_nomina_empleado", table_name="nomina")

    op.drop_column("nomina", "empleado_id")
    op.drop_column("nomina", "salario_base")
    op.drop_column("nomina", "horas_extras")
    op.drop_column("nomina", "deducciones")
    op.drop_column("nomina", "bonificaciones")
    op.drop_column("nomina", "salario_neto")

    op.add_column(
        "nomina",
        sa.Column("descripcion", sa.String(200), nullable=False, server_default=""),
    )
    op.alter_column("nomina", "descripcion", server_default=None)
    op.add_column(
        "nomina", sa.Column("moneda_id", sa.Integer(), nullable=False)
    )
    op.create_foreign_key(
        "fk_nomina_moneda",
        "nomina",
        "moneda",
        ["moneda_id"],
        ["id_moneda"],
        ondelete="RESTRICT",
    )
    op.add_column(
        "nomina",
        sa.Column("tasa", sa.Numeric(12, 4), nullable=False, server_default="1"),
    )
    op.add_column(
        "nomina",
        sa.Column(
            "porcentaje_impuesto",
            sa.Numeric(5, 2),
            nullable=False,
            server_default="0",
        ),
    )
    op.create_check_constraint(
        "chk_nomina_estado", "nomina", "estado IN ('pre_nomina','nomina')"
    )
    op.create_check_constraint("chk_nomina_tasa", "nomina", "tasa >= 0")
    op.create_check_constraint(
        "chk_nomina_porcentaje",
        "nomina",
        "porcentaje_impuesto >= 0 AND porcentaje_impuesto <= 100",
    )

    op.create_table(
        "nomina_empleados",
        sa.Column(
            "id_nomina_empleado",
            sa.Integer(),
            primary_key=True,
            autoincrement=True,
        ),
        sa.Column("empleados_id", sa.Integer(), nullable=False),
        sa.Column("nomina_id", sa.Integer(), nullable=False),
        sa.Column("salario_base", NUM, nullable=False, server_default="0"),
        sa.Column("horas_extras", NUM, nullable=False, server_default="0"),
        sa.Column("deducciones", NUM, nullable=False, server_default="0"),
        sa.Column("bonificaciones", NUM, nullable=False, server_default="0"),
        sa.Column("salario_neto", NUM, nullable=False, server_default="0"),
        sa.Column("devengado", NUM, nullable=False, server_default="0"),
        sa.Column("impuesto", NUM, nullable=False, server_default="0"),
        sa.Column("neto_a_cobrar", NUM, nullable=False, server_default="0"),
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
            ["empleados_id"],
            ["empleados.id"],
            name="fk_nomina_emp_empleado",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["nomina_id"],
            ["nomina.id"],
            name="fk_nomina_emp_nomina",
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "nomina_id", "empleados_id", name="uq_nomina_empleados"
        ),
        sa.CheckConstraint("salario_base >= 0", name="chk_nomina_emp_salario_base"),
        sa.CheckConstraint("horas_extras >= 0", name="chk_nomina_emp_horas_extras"),
        sa.CheckConstraint("deducciones >= 0", name="chk_nomina_emp_deducciones"),
        sa.CheckConstraint(
            "bonificaciones >= 0", name="chk_nomina_emp_bonificaciones"
        ),
        sa.CheckConstraint("devengado >= 0", name="chk_nomina_emp_devengado"),
        sa.CheckConstraint("impuesto >= 0", name="chk_nomina_emp_impuesto"),
        sa.CheckConstraint("neto_a_cobrar >= 0", name="chk_nomina_emp_neto"),
    )
    op.create_index(
        "idx_nomina_empleados_nomina",
        "nomina_empleados",
        ["nomina_id"],
    )
    op.create_index(
        "idx_nomina_empleados_empleado",
        "nomina_empleados",
        ["empleados_id"],
    )


def downgrade() -> None:
    op.drop_index("idx_nomina_empleados_empleado", table_name="nomina_empleados")
    op.drop_index("idx_nomina_empleados_nomina", table_name="nomina_empleados")
    op.drop_table("nomina_empleados")

    op.drop_constraint("chk_nomina_porcentaje", "nomina", type_="check")
    op.drop_constraint("chk_nomina_tasa", "nomina", type_="check")
    op.drop_constraint("chk_nomina_estado", "nomina", type_="check")
    op.drop_column("nomina", "porcentaje_impuesto")
    op.drop_column("nomina", "tasa")
    op.drop_constraint("fk_nomina_moneda", "nomina", type_="foreignkey")
    op.drop_column("nomina", "moneda_id")
    op.drop_column("nomina", "descripcion")

    op.add_column("nomina", sa.Column("empleado_id", sa.Integer(), nullable=True))
    op.add_column(
        "nomina",
        sa.Column("salario_base", sa.Numeric(10, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "nomina",
        sa.Column("horas_extras", sa.Numeric(10, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "nomina",
        sa.Column("deducciones", sa.Numeric(10, 2), nullable=False, server_default="0"),
    )
    op.add_column(
        "nomina",
        sa.Column("bonificaciones", sa.Numeric(10, 2), nullable=False, server_default="0"),
    )
    op.add_column("nomina", sa.Column("salario_neto", sa.Numeric(10, 2), nullable=True))
    op.create_foreign_key(
        "nomina_empleado_id_fkey",
        "nomina",
        "empleados",
        ["empleado_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_unique_constraint(
        "uq_nomina_empleado_periodo", "nomina", ["empleado_id", "periodo"]
    )
    op.create_index("idx_nomina_empleado", "nomina", ["empleado_id"])
    op.create_check_constraint(
        "nomina_estado_check",
        "nomina",
        "estado IN ('pendiente','pagada','anulada')",
    )
    op.create_check_constraint(
        "chk_neto_coherente",
        "nomina",
        "salario_neto IS NULL OR salario_neto <= "
        "(salario_base + horas_extras + bonificaciones - deducciones)",
    )

    op.create_table(
        "nomina_deducciones",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("nomina_id", sa.Integer(), nullable=False),
        sa.Column("deduccion_id", sa.Integer(), nullable=False),
        sa.Column("monto_aplicado", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(
            ["nomina_id"], ["nomina.id"], name="fk_nomina_ded_nomina", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["deduccion_id"],
            ["deducciones.id_deducciones"],
            name="fk_nomina_ded_deduccion",
            ondelete="RESTRICT",
        ),
    )
    op.create_table(
        "nomina_bonificaciones",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("nomina_id", sa.Integer(), nullable=False),
        sa.Column("bonificacion_id", sa.Integer(), nullable=False),
        sa.Column("monto_aplicado", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(
            ["nomina_id"], ["nomina.id"], name="fk_nomina_bon_nomina", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["bonificacion_id"],
            ["bonificaciones.id_bonificaciones"],
            name="fk_nomina_bon_bonificacion",
            ondelete="RESTRICT",
        ),
    )
