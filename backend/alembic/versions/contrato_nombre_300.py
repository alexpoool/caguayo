"""`nombre` de contrato y suplemento a VARCHAR(300), como en el legacy.

El legacy usa `varchar(300)` en las dos tablas y el destino se quedó en 200.
386 contratos y 4 suplementos pasan de 200 caracteres (el más largo llega justo a
300). Ampliar la columna es más honesto que truncarlos: el nombre es la
identificación del documento y cortarlo deja dos contratos con el mismo nombre.

No se trunca nada: ninguna fila pasa de 300.

Revision ID: contrato_nombre_300
Revises: contrato_texto_contrato
Create Date: 2026-10-14

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "contrato_nombre_300"
down_revision: Union[str, None] = "contrato_texto_contrato"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

LARGO = 300


def upgrade() -> None:
    for tabla in ("contrato", "suplemento"):
        op.alter_column(
            tabla,
            "nombre",
            existing_type=sa.String(length=200),
            type_=sa.String(length=LARGO),
            existing_nullable=False,
        )


def downgrade() -> None:
    # Sólo se puede bajar si ningún nombre pasa de 300: si los hay, el ALTER
    # revienta y el `downgrade` falla. Es preferible a truncarlos en silencio.
    for tabla in ("contrato", "suplemento"):
        op.alter_column(
            tabla,
            "nombre",
            existing_type=sa.String(length=LARGO),
            type_=sa.String(length=200),
            existing_nullable=False,
        )