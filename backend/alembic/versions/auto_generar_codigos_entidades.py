"""Agregar campo codigo a convenio, suplemento, venta_efectivo y renombrar contrato.codigo_convenio -> codigo"""

from alembic import op
import sqlalchemy as sa


revision = "auto_generar_codigos_entidades"
down_revision = "link_productos_item_anexo"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("convenio", sa.Column("codigo", sa.String(length=50), nullable=True))
    op.add_column(
        "suplemento", sa.Column("codigo", sa.String(length=50), nullable=True)
    )
    op.add_column(
        "venta_efectivo", sa.Column("codigo", sa.String(length=50), nullable=True)
    )

    op.alter_column("contrato", "codigo_convenio", new_column_name="codigo")


def downgrade() -> None:
    op.alter_column("contrato", "codigo", new_column_name="codigo_convenio")
    op.drop_column("venta_efectivo", "codigo")
    op.drop_column("suplemento", "codigo")
    op.drop_column("convenio", "codigo")
