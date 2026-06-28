"""merge_id_cuenta_and_reeup

Revision ID: 32573ff94f16
Revises: add_id_cuenta_to_factura, add_reeup_to_dependencia
Create Date: 2026-06-15 12:26:35.141254

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "32573ff94f16"
down_revision: Union[str, None] = (
    "add_id_cuenta_to_factura",
    "add_reeup_to_dependencia",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
