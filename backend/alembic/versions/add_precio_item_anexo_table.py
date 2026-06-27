"""Add precio_item_anexo table

Revision ID: add_precio_item_anexo_table
Revises: 32573ff94f16
Create Date: 2026-06-17

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import NUMERIC


revision = "add_precio_item_anexo_table"
down_revision = "32573ff94f16"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "precio_item_anexo",
        sa.Column(
            "id_precio_item_anexo", sa.Integer(), autoincrement=True, nullable=False
        ),
        sa.Column("id_item_anexo", sa.Integer(), nullable=False),
        sa.Column("id_moneda", sa.Integer(), nullable=False),
        sa.Column("precio_venta", NUMERIC(15, 4), nullable=False),
        sa.Column("precio_compra", NUMERIC(15, 4), nullable=True),
        sa.ForeignKeyConstraint(
            ["id_item_anexo"],
            ["item_anexo.id_item_anexo"],
        ),
        sa.ForeignKeyConstraint(
            ["id_moneda"],
            ["moneda.id_moneda"],
        ),
        sa.PrimaryKeyConstraint("id_precio_item_anexo"),
        sa.UniqueConstraint("id_item_anexo", "id_moneda", name="uq_item_anexo_moneda"),
    )
    op.create_index(
        "ix_precio_item_anexo_id_item_anexo",
        "precio_item_anexo",
        ["id_item_anexo"],
    )


def downgrade() -> None:
    op.drop_index("ix_precio_item_anexo_id_item_anexo")
    op.drop_table("precio_item_anexo")
