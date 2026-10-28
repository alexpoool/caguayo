"""Marcar lo que la migración del legacy tuvo que suponer.

Dos columnas en `persona_etapa` y dos en `solicitud_servicio`, con el mismo
patrón que ya usan `clientes.valido` y `clientes.razon`: un booleano que dice
"esto es provisional" y el motivo al lado, para que quien lo vea sepa qué
rectificar.

`persona_etapa`:
    El legacy no guarda en qué etapa va cada artista. La tabla que lo ataría,
    `pago`, tiene `id_etapa` y 0 filas. `artista_contrato` dice el contrato y el
    cobro, no la etapa. La Fase O concentra a todos los artistas del contrato en
    la primera etapa y marca la fila, porque esa asignación es una decisión
    nuestra y no un dato.

`solicitud_servicio`:
    La Fase O pone todas las solicitudes en `EN PROCESO` para que aparezcan en la
    pantalla de proyectos, que filtra por ese estado. En 337 el legacy no decía
    si estaban aprobadas, así que el estado se inventó. `aprobado` conserva el
    valor real del legacy; esto dice que el estado no es de fiar.

Ninguna de las cuatro columnas las escribe la aplicación: van en el modelo para
que `create_all` las traiga en una base nueva, y aquí para las que ya existen.

Idempotente por guarda de `information_schema`.

Revision ID: marcar_supuestos_migracion
Revises: contrato_nombre_300
Create Date: 2026-10-14

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "marcar_supuestos_migracion"
down_revision: Union[str, None] = "contrato_nombre_300"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

#: (tabla, columna, tipo, default del servidor)
COLUMNAS = (
    ("persona_etapa", "asignada_por_migracion", sa.Boolean(), "FALSE"),
    ("persona_etapa", "motivo_asignacion", sa.Text(), None),
    ("solicitud_servicio", "estado_por_revisar", sa.Boolean(), "FALSE"),
    ("solicitud_servicio", "motivo_revision", sa.Text(), None),
)


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
    for tabla, columna, tipo, default in COLUMNAS:
        if _existe(conn, tabla, columna):
            continue
        op.add_column(
            tabla,
            sa.Column(columna, tipo, nullable=True if default is None else False,
                      server_default=default),
        )
        # El default de servidor se queda: `asignada_por_migracion` es NOT NULL y
        # el INSERT de la migración es en crudo, sin pasar por SQLModel. Sin
        # default, un INSERT que no la mencione revienta.
        if default is not None:
            op.execute(
                "ALTER TABLE {t} ALTER COLUMN {c} SET NOT NULL".format(
                    t=tabla, c=columna)
            )


def downgrade() -> None:
    conn = op.get_bind()
    for tabla, columna, _tipo, _default in COLUMNAS:
        if _existe(conn, tabla, columna):
            op.drop_column(tabla, columna)