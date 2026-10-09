"""Añade la especialidad del artista al cliente persona natural

La tabla `especialidades_artisticas` ya existía pero estaba vacía y no había
ningún campo que relacionara una especialidad con su artista. `artista.especialidad`
se había descartado en la migración inicial; aquí se recupera.

Cada artista queda enlazado a una sola especialidad: el valor del legacy puede
ser compuesto ("escultura y ceramica") pero no se separa, porque muchos valores
con "/" o "y" son una única disciplina ("talla madera", "talla/madera").

Revision ID: add_especialidad_artista
Revises: add_validacion_migracion
Create Date: 2026-10-09

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "add_especialidad_artista"
down_revision: Union[str, None] = "add_validacion_migracion"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE clientes_persona_natural"
        " ADD COLUMN IF NOT EXISTS id_especialidad INTEGER"
    )
    op.execute(
        "DO $$ BEGIN "
        "  IF NOT EXISTS (SELECT 1 FROM pg_constraint "
        "      WHERE conname = 'clientes_persona_natural_id_especialidad_fkey') THEN "
        "    ALTER TABLE clientes_persona_natural ADD CONSTRAINT "
        "      clientes_persona_natural_id_especialidad_fkey "
        "      FOREIGN KEY (id_especialidad) "
        "      REFERENCES especialidades_artisticas(id_especialidad) "
        "      ON DELETE SET NULL; "
        "  END IF; "
        "END $$;"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_natural_especialidad"
        " ON clientes_persona_natural (id_especialidad)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_natural_especialidad")
    op.execute(
        "ALTER TABLE clientes_persona_natural DROP COLUMN IF EXISTS id_especialidad"
    )