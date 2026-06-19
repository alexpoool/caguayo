"""add_cantidad_vendida_to_item_anexo

Revision ID: 924a816ae36e
Revises: 90e6a1d4ded9
Create Date: 2026-05-18 14:33:32.879818

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '924a816ae36e'
down_revision: Union[str, None] = '90e6a1d4ded9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE item_anexo ADD COLUMN IF NOT EXISTS cantidad_vendida INTEGER DEFAULT 0 NOT NULL"
    )


def downgrade() -> None:
    op.drop_column("item_anexo", "cantidad_vendida")
