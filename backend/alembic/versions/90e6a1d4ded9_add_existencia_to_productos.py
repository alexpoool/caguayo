"""add_existencia_to_productos

Revision ID: 90e6a1d4ded9
Revises: 86f8e8848cf1
Create Date: 2026-05-18 14:31:27.098398

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '90e6a1d4ded9'
down_revision: Union[str, None] = '86f8e8848cf1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE productos ADD COLUMN IF NOT EXISTS existencia INTEGER DEFAULT 0 NOT NULL"
    )


def downgrade() -> None:
    op.drop_column("productos", "existencia")
