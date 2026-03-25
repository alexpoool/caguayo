"""Seed item tables with random data

Revision ID: seed_item_tables
Revises: add_id_dependencia_to_factura
Create Date: 2026-03-23
"""

from typing import Sequence, Union
import random
from alembic import op
import sqlalchemy as sa


revision: str = "seed_item_tables"
down_revision: Union[str, None] = "add_id_dependencia_to_factura"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    rp = conn.execute(sa.text("SELECT id_anexo FROM anexo ORDER BY id_anexo"))
    anexo_ids = [row[0] for row in rp.fetchall()]
    rp = conn.execute(sa.text("SELECT id_producto FROM productos ORDER BY id_producto"))
    producto_ids = [row[0] for row in rp.fetchall()]
    rp = conn.execute(sa.text("SELECT id_factura FROM factura ORDER BY id_factura"))
    factura_ids = [row[0] for row in rp.fetchall()]
    rp = conn.execute(
        sa.text(
            "SELECT id_venta_efectivo FROM venta_efectivo ORDER BY id_venta_efectivo"
        )
    )
    venta_efectivo_ids = [row[0] for row in rp.fetchall()]
    rp = conn.execute(sa.text("SELECT id_moneda FROM moneda ORDER BY id_moneda"))
    moneda_ids = [row[0] for row in rp.fetchall()]

    random.seed(42)

    item_anexo_rows = []
    for _ in range(100):
        id_anexo = random.choice(anexo_ids)
        id_producto = random.choice(producto_ids)
        cantidad = random.randint(1, 20)
        precio_compra = round(random.uniform(10, 5000), 4)
        margen = random.uniform(0.10, 0.30)
        precio_venta = round(precio_compra * (1 + margen), 4)
        id_moneda = random.choice(moneda_ids)
        item_anexo_rows.append(
            {
                "id_anexo": id_anexo,
                "id_producto": id_producto,
                "cantidad": cantidad,
                "precio_compra": str(precio_compra),
                "precio_venta": str(precio_venta),
                "id_moneda": id_moneda,
            }
        )

    conn.execute(
        sa.text("""
            INSERT INTO item_anexo (id_anexo, id_producto, cantidad, precio_compra, precio_venta, id_moneda)
            VALUES (:id_anexo, :id_producto, :cantidad, :precio_compra, :precio_venta, :id_moneda)
        """),
        item_anexo_rows,
    )

    item_factura_rows = []
    for _ in range(100):
        id_factura = random.choice(factura_ids)
        id_producto = random.choice(producto_ids)
        cantidad = random.randint(1, 20)
        precio_compra = round(random.uniform(10, 5000), 4)
        margen = random.uniform(0.10, 0.30)
        precio_venta = round(precio_compra * (1 + margen), 4)
        id_moneda = random.choice(moneda_ids)
        item_factura_rows.append(
            {
                "id_factura": id_factura,
                "id_producto": id_producto,
                "cantidad": cantidad,
                "precio_compra": str(precio_compra),
                "precio_venta": str(precio_venta),
                "id_moneda": id_moneda,
            }
        )

    conn.execute(
        sa.text("""
            INSERT INTO item_factura (id_factura, id_producto, cantidad, precio_compra, precio_venta, id_moneda)
            VALUES (:id_factura, :id_producto, :cantidad, :precio_compra, :precio_venta, :id_moneda)
        """),
        item_factura_rows,
    )

    item_venta_efectivo_rows = []
    for _ in range(100):
        id_venta_efectivo = random.choice(venta_efectivo_ids)
        id_producto = random.choice(producto_ids)
        cantidad = random.randint(1, 20)
        precio_compra = round(random.uniform(10, 5000), 4)
        margen = random.uniform(0.10, 0.30)
        precio_venta = round(precio_compra * (1 + margen), 4)
        id_moneda = random.choice(moneda_ids)
        item_venta_efectivo_rows.append(
            {
                "id_venta_efectivo": id_venta_efectivo,
                "id_producto": id_producto,
                "cantidad": cantidad,
                "precio_compra": str(precio_compra),
                "precio_venta": str(precio_venta),
                "id_moneda": id_moneda,
            }
        )

    conn.execute(
        sa.text("""
            INSERT INTO item_venta_efectivo (id_venta_efectivo, id_producto, cantidad, precio_compra, precio_venta, id_moneda)
            VALUES (:id_venta_efectivo, :id_producto, :cantidad, :precio_compra, :precio_venta, :id_moneda)
        """),
        item_venta_efectivo_rows,
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("TRUNCATE TABLE item_anexo RESTART IDENTITY CASCADE"))
    conn.execute(sa.text("TRUNCATE TABLE item_factura RESTART IDENTITY CASCADE"))
    conn.execute(sa.text("TRUNCATE TABLE item_venta_efectivo RESTART IDENTITY CASCADE"))
