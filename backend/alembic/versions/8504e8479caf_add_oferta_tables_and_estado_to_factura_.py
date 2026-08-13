"""add oferta tables and estado to factura_servicio

Revision ID: 8504e8479caf
Revises: fill_denom_deps
Create Date: 2026-08-11 13:47:50.077591

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8504e8479caf'
down_revision: Union[str, None] = 'fill_denom_deps'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "factura_servicio",
        sa.Column(
            "estado", sa.String(length=20), server_default="APROBADA", nullable=False
        ),
    )

    op.create_table(
        "oferta",
        sa.Column("id_oferta", sa.Integer(), nullable=False),
        sa.Column("id_etapa", sa.Integer(), nullable=True),
        sa.Column("id_certificacion", sa.Integer(), nullable=True),
        sa.Column("alcance", sa.String(length=20), nullable=True),
        sa.Column("codigo_oferta", sa.String(length=50), nullable=True),
        sa.Column("id_moneda", sa.Integer(), nullable=True),
        sa.Column("fecha", sa.Date(), nullable=True),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("importe", sa.Numeric(precision=15, scale=2), server_default="0.00", nullable=False),
        sa.Column("pagado", sa.Numeric(precision=15, scale=2), server_default="0.00", nullable=False),
        sa.Column("observaciones", sa.Text(), nullable=True),
        sa.Column("cuenta_factura", sa.String(length=50), nullable=True),
        sa.Column("id_usuario", sa.Integer(), nullable=True),
        sa.Column("estado", sa.String(length=20), server_default="PENDIENTE", nullable=False),
        sa.PrimaryKeyConstraint("id_oferta"),
        sa.ForeignKeyConstraint(["id_etapa"], ["etapas.id_etapa"]),
        sa.ForeignKeyConstraint(["id_certificacion"], ["certificacion.id_certificacion"]),
        sa.ForeignKeyConstraint(["id_moneda"], ["moneda.id_moneda"]),
        sa.ForeignKeyConstraint(["id_usuario"], ["usuarios.id_usuario"]),
    )

    op.create_table(
        "items_oferta",
        sa.Column("id_item_oferta", sa.Integer(), nullable=False),
        sa.Column("id_oferta", sa.Integer(), nullable=False),
        sa.Column("id_tarea_etapa", sa.Integer(), nullable=False),
        sa.Column("codigo_extendido", sa.String(length=100), nullable=True),
        sa.Column("concepto", sa.Text(), nullable=True),
        sa.Column("unidad_medida", sa.String(length=20), nullable=True),
        sa.Column("cantidad", sa.Numeric(precision=12, scale=2), server_default="0.00", nullable=False),
        sa.Column("precio", sa.Numeric(precision=15, scale=2), server_default="0.00", nullable=False),
        sa.Column("ajuste_porciento", sa.Numeric(precision=5, scale=2), server_default="0.00", nullable=False),
        sa.Column("ajuste_valor", sa.Numeric(precision=15, scale=2), server_default="0.00", nullable=False),
        sa.PrimaryKeyConstraint("id_item_oferta"),
        sa.ForeignKeyConstraint(
            ["id_oferta"], ["oferta.id_oferta"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["id_tarea_etapa"], ["tareas_etapa.id_tarea_etapa"], ondelete="CASCADE"
        ),
    )


def downgrade() -> None:
    op.drop_table("items_oferta")
    op.drop_table("oferta")
    op.drop_column("factura_servicio", "estado")
