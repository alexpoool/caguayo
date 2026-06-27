"""Add id_cuenta column to factura table

Revision ID: add_id_cuenta_to_factura
Revises: add_nit_column_to_clientes
Create Date: 2026-05-29

"""

from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "add_id_cuenta_to_factura"
down_revision: Union[str, None] = "add_nit_column_to_clientes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from sqlalchemy import text as sa_text

    op.execute("ALTER TABLE factura ADD COLUMN IF NOT EXISTS id_cuenta INTEGER")
    conn = op.get_bind()
    result = conn.execute(
        sa_text(
            "SELECT 1 FROM pg_constraint con "
            "JOIN pg_class rel ON rel.oid = con.conrelid "
            "WHERE rel.relname = 'factura' AND con.confrelid = "
            "(SELECT oid FROM pg_class WHERE relname = 'cuenta')"
        )
    )
    if not result.fetchone():
        op.create_foreign_key(
            "fk_factura_cuenta",
            "factura",
            "cuenta",
            ["id_cuenta"],
            ["id_cuenta"],
        )


def downgrade() -> None:
    op.drop_constraint("fk_factura_cuenta", "factura", type_="foreignkey")
    op.drop_column("factura", "id_cuenta")
