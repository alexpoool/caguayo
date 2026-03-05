"""add database fields to dependencia and create sesion table

Revision ID: 2712054c807a
Revises: a9d239ce0765
Create Date: 2026-03-01 12:24:01.451108

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "2712054c807a"
down_revision: Union[str, None] = "a9d239ce0765"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Agregar campos de conexión a la base de datos a la tabla dependencia
    # Primero como nullable, luego actualizaremos los valores
    op.add_column(
        "dependencia",
        sa.Column(
            "host", sa.String(length=100), nullable=True, server_default="localhost"
        ),
    )
    op.add_column(
        "dependencia",
        sa.Column("puerto", sa.Integer(), nullable=True, server_default="5432"),
    )
    op.add_column(
        "dependencia", sa.Column("usuario", sa.String(length=100), nullable=True)
    )
    op.add_column(
        "dependencia", sa.Column("contrasenia", sa.String(length=255), nullable=True)
    )
    op.add_column(
        "dependencia", sa.Column("base_datos", sa.String(length=100), nullable=True)
    )

    # Actualizar las dependencias existentes con valores por defecto
    # Usar el nombre de la dependencia como nombre de base de datos
    op.execute(
        "UPDATE dependencia SET base_datos = 'caguayo_inventario' WHERE base_datos IS NULL"
    )

    # Hacer la columna NOT NULL
    op.alter_column("dependencia", "base_datos", nullable=False)

    # Crear tabla de sesiones
    op.create_table(
        "sesion",
        sa.Column("id_sesion", sa.Integer(), nullable=False),
        sa.Column("id_usuario", sa.Integer(), nullable=False),
        sa.Column("token", sa.String(length=500), nullable=False),
        sa.Column("base_datos", sa.String(length=100), nullable=False),
        sa.Column("fecha_login", sa.DateTime(), nullable=False),
        sa.Column("fecha_expiracion", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["id_usuario"],
            ["usuarios.id_usuario"],
        ),
        sa.PrimaryKeyConstraint("id_sesion"),
        sa.UniqueConstraint("token"),
    )


def downgrade() -> None:
    # Eliminar tabla de sesiones
    op.drop_table("sesion")

    # Eliminar campos de dependencia
    op.drop_column("dependencia", "base_datos")
    op.drop_column("dependencia", "contrasenia")
    op.drop_column("dependencia", "usuario")
    op.drop_column("dependencia", "puerto")
    op.drop_column("dependencia", "host")
