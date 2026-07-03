"""merge heads

Revision ID: e4040402ac2c
Revises: add_compras_tables, seed_funcionalidades_reportes
Create Date: 2026-07-03 09:19:02.949925

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e4040402ac2c'
down_revision: Union[str, None] = ('add_compras_tables', 'seed_funcionalidades_reportes')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
