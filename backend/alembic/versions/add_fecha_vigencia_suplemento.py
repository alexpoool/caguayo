"""Add fecha_vigencia to suplemento

Revision ID: add_fecha_vigencia_suplemento
Revises: quitar_mes_de_codigos
Create Date: 2026-08-17
"""

from alembic import op
import sqlalchemy as sa


revision: str = "add_fecha_vigencia_suplemento"
down_revision: str = "quitar_mes_de_codigos"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "suplemento",
        sa.Column("fecha_vigencia", sa.Date(), nullable=True),
    )
    op.execute(
        "UPDATE suplemento SET fecha_vigencia = fecha WHERE fecha_vigencia IS NULL"
    )
    op.alter_column("suplemento", "fecha_vigencia", nullable=False)


def downgrade() -> None:
    op.drop_column("suplemento", "fecha_vigencia")