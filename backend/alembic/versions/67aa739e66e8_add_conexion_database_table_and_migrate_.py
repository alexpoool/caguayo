"""add conexion_database table and migrate data

Revision ID: 67aa739e66e8
Revises: 2712054c807a
Create Date: 2026-03-03 15:05:23.659953

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "67aa739e66e8"
down_revision: Union[str, None] = "2712054c807a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Crear tabla conexion_database
    op.create_table(
        "conexion_database",
        sa.Column("id_conexion", sa.Integer(), nullable=False),
        sa.Column(
            "host", sa.String(length=100), nullable=False, server_default="localhost"
        ),
        sa.Column("puerto", sa.Integer(), nullable=False, server_default="5432"),
        sa.Column("usuario", sa.String(length=100), nullable=True),
        sa.Column("contrasenia", sa.String(length=255), nullable=True),
        sa.Column("nombre_database", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("id_conexion"),
    )

    # Agregar columna id_conexion a dependencia (nullable)
    op.add_column("dependencia", sa.Column("id_conexion", sa.Integer(), nullable=True))

    # Migrar datos únicos de dependencia a conexion_database
    op.execute("""
        INSERT INTO conexion_database (host, puerto, usuario, contrasenia, nombre_database)
        SELECT DISTINCT 
            COALESCE(host, 'localhost'),
            COALESCE(puerto, 5432),
            usuario,
            contrasenia,
            base_datos
        FROM dependencia
        WHERE base_datos IS NOT NULL
    """)

    # Actualizar cada dependencia con su id_conexion correspondiente
    op.execute("""
        UPDATE dependencia d
        SET id_conexion = c.id_conexion
        FROM (
            SELECT MIN(id_dependencia) as id_dependencia, base_datos
            FROM dependencia
            WHERE base_datos IS NOT NULL
            GROUP BY base_datos
        ) sub
        JOIN conexion_database c ON c.nombre_database = sub.base_datos
        WHERE d.base_datos = sub.base_datos
    """)

    # Crear FK
    op.create_foreign_key(
        "fk_dependencia_conexion",
        "dependencia",
        "conexion_database",
        ["id_conexion"],
        ["id_conexion"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_dependencia_conexion", "dependencia", type_="foreignkey")
    op.drop_column("dependencia", "id_conexion")
    op.drop_table("conexion_database")
