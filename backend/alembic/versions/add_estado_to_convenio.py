"""add estado to convenio

Revision ID: add_estado_convenio
Revises: merge_nomina_proyectos
Create Date: 2026-10-26

Columna para el borrado lógico: un convenio con anexos, liquidaciones o
movimientos asociados no se borra físicamente, pasa a estado ANULADO.
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "add_estado_convenio"
down_revision: Union[str, None] = "merge_nomina_proyectos"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE convenio ADD COLUMN IF NOT EXISTS estado VARCHAR(20)"
        " NOT NULL DEFAULT 'ACTIVO'"
    )


def downgrade() -> None:
    op.drop_column("convenio", "estado")
