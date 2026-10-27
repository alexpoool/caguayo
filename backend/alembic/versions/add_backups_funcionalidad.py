"""add backups funcionalidad

Crea la funcionalidad 'backups' y la asigna al grupo ADMINISTRADOR (id=1).
Es la que autoriza el módulo de respaldos/restauración de la BD de cada
dependencia (endpoints /api/v1/backups y la sección Respaldos del panel).

Revision ID: add_backups_funcionalidad
Revises: add_estado_evaluacion
Create Date: 2026-10-27

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_backups_funcionalidad"
down_revision: Union[str, None] = "add_estado_evaluacion"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Insert 'backups' funcionalidad if it doesn't exist
    result = conn.execute(
        sa.text("SELECT id_funcionalidad FROM funcionalidad WHERE nombre = :nombre"),
        {"nombre": "backups"},
    )
    row = result.fetchone()
    if row is None:
        conn.execute(
            sa.text("INSERT INTO funcionalidad (nombre) VALUES (:nombre)"),
            {"nombre": "backups"},
        )
        result = conn.execute(
            sa.text("SELECT id_funcionalidad FROM funcionalidad WHERE nombre = :nombre"),
            {"nombre": "backups"},
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
        {"nombre": "backups"},
    )

    # Remove funcionalidad
    conn.execute(
        sa.text("DELETE FROM funcionalidad WHERE nombre = :nombre"),
        {"nombre": "backups"},
    )
