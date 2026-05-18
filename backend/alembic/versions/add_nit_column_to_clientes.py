"""Add nit column to clientes (rename from cedula_rif)

Revision ID: add_nit_column_to_clientes
Revises: fb03a424c458
Create Date: 2026-05-18

"""

from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "add_nit_column_to_clientes"
down_revision: Union[str, None] = "fb03a424c458"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("clientes", "cedula_rif", new_column_name="nit")


def downgrade() -> None:
    op.alter_column("clientes", "nit", new_column_name="cedula_rif")
