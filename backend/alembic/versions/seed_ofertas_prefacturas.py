"""seed new funcionalidades for ofertas and pre-facturas

Revision ID: seed_ofertas_prefacturas_funcionalidades
Revises: 8504e8479caf
Create Date: 2026-08-11

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "seed_ofertas_prefacturas"
down_revision: Union[str, None] = "8504e8479caf"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


NUEVAS_FUNCIONALIDADES = [
    "ofertas",
    "pre_facturas",
]


def upgrade() -> None:
    conn = op.get_bind()
    for nombre in NUEVAS_FUNCIONALIDADES:
        result = conn.execute(
            sa.text(
                "SELECT id_funcionalidad FROM funcionalidad WHERE nombre = :nombre"
            ),
            {"nombre": nombre},
        )
        row = result.fetchone()
        if row is None:
            conn.execute(
                sa.text("INSERT INTO funcionalidad (nombre) VALUES (:nombre)"),
                {"nombre": nombre},
            )
            result = conn.execute(
                sa.text(
                    "SELECT id_funcionalidad FROM funcionalidad WHERE nombre = :nombre"
                ),
                {"nombre": nombre},
            )
            row = result.fetchone()
        func_id = row[0]
        exists = conn.execute(
            sa.text(
                "SELECT 1 FROM grupo_funcionalidad WHERE id_grupo = 1 AND id_funcionalidad = :fid"
            ),
            {"fid": func_id},
        )
        if exists.fetchone() is None:
            conn.execute(
                sa.text(
                    "INSERT INTO grupo_funcionalidad (id_grupo, id_funcionalidad) VALUES (1, :fid)"
                ),
                {"fid": func_id},
            )


def downgrade() -> None:
    conn = op.get_bind()
    for nombre in NUEVAS_FUNCIONALIDADES:
        conn.execute(
            sa.text(
                "DELETE FROM grupo_funcionalidad WHERE id_funcionalidad = ("
                "SELECT id_funcionalidad FROM funcionalidad WHERE nombre = :nombre"
                ")"
            ),
            {"nombre": nombre},
        )
        conn.execute(
            sa.text("DELETE FROM funcionalidad WHERE nombre = :nombre"),
            {"nombre": nombre},
        )
