"""Quita el estado borrador/finalizada de las evaluaciones

Decisión de usuario: la evaluación es siempre editable y el estado deja de
existir (sin botón «Finalizar», sin filtro por estado y sin conteos de
borradores/finalizadas en el reporte).

Revision ID: drop_evaluacion_estado
Revises: evaluaciones_objetivos
Create Date: 2026-10-18
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "drop_evaluacion_estado"
down_revision: Union[str, None] = "evaluaciones_objetivos"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # El CHECK `chk_evaluacion_estado` cae con la columna.
    op.drop_column("evaluaciones", "estado")


def downgrade() -> None:
    op.add_column(
        "evaluaciones",
        sa.Column("estado", sa.String(20), nullable=False, server_default="borrador"),
    )
    op.create_check_constraint(
        "chk_evaluacion_estado",
        "evaluaciones",
        "estado IN ('borrador','finalizada')",
    )
