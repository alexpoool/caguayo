"""merge cuentas funcionalidad with estadoventa

Revision ID: merge_cuentas_and_estadoventa
Revises: add_cuentas_funcionalidad, create_estadoventa_enum
Create Date: 2026-08-24

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "merge_cuentas_and_estadoventa"
down_revision: Union[str, None] = ("add_cuentas_funcionalidad", "create_estadoventa_enum")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
