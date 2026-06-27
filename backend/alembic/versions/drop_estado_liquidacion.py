"""Drop estado column from liquidacion table

Revision ID: drop_estado_liquidacion
Revises: seed_item_tables
Create Date: 2026-05-15
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "drop_estado_liquidacion"
down_revision: Union[str, None] = "seed_item_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if the column exists before dropping
    conn = op.get_bind()
    result = conn.execute(
        sa.text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'liquidacion' AND column_name = 'estado'
        """)
    )
    if result.fetchone():
        op.drop_column("liquidacion", "estado")


def downgrade() -> None:
    op.add_column(
        "liquidacion", sa.Column("estado", sa.String(20), server_default="PENDIENTE")
    )
