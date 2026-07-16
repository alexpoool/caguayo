"""add denominacion to dependencia

Revision ID: add_denominacion_to_dependencia
Revises: cb6d9e4f73a1
Create Date: 2026-07-15

"""

from alembic import op
import sqlalchemy as sa


revision = "add_denominacion_to_dependencia"
down_revision = "cb6d9e4f73a1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "dependencia",
        sa.Column("denominacion", sa.String(length=3), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("dependencia", "denominacion")
