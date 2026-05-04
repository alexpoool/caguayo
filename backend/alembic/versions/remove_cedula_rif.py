"""remove_cedula_rif_from_clientes

Revision ID: remove_cedula_rif
Revises: add_cargo_usuario
Create Date: 2026-04-16

"""

from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "remove_cedula_rif"
down_revision: Union[str, None] = "add_cargo_usuario"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("clientes_cedula_rif_key", "clientes", type_="unique")
    op.drop_index("idx_clientes_cedula", table_name="clientes")
    op.drop_column("clientes", "cedula_rif")


def downgrade() -> None:
    op.add_column(
        "clientes", sa.Column("cedula_rif", sa.VARCHAR(length=20), nullable=False)
    )
    op.create_unique_constraint("clientes_cedula_rif_key", "clientes", ["cedula_rif"])
    op.create_index("idx_clientes_cedula", "clientes", ["cedula_rif"])
