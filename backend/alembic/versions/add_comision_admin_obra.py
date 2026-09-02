"""add comision_admin_obra to persona_liquidacion

Revision ID: a1b2c3d4e5f6
Revises: c1e6f9a2348c
Create Date: 2026-09-02 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "c1e6f9a2348c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "persona_liquidacion",
        sa.Column(
            "comision_admin_obra",
            sa.Numeric(precision=15, scale=2),
            nullable=False,
            server_default="0.00",
        ),
    )


def downgrade() -> None:
    op.drop_column("persona_liquidacion", "comision_admin_obra")
