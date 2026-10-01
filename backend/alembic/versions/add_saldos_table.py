"""add saldos table (snapshot de stock por producto/dependencia) + backfill

Revision ID: add_saldos_table
Revises: add_ficha_tarifa_table
Create Date: 2026-10-01

Cada fila de `saldos` guarda el saldo ACUMULADO en unidades
(cantidad x factor) de los movimientos CONFIRMADOS hasta `fecha`,
por (id_producto, id_dependencia).

El backfill reconstruye la cadena historica completa a partir de los
movimientos confirmados existentes, para que el reporte de movimientos
por dependencia pueda leer el saldo inicial historico sin regresar
sobre todo el movimento cada vez.
"""

from alembic import op
import sqlalchemy as sa


revision = "add_saldos_table"
down_revision = "add_ficha_tarifa_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "saldos",
        sa.Column("id_saldo", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("id_producto", sa.Integer(), nullable=False),
        sa.Column("id_dependencia", sa.Integer(), nullable=False),
        sa.Column("fecha", sa.DateTime(), nullable=False),
        sa.Column(
            "saldo",
            sa.Numeric(precision=15, scale=4),
            nullable=False,
            server_default="0",
        ),
        sa.PrimaryKeyConstraint("id_saldo"),
        sa.ForeignKeyConstraint(["id_producto"], ["productos.id_producto"]),
        sa.ForeignKeyConstraint(["id_dependencia"], ["dependencia.id_dependencia"]),
    )
    op.create_index(
        "idx_saldos_producto_dependencia_fecha",
        "saldos",
        ["id_producto", "id_dependencia", "fecha"],
    )

    # ── Backfill: saldo corrido por (producto, dependencia) en orden de fecha ──
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            """
            SELECT m.id_producto, m.id_dependencia, m.fecha,
                   m.cantidad * tm.factor AS delta
            FROM movimiento m
            JOIN tipo_movimiento tm
              ON tm.id_tipo_movimiento = m.id_tipo_movimiento
            WHERE m.estado = 'confirmado'
            ORDER BY m.id_producto, m.id_dependencia, m.fecha, m.id_movimiento
            """
        )
    ).fetchall()

    acumulados: dict = {}
    pendientes: list = []
    for id_producto, id_dependencia, fecha, delta in rows:
        key = (id_producto, id_dependencia)
        acumulados[key] = acumulados.get(key, 0) + int(delta or 0)
        pendientes.append(
            {
                "id_producto": id_producto,
                "id_dependencia": id_dependencia,
                "fecha": fecha,
                "saldo": acumulados[key],
            }
        )

    if pendientes:
        conn.execute(
            sa.text(
                "INSERT INTO saldos (id_producto, id_dependencia, fecha, saldo) "
                "VALUES (:id_producto, :id_dependencia, :fecha, :saldo)"
            ),
            pendientes,
        )


def downgrade() -> None:
    op.drop_index("idx_saldos_producto_dependencia_fecha", table_name="saldos")
    op.drop_table("saldos")
