"""Link productos to item_anexo and update movimientos with anexo/convenio

Revision ID: link_productos_item_anexo
Revises: seed_item_tables
Create Date: 2026-03-23
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = "link_productos_item_anexo"
down_revision: Union[str, None] = "seed_item_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    result = conn.execute(
        sa.text("SELECT id_anexo, id_convenio FROM anexo ORDER BY id_anexo LIMIT 1")
    )
    row = result.fetchone()
    if not row:
        return
    default_anexo = row[0]
    default_convenio = row[1]

    result = conn.execute(
        sa.text("""
        SELECT DISTINCT ON (ia.id_producto)
            ia.id_producto, ia.id_anexo, a.id_convenio
        FROM item_anexo ia
        JOIN anexo a ON ia.id_anexo = a.id_anexo
        ORDER BY ia.id_producto, ia.id_item_anexo
    """)
    )
    existing_relations = {r[0]: (r[1], r[2]) for r in result.fetchall()}

    result = conn.execute(
        sa.text("SELECT id_producto FROM productos ORDER BY id_producto")
    )
    all_products = [r[0] for r in result.fetchall()]

    result = conn.execute(
        sa.text("SELECT id_moneda FROM moneda ORDER BY id_moneda LIMIT 1")
    )
    default_moneda = result.fetchone()[0]

    if existing_relations:
        ref_anexo, ref_convenio = next(iter(existing_relations.values()))
    else:
        ref_anexo, ref_convenio = default_anexo, default_convenio

    created_count = 0
    for product_id in all_products:
        if product_id not in existing_relations:
            conn.execute(
                sa.text("""
                    INSERT INTO item_anexo (id_anexo, id_producto, cantidad, precio_compra, precio_venta, id_moneda)
                    VALUES (:id_anexo, :id_producto, 0, 0, 0, :id_moneda)
                    ON CONFLICT DO NOTHING
                """),
                {
                    "id_anexo": ref_anexo,
                    "id_producto": product_id,
                    "id_moneda": default_moneda,
                },
            )
            created_count += 1

    result = conn.execute(
        sa.text("""
        UPDATE movimiento m
        SET id_anexo = sub.id_anexo,
            id_convenio = sub.id_convenio
        FROM (
            SELECT DISTINCT ON (ia.id_producto)
                ia.id_producto, ia.id_anexo, a.id_convenio
            FROM item_anexo ia
            JOIN anexo a ON ia.id_anexo = a.id_anexo
            ORDER BY ia.id_producto, ia.id_item_anexo
        ) AS sub
        WHERE m.id_producto = sub.id_producto
          AND m.estado = 'confirmado'
          AND (m.id_anexo IS NULL OR m.id_convenio IS NULL)
    """)
    )
    rows_affected = result.rowcount

    print(f"Created {created_count} item_anexo entries for products without relations")
    print(f"Updated {rows_affected} movimientos with id_anexo and id_convenio")


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text("""
        UPDATE movimiento
        SET id_anexo = NULL, id_convenio = NULL
        WHERE estado = 'confirmado'
    """)
    )
