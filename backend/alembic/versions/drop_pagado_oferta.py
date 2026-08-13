"""drop pagado column from oferta

Revision ID: drop_pagado_oferta
Revises: seed_ofertas_prefacturas
Create Date: 2026-08-11 14:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'drop_pagado_oferta'
down_revision: Union[str, None] = 'seed_ofertas_prefacturas'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("oferta", "pagado")


def downgrade() -> None:
    op.add_column(
        "oferta",
        sa.Column(
            "pagado", sa.Numeric(precision=15, scale=2), server_default="0.00", nullable=False
        ),
    )
