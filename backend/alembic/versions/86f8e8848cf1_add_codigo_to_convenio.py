"""add_codigo_to_convenio

Revision ID: 86f8e8848cf1
Revises: drop_num_cliente
Create Date: 2026-05-18 14:22:11.838493

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "86f8e8848cf1"
down_revision: Union[str, None] = "drop_num_cliente"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE convenio ADD COLUMN IF NOT EXISTS codigo VARCHAR(50)")


def downgrade() -> None:
    op.drop_column("convenio", "codigo")
