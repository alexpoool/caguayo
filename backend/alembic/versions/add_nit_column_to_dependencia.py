"""Add nit column to dependencia

Revision ID: add_nit_column_to_dependencia
Revises: add_ajuste_fields
Create Date: 2026-06-03

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "add_nit_column_to_dependencia"
down_revision: Union[str, None] = "add_ajuste_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "dependencia",
        sa.Column("nit", sa.String(20), unique=True, nullable=True),
    )


def downgrade() -> None:
    op.drop_column("dependencia", "nit")
