"""Remove id_moneda from anexo table

Revision ID: remove_id_moneda_from_anexo
Revises: add_precio_item_anexo_table
Create Date: 2026-06-17

"""

from alembic import op
import sqlalchemy as sa


revision = "remove_id_moneda_from_anexo"
down_revision = "add_precio_item_anexo_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("anexo_id_moneda_fkey", "anexo", type_="foreignkey")
    op.drop_column("anexo", "id_moneda")


def downgrade() -> None:
    op.add_column("anexo", sa.Column("id_moneda", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "anexo_id_moneda_fkey",
        "anexo",
        "moneda",
        ["id_moneda"],
        ["id_moneda"],
    )
