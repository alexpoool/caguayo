"""Quitar el segmento .MM (mes) de todos los códigos que lo llevan.

- convenio:       {den}.YY.{id_convenio:03}
- anexo:          {den}.YY.{id_convenio:03}.{secuencia:03}
- liquidacion:    {den}.YY.{id_cliente}.{secuencia:03}   (global por cliente)
- factura:        {den}.YY.{id_contrato:03}.{secuencia:03}
- venta_efectivo: {den}.YY.{secuencia:03}               (global)
- contrato:       {den}.YY.{secuencia:03}               (global)
- suplemento:     {den}.YY.{id_contrato:03}.{secuencia:03}
- item_venta_efectivo: {sec_venta:03}.{producto}         (re-secuencia con su venta)

Se excluyen los marcadores BASE-REC y ANEXO-BASE-REC.

Revision ID: quitar_mes_de_codigos
Revises: recodificar_solicitud_proy
Create Date: 2026-08-17

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text


revision: str = "quitar_mes_de_codigos"
down_revision: Union[str, None] = "recodificar_solicitud_proy"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Convenios: se excluye el convenio base de recepciones (BASE-REC)
    conn.execute(
        text("""
            UPDATE convenio t
            SET codigo = COALESCE(NULLIF(SPLIT_PART(t.codigo, '.', 1), ''), 'CAG')
                         || '.' || TO_CHAR(t.fecha, 'YY')
                         || '.' || LPAD(t.id_convenio::text, 3, '0')
            WHERE t.codigo IS NOT NULL
              AND t.codigo <> ''
              AND t.codigo <> 'BASE-REC'
        """)
    )

    # Anexos: secuencia por convenio (orden por id_anexo); se excluye el anexo
    # base de recepciones (ANEXO-BASE-REC) usado como marcador
    conn.execute(
        text("""
            WITH anexo_seq AS (
                SELECT id_anexo, id_convenio, fecha,
                       ROW_NUMBER() OVER (
                           PARTITION BY id_convenio ORDER BY id_anexo
                       ) AS secuencia
                FROM anexo
            )
            UPDATE anexo t
            SET codigo_anexo =
                    COALESCE(NULLIF(SPLIT_PART(t.codigo_anexo, '.', 1), ''), 'CAG')
                    || '.' || TO_CHAR(s.fecha, 'YY')
                    || '.' || LPAD(t.id_convenio::text, 3, '0')
                    || '.' || LPAD(s.secuencia::text, 3, '0')
            FROM anexo_seq s
            WHERE t.id_anexo = s.id_anexo
              AND t.codigo_anexo IS NOT NULL
              AND t.codigo_anexo <> ''
              AND t.codigo_anexo <> 'ANEXO-BASE-REC'
        """)
    )

    # Liquidaciones: secuencia global por cliente (orden por fecha, id)
    conn.execute(
        text("""
            WITH liq_seq AS (
                SELECT id_liquidacion, id_cliente, fecha_emision,
                       ROW_NUMBER() OVER (
                           PARTITION BY id_cliente
                           ORDER BY fecha_emision, id_liquidacion
                       ) AS secuencia
                FROM liquidacion
            )
            UPDATE liquidacion t
            SET codigo =
                    COALESCE(NULLIF(SPLIT_PART(t.codigo, '.', 1), ''), 'CAG')
                    || '.' || TO_CHAR(s.fecha_emision, 'YY')
                    || '.' || t.id_cliente::text
                    || '.' || LPAD(s.secuencia::text, 3, '0')
            FROM liq_seq s
            WHERE t.id_liquidacion = s.id_liquidacion
              AND t.codigo IS NOT NULL
              AND t.codigo <> ''
        """)
    )

    # Facturas: secuencia propia de la factura dentro de su contrato
    conn.execute(
        text("""
            WITH fact_seq AS (
                SELECT id_factura, id_contrato, fecha,
                       ROW_NUMBER() OVER (
                           PARTITION BY id_contrato
                           ORDER BY fecha, id_factura
                       ) AS secuencia
                FROM factura
            )
            UPDATE factura t
            SET codigo_factura =
                    COALESCE(NULLIF(SPLIT_PART(t.codigo_factura, '.', 1), ''), 'CAG')
                    || '.' || TO_CHAR(s.fecha, 'YY')
                    || '.' || LPAD(t.id_contrato::text, 3, '0')
                    || '.' || LPAD(s.secuencia::text, 3, '0')
            FROM fact_seq s
            WHERE t.id_factura = s.id_factura
              AND t.codigo_factura IS NOT NULL
              AND t.codigo_factura <> ''
        """)
    )

    # Ventas en efectivo: secuencia global (orden por fecha, id)
    conn.execute(
        text("""
            WITH venta_seq AS (
                SELECT id_venta_efectivo, fecha,
                       ROW_NUMBER() OVER (
                           ORDER BY fecha, id_venta_efectivo
                       ) AS secuencia
                FROM venta_efectivo
            )
            UPDATE venta_efectivo t
            SET codigo =
                    COALESCE(NULLIF(SPLIT_PART(t.codigo, '.', 1), ''), 'CAG')
                    || '.' || TO_CHAR(s.fecha, 'YY')
                    || '.' || LPAD(s.secuencia::text, 3, '0')
            FROM venta_seq s
            WHERE t.id_venta_efectivo = s.id_venta_efectivo
              AND t.codigo IS NOT NULL
              AND t.codigo <> ''
        """)
    )

    # Contratos: secuencia global (orden por fecha, id)
    conn.execute(
        text("""
            WITH contrato_seq AS (
                SELECT id_contrato, fecha,
                       ROW_NUMBER() OVER (
                           ORDER BY fecha, id_contrato
                       ) AS secuencia
                FROM contrato
            )
            UPDATE contrato t
            SET codigo =
                    COALESCE(NULLIF(SPLIT_PART(t.codigo, '.', 1), ''), 'CAG')
                    || '.' || TO_CHAR(s.fecha, 'YY')
                    || '.' || LPAD(s.secuencia::text, 3, '0')
            FROM contrato_seq s
            WHERE t.id_contrato = s.id_contrato
              AND t.codigo IS NOT NULL
              AND t.codigo <> ''
        """)
    )

    # Suplementos: secuencia propia del suplemento dentro de su contrato
    conn.execute(
        text("""
            WITH supl_seq AS (
                SELECT id_suplemento, id_contrato, fecha,
                       ROW_NUMBER() OVER (
                           PARTITION BY id_contrato
                           ORDER BY fecha, id_suplemento
                       ) AS secuencia
                FROM suplemento
            )
            UPDATE suplemento t
            SET codigo =
                    COALESCE(NULLIF(SPLIT_PART(t.codigo, '.', 1), ''), 'CAG')
                    || '.' || TO_CHAR(s.fecha, 'YY')
                    || '.' || LPAD(t.id_contrato::text, 3, '0')
                    || '.' || LPAD(s.secuencia::text, 3, '0')
            FROM supl_seq s
            WHERE t.id_suplemento = s.id_suplemento
              AND t.codigo IS NOT NULL
              AND t.codigo <> ''
        """)
    )

    # item_venta_efectivo: re-secuencia con la serie global de su venta
    conn.execute(
        text("""
            WITH venta_seq AS (
                SELECT id_venta_efectivo, fecha,
                       ROW_NUMBER() OVER (
                           ORDER BY fecha, id_venta_efectivo
                       ) AS secuencia
                FROM venta_efectivo
            ),
            recalc AS (
                SELECT ive.id_item_venta_efectivo,
                       LPAD(vs.secuencia::text, 3, '0')
                       || '.' || NULLIF(
                           SUBSTRING(ive.codigo FROM POSITION('.' IN ive.codigo) + 1),
                           ''
                       ) AS nuevo_codigo
                FROM item_venta_efectivo ive
                JOIN venta_seq vs ON vs.id_venta_efectivo = ive.id_venta_efectivo
                WHERE ive.codigo IS NOT NULL
                  AND ive.codigo <> ''
            )
            UPDATE item_venta_efectivo t
            SET codigo = r.nuevo_codigo
            FROM recalc r
            WHERE t.id_item_venta_efectivo = r.id_item_venta_efectivo
        """)
    )


def downgrade() -> None:
    pass