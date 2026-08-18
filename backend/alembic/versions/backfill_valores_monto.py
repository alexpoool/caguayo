"""Backfill valores (monto) en cero para contrato y suplemento

Revision ID: backfill_valores_monto
Revises: add_fecha_vigencia_suplemento
Create Date: 2026-08-18
"""

from alembic import op


revision: str = "backfill_valores_monto"
down_revision: str = "add_fecha_vigencia_suplemento"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "UPDATE contrato SET monto = (100000 + floor(random() * 900001))::numeric "
        "WHERE monto = 0 OR monto IS NULL"
    )
    op.execute(
        "UPDATE suplemento SET monto = (100000 + floor(random() * 900001))::numeric "
        "WHERE monto = 0 OR monto IS NULL"
    )


def downgrade() -> None:
    pass