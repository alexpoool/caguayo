"""Eliminar la comisión de administración de obra de las liquidaciones.

Revision ID: drop_comision_admin_obra
Revises: a1b2c3d4e5f6, merge_nomina_proyectos
Create Date: 2026-11-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "drop_comision_admin_obra"
down_revision: Union[str, Sequence[str], None] = (
    "a1b2c3d4e5f6",
    "merge_nomina_proyectos",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("persona_liquidacion", "comision_admin_obra")


def downgrade() -> None:
    op.add_column(
        "persona_liquidacion",
        sa.Column(
            "comision_admin_obra",
            sa.Numeric(precision=15, scale=2),
            nullable=False,
            server_default="0.00",
        ),
    )
