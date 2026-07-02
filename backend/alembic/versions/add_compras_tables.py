"""Add compras and detalle_compras tables

Revision ID: add_compras_tables
Revises: add_fk_id_dependencia_movimiento
Create Date: 2026-07-02

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_compras_tables"
down_revision: Union[str, None] = "add_fk_id_dependencia_movimiento"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Tabla compras ---
    op.create_table(
        "compras",
        sa.Column("id_compra", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("id_cliente", sa.Integer(), nullable=False),
        sa.Column(
            "fecha",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "total",
            sa.Numeric(precision=15, scale=2),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "estado",
            sa.String(length=20),
            nullable=False,
            server_default="PENDIENTE",
        ),
        sa.Column("observacion", sa.Text(), nullable=True),
        sa.Column(
            "fecha_registro",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("fecha_actualizacion", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id_compra"),
        sa.ForeignKeyConstraint(
            ["id_cliente"], ["clientes.id_cliente"], ondelete="CASCADE"
        ),
    )

    # --- Tabla detalle_compras ---
    op.create_table(
        "detalle_compras",
        sa.Column("id_detalle", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("id_compra", sa.Integer(), nullable=False),
        sa.Column("id_producto", sa.Integer(), nullable=False),
        sa.Column("cantidad", sa.Integer(), nullable=False),
        sa.Column(
            "precio_unitario", sa.Numeric(precision=15, scale=2), nullable=False
        ),
        sa.Column("subtotal", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.PrimaryKeyConstraint("id_detalle"),
        sa.ForeignKeyConstraint(
            ["id_compra"], ["compras.id_compra"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["id_producto"], ["productos.id_producto"], ondelete="CASCADE"
        ),
    )

    # --- Índices ---
    op.create_index("idx_compras_cliente", "compras", ["id_cliente"])
    op.create_index("idx_compras_estado", "compras", ["estado"])
    op.create_index("idx_compras_fecha", "compras", ["fecha"])
    op.create_index("idx_detalle_compras_compra", "detalle_compras", ["id_compra"])
    op.create_index("idx_detalle_compras_producto", "detalle_compras", ["id_producto"])


def downgrade() -> None:
    op.drop_index("idx_detalle_compras_producto")
    op.drop_index("idx_detalle_compras_compra")
    op.drop_table("detalle_compras")
    op.drop_index("idx_compras_fecha")
    op.drop_index("idx_compras_estado")
    op.drop_index("idx_compras_cliente")
    op.drop_table("compras")
