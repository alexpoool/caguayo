"""add id_cliente to productos_en_liquidacion

Revision ID: 128537904b80
Revises: 0e9b65ee4d21
Create Date: 2026-07-13 10:46:32.895360

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '128537904b80'
down_revision: Union[str, None] = '0e9b65ee4d21'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('productos_en_liquidacion', sa.Column('id_cliente', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_productos_en_liquidacion_id_cliente',
        'productos_en_liquidacion', 'clientes',
        ['id_cliente'], ['id_cliente']
    )


def downgrade() -> None:
    op.drop_constraint('fk_productos_en_liquidacion_id_cliente', 'productos_en_liquidacion', type_='foreignkey')
    op.drop_column('productos_en_liquidacion', 'id_cliente')
