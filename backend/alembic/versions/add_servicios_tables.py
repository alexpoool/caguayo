"""Add servicios tables

Revision ID: add_servicios_tables
Revises: 71dfb26e6097
Create Date: 2026-03-31

"""

from alembic import op
import sqlalchemy as sa
import sqlmodel


revision = "add_servicios_tables"
down_revision = "71dfb26e6097"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "servicios",
        sa.Column("id_servicio", sa.Integer(), nullable=False),
        sa.Column(
            "codigo_servicio",
            sqlmodel.sql.sqltypes.AutoString(length=50),
            nullable=True,
        ),
        sa.Column("concepto", sa.Text(), nullable=True),
        sa.Column(
            "unidad_medida", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True
        ),
        sa.Column("precio", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("id_moneda", sa.Integer(), nullable=True),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id_servicio"),
        sa.UniqueConstraint("codigo_servicio"),
        sa.ForeignKeyConstraint(["id_moneda"], ["moneda.id_moneda"]),
    )

    op.create_table(
        "solicitud_servicio",
        sa.Column("id_solicitud_servicio", sa.Integer(), nullable=False),
        sa.Column("id_cliente", sa.Integer(), nullable=True),
        sa.Column("id_contrato", sa.Integer(), nullable=True),
        sa.Column("id_suplemento", sa.Integer(), nullable=True),
        sa.Column(
            "codigo_solicitud",
            sqlmodel.sql.sqltypes.AutoString(length=50),
            nullable=True,
        ),
        sa.Column("numero", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
        sa.Column(
            "nombres_rep", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True
        ),
        sa.Column(
            "apellido1_rep", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True
        ),
        sa.Column(
            "apellido2_rep", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True
        ),
        sa.Column("ci_rep", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
        sa.Column(
            "telefono_rep", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True
        ),
        sa.Column("cargo", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("fecha_solicitud", sa.Date(), nullable=False),
        sa.Column("fecha_entrega", sa.Date(), nullable=True),
        sa.Column("estado", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.Column("material_asumido_x", sa.Boolean(), nullable=False),
        sa.Column("id_usuario", sa.Integer(), nullable=True),
        sa.Column("aprobado", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id_solicitud_servicio"),
        sa.ForeignKeyConstraint(["id_cliente"], ["clientes.id_cliente"]),
        sa.ForeignKeyConstraint(["id_contrato"], ["contrato.id_contrato"]),
        sa.ForeignKeyConstraint(["id_suplemento"], ["suplemento.id_suplemento"]),
    )

    op.create_table(
        "etapas",
        sa.Column("id_etapa", sa.Integer(), nullable=False),
        sa.Column("id_solicitud_servicio", sa.Integer(), nullable=False),
        sa.Column("numero_etapa", sa.Integer(), nullable=True),
        sa.Column(
            "nombre_etapa", sqlmodel.sql.sqltypes.AutoString(length=150), nullable=True
        ),
        sa.Column("fecha_entrega", sa.Date(), nullable=True),
        sa.Column("fecha_pago", sa.Date(), nullable=True),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("valor", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("id_moneda", sa.Integer(), nullable=True),
        sa.Column("pagada", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id_etapa"),
        sa.ForeignKeyConstraint(
            ["id_solicitud_servicio"],
            ["solicitud_servicio.id_solicitud_servicio"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["id_moneda"], ["moneda.id_moneda"]),
    )

    op.create_table(
        "tareas_etapa",
        sa.Column("id_tarea_etapa", sa.Integer(), nullable=False),
        sa.Column("id_etapa", sa.Integer(), nullable=False),
        sa.Column("id_servicio", sa.Integer(), nullable=True),
        sa.Column(
            "codigo_extendido",
            sqlmodel.sql.sqltypes.AutoString(length=100),
            nullable=True,
        ),
        sa.Column("concepto_modificado", sa.Text(), nullable=True),
        sa.Column(
            "unidad_medida", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True
        ),
        sa.Column("cantidad", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("precio_ajustado", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("id_moneda", sa.Integer(), nullable=True),
        sa.Column("observaciones_ajustadas", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id_tarea_etapa"),
        sa.ForeignKeyConstraint(["id_etapa"], ["etapas.id_etapa"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["id_servicio"], ["servicios.id_servicio"]),
        sa.ForeignKeyConstraint(["id_moneda"], ["moneda.id_moneda"]),
    )

    op.create_table(
        "persona_etapa",
        sa.Column("id_etapa", sa.Integer(), nullable=False),
        sa.Column("id_persona", sa.Integer(), nullable=False),
        sa.Column("cobro", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("id_moneda", sa.Integer(), nullable=True),
        sa.Column("liquidada", sa.Boolean(), nullable=False),
        sa.Column("pago_completado", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id_etapa", "id_persona"),
        sa.ForeignKeyConstraint(["id_etapa"], ["etapas.id_etapa"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["id_persona"], ["clientes_persona_natural.id_cliente"]
        ),
        sa.ForeignKeyConstraint(["id_moneda"], ["moneda.id_moneda"]),
    )

    op.create_table(
        "factura_servicio",
        sa.Column("id_factura_servicio", sa.Integer(), nullable=False),
        sa.Column("id_etapa", sa.Integer(), nullable=True),
        sa.Column(
            "alcance", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True
        ),
        sa.Column(
            "codigo_factura", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True
        ),
        sa.Column("numero", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
        sa.Column("id_moneda", sa.Integer(), nullable=True),
        sa.Column("fecha", sa.Date(), nullable=True),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("cantidad", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("precio", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.Column("id_usuario", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id_factura_servicio"),
        sa.ForeignKeyConstraint(["id_etapa"], ["etapas.id_etapa"]),
        sa.ForeignKeyConstraint(["id_moneda"], ["moneda.id_moneda"]),
    )

    op.create_table(
        "items_factura_servicio",
        sa.Column("id_item_factura_servicio", sa.Integer(), nullable=False),
        sa.Column("id_factura_servicio", sa.Integer(), nullable=False),
        sa.Column(
            "codigo_extendido",
            sqlmodel.sql.sqltypes.AutoString(length=100),
            nullable=True,
        ),
        sa.Column("concepto", sa.Text(), nullable=True),
        sa.Column(
            "unidad_medida", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True
        ),
        sa.Column("cantidad", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("precio", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.PrimaryKeyConstraint("id_item_factura_servicio"),
        sa.ForeignKeyConstraint(
            ["id_factura_servicio"],
            ["factura_servicio.id_factura_servicio"],
            ondelete="CASCADE",
        ),
    )

    op.create_table(
        "pago_factura_servicio",
        sa.Column("id_pago_factura_servicio", sa.Integer(), nullable=False),
        sa.Column("id_factura_servicio", sa.Integer(), nullable=True),
        sa.Column("monto", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("id_moneda", sa.Integer(), nullable=True),
        sa.Column("fecha", sa.Date(), nullable=True),
        sa.Column(
            "doc_traza", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True
        ),
        sa.Column(
            "doc_factura", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True
        ),
        sa.PrimaryKeyConstraint("id_pago_factura_servicio"),
        sa.ForeignKeyConstraint(
            ["id_factura_servicio"], ["factura_servicio.id_factura_servicio"]
        ),
        sa.ForeignKeyConstraint(["id_moneda"], ["moneda.id_moneda"]),
    )

    op.create_table(
        "persona_liquidacion",
        sa.Column("id_liquidacion", sa.Integer(), nullable=False),
        sa.Column("numero", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
        sa.Column("id_etapa", sa.Integer(), nullable=True),
        sa.Column("id_persona", sa.Integer(), nullable=True),
        sa.Column("fecha_emision", sa.Date(), nullable=False),
        sa.Column("fecha_liquidacion", sa.Date(), nullable=True),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("id_moneda", sa.Integer(), nullable=True),
        sa.Column("importe", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column(
            "porciento_gestion", sa.Numeric(precision=5, scale=2), nullable=False
        ),
        sa.Column(
            "porciento_empresa", sa.Numeric(precision=5, scale=2), nullable=False
        ),
        sa.Column("devengado", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("tributario", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column(
            "comision_bancaria", sa.Numeric(precision=15, scale=2), nullable=False
        ),
        sa.Column("neto_pagar", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("id_tipo_concepto", sa.Integer(), nullable=True),
        sa.Column(
            "doc_pago_liquidacion",
            sqlmodel.sql.sqltypes.AutoString(length=100),
            nullable=True,
        ),
        sa.Column("gasto_empresa", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("observacion", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id_liquidacion"),
        sa.ForeignKeyConstraint(["id_etapa"], ["etapas.id_etapa"]),
        sa.ForeignKeyConstraint(
            ["id_persona"], ["clientes_persona_natural.id_cliente"]
        ),
        sa.ForeignKeyConstraint(["id_moneda"], ["moneda.id_moneda"]),
    )


def downgrade() -> None:
    op.drop_table("persona_liquidacion")
    op.drop_table("pago_factura_servicio")
    op.drop_table("items_factura_servicio")
    op.drop_table("factura_servicio")
    op.drop_table("persona_etapa")
    op.drop_table("tareas_etapa")
    op.drop_table("etapas")
    op.drop_table("solicitud_servicio")
    op.drop_table("servicios")
