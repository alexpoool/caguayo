"""merge all heads

Revision ID: cf42c599529a
Revises: 924a816ae36e, add_cargo_usuario, add_log_table, add_nit_column_to_dependencia, drop_estado_liquidacion
Create Date: 2026-06-03 09:42:02.569897

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "cf42c599529a"
down_revision: Union[str, None] = (
    "924a816ae36e",
    "add_cargo_usuario",
    "add_log_table",
    "add_nit_column_to_dependencia",
    "drop_estado_liquidacion",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
