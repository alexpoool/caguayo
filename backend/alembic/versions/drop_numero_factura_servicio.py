"""Drop numero column from factura_servicio

Revision ID: drop_numero_factura_servicio
Revises: add_servicios_tables
Create Date: 2026-04-02

"""

from alembic import op
import sqlalchemy as sa


revision = "drop_numero_factura_servicio"
down_revision = "drop_numero_solicitud"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("factura_servicio", "numero")


def downgrade() -> None:
    op.add_column("factura_servicio", sa.Column("numero", sa.String(50), nullable=True))
