"""Merge pago with conexion

Revision ID: 71dfb26e6097
Revises: 67aa739e66e8, add_pago_table
Create Date: 2026-03-30 12:31:16.783626

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '71dfb26e6097'
down_revision: Union[str, None] = ('67aa739e66e8', 'add_pago_table')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
