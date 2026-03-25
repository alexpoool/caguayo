"""Add id_dependencia to factura table

Revision ID: add_id_dependencia_to_factura
Revises: replace_producto_tables
Create Date: 2026-03-23
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "add_id_dependencia_to_factura"
down_revision = "replace_producto_tables"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("factura", sa.Column("id_dependencia", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "factura_id_dependencia_fkey",
        "factura",
        "dependencia",
        ["id_dependencia"],
        ["id_dependencia"],
    )


def downgrade():
    op.drop_constraint("factura_id_dependencia_fkey", "factura", type_="foreignkey")
    op.drop_column("factura", "id_dependencia")
