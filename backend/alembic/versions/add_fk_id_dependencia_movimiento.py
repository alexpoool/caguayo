"""add FK id_dependencia to movimiento table

Revision ID: add_fk_id_dependencia_movimiento
Revises: add_existencia_to_item_anexo
Create Date: 2026-06-19

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_fk_id_dependencia_movimiento"
down_revision: Union[str, None] = "add_existencia_to_item_anexo"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    from sqlalchemy import inspect

    inspector = inspect(conn)

    # Check if FK already exists
    fks = [fk["constrained_columns"] for fk in inspector.get_foreign_keys("movimiento")]

    if ["id_dependencia"] not in fks:
        op.create_foreign_key(
            "fk_movimiento_id_dependencia",
            "movimiento",
            "dependencia",
            ["id_dependencia"],
            ["id_dependencia"],
        )


def downgrade() -> None:
    op.drop_constraint(
        "fk_movimiento_id_dependencia",
        "movimiento",
        type_="foreignkey",
    )
