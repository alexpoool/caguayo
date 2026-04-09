"""Add porcentaje_caguayo, importe_caguayo, tributario_monto to persona_liquidacion

Revision ID: add_liq_caguayo_fields
Revises: add_monto_factura_servicio
Create Date: 2026-04-08
"""

from alembic import op
import sqlalchemy as sa


revision = "add_liq_caguayo_fields"
down_revision = "add_monto_factura_servicio"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "persona_liquidacion",
        sa.Column(
            "porcentaje_caguayo",
            sa.Numeric(10, 2),
            nullable=True,
            server_default="10.00",
        ),
    )
    op.add_column(
        "persona_liquidacion",
        sa.Column(
            "importe_caguayo", sa.Numeric(15, 2), nullable=True, server_default="0.00"
        ),
    )
    op.add_column(
        "persona_liquidacion",
        sa.Column(
            "tributario_monto", sa.Numeric(15, 2), nullable=True, server_default="0.00"
        ),
    )


def downgrade() -> None:
    op.drop_column("persona_liquidacion", "tributario_monto")
    op.drop_column("persona_liquidacion", "importe_caguayo")
    op.drop_column("persona_liquidacion", "porcentaje_caguayo")
