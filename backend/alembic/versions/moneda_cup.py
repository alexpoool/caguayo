"""Sembrar CUP en `moneda`.

El legacyliquidaba en dos monedas: CUC (3.828 liquidaciones, 2.535 contratos) y
CUP (1.564 liquidaciones, 1.057 contratos). El destino sólo tenía USD y EUR, y
tanto `liquidacion.id_moneda` como `contrato.id_moneda` son NOT NULL con FK a
`moneda`: sin CUP, las fases K y L no insertan ni una fila.

CUC no se siembra a propósito: no hay tipos de cambio ni una decisión sobre qué
valor ponerle. Las fases K y L traducen CUC a USD y lo dejan anotado con un
WARNING en `migracion_log`.

Idempotente por `simbolo`, que es UNIQUE: si ya está, no hace nada.

`alembic/env.py` ya siembra CUP en las bases nuevas (ahí las migraciones ni se
corren, se crea todo desde los modelos y se stampa), así que esta revisión sólo
afecta a las bases que ya existían.

Revision ID: moneda_cup
Revises: clientes_valido_server_default
Create Date: 2026-10-14

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# `alembic_version.version_num` es VARCHAR(32): el id va corto a propósito.
revision: str = "moneda_cup"
down_revision: Union[str, None] = "clientes_valido_server_default"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CUP = ("Peso Cubano", "Peso Cubano", "CUP")


def upgrade() -> None:
    conn = op.get_bind()
    ya_esta = conn.execute(
        sa.text("SELECT 1 FROM moneda WHERE simbolo = :simbolo"),
        {"simbolo": CUP[2]},
    ).fetchone()
    if ya_esta is not None:
        return
    conn.execute(
        sa.text("INSERT INTO moneda (nombre, denominacion, simbolo) VALUES (:n, :d, :s)"),
        {"n": CUP[0], "d": CUP[1], "s": CUP[2]},
    )


def downgrade() -> None:
    op.get_bind().execute(sa.text("DELETE FROM moneda WHERE simbolo = :s"), {"s": CUP[2]})