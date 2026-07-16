"""backfill denominacion for existing dependencias

Revision ID: fill_denom_deps
Revises: add_denominacion_to_dependencia
Create Date: 2026-07-15

"""

from alembic import op


revision = "fill_denom_deps"
down_revision = "add_denominacion_to_dependencia"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "UPDATE dependencia SET denominacion = UPPER(LEFT(nombre, 3)) "
        "WHERE denominacion = '' OR denominacion IS NULL"
    )


def downgrade() -> None:
    pass
