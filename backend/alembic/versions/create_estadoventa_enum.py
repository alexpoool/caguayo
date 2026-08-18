"""Crear enum estadoventa para la columna ventas.estado

Revision ID: create_estadoventa_enum
Revises: backfill_valores_monto
Create Date: 2026-08-18
"""

from alembic import op
import sqlalchemy as sa


revision: str = "create_estadoventa_enum"
down_revision: str = "backfill_valores_monto"
branch_labels = None
depends_on = None


def upgrade() -> None:
    estadoventa = sa.Enum("PENDIENTE", "COMPLETADA", "ANULADA", name="estadoventa")
    estadoventa.create(op.get_bind(), checkfirst=True)
    op.execute("ALTER TABLE ventas ALTER COLUMN estado DROP DEFAULT")
    op.execute(
        "ALTER TABLE ventas ALTER COLUMN estado TYPE estadoventa "
        "USING estado::text::estadoventa"
    )
    op.execute("ALTER TABLE ventas ALTER COLUMN estado SET DEFAULT 'PENDIENTE'::estadoventa")


def downgrade() -> None:
    op.execute("ALTER TABLE ventas ALTER COLUMN estado DROP DEFAULT")
    op.execute("ALTER TABLE ventas ALTER COLUMN estado TYPE varchar USING estado::text")
    op.execute("ALTER TABLE ventas ALTER COLUMN estado SET DEFAULT 'PENDIENTE'::character varying")
    estadoventa = sa.Enum("PENDIENTE", "COMPLETADA", "ANULADA", name="estadoventa")
    estadoventa.drop(op.get_bind(), checkfirst=True)