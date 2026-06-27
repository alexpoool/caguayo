"""Drop numero_cliente column from clientes

Revision ID: drop_num_cliente
Revises: add_nit_column_to_clientes
Create Date: 2026-05-18

"""

from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "drop_num_cliente"
down_revision: Union[str, None] = "add_nit_column_to_clientes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE clientes DROP COLUMN IF EXISTS numero_cliente")


def downgrade() -> None:
    op.add_column(
        "clientes",
        sa.Column("numero_cliente", sa.VARCHAR(length=20), nullable=False),
    )
