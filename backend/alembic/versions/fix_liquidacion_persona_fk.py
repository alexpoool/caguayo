"""Fix persona_liquidacion id_persona foreign key to clientes table

Revision ID: fix_liquidacion_persona_fk
Revises: add_liq_caguayo_fields
Create Date: 2026-04-08
"""

from alembic import op
import sqlalchemy as sa


revision = "fix_liquidacion_persona_fk"
down_revision = "add_liq_caguayo_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint(
        "persona_liquidacion_id_persona_fkey", table_name="persona_liquidacion"
    )
    op.create_foreign_key(
        "persona_liquidacion_id_persona_fkey",
        "persona_liquidacion",
        "clientes",
        ["id_persona"],
        ["id_cliente"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint(
        "persona_liquidacion_id_persona_fkey", table_name="persona_liquidacion"
    )
    op.create_foreign_key(
        "persona_liquidacion_id_persona_fkey",
        "persona_liquidacion",
        "clientes_persona_natural",
        ["id_persona"],
        ["id_cliente"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "persona_liquidacion_id_persona_fkey",
        "persona_liquidacion",
        "clientes",
        ["id_persona"],
        ["id_cliente"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint(
        "persona_liquidacion_id_persona_fkey",
        table_name="persona_liquidacion",
        constraint_type="foreignkey",
    )
    op.create_foreign_key(
        "persona_liquidacion_id_persona_fkey",
        "persona_liquidacion",
        "clientes_persona_natural",
        ["id_persona"],
        ["id_cliente"],
        ondelete="CASCADE",
    )
