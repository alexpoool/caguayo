"""persona_etapa: la moneda entra en la clave primaria.

El legacy guarda el cobro de un artista en dos columnas, `cobro_cuc` y
`cobro_cup`. Al partir el contrato en dos (uno por moneda) y duplicar el
proyecto entero, un mismo artista puede cobrar la misma etapa en CUC y en CUP a
la vez: dos filas con el mismo `(id_etapa, id_persona)` y distinta moneda. Basta
con una sola moneda para que la clave vieja reviente.

La clave pasa a ser `(id_etapa, id_persona, id_moneda)` e `id_moneda` deja de ser
opcional. Las filas viejas sin moneda se rellenan con CUP, que es la moneda con
la que se leyó el legacy hasta ahora.

Idempotente: si la moneda ya está en la clave no hace nada.

Revision ID: persona_etapa_pk_moneda
Revises: marcar_supuestos_migracion
Create Date: 2026-10-16

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "persona_etapa_pk_moneda"
down_revision: Union[str, None] = "marcar_supuestos_migracion"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _clave_primaria(conn):
    """Las columnas de la PK de `persona_etapa`, en su orden."""
    filas = conn.execute(
        sa.text(
            "SELECT a.attname "
            "FROM pg_index i "
            "JOIN pg_attribute a ON a.attrelid = i.indrelid "
            "AND a.attnum = ANY(i.indkey) "
            "WHERE i.indrelid = 'persona_etapa'::regclass AND i.indisprimary "
            "ORDER BY array_position(i.indkey, a.attnum)"
        )
    ).fetchall()
    return [f[0] for f in filas]


def upgrade() -> None:
    conn = op.get_bind()
    if "id_moneda" in _clave_primaria(conn):
        return
    op.execute(
        "UPDATE persona_etapa SET id_moneda = ("
        "  SELECT id_moneda FROM moneda WHERE simbolo = 'CUP' "
        "  ORDER BY id_moneda LIMIT 1"
        ") WHERE id_moneda IS NULL"
    )
    op.alter_column("persona_etapa", "id_moneda", nullable=False)
    op.drop_constraint("persona_etapa_pkey", "persona_etapa", type_="primary")
    op.create_primary_key(
        "persona_etapa_pkey", "persona_etapa",
        ["id_etapa", "id_persona", "id_moneda"],
    )


def downgrade() -> None:
    conn = op.get_bind()
    if "id_moneda" not in _clave_primaria(conn):
        return
    # Con las dos monedas en la tabla la clave vieja no admite duplicados: se
    # quedan las filas en CUP, que son las que el esquema anterior entendía.
    op.execute(
        "DELETE FROM persona_etapa pe WHERE pe.id_moneda <> ("
        "  SELECT id_moneda FROM moneda WHERE simbolo = 'CUP' "
        "  ORDER BY id_moneda LIMIT 1"
        ")"
    )
    op.drop_constraint("persona_etapa_pkey", "persona_etapa", type_="primary")
    op.create_primary_key(
        "persona_etapa_pkey", "persona_etapa", ["id_etapa", "id_persona"],
    )
    op.alter_column("persona_etapa", "id_moneda", nullable=True)
