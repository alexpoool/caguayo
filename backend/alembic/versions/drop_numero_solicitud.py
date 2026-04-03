"""Drop numero column from solicitud_servicio

Revision ID: drop_numero_solicitud
Revises: seed_servicios_tables
Create Date: 2026-03-31

"""

from alembic import op
import sqlalchemy as sa


revision = "drop_numero_solicitud"
down_revision = "seed_servicios_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("solicitud_servicio", "numero")


def downgrade() -> None:
    op.add_column(
        "solicitud_servicio", sa.Column("numero", sa.String(50), nullable=True)
    )
