"""estado ANULADA en factura (borrado lógico de facturas de venta)

Revision ID: add_estado_factura
Revises: add_estado_anulado
Create Date: 2026-10-26

Una factura con pagos se anula en lugar de borrarse: el borrado físico
tenía los pagos en CASCADE y se perdían silenciosamente.
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "add_estado_factura"
down_revision: Union[str, None] = "add_estado_anulado"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE factura ADD COLUMN IF NOT EXISTS estado VARCHAR(20)"
        " NOT NULL DEFAULT 'ACTIVA'"
    )


def downgrade() -> None:
    op.drop_column("factura", "estado")
