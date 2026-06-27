"""Add ajuste_porciento and ajuste_valor fields to items_factura_servicio and certificacion

Revision ID: add_ajuste_fields
Revises: drop_numero_factura_servicio
Create Date: 2026-05-28

"""

from alembic import op
import sqlalchemy as sa


revision = "add_ajuste_fields"
down_revision = "drop_numero_factura_servicio"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "items_factura_servicio",
        sa.Column(
            "ajuste_porciento",
            sa.Numeric(precision=5, scale=2),
            server_default="0.00",
            nullable=False,
        ),
    )
    op.add_column(
        "items_factura_servicio",
        sa.Column(
            "ajuste_valor",
            sa.Numeric(precision=15, scale=2),
            server_default="0.00",
            nullable=False,
        ),
    )
    op.execute(
        "ALTER TABLE certificacion ADD COLUMN IF NOT EXISTS ajuste_porciento NUMERIC(5, 2) DEFAULT '0.00' NOT NULL"
    )
    op.execute(
        "ALTER TABLE certificacion ADD COLUMN IF NOT EXISTS ajuste_valor NUMERIC(15, 2) DEFAULT '0.00' NOT NULL"
    )


def downgrade() -> None:
    op.drop_column("certificacion", "ajuste_valor")
    op.drop_column("certificacion", "ajuste_porciento")
    op.drop_column("items_factura_servicio", "ajuste_valor")
    op.drop_column("items_factura_servicio", "ajuste_porciento")
