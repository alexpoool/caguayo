"""Recodificar factura, item_factura, venta_efectivo e item_venta_efectivo.

Mismo patrón que anexo/item_anexo:
- factura:            {den}.YY.MM.{id_contrato:03}.{sec_factura:03}   (sec por contrato)
- item_factura:       {id_contrato:03}.{sec_factura:03}.{codigo_producto}
- venta_efectivo:     {den}.YY.MM.{sec:03}                            (sec por año+mes)
- item_venta_efectivo:{sec_venta:03}.{codigo_producto}

Revision ID: recodificar_codigos_fact_venta
Revises: recodificar_codigos_liquidacion
Create Date: 2026-08-17

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text


revision: str = "recodificar_codigos_fact_venta"
down_revision: Union[str, None] = "recodificar_codigos_liquidacion"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # factura: secuencia por contrato (orden por fecha, id)
    conn.execute(
        text("""
            WITH recalc AS (
                SELECT id_factura,
                       COALESCE(NULLIF(SPLIT_PART(codigo_factura, '.', 1), ''), 'CAG')
                       || '.' || TO_CHAR(fecha, 'YY')
                       || '.' || TO_CHAR(fecha, 'MM')
                       || '.' || LPAD(id_contrato::text, 3, '0')
                       || '.' || LPAD(
                           ROW_NUMBER() OVER (
                               PARTITION BY id_contrato ORDER BY fecha, id_factura
                           )::text,
                           3,
                           '0'
                       ) AS nuevo_codigo
                FROM factura
                WHERE codigo_factura IS NOT NULL AND codigo_factura <> ''
            )
            UPDATE factura t
            SET codigo_factura = r.nuevo_codigo
            FROM recalc r
            WHERE t.id_factura = r.id_factura
        """)
    )

    # item_factura: contrato + secuencia de su factura + código del producto
    conn.execute(
        text("""
            WITH recalc AS (
                SELECT i.id_item_factura,
                       LPAD(f.id_contrato::text, 3, '0')
                       || '.' || LPAD(
                           ROW_NUMBER() OVER (
                               PARTITION BY f.id_contrato ORDER BY f.fecha, f.id_factura
                           )::text,
                           3,
                           '0'
                       ) || '.' || COALESCE(
                           NULLIF(p.codigo, ''),
                           LPAD(i.id_producto::text, 3, '0')
                       ) AS nuevo_codigo
                FROM item_factura i
                JOIN factura f ON f.id_factura = i.id_factura
                JOIN productos p ON p.id_producto = i.id_producto
                WHERE i.codigo IS NOT NULL
            )
            UPDATE item_factura t
            SET codigo = r.nuevo_codigo
            FROM recalc r
            WHERE t.id_item_factura = r.id_item_factura
        """)
    )

    # venta_efectivo: secuencia por año+mes (orden por fecha, id)
    conn.execute(
        text("""
            WITH recalc AS (
                SELECT id_venta_efectivo,
                       COALESCE(NULLIF(SPLIT_PART(codigo, '.', 1), ''), 'CAG')
                       || '.' || TO_CHAR(fecha, 'YY')
                       || '.' || TO_CHAR(fecha, 'MM')
                       || '.' || LPAD(
                           ROW_NUMBER() OVER (
                               PARTITION BY EXTRACT(YEAR FROM fecha), EXTRACT(MONTH FROM fecha)
                               ORDER BY fecha, id_venta_efectivo
                           )::text,
                           3,
                           '0'
                       ) AS nuevo_codigo
                FROM venta_efectivo
                WHERE codigo IS NOT NULL AND codigo <> ''
            )
            UPDATE venta_efectivo t
            SET codigo = r.nuevo_codigo
            FROM recalc r
            WHERE t.id_venta_efectivo = r.id_venta_efectivo
        """)
    )

    # item_venta_efectivo: secuencia de su venta + código del producto
    conn.execute(
        text("""
            WITH recalc AS (
                SELECT i.id_item_venta_efectivo,
                       LPAD(
                           ROW_NUMBER() OVER (
                               PARTITION BY EXTRACT(YEAR FROM v.fecha), EXTRACT(MONTH FROM v.fecha)
                               ORDER BY v.fecha, v.id_venta_efectivo
                           )::text,
                           3,
                           '0'
                       ) || '.' || COALESCE(
                           NULLIF(p.codigo, ''),
                           LPAD(i.id_producto::text, 3, '0')
                       ) AS nuevo_codigo
                FROM item_venta_efectivo i
                JOIN venta_efectivo v ON v.id_venta_efectivo = i.id_venta_efectivo
                JOIN productos p ON p.id_producto = i.id_producto
                WHERE i.codigo IS NOT NULL
            )
            UPDATE item_venta_efectivo t
            SET codigo = r.nuevo_codigo
            FROM recalc r
            WHERE t.id_item_venta_efectivo = r.id_item_venta_efectivo
        """)
    )


def downgrade() -> None:
    pass