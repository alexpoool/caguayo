"""Add reeup to dependencia

Revision ID: add_reeup_to_dependencia
Revises: add_codigo_to_compra_venta
Create Date: 2026-06-08

"""

from alembic import op
import sqlalchemy as sa


revision = "add_reeup_to_dependencia"
down_revision = "add_codigo_to_compra_venta"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "dependencia",
        sa.Column("reeup", sa.String(length=15), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("dependencia", "reeup")
