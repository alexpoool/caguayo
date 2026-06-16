"""Merge branches and add cuenta_dependencias table

Revision ID: add_cuenta_dependencias_table
Revises: add_reeup_to_dependencia, add_id_cuenta_to_factura
Create Date: 2026-06-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_cuenta_dependencias_table"
down_revision: Union[str, Sequence[str], None] = (
    "add_reeup_to_dependencia",
    "add_id_cuenta_to_factura",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cuenta_dependencias",
        sa.Column("id_cuenta", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("id_dependencia", sa.Integer(), nullable=False),
        sa.Column("id_moneda", sa.Integer(), nullable=True),
        sa.Column("titular", sa.String(length=150), nullable=False),
        sa.Column("banco", sa.String(length=100), nullable=False),
        sa.Column("sucursal", sa.Integer(), nullable=True),
        sa.Column("numero_cuenta", sa.String(length=50), nullable=False),
        sa.Column("direccion", sa.String(length=255), nullable=False),
        sa.ForeignKeyConstraint(
            ["id_dependencia"],
            ["dependencia.id_dependencia"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["id_moneda"],
            ["moneda.id_moneda"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id_cuenta"),
    )


def downgrade() -> None:
    op.drop_table("cuenta_dependencias")
