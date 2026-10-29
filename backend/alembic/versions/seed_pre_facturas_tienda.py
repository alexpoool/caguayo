"""seed funcionalidad pre_facturas_tienda

Revision ID: seed_pre_facturas_tienda
Revises: seed_ofertas_tienda
Create Date: 2026-10-29

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "seed_pre_facturas_tienda"
down_revision: Union[str, None] = "seed_ofertas_tienda"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


NUEVAS_FUNCIONALIDADES = ["pre_facturas_tienda"]
GRUPOS_DESTINO = [1]  # administrador


def upgrade() -> None:
    conn = op.get_bind()
    for nombre in NUEVAS_FUNCIONALIDADES:
        result = conn.execute(
            sa.text("SELECT id_funcionalidad FROM funcionalidad WHERE nombre = :nombre"),
            {"nombre": nombre},
        )
        row = result.fetchone()
        if row is None:
            conn.execute(
                sa.text("INSERT INTO funcionalidad (nombre) VALUES (:nombre)"),
                {"nombre": nombre},
            )
            result = conn.execute(
                sa.text("SELECT id_funcionalidad FROM funcionalidad WHERE nombre = :nombre"),
                {"nombre": nombre},
            )
            row = result.fetchone()
        func_id = row[0]
        for id_grupo in GRUPOS_DESTINO:
            exists = conn.execute(
                sa.text(
                    "SELECT 1 FROM grupo_funcionalidad WHERE id_grupo = :gid"
                    " AND id_funcionalidad = :fid"
                ),
                {"gid": id_grupo, "fid": func_id},
            )
            if exists.fetchone() is None:
                conn.execute(
                    sa.text(
                        "INSERT INTO grupo_funcionalidad (id_grupo, id_funcionalidad)"
                        " VALUES (:gid, :fid)"
                    ),
                    {"gid": id_grupo, "fid": func_id},
                )


def downgrade() -> None:
    conn = op.get_bind()
    for nombre in NUEVAS_FUNCIONALIDADES:
        conn.execute(
            sa.text(
                "DELETE FROM grupo_funcionalidad WHERE id_funcionalidad = ("
                "SELECT id_funcionalidad FROM funcionalidad WHERE nombre = :nombre)"
            ),
            {"nombre": nombre},
        )
        conn.execute(
            sa.text("DELETE FROM funcionalidad WHERE nombre = :nombre"),
            {"nombre": nombre},
        )
