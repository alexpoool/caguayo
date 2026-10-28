"""White-label: campos *_caguayo -> *_agencia en liquidacion y persona_liquidacion

El nombre del cliente no puede vivir en el esquema de la base de datos:
es un detalle de una instalación concreta (Caguayo). En instalaciones
nuevas el campo se llama por su semántica de negocio.

Revision ID: renombrar_agencia_campos
Revises: add_backups_funcionalidad
Create Date: 2026-10-28

"""
from typing import Sequence, Union

from alembic import op

revision: str = "renombrar_agencia_campos"
down_revision: Union[str, None] = "add_backups_funcionalidad"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE liquidacion RENAME COLUMN porcentaje_caguayo TO porcentaje_agencia")
    op.execute("ALTER TABLE liquidacion RENAME COLUMN importe_caguayo TO importe_agencia")
    op.execute("ALTER TABLE persona_liquidacion RENAME COLUMN porcentaje_caguayo TO porcentaje_agencia")
    op.execute("ALTER TABLE persona_liquidacion RENAME COLUMN importe_caguayo TO importe_agencia")


def downgrade() -> None:
    op.execute("ALTER TABLE persona_liquidacion RENAME COLUMN importe_agencia TO importe_caguayo")
    op.execute("ALTER TABLE persona_liquidacion RENAME COLUMN porcentaje_agencia TO porcentaje_caguayo")
    op.execute("ALTER TABLE liquidacion RENAME COLUMN importe_agencia TO importe_caguayo")
    op.execute("ALTER TABLE liquidacion RENAME COLUMN porcentaje_agencia TO porcentaje_caguayo")
