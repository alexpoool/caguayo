"""add ficha_costo, ficha_insumo and ficha_mano_obra tables

Revision ID: add_ficha_costo_tables
Revises: a1b2c3d4e5f6
Create Date: 2026-09-28

"""

from alembic import op
import sqlalchemy as sa


revision = "add_ficha_costo_tables"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None

# Coeficientes con alta precisión (el Excel usa p.ej. 0.4195769613893774)
COEF = dict(precision=22, scale=16)
# Importes monetarios y cantidades
AMT = dict(precision=20, scale=6)


def upgrade() -> None:
    op.create_table(
        "ficha_costo",
        sa.Column("id_ficha", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("id_producto", sa.Integer(), nullable=False),
        sa.Column("numero_ficha", sa.String(50), nullable=False),
        sa.Column(
            "nivel_produccion", sa.Numeric(**AMT), nullable=False, server_default="1"
        ),
        # ── Coeficientes (editables, precargados con valores de la entidad) ──
        sa.Column("pct_energia", sa.Numeric(**COEF), nullable=False, server_default="3"),
        sa.Column("pct_agua", sa.Numeric(**COEF), nullable=False, server_default="0.5"),
        sa.Column(
            "pct_otros_gastos_directos",
            sa.Numeric(**COEF),
            nullable=False,
            server_default="17",
        ),
        sa.Column(
            "pct_vacaciones", sa.Numeric(**COEF), nullable=False, server_default="9.09"
        ),
        sa.Column(
            "coef_gastos_asociados",
            sa.Numeric(**COEF),
            nullable=False,
            server_default="0.2587298394047821",
        ),
        sa.Column(
            "coef_gastos_generales",
            sa.Numeric(**COEF),
            nullable=False,
            server_default="0.4195769613893774",
        ),
        sa.Column(
            "coef_gastos_distribucion",
            sa.Numeric(**COEF),
            nullable=False,
            server_default="0.3216931992058406",
        ),
        sa.Column(
            "coef_gastos_financieros",
            sa.Numeric(**COEF),
            nullable=False,
            server_default="1.4939751466265447",
        ),
        sa.Column(
            "pct_seguridad_social",
            sa.Numeric(**COEF),
            nullable=False,
            server_default="12.5",
        ),
        sa.Column(
            "pct_fuerza_trabajo", sa.Numeric(**COEF), nullable=False, server_default="5"
        ),
        sa.Column(
            "pct_utilidad", sa.Numeric(**COEF), nullable=False, server_default="25"
        ),
        sa.Column(
            "pct_impuesto_ventas",
            sa.Numeric(**COEF),
            nullable=False,
            server_default="18",
        ),
        # ── Entradas manuales ──
        sa.Column(
            "gasto_combustible", sa.Numeric(**AMT), nullable=False, server_default="0"
        ),
        sa.Column("gasto_osde", sa.Numeric(**AMT), nullable=False, server_default="0"),
        # ── Importes calculados (snapshot al guardar) ──
        sa.Column(
            "total_insumos", sa.Numeric(**AMT), nullable=False, server_default="0"
        ),
        sa.Column("gasto_energia", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("gasto_agua", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column(
            "gasto_material", sa.Numeric(**AMT), nullable=False, server_default="0"
        ),
        sa.Column(
            "salario_directo", sa.Numeric(**AMT), nullable=False, server_default="0"
        ),
        sa.Column("vacaciones", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("salario_total", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column(
            "otros_gastos_directos", sa.Numeric(**AMT), nullable=False, server_default="0"
        ),
        sa.Column(
            "gastos_asociados", sa.Numeric(**AMT), nullable=False, server_default="0"
        ),
        sa.Column("costo_total", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column(
            "gastos_generales", sa.Numeric(**AMT), nullable=False, server_default="0"
        ),
        sa.Column(
            "gastos_distribucion", sa.Numeric(**AMT), nullable=False, server_default="0"
        ),
        sa.Column(
            "gastos_financieros", sa.Numeric(**AMT), nullable=False, server_default="0"
        ),
        sa.Column(
            "gastos_tributarios", sa.Numeric(**AMT), nullable=False, server_default="0"
        ),
        sa.Column(
            "impuesto_ventas", sa.Numeric(**AMT), nullable=False, server_default="0"
        ),
        sa.Column("total_gastos", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column(
            "total_costos_gastos", sa.Numeric(**AMT), nullable=False, server_default="0"
        ),
        sa.Column("utilidad", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("precio_tarifa", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column(
            "precio_unitario_ajustado",
            sa.Numeric(**AMT),
            nullable=False,
            server_default="0",
        ),
        # ── Metadatos del documento ──
        sa.Column("elaborado_por", sa.String(200), nullable=True),
        sa.Column("aprobado_por", sa.String(200), nullable=True),
        sa.Column("fecha_elaboracion", sa.Date(), nullable=False),
        sa.Column("fecha_aprobacion", sa.Date(), nullable=True),
        sa.ForeignKeyConstraint(["id_producto"], ["productos.id_producto"]),
        sa.PrimaryKeyConstraint("id_ficha"),
    )
    op.create_index("idx_ficha_costo_producto", "ficha_costo", ["id_producto"])

    op.create_table(
        "ficha_insumo",
        sa.Column("id_ficha_insumo", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("id_ficha", sa.Integer(), nullable=False),
        sa.Column("id_producto", sa.Integer(), nullable=True),
        sa.Column("codigo", sa.String(50), nullable=False, server_default=""),
        sa.Column("nombre", sa.String(150), nullable=False),
        sa.Column("um", sa.String(20), nullable=True),
        sa.Column("norma_consumo", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column(
            "precio_unitario", sa.Numeric(**AMT), nullable=False, server_default="0"
        ),
        sa.Column("costo", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(
            ["id_ficha"], ["ficha_costo.id_ficha"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["id_producto"], ["productos.id_producto"]),
        sa.PrimaryKeyConstraint("id_ficha_insumo"),
    )
    op.create_index("idx_ficha_insumo_ficha", "ficha_insumo", ["id_ficha"])

    op.create_table(
        "ficha_mano_obra",
        sa.Column("id_ficha_mano_obra", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("id_ficha", sa.Integer(), nullable=False),
        sa.Column("categoria", sa.String(150), nullable=False),
        sa.Column("tarifa_horaria", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("norma_tiempo", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("gasto_salario", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(
            ["id_ficha"], ["ficha_costo.id_ficha"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id_ficha_mano_obra"),
    )
    op.create_index("idx_ficha_mano_obra_ficha", "ficha_mano_obra", ["id_ficha"])


def downgrade() -> None:
    op.drop_index("idx_ficha_mano_obra_ficha")
    op.drop_table("ficha_mano_obra")
    op.drop_index("idx_ficha_insumo_ficha")
    op.drop_table("ficha_insumo")
    op.drop_index("idx_ficha_costo_producto")
    op.drop_table("ficha_costo")
