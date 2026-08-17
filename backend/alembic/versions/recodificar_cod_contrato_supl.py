"""Recodificar contrato y suplemento al patrón año+mes.

- contrato:    {den}.YY.MM.{sec:03d}               (sec por año+mes)
- suplemento:  {den}.YY.MM.{id_contrato:03d}.{sec:03d} (sec por contrato)

Ej: CAG.26.07.014 / CAG.26.07.002.001

Revision ID: recodificar_cod_contrato_supl
Revises: recodificar_codigos_fact_venta
Create Date: 2026-08-17

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text


revision: str = "recodificar_cod_contrato_supl"
down_revision: Union[str, None] = "recodificar_codigos_fact_venta"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # contrato: secuencia por año+mes (orden por fecha, id)
    conn.execute(
        text("""
            WITH recalc AS (
                SELECT id_contrato,
                       COALESCE(NULLIF(SPLIT_PART(codigo, '.', 1), ''), 'CAG')
                       || '.' || TO_CHAR(fecha, 'YY')
                       || '.' || TO_CHAR(fecha, 'MM')
                       || '.' || LPAD(
                           ROW_NUMBER() OVER (
                               PARTITION BY EXTRACT(YEAR FROM fecha), EXTRACT(MONTH FROM fecha)
                               ORDER BY fecha, id_contrato
                           )::text,
                           3,
                           '0'
                       ) AS nuevo_codigo
                FROM contrato
                WHERE codigo IS NOT NULL AND codigo <> ''
            )
            UPDATE contrato t
            SET codigo = r.nuevo_codigo
            FROM recalc r
            WHERE t.id_contrato = r.id_contrato
        """)
    )

    # suplemento: secuencia por contrato (orden por fecha, id)
    conn.execute(
        text("""
            WITH recalc AS (
                SELECT id_suplemento,
                       COALESCE(NULLIF(SPLIT_PART(codigo, '.', 1), ''), 'CAG')
                       || '.' || TO_CHAR(fecha, 'YY')
                       || '.' || TO_CHAR(fecha, 'MM')
                       || '.' || LPAD(id_contrato::text, 3, '0')
                       || '.' || LPAD(
                           ROW_NUMBER() OVER (
                               PARTITION BY id_contrato ORDER BY fecha, id_suplemento
                           )::text,
                           3,
                           '0'
                       ) AS nuevo_codigo
                FROM suplemento
                WHERE codigo IS NOT NULL AND codigo <> ''
            )
            UPDATE suplemento t
            SET codigo = r.nuevo_codigo
            FROM recalc r
            WHERE t.id_suplemento = r.id_suplemento
        """)
    )


def downgrade() -> None:
    pass