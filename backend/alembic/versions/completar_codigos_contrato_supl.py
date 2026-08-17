"""Completar códigos de contrato y suplemento que nunca tuvieron código.

La migración anterior solo tocó filas ya codificadas. Esta recomputa TODAS
(las que tienen NULL usan el prefijo 'CAG' por defecto) para que contratos
sin código queden con la misma secuencia por año+mes y suplementos por contrato.

Revision ID: completar_codigos_contrato_supl
Revises: recodificar_cod_contrato_supl
Create Date: 2026-08-17

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text


revision: str = "completar_codigos_contrato_supl"
down_revision: Union[str, None] = "recodificar_cod_contrato_supl"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # contrato: los NULL usan el prefijo 'CAG' (COALESCE) y se integran a la secuencia
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
            )
            UPDATE contrato t
            SET codigo = r.nuevo_codigo
            FROM recalc r
            WHERE t.id_contrato = r.id_contrato
        """)
    )

    # suplemento: mismo tratamiento, secuencia por contrato
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
            )
            UPDATE suplemento t
            SET codigo = r.nuevo_codigo
            FROM recalc r
            WHERE t.id_suplemento = r.id_suplemento
        """)
    )


def downgrade() -> None:
    pass