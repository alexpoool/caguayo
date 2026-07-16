"""seed 5 item_anexo per existing anexo with stock > 10

Revision ID: seed_item_anexo_data
Revises: e4040402ac2c
Create Date: 2026-07-09

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "seed_item_anexo_data"
down_revision: Union[str, None] = "e4040402ac2c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    anexos = conn.execute(
        sa.text("SELECT id_anexo FROM anexo ORDER BY id_anexo")
    ).fetchall()

    productos = conn.execute(
        sa.text(
            "SELECT id_producto, precio_compra, precio_venta, moneda_venta FROM productos ORDER BY id_producto"
        )
    ).fetchall()

    if not anexos or not productos:
        return

    stocks = [15, 20, 25, 30, 50]
    rows = []

    for idx, (anexo_id,) in enumerate(anexos):
        for i in range(5):
            prod = productos[(idx * 5 + i) % len(productos)]
            rows.append({
                "id_anexo": anexo_id,
                "id_producto": prod[0],
                "entrada": stocks[i],
                "vendido": 0,
                "precio_compra": str(float(prod[1]) if prod[1] else 10),
                "precio_venta": str(float(prod[2]) if prod[2] else 50),
                "id_moneda": prod[3] if prod[3] else 1,
            })

    conn.execute(
        sa.text("""
            INSERT INTO item_anexo (id_anexo, id_producto, entrada, vendido, precio_compra, precio_venta, id_moneda)
            VALUES (:id_anexo, :id_producto, :entrada, :vendido, :precio_compra, :precio_venta, :id_moneda)
        """),
        rows,
    )


def downgrade() -> None:
    conn = op.get_bind()

    inserted = conn.execute(
        sa.text("""
            SELECT ia.id_item_anexo
            FROM item_anexo ia
            INNER JOIN (
                SELECT id_anexo, MIN(id_item_anexo) AS first_id
                FROM item_anexo
                GROUP BY id_anexo
            ) first ON ia.id_anexo = first.id_anexo
            WHERE ia.entrada IN (15, 20, 25, 30, 50)
              AND ia.vendido = 0
              AND ia.id_item_anexo > first.first_id
        """)
    ).fetchall()

    if inserted:
        ids_to_delete = [row[0] for row in inserted]
        conn.execute(
            sa.text("DELETE FROM item_anexo WHERE id_item_anexo = ANY(:ids)"),
            {"ids": ids_to_delete},
        )
