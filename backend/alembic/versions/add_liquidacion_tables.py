"""Add liquidacion tables

Revision ID: add_liquidacion_tables
Revises: 26bae45686ea
Create Date: 2026-03-11

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

revision: str = "add_liquidacion_tables"
down_revision: Union[str, None] = "26bae45686ea"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "liquidacion",
        sa.Column("id_liquidacion", sa.Integer(), nullable=False),
        sa.Column(
            "codigo", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False
        ),
        sa.Column("id_cliente", sa.Integer(), nullable=False),
        sa.Column("id_factura", sa.Integer(), nullable=True),
        sa.Column("id_moneda", sa.Integer(), nullable=False),
        sa.Column("liquidada", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("fecha_emision", sa.Date(), nullable=False),
        sa.Column("fecha_liquidacion", sa.Date(), nullable=True),
        sa.Column("descripcion", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column(
            "devengado",
            sa.Numeric(precision=10, scale=2),
            nullable=False,
            server_default="0.00",
        ),
        sa.Column(
            "tributario",
            sa.Numeric(precision=10, scale=2),
            nullable=False,
            server_default="0.00",
        ),
        sa.Column(
            "comision_bancaria",
            sa.Numeric(precision=10, scale=2),
            nullable=False,
            server_default="0.00",
        ),
        sa.Column(
            "neto_pagar",
            sa.Numeric(precision=10, scale=2),
            nullable=False,
            server_default="0.00",
        ),
        sa.Column(
            "gasto_empresa",
            sa.Numeric(precision=10, scale=2),
            nullable=False,
            server_default="0.00",
        ),
        sa.Column(
            "tipo_concepto",
            sqlmodel.sql.sqltypes.AutoString(length=100),
            nullable=False,
        ),
        sa.Column(
            "importe",
            sa.Numeric(precision=10, scale=2),
            nullable=False,
            server_default="0.00",
        ),
        sa.Column("observacion", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column(
            "tipo_pago",
            sa.String(length=20),
            nullable=False,
            server_default="TRANSFERENCIA",
        ),
        sa.ForeignKeyConstraint(["id_cliente"], ["clientes.id_cliente"]),
        sa.ForeignKeyConstraint(["id_factura"], ["factura.id_factura"]),
        sa.ForeignKeyConstraint(["id_moneda"], ["moneda.id_moneda"]),
        sa.PrimaryKeyConstraint("id_liquidacion"),
        sa.UniqueConstraint("codigo"),
    )

    op.create_table(
        "productos_liquidacion",
        sa.Column("id_producto_liquidacion", sa.Integer(), nullable=False),
        sa.Column(
            "codigo", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False
        ),
        sa.Column("cantidad", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("liquidado", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("tipo_transaccion", sa.String(length=20), nullable=False),
        sa.Column("id_transaccion", sa.Integer(), nullable=False),
        sa.Column("id_liquidacion", sa.Integer(), nullable=False),
        sa.Column("id_producto", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["id_liquidacion"], ["liquidacion.id_liquidacion"]),
        sa.ForeignKeyConstraint(["id_producto"], ["productos.id_producto"]),
        sa.PrimaryKeyConstraint("id_producto_liquidacion"),
        sa.UniqueConstraint("codigo"),
    )

    op.add_column(
        "productos",
        sa.Column("stock", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("productos", "stock")
    op.drop_table("productos_liquidacion")
    op.drop_table("liquidacion")
