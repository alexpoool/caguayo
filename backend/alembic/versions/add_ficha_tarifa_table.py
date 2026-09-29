"""add ficha_tarifa catalog table

Revision ID: add_ficha_tarifa_table
Revises: add_ficha_costo_tables
Create Date: 2026-09-29

"""

from alembic import op
import sqlalchemy as sa


revision = "add_ficha_tarifa_table"
down_revision = "add_ficha_costo_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ficha_tarifa",
        sa.Column("id_tarifa", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("categoria", sa.String(150), nullable=False),
        sa.Column(
            "tarifa_horaria",
            sa.Numeric(precision=20, scale=6),
            nullable=False,
            server_default="0",
        ),
        sa.PrimaryKeyConstraint("id_tarifa"),
        sa.UniqueConstraint("categoria", name="uq_ficha_tarifa_categoria"),
    )
    op.create_index("idx_ficha_tarifa_categoria", "ficha_tarifa", ["categoria"])
    # Referencia opcional de la mano de obra al catálogo de tarifas
    op.add_column(
        "ficha_mano_obra",
        sa.Column(
            "id_tarifa",
            sa.Integer(),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_ficha_mano_obra_tarifa",
        "ficha_mano_obra",
        "ficha_tarifa",
        ["id_tarifa"],
        ["id_tarifa"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_ficha_mano_obra_tarifa", "ficha_mano_obra", type_="foreignkey")
    op.drop_column("ficha_mano_obra", "id_tarifa")
    op.drop_index("idx_ficha_tarifa_categoria")
    op.drop_table("ficha_tarifa")
