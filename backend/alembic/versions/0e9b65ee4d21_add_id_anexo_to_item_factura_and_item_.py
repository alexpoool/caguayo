"""add id_anexo to item_factura and item_venta_efectivo

Revision ID: 0e9b65ee4d21
Revises: 733b55e2a9ce
Create Date: 2026-07-13 10:09:20.084423

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0e9b65ee4d21'
down_revision: Union[str, None] = '733b55e2a9ce'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'item_factura',
        sa.Column('id_anexo', sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        'item_factura_id_anexo_fkey',
        'item_factura', 'anexo',
        ['id_anexo'], ['id_anexo'],
    )
    op.add_column(
        'item_venta_efectivo',
        sa.Column('id_anexo', sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        'item_venta_efectivo_id_anexo_fkey',
        'item_venta_efectivo', 'anexo',
        ['id_anexo'], ['id_anexo'],
    )


def downgrade() -> None:
    op.drop_constraint('item_venta_efectivo_id_anexo_fkey', 'item_venta_efectivo', type_='foreignkey')
    op.drop_column('item_venta_efectivo', 'id_anexo')
    op.drop_constraint('item_factura_id_anexo_fkey', 'item_factura', type_='foreignkey')
    op.drop_column('item_factura', 'id_anexo')
