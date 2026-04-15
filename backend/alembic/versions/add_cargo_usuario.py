"""Add cargo to usuario

Revision ID: add_cargo_usuario
Revises: add_confirmado_liquidacion
Create Date: 2026-04-13

"""

from alembic import op
import sqlalchemy as sa


revision = "add_cargo_usuario"
down_revision = "add_confirmado_liquidacion"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column("cargo", sa.String(length=200), nullable=False, server_default=""),
    )


def downgrade() -> None:
    op.drop_column("usuarios", "cargo")
