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
    op.create_table(
        "tipo_entidad",
        sa.Column("id_tipo_entidad", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("descripcion", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id_tipo_entidad"),
        sa.UniqueConstraint("nombre"),
    )


def downgrade() -> None:
    op.drop_table("tipo_entidad")
