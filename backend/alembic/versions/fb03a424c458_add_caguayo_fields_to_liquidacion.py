"""add_caguayo_fields_to_liquidacion

Revision ID: fb03a424c458
Revises: add_confirmado_liquidacion
Create Date: 2026-04-09 12:18:47.986928

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "fb03a424c458"
down_revision: Union[str, None] = "add_confirmado_liquidacion"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "liquidacion",
        sa.Column(
            "porcentaje_caguayo",
            sa.Numeric(precision=5, scale=2),
            nullable=False,
            server_default="10.00",
        ),
    )
    op.add_column(
        "liquidacion",
        sa.Column(
            "importe_caguayo",
            sa.Numeric(precision=15, scale=2),
            nullable=False,
            server_default="0.00",
        ),
    )
    op.add_column(
        "liquidacion",
        sa.Column(
            "tributario_monto",
            sa.Numeric(precision=15, scale=2),
            nullable=False,
            server_default="0.00",
        ),
    )


def downgrade() -> None:
    op.drop_column("liquidacion", "tributario_monto")
    op.drop_column("liquidacion", "importe_caguayo")
    op.drop_column("liquidacion", "porcentaje_caguayo")
