"""`contrato.texto_contrato`: el texto del contrato del legacy.

El legacy guarda el contrato entero en `contrato.proforma`: 12 filas con HTML de
entre 45.308 y 49.793 caracteres. En el destino `proforma` es VARCHAR(100) y no
es lo mismo: en la aplicación es el NÚMERO de proforma
(`frontend/src/pages/proyecto/ProyectosPage.tsx:1303`, placeholder "Número de
proforma"). Meterle encima el HTML del legacy lo rompe, así que el texto va a una
columna nueva y `proforma` se queda como está.

No es NOT NULL porque 3.384 de 3.396 contratos del legacy la traían vacía: se
migran sólo las 12 que tienen texto.

Si la columna ya existe (base creada desde los modelos después de cambiar
`src/models/contrato.py`), no se toca nada.

Revision ID: contrato_texto_contrato
Revises: moneda_cup
Create Date: 2026-10-14

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "contrato_texto_contrato"
down_revision: Union[str, None] = "moneda_cup"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

COLUMNA = "texto_contrato"


def _existe(conn, tabla, columna) -> bool:
    return conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = :t AND column_name = :c"
        ),
        {"t": tabla, "c": columna},
    ).fetchone() is not None


def upgrade() -> None:
    conn = op.get_bind()
    if not _existe(conn, "contrato", COLUMNA):
        op.add_column("contrato", sa.Column(COLUMNA, sa.Text(), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    if _existe(conn, "contrato", COLUMNA):
        op.drop_column("contrato", COLUMNA)