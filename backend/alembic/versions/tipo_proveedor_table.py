"""Add tipo_proveedor table

Revision ID: tipo_proveedor_table
Revises: auto_generar_codigos_entidades
Create Date: 2026-03-24

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "tipo_proveedor_table"
down_revision = "auto_generar_codigos_entidades"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tipo_proveedor",
        sa.Column("id_tipo_proveedor", sa.Integer(), nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id_tipo_proveedor"),
    )
    op.execute(
        "INSERT INTO tipo_proveedor (nombre, descripcion) VALUES ('Default', 'Tipo de proveedor por defecto')"
    )


def downgrade() -> None:
    op.drop_table("tipo_proveedor")
