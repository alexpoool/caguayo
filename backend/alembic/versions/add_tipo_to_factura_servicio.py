"""add tipo to factura_servicio

Revision ID: add_tipo_to_factura_servicio
Revises: drop_pagado_oferta
Create Date: 2026-08-13 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_tipo_to_factura_servicio'
down_revision: Union[str, None] = 'drop_pagado_oferta'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'factura_servicio',
        sa.Column(
            'tipo', sa.String(length=20), server_default='FACTURA', nullable=False
        ),
    )


def downgrade() -> None:
    op.drop_column('factura_servicio', 'tipo')
