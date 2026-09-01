"""add tipo_entidad table

Revision ID: add_tipo_entidad
Revises: add_liquidacion_tables
Create Date: 2026-03-11

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "add_tipo_entidad"
down_revision: Union[str, None] = "add_liquidacion_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # tipo_entidad may already exist if the bootstrap migration (26bae45686ea)
    # created it on a fresh database.
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='tipo_entidad')"
    ))
    if not result.scalar():
        op.create_table(
            "tipo_entidad",
            sa.Column("id_tipo_entidad", sa.Integer(), nullable=False),
            sa.Column("nombre", sa.String(length=100), nullable=False),
            sa.Column("descripcion", sa.String(), nullable=True),
            sa.PrimaryKeyConstraint("id_tipo_entidad"),
            sa.UniqueConstraint("nombre"),
        )


def downgrade() -> None:
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='tipo_entidad')"
    ))
    if result.scalar():
        op.drop_table("tipo_entidad")
