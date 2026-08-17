"""Reconvertir secuencias de códigos de convenio, anexo e item_anexo de 4 a 3 dígitos.

- convenio:  {den}.YY.MM.{id_convenio:03}
- anexo:     {den}.YY.MM.{id_convenio:03}.{secuencia_anexo:03}
- item_anexo:{id_convenio:03}.{secuencia_anexo:03}.{codigo_producto}

Revision ID: recodificar_codigos_3_digitos
Revises: backfill_codigos_conv_item
Create Date: 2026-08-17

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text


revision: str = "recodificar_codigos_3_digitos"
down_revision: Union[str, None] = "backfill_codigos_conv_item"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Convenios: se excluye el convenio base de recepciones (BASE-REC)
    conn.execute(
        text("""
            UPDATE convenio c
            SET codigo = COALESCE(NULLIF(SPLIT_PART(c.codigo, '.', 1), ''), 'CAG')
                         || '.' || TO_CHAR(c.fecha, 'YY')
                         || '.' || TO_CHAR(c.fecha, 'MM')
                         || '.' || LPAD(c.id_convenio::text, 3, '0')
            WHERE c.codigo IS NOT NULL
              AND c.codigo <> ''
              AND c.codigo <> 'BASE-REC'
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
            UPDATE anexo a
            SET codigo_anexo =
                    COALESCE(NULLIF(SPLIT_PART(a.codigo_anexo, '.', 1), ''), 'CAG')
                    || '.' || TO_CHAR(s.fecha, 'YY')
                    || '.' || TO_CHAR(s.fecha, 'MM')
                    || '.' || LPAD(a.id_convenio::text, 3, '0')
                    || '.' || LPAD(s.secuencia::text, 3, '0')
            FROM anexo_seq s
            WHERE a.id_anexo = s.id_anexo
              AND a.codigo_anexo IS NOT NULL
              AND a.codigo_anexo <> ''
              AND a.codigo_anexo <> 'ANEXO-BASE-REC'
        """)
    )

    # item_anexo: secuencia del anexo padre + código del producto.
    # Se calcula en un CTE porque el destino no puede referenciarse en el FROM.
    conn.execute(
        text("""
            WITH anexo_seq AS (
                SELECT id_anexo, id_convenio,
                       ROW_NUMBER() OVER (
                           PARTITION BY id_convenio ORDER BY id_anexo
                       ) AS secuencia
                FROM anexo
            ),
            recalc AS (
                SELECT ia.id_item_anexo,
                       LPAD(a.id_convenio::text, 3, '0')
                       || '.' || LPAD(s.secuencia::text, 3, '0')
                       || '.' || COALESCE(
                           NULLIF(p.codigo, ''),
                           LPAD(ia.id_producto::text, 3, '0')
                       ) AS nuevo_codigo
                FROM item_anexo ia
                JOIN anexo a ON a.id_anexo = ia.id_anexo
                JOIN anexo_seq s ON s.id_anexo = a.id_anexo
                JOIN productos p ON p.id_producto = ia.id_producto
                WHERE ia.codigo IS NOT NULL
            )
            UPDATE item_anexo t
            SET codigo = r.nuevo_codigo
            FROM recalc r
            WHERE t.id_item_anexo = r.id_item_anexo
        """)
    )


def downgrade() -> None:
    pass