"""merge rename_existencia_stock_v2 with fix_trigger_existencia_to_stock

Revision ID: 524de4aaae94
Revises: rename_existencia_stock_v2, fix_trigger_existencia_to_stock
Create Date: 2026-06-17 12:52:27.179964

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "524de4aaae94"
down_revision: Union[str, None] = (
    "rename_existencia_stock_v2",
    "fix_trigger_existencia_to_stock",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
