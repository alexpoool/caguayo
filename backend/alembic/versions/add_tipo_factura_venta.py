"""Add document type to sales invoices.

Revision ID: add_tipo_factura_venta
Revises: add_liq_ref_factura
Create Date: 2026-11-26

Existing rows are regular invoices; new rows default to FACTURA unless the
application explicitly creates a PREFACTURA.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_tipo_factura_venta"
down_revision: Union[str, None] = "add_liq_ref_factura"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("factura")}

    if "tipo" not in columns:
        op.add_column(
            "factura",
            sa.Column(
                "tipo",
                sa.String(length=20),
                nullable=False,
                server_default="FACTURA",
            ),
        )


def downgrade() -> None:
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("factura")}

    if "tipo" in columns:
        op.drop_column("factura", "tipo")
