"""Add bank reference and invoice fields to person liquidations.

Revision ID: add_liq_ref_factura
Revises: drop_comision_admin_obra
Create Date: 2026-11-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_liq_ref_factura"
down_revision: Union[str, Sequence[str], None] = "drop_comision_admin_obra"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "persona_liquidacion",
        sa.Column("referencia_bancaria", sa.String(length=150), nullable=True),
    )
    op.add_column(
        "persona_liquidacion",
        sa.Column("factura", sa.String(length=100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("persona_liquidacion", "factura")
    op.drop_column("persona_liquidacion", "referencia_bancaria")
