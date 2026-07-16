"""add_a_vender_to_item_anexo

Revision ID: 733b55e2a9ce
Revises: seed_item_anexo_data
Create Date: 2026-07-10 14:32:18.978241

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '733b55e2a9ce'
down_revision: Union[str, None] = 'seed_item_anexo_data'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('item_anexo', sa.Column(
        'a_vender', sa.Boolean(), nullable=False, server_default=sa.text('false')
    ))
    # Existing items that have been vendidos > 0 should be available to sell
    op.execute("UPDATE item_anexo SET a_vender = true WHERE vendido > 0")


def downgrade() -> None:
    op.drop_column('item_anexo', 'a_vender')
