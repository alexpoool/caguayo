"""backfill id_cliente in productos_en_liquidacion

Revision ID: cb6d9e4f73a1
Revises: f22e8c3b9a14
Create Date: 2026-07-13 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "cb6d9e4f73a1"
down_revision: Union[str, None] = "f22e8c3b9a14"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        UPDATE productos_en_liquidacion pel
        SET id_cliente = c.id_cliente
        FROM anexo a
        JOIN convenio conv ON a.id_convenio = conv.id_convenio
        JOIN clientes c ON conv.id_cliente = c.id_cliente
        WHERE pel.id_anexo = a.id_anexo
          AND pel.id_cliente IS NULL
    """)


def downgrade() -> None:
    pass
