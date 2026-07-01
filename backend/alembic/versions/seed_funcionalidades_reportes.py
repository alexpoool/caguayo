"""seed new funcionalidades for reports and dependencias

Revision ID: seed_funcionalidades_reportes
Revises: drop_productos_stock
Create Date: 2026-07-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "seed_funcionalidades_reportes"
down_revision: Union[str, None] = "drop_productos_stock"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


NUEVAS_FUNCIONALIDADES = [
    "dependencias",
    "reporte_existencias",
    "reporte_movimientos_dependencia",
    "reporte_movimientos_producto",
    "reporte_proveedores",
    "reporte_clientes",
    "reporte_proyectos",
    "reporte_creadores",
    "reporte_desempeno",
    "reporte_liquidaciones",
    "reporte_onat",
    "reporte_mincult",
]


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
