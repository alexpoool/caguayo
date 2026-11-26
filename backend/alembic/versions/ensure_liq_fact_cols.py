"""Ensure liquidation and invoice columns exist.

Revision ID: ensure_liq_fact_cols
Revises: drop_pel_codigo_unique
Create Date: 2026-11-26

This is a defensive schema-reconciliation migration. Some installations may
already have one or more columns because they were created outside Alembic.
Only missing columns are added.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "ensure_liq_fact_cols"
down_revision: Union[str, Sequence[str], None] = "drop_pel_codigo_unique"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns(table_name: str) -> set[str]:
    bind = op.get_bind()
    return {column["name"] for column in sa.inspect(bind).get_columns(table_name)}


def upgrade() -> None:
    persona_columns = _existing_columns("persona_liquidacion")

    if "referencia_bancaria" not in persona_columns:
        op.add_column(
            "persona_liquidacion",
            sa.Column("referencia_bancaria", sa.String(length=150), nullable=True),
        )

    if "factura" not in persona_columns:
        op.add_column(
            "persona_liquidacion",
            sa.Column("factura", sa.String(length=100), nullable=True),
        )

    factura_columns = _existing_columns("factura")
    if "tipo" not in factura_columns:
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
    # Intentionally non-destructive: this migration reconciles columns that
    # may have existed before the migration. Dropping them could destroy data.
    pass
