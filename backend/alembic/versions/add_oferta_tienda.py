"""tablas oferta_tienda e item_oferta_tienda (ofertas previas a factura)

Revision ID: add_oferta_tienda
Revises: renombrar_agencia_campos
Create Date: 2026-10-28

La oferta espeja a factura/item_factura: se arma antes de facturar y no
toca stock. Al convertirla se copia a factura (que genera su propio
código) y ahí sí se descuenta stock vía movimientos de venta.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "add_oferta_tienda"
down_revision: Union[str, None] = "renombrar_agencia_campos"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "oferta_tienda",
        sa.Column("id_oferta_tienda", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("id_contrato", sa.Integer(), sa.ForeignKey("contrato.id_contrato"), nullable=False),
        sa.Column("codigo_oferta", sa.String(50), nullable=False, unique=True),
        sa.Column("descripcion", sa.String()),
        sa.Column("observaciones", sa.String()),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("monto", sa.Numeric(), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False, server_default="ACTIVA"),
        # Rastro de conversión: factura generada por esta oferta
        sa.Column("id_factura", sa.Integer(), sa.ForeignKey("factura.id_factura")),
    )
    op.create_index("idx_oferta_tienda_codigo", "oferta_tienda", ["codigo_oferta"])
    op.create_index("idx_oferta_tienda_contrato", "oferta_tienda", ["id_contrato"])
    op.create_index("idx_oferta_tienda_estado", "oferta_tienda", ["estado"])

    op.create_table(
        "item_oferta_tienda",
        sa.Column(
            "id_item_oferta_tienda", sa.Integer(), autoincrement=True, primary_key=True
        ),
        sa.Column(
            "id_oferta_tienda",
            sa.Integer(),
            sa.ForeignKey("oferta_tienda.id_oferta_tienda"),
            nullable=False,
        ),
        sa.Column("id_producto", sa.Integer(), sa.ForeignKey("productos.id_producto"), nullable=False),
        sa.Column("cantidad", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("precio_compra", sa.Numeric(15, 4), nullable=False),
        sa.Column("precio_venta", sa.Numeric(15, 4), nullable=False),
        sa.Column("id_moneda", sa.Integer(), sa.ForeignKey("moneda.id_moneda"), nullable=False),
        sa.Column("codigo", sa.String(100)),
        sa.Column("id_anexo", sa.Integer(), sa.ForeignKey("anexo.id_anexo")),
    )
    op.create_index(
        "idx_item_oferta_tienda_oferta", "item_oferta_tienda", ["id_oferta_tienda"]
    )
    op.create_index(
        "idx_item_oferta_tienda_producto", "item_oferta_tienda", ["id_producto"]
    )


def downgrade() -> None:
    op.drop_index("idx_item_oferta_tienda_producto", table_name="item_oferta_tienda")
    op.drop_index("idx_item_oferta_tienda_oferta", table_name="item_oferta_tienda")
    op.drop_table("item_oferta_tienda")
    op.drop_index("idx_oferta_tienda_estado", table_name="oferta_tienda")
    op.drop_index("idx_oferta_tienda_contrato", table_name="oferta_tienda")
    op.drop_index("idx_oferta_tienda_codigo", table_name="oferta_tienda")
    op.drop_table("oferta_tienda")
