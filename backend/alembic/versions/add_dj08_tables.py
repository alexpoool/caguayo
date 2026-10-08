"""add dj08 tables (actividad_economica, tributo, declaracion_jurada + detalles) and codigo_postal to dependencia

Revision ID: add_dj08_tables
Revises: add_id_item_anexo_to_movimiento + add_saldos_table (merge)
Create Date: 2026-09-30

"""

from alembic import op
import sqlalchemy as sa


revision = "add_dj08_tables"
# Merge de las ramas add_saldos_table (commiteada pero no aplicada en BD)
# y add_id_item_anexo_to_movimiento (head actual de la BD).
down_revision = ("add_id_item_anexo_to_movimiento", "add_saldos_table")
branch_labels = None
depends_on = None

AMT = dict(precision=20, scale=6)


def upgrade() -> None:
    op.create_table(
        "actividad_economica",
        sa.Column("id_actividad", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("codigo", sa.String(50), nullable=False),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("fecha_inicio", sa.Date(), nullable=False),
        sa.Column("fecha_fin", sa.Date(), nullable=False),
        sa.Column("ingresos", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("gastos", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("orden", sa.Integer(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("id_actividad"),
    )
    op.create_index(
        "idx_actividad_economica_codigo", "actividad_economica", ["codigo"]
    )

    op.create_table(
        "tributo",
        sa.Column("id_tributo", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("importe", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("id_tributo"),
    )
    op.create_index("idx_tributo_nombre", "tributo", ["nombre"])

    op.create_table(
        "declaracion_jurada",
        sa.Column("id_declaracion", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("codigo", sa.String(50), nullable=False),
        sa.Column("id_usuario", sa.Integer(), nullable=True),
        sa.Column("id_dependencia", sa.Integer(), nullable=True),
        sa.Column("estado", sa.String(20), nullable=False, server_default="BORRADOR"),
        sa.Column("fecha_creacion", sa.DateTime(), nullable=False),
        # Cabecera (snapshot de dependencia/usuario)
        sa.Column("nit", sa.String(20), nullable=True),
        sa.Column("nombre", sa.String(300), nullable=True),
        sa.Column("direccion", sa.String(255), nullable=True),
        sa.Column("municipio", sa.String(100), nullable=True),
        sa.Column("provincia", sa.String(100), nullable=True),
        sa.Column("codigo_postal", sa.String(10), nullable=True),
        sa.Column("telefono", sa.String(20), nullable=True),
        sa.Column("email", sa.String(100), nullable=True),
        # Datos del formulario
        sa.Column("ano_fiscal", sa.Integer(), nullable=False),
        sa.Column("opera_en_municipio", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("municipio_donde_opera", sa.String(100), nullable=True),
        sa.Column("codigo_tributo", sa.String(50), nullable=True),
        sa.Column("codigo_banco", sa.String(50), nullable=True),
        sa.Column("minimo_exento", sa.Numeric(**AMT), nullable=False, server_default="39120"),
        sa.Column("contribucion_restauracion", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("pagos_arrendamiento", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("importe_exonerado_reparaciones", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("otros_descuentos", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("bonificacion_mfp", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("cuotas_mensuales", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("otros_pagos_anticipados", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("total_retenciones", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("bonificaciones_autorizadas", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("impuesto_declaracion_rectificada", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("pago_declaracion_anterior", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("bonificacion_pronto_pago", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("impuesto_pagado_dj_ano", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("recargo_mora", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("fecha_declaracion", sa.Date(), nullable=True),
        sa.Column("observaciones", sa.String(), nullable=True),
        # Resultados calculados (snapshot)
        sa.Column("total_ingresos", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("total_gastos", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("total_tributos", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("base_imponible", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("impuesto_escala", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("impuesto_pagar", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("total_devolver", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("diferencia_pagar", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("diferencia_devolver", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("total_pagar", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["id_usuario"], ["usuarios.id_usuario"]),
        sa.ForeignKeyConstraint(["id_dependencia"], ["dependencia.id_dependencia"]),
        sa.PrimaryKeyConstraint("id_declaracion"),
        sa.UniqueConstraint("codigo"),
    )
    op.create_index("idx_dj_ano_fiscal", "declaracion_jurada", ["ano_fiscal"])
    op.create_index("idx_dj_estado", "declaracion_jurada", ["estado"])

    op.create_table(
        "declaracion_actividad",
        sa.Column("id_declaracion_actividad", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("id_declaracion", sa.Integer(), nullable=False),
        sa.Column("codigo", sa.String(50), nullable=False),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("fecha_inicio", sa.Date(), nullable=False),
        sa.Column("fecha_fin", sa.Date(), nullable=False),
        sa.Column("ingresos", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("gastos", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.Column("orden", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(
            ["id_declaracion"],
            ["declaracion_jurada.id_declaracion"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id_declaracion_actividad"),
    )
    op.create_index("idx_dj_act_declaracion", "declaracion_actividad", ["id_declaracion"])

    op.create_table(
        "declaracion_tributo",
        sa.Column("id_declaracion_tributo", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("id_declaracion", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(200), nullable=False),
        sa.Column("importe", sa.Numeric(**AMT), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(
            ["id_declaracion"],
            ["declaracion_jurada.id_declaracion"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id_declaracion_tributo"),
    )
    op.create_index("idx_dj_trib_declaracion", "declaracion_tributo", ["id_declaracion"])

    op.add_column("dependencia", sa.Column("codigo_postal", sa.String(10), nullable=True))


def downgrade() -> None:
    op.drop_column("dependencia", "codigo_postal")
    op.drop_index("idx_dj_trib_declaracion")
    op.drop_table("declaracion_tributo")
    op.drop_index("idx_dj_act_declaracion")
    op.drop_table("declaracion_actividad")
    op.drop_index("idx_dj_estado")
    op.drop_index("idx_dj_ano_fiscal")
    op.drop_table("declaracion_jurada")
    op.drop_index("idx_tributo_nombre")
    op.drop_table("tributo")
    op.drop_index("idx_actividad_economica_codigo")
    op.drop_table("actividad_economica")
