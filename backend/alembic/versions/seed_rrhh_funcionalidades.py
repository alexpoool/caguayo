"""seed funcionalidades del módulo RRHH

Crea las funcionalidades `rrhh_*` (granularidad por sub-módulo, consistente con
las existentes: 'movimientos', 'reporte_existencias', …). No las asigna a
grupos: la asignación se hace desde la pantalla de Grupos existente.

Idempotente: solo inserta si el nombre no existe.

Revision ID: seed_rrhh_funcionalidades
Revises: add_rrhh_tables
Create Date: 2026-10-13

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "seed_rrhh_funcionalidades"
down_revision: Union[str, None] = "add_rrhh_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


FUNCIONALIDADES_RRHH = [
    "rrhh_empleados",
    "rrhh_departamentos",
    "rrhh_puestos",
    "rrhh_asistencia",
    "rrhh_solicitudes",
    "rrhh_deducciones",
    "rrhh_bonificaciones",
    "rrhh_nomina",
    "rrhh_pagos",
    "rrhh_evaluaciones",
    "rrhh_catalogos",
    "rrhh_reportes",
    "rrhh_auditoria",
]


def upgrade() -> None:
    conn = op.get_bind()
    for nombre in FUNCIONALIDADES_RRHH:
        result = conn.execute(
            sa.text(
                "SELECT id_funcionalidad FROM funcionalidad WHERE nombre = :nombre"
            ),
            {"nombre": nombre},
        )
        if result.fetchone() is None:
            conn.execute(
                sa.text("INSERT INTO funcionalidad (nombre) VALUES (:nombre)"),
                {"nombre": nombre},
            )
    # El grupo ADMINISTRADOR (seed existente) recibe todas las funcionalidades.
    # Se repite aquí para que los tenants creados después del seed original
    # también tengan acceso RRHH sin intervención manual.
    result = conn.execute(
        sa.text("SELECT id_grupo FROM grupo WHERE nombre = 'ADMINISTRADOR'")
    )
    admin = result.fetchone()
    if admin:
        id_grupo = admin[0]
        for nombre in FUNCIONALIDADES_RRHH:
            row = conn.execute(
                sa.text(
                    "SELECT id_funcionalidad FROM funcionalidad WHERE nombre = :nombre"
                ),
                {"nombre": nombre},
            ).fetchone()
            if row is None:
                continue
            id_func = row[0]
            exists = conn.execute(
                sa.text(
                    "SELECT 1 FROM grupo_funcionalidad "
                    "WHERE id_grupo = :id_grupo AND id_funcionalidad = :id_func"
                ),
                {"id_grupo": id_grupo, "id_func": id_func},
            ).fetchone()
            if exists is None:
                conn.execute(
                    sa.text(
                        "INSERT INTO grupo_funcionalidad (id_grupo, id_funcionalidad) "
                        "VALUES (:id_grupo, :id_func)"
                    ),
                    {"id_grupo": id_grupo, "id_func": id_func},
                )


def downgrade() -> None:
    conn = op.get_bind()
    nombres = ", ".join(f"'{n}'" for n in FUNCIONALIDADES_RRHH)
    conn.execute(
        sa.text(
            "DELETE FROM grupo_funcionalidad WHERE id_funcionalidad IN "
            "(SELECT id_funcionalidad FROM funcionalidad WHERE nombre IN ("
            + nombres
            + "))"
        )
    )
    conn.execute(
        sa.text(
            "DELETE FROM funcionalidad WHERE nombre IN (" + nombres + ")"
        )
    )
