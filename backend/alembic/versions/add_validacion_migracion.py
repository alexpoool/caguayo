"""Add validacion de datos migrados to clientes

Añade el marcaje de los registros que necesitaron un arreglo para poder
migrarse: `valido` indica si el registro entró sin modificaciones, y
`campo`/`razon` señalan qué corregir y por qué.

No se crea tabla de auditoría: son tres columnas en `clientes` para que el
listado pueda filtrar y resaltar sin JOIN.

Revision ID: add_validacion_migracion
Revises: add_dj08_tables
Create Date: 2026-10-08

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "add_validacion_migracion"
down_revision: Union[str, None] = "add_dj08_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE clientes ADD COLUMN IF NOT EXISTS valido BOOLEAN")
    op.execute(
        "UPDATE clientes SET valido = TRUE WHERE valido IS NULL"
    )
    op.execute("ALTER TABLE clientes ALTER COLUMN valido SET DEFAULT TRUE")
    op.execute("ALTER TABLE clientes ALTER COLUMN valido SET NOT NULL")

    op.execute("ALTER TABLE clientes ADD COLUMN IF NOT EXISTS campo VARCHAR(50)")
    op.execute("ALTER TABLE clientes ADD COLUMN IF NOT EXISTS razon TEXT")

    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_clientes_pendientes"
        " ON clientes (id_cliente) WHERE valido = FALSE"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_clientes_pendientes")
    op.execute("ALTER TABLE clientes DROP COLUMN IF EXISTS razon")
    op.execute("ALTER TABLE clientes DROP COLUMN IF EXISTS campo")
    op.execute("ALTER TABLE clientes DROP COLUMN IF EXISTS valido")
