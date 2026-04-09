"""Add monto to factura_servicio

Revision ID: add_monto_factura_servicio
Revises: merge_liq_and_drop_numero
Create Date: 2026-04-07

"""

from alembic import op
import sqlalchemy as sa
from decimal import Decimal


revision = "add_monto_factura_servicio"
down_revision = "7707c2a751cf"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "factura_servicio",
        sa.Column("monto", sa.DECIMAL(precision=15, scale=2), nullable=True),
    )
    op.execute(
        "UPDATE factura_servicio SET monto = cantidad * precio WHERE monto IS NULL"
    )


def downgrade() -> None:
    op.drop_column("factura_servicio", "monto")
