"""ensancha evaluaciones.promedio_objetivos a DECIMAL(5,2)

El CHECK de la tabla admite `promedio_objetivos BETWEEN 0 AND 100`, pero la
columna se creó como `DECIMAL(4,2)`, cuyo máximo almacenable es 99.99: una
evaluación con valoración media perfecta (100.00) producía
`NumericValueOutOfRange` al persistirla. Se ensancha a `DECIMAL(5,2)`
(máximo 999.99) para que la columna respete su propio CHECK.

Revision ID: widen_promedio_objetivos
Revises: seed_rrhh_funcionalidades
Create Date: 2026-10-14

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "widen_promedio_objetivos"
down_revision: Union[str, None] = "seed_rrhh_funcionalidades"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "evaluaciones",
        "promedio_objetivos",
        type_=sa.Numeric(5, 2),
        existing_nullable=True,
        existing_server_default=None,
    )


def downgrade() -> None:
    # Revierte solo si no hay valores >= 100.00; si los hay, falla y obliga
    # a revisarlos a mano.
    op.alter_column(
        "evaluaciones",
        "promedio_objetivos",
        type_=sa.Numeric(4, 2),
        existing_nullable=True,
        existing_server_default=None,
    )
