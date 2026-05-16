"""Add facturada field to tareas_etapa

Revision ID: add_facturada_tarea_etapa
Revises: remove_cedula_rif
Create Date: 2026-05-13
"""

from alembic import op
import sqlalchemy as sa


revision = "add_facturada_tarea_etapa"
down_revision = "remove_cedula_rif"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tareas_etapa",
        sa.Column("facturada", sa.Boolean(), nullable=True, server_default="false"),
    )


def downgrade() -> None:
    op.drop_column("tareas_etapa", "facturada")