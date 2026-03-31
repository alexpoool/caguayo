"""Add pago table

Revision ID: add_pago_table
Revises: tipo_proveedor_table
Create Date: 2026-03-30

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "add_pago_table"
down_revision = "tipo_proveedor_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pago",
        sa.Column("id_pago", sa.Integer(), nullable=False),
        sa.Column("id_factura", sa.Integer(), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("monto", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("id_moneda", sa.Integer(), nullable=True),
        sa.Column("tipo_pago", sa.String(length=50), nullable=False),
        sa.Column("referencia", sa.String(length=100), nullable=True),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id_pago"),
        sa.ForeignKeyConstraint(
            ["id_factura"], ["factura.id_factura"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["id_moneda"], ["moneda.id_moneda"]),
    )


def downgrade() -> None:
    op.drop_table("pago")
