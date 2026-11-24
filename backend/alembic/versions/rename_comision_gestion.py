"""Renombra los campos de agencia a comisión de gestión en liquidaciones.

Revision ID: rename_comision_gestion
Revises: renombrar_agencia_campos
Create Date: 2026-11-24
"""
from typing import Sequence, Union

from alembic import op

revision: str = "rename_comision_gestion"
down_revision: Union[str, None] = "renombrar_agencia_campos"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "liquidacion",
        "porcentaje_agencia",
        new_column_name="comision_gestion_porcentaje",
    )
    op.alter_column(
        "liquidacion",
        "importe_agencia",
        new_column_name="comision_gestion_importe",
    )


def downgrade() -> None:
    op.alter_column(
        "liquidacion",
        "comision_gestion_importe",
        new_column_name="importe_agencia",
    )
    op.alter_column(
        "liquidacion",
        "comision_gestion_porcentaje",
        new_column_name="porcentaje_agencia",
    )
