"""Backfill de códigos faltantes: convenios e items sin código previo.

Completa los registros que la migración recodificar_codigos_conv_anex no
tocó porque no tenían código asignado.

- convenio:  {den}.YY.MM.{id_convenio:04}
- item_anexo:{id_convenio:04}.{secuencia_anexo:04}.{codigo_producto}

Revision ID: backfill_codigos_convenio_item_faltantes
Revises: recodificar_codigos_conv_anex
Create Date: 2026-08-17

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text


revision: str = "backfill_codigos_conv_item"
down_revision: Union[str, None] = "recodificar_codigos_conv_anex"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Convenios sin código previo (denominación por defecto CAG)
    conn.execute(
        text("""
            UPDATE convenio c
            SET codigo = 'CAG'
                         || '.' || TO_CHAR(c.fecha, 'YY')
                         || '.' || TO_CHAR(c.fecha, 'MM')
                         || '.' || LPAD(c.id_convenio::text, 4, '0')
            WHERE (c.codigo IS NULL OR c.codigo = '')
              AND COALESCE(c.codigo, '') <> 'BASE-REC'
        """)
    )

    # item_anexo sin código previo
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
                       LPAD(a.id_convenio::text, 4, '0')
                       || '.' || LPAD(s.secuencia::text, 4, '0')
                       || '.' || COALESCE(
                           NULLIF(p.codigo, ''),
                           LPAD(ia.id_producto::text, 4, '0')
                       ) AS nuevo_codigo
                FROM item_anexo ia
                JOIN anexo a ON a.id_anexo = ia.id_anexo
                JOIN anexo_seq s ON s.id_anexo = a.id_anexo
                JOIN productos p ON p.id_producto = ia.id_producto
                WHERE ia.codigo IS NULL OR ia.codigo = ''
            )
            UPDATE item_anexo t
            SET codigo = r.nuevo_codigo
            FROM recalc r
            WHERE t.id_item_anexo = r.id_item_anexo
        """)
    )


def downgrade() -> None:
    pass