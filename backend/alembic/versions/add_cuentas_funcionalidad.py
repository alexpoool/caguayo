"""add cuentas funcionalidad

Revision ID: add_cuentas_funcionalidad
Revises: seed_funcionalidades_reportes
Create Date: 2026-08-24

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_cuentas_funcionalidad"
down_revision: Union[str, None] = "seed_funcionalidades_reportes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Insert 'cuentas' funcionalidad if it doesn't exist
    result = conn.execute(
        sa.text("SELECT id_funcionalidad FROM funcionalidad WHERE nombre = :nombre"),
        {"nombre": "cuentas"},
    )
    row = result.fetchone()
    if row is None:
        conn.execute(
            sa.text("INSERT INTO funcionalidad (nombre) VALUES (:nombre)"),
            {"nombre": "cuentas"},
        )
        result = conn.execute(
            sa.text("SELECT id_funcionalidad FROM funcionalidad WHERE nombre = :nombre"),
            {"nombre": "cuentas"},
        )
        row = result.fetchone()

    func_id = row[0]

    # 2. Assign to ADMINISTRADOR group (id=1) if not already assigned
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

    # Remove from all groups
    conn.execute(
        sa.text(
            "DELETE FROM grupo_funcionalidad WHERE id_funcionalidad = ("
            "SELECT id_funcionalidad FROM funcionalidad WHERE nombre = :nombre"
            ")"
        ),
        {"nombre": "cuentas"},
    )

    # Remove funcionalidad
    conn.execute(
        sa.text("DELETE FROM funcionalidad WHERE nombre = :nombre"),
        {"nombre": "cuentas"},
    )
