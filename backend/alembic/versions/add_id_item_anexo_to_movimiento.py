"""add id_item_anexo to movimiento

Identifica el item_anexo exacto al que una devolucion ya desconto la `entrada`
al momento de crearse. Cuando el valor esta presente:
  - confirmar NO vuelve a aplicar el efecto sobre item_anexo (sin doble conteo)
  - cancelar / eliminar DEBEN restaurar la `entrada`

Sin FK a proposito: los items se eliminan en operaciones de mantenimiento y una
FK haria fallar el ciclo confirmar/cancelar si el item ya no existe.

Revision ID: add_id_item_anexo_to_movimiento
Revises: add_ficha_tarifa_table
Create Date: 2026-09-30

"""

from alembic import op
import sqlalchemy as sa

revision = "add_id_item_anexo_to_movimiento"
down_revision = "add_ficha_tarifa_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "movimiento",
        sa.Column("id_item_anexo", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("movimiento", "id_item_anexo")
