"""Server default de clientes.valido

`add_validacion_migracion` ya declara `ALTER COLUMN valido SET DEFAULT TRUE`,
pero esa migración no corre en una base nueva: `alembic/env.py` detecta que la
base está vacía, crea las tablas desde la metadata de SQLModel y salta el resto
del historial con `_stamp_to_head()`. Como el modelo declaraba
`valido: bool = Field(default=True)` —default de Python, no de servidor— la
columna quedaba NOT NULL y sin default en toda instalación creada de cero.

Consecuencia: cualquier INSERT que no pase por SQLModel revienta. Le pasa a
`init_office` y al ETL de migración, que insertan en crudo.

Esta migración pone el default en la base, y el modelo lo declara también para
que las bases nuevas lo traigan desde el CREATE TABLE.

No toca datos: `valido` ya es NOT NULL y no puede contener NULL.

Revision ID: clientes_valido_server_default
Revises: add_especialidad_artista
Create Date: 2026-10-13

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

# `alembic_version.version_num` es VARCHAR(32): el id va corto a propósito.
revision: str = "clientes_valido_server_default"
down_revision: Union[str, None] = "add_especialidad_artista"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE clientes ALTER COLUMN valido SET DEFAULT TRUE")


def downgrade() -> None:
    op.execute("ALTER TABLE clientes ALTER COLUMN valido DROP DEFAULT")