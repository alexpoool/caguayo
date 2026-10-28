"""calificaciones.valor admite escalas de 1 a 100

El usuario define su propia escala de puntuación en el catálogo: el `valor`
de la entrada es el **último número de la escala** (5 → 1–5, 10 → 1–10,
100 → 1–100). Los criterios de una evaluación se puntúan con una
calificación de ese catálogo y el promedio se calcula sobre la escala
elegida (el widget del frontend muestra siempre 5 estrellas y mapea
proporcionalmente).

Revision ID: calificaciones_escala_100
Revises: objetivos_a_empleados
Create Date: 2026-10-15

"""

from typing import Sequence, Union

from alembic import op


revision: str = "calificaciones_escala_100"
down_revision: Union[str, None] = "objetivos_a_empleados"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # El CHECK venía sin nombre en el CREATE TABLE: PostgreSQL lo llama
    # `calificaciones_valor_check`.
    op.execute(
        "ALTER TABLE calificaciones "
        "DROP CONSTRAINT IF EXISTS calificaciones_valor_check"
    )
    op.execute(
        """
        ALTER TABLE calificaciones
        ADD CONSTRAINT chk_calificaciones_valor CHECK (valor BETWEEN 1 AND 100)
        """
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE calificaciones "
        "DROP CONSTRAINT IF EXISTS chk_calificaciones_valor"
    )
    op.execute(
        """
        ALTER TABLE calificaciones
        ADD CONSTRAINT calificaciones_valor_check CHECK (valor BETWEEN 1 AND 5)
        """
    )
