"""Add tipo_pago to persona_liquidacion

Revision ID: add_tipo_pago_liq
Revises: seed_servicios_tables
Create Date: 2026-04-06

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "add_tipo_pago_liq"
down_revision: Union[str, None] = "seed_servicios_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "persona_liquidacion",
        sa.Column(
            "tipo_pago",
            sa.String(length=50),
            nullable=False,
            server_default="TRANSFERENCIA",
        ),
    )


def downgrade() -> None:
    op.drop_column("persona_liquidacion", "tipo_pago")
