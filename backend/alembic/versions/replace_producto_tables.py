"""Replace producto tables with new item tables

Revision ID: replace_producto_tables
Revises: add_tipo_entidad
Create Date: 2026-03-23

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


revision: str = "replace_producto_tables"
down_revision: Union[str, None] = "add_tipo_entidad"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table("anexo_producto")
    op.drop_table("contrato_producto")
    op.drop_table("suplemento_producto")
    op.drop_table("factura_producto")
    op.drop_table("venta_efectivo_producto")

    op.create_table(
        "item_anexo",
        sa.Column("id_item_anexo", sa.Integer(), nullable=False),
        sa.Column("id_anexo", sa.Integer(), nullable=False),
        sa.Column("id_producto", sa.Integer(), nullable=False),
        sa.Column("cantidad", sa.Integer(), nullable=False),
        sa.Column(
            "precio_compra",
            sqlmodel.sql.sqltypes.AutoString(length=17),
            nullable=False,
        ),
        sa.Column(
            "precio_venta",
            sqlmodel.sql.sqltypes.AutoString(length=17),
            nullable=False,
        ),
        sa.Column("id_moneda", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["id_anexo"], ["anexo.id_anexo"]),
        sa.ForeignKeyConstraint(["id_moneda"], ["moneda.id_moneda"]),
        sa.ForeignKeyConstraint(["id_producto"], ["productos.id_producto"]),
        sa.PrimaryKeyConstraint("id_item_anexo"),
    )
    op.create_index("idx_item_anexo_anexo", "item_anexo", ["id_anexo"], unique=False)
    op.create_index(
        "idx_item_anexo_producto", "item_anexo", ["id_producto"], unique=False
    )

    op.create_table(
        "item_factura",
        sa.Column("id_item_factura", sa.Integer(), nullable=False),
        sa.Column("id_factura", sa.Integer(), nullable=False),
        sa.Column("id_producto", sa.Integer(), nullable=False),
        sa.Column("cantidad", sa.Integer(), nullable=False),
        sa.Column(
            "precio_compra",
            sqlmodel.sql.sqltypes.AutoString(length=17),
            nullable=False,
        ),
        sa.Column(
            "precio_venta",
            sqlmodel.sql.sqltypes.AutoString(length=17),
            nullable=False,
        ),
        sa.Column("id_moneda", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["id_factura"], ["factura.id_factura"]),
        sa.ForeignKeyConstraint(["id_moneda"], ["moneda.id_moneda"]),
        sa.ForeignKeyConstraint(["id_producto"], ["productos.id_producto"]),
        sa.PrimaryKeyConstraint("id_item_factura"),
    )
    op.create_index(
        "idx_item_factura_factura", "item_factura", ["id_factura"], unique=False
    )
    op.create_index(
        "idx_item_factura_producto", "item_factura", ["id_producto"], unique=False
    )

    op.create_table(
        "item_venta_efectivo",
        sa.Column("id_item_venta_efectivo", sa.Integer(), nullable=False),
        sa.Column("id_venta_efectivo", sa.Integer(), nullable=False),
        sa.Column("id_producto", sa.Integer(), nullable=False),
        sa.Column("cantidad", sa.Integer(), nullable=False),
        sa.Column(
            "precio_compra",
            sqlmodel.sql.sqltypes.AutoString(length=17),
            nullable=False,
        ),
        sa.Column(
            "precio_venta",
            sqlmodel.sql.sqltypes.AutoString(length=17),
            nullable=False,
        ),
        sa.Column("id_moneda", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["id_venta_efectivo"], ["venta_efectivo.id_venta_efectivo"]
        ),
        sa.ForeignKeyConstraint(["id_moneda"], ["moneda.id_moneda"]),
        sa.ForeignKeyConstraint(["id_producto"], ["productos.id_producto"]),
        sa.PrimaryKeyConstraint("id_item_venta_efectivo"),
    )
    op.create_index(
        "idx_item_venta_efectivo_venta",
        "item_venta_efectivo",
        ["id_venta_efectivo"],
        unique=False,
    )
    op.create_index(
        "idx_item_venta_efectivo_producto",
        "item_venta_efectivo",
        ["id_producto"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_table("item_anexo")
    op.drop_table("item_factura")
    op.drop_table("item_venta_efectivo")

    op.create_table(
        "anexo_producto",
        sa.Column("id_anexo", sa.Integer(), nullable=False),
        sa.Column("id_producto", sa.Integer(), nullable=False),
        sa.Column("cantidad", sa.Integer(), nullable=True),
        sa.Column(
            "precio_acordado",
            sqlmodel.sql.sqltypes.AutoString(length=18),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["id_anexo"], ["anexo.id_anexo"]),
        sa.ForeignKeyConstraint(["id_producto"], ["productos.id_producto"]),
        sa.PrimaryKeyConstraint("id_anexo", "id_producto"),
    )
    op.create_table(
        "contrato_producto",
        sa.Column("id_contrato_producto", sa.Integer(), nullable=False),
        sa.Column("id_contrato", sa.Integer(), nullable=False),
        sa.Column("id_producto", sa.Integer(), nullable=False),
        sa.Column("cantidad", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["id_contrato"], ["contrato.id_contrato"]),
        sa.ForeignKeyConstraint(["id_producto"], ["productos.id_producto"]),
        sa.PrimaryKeyConstraint("id_contrato_producto"),
        sa.UniqueConstraint("id_contrato", "id_producto"),
    )
    op.create_table(
        "suplemento_producto",
        sa.Column("id_suplemento_producto", sa.Integer(), nullable=False),
        sa.Column("id_suplemento", sa.Integer(), nullable=False),
        sa.Column("id_producto", sa.Integer(), nullable=False),
        sa.Column("cantidad", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["id_suplemento"], ["suplemento.id_suplemento"]),
        sa.ForeignKeyConstraint(["id_producto"], ["productos.id_producto"]),
        sa.PrimaryKeyConstraint("id_suplemento_producto"),
        sa.UniqueConstraint("id_suplemento", "id_producto"),
    )
    op.create_table(
        "factura_producto",
        sa.Column("id_factura_producto", sa.Integer(), nullable=False),
        sa.Column("id_factura", sa.Integer(), nullable=False),
        sa.Column("id_producto", sa.Integer(), nullable=False),
        sa.Column("cantidad", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["id_factura"], ["factura.id_factura"]),
        sa.ForeignKeyConstraint(["id_producto"], ["productos.id_producto"]),
        sa.PrimaryKeyConstraint("id_factura_producto"),
        sa.UniqueConstraint("id_factura", "id_producto"),
    )
    op.create_table(
        "venta_efectivo_producto",
        sa.Column("id_venta_efectivo_producto", sa.Integer(), nullable=False),
        sa.Column("id_venta_efectivo", sa.Integer(), nullable=False),
        sa.Column("id_producto", sa.Integer(), nullable=False),
        sa.Column("cantidad", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["id_venta_efectivo"], ["venta_efectivo.id_venta_efectivo"]
        ),
        sa.ForeignKeyConstraint(["id_producto"], ["productos.id_producto"]),
        sa.PrimaryKeyConstraint("id_venta_efectivo_producto"),
        sa.UniqueConstraint("id_venta_efectivo", "id_producto"),
    )
