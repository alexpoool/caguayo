"""Recodificar liquidaciones: {den}.YY.MM.id_cliente.secuencia_por_cliente.

Nuevo formato: {den}.{año_2d}.{mes_2d}.{id_cliente}.{sec_por_cliente:03}
- den: prefijo actual del código (split_part) o 'CAG'
- id_cliente: tal cual, sin padding
- secuencia por cliente que reinicia cada año+mes (orden por fecha_emision, id_liquidacion)

Ej: CAG.26.07.1.001

Revision ID: recodificar_codigos_liquidacion
Revises: recodificar_codigos_3_digitos
Create Date: 2026-08-17

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text


revision: str = "recodificar_codigos_liquidacion"
down_revision: Union[str, None] = "recodificar_codigos_3_digitos"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Se recalcula en un CTE porque el destino no puede referenciarse en el FROM.
    conn.execute(
        text("""
            WITH recalc AS (
                SELECT id_liquidacion,
                       COALESCE(NULLIF(SPLIT_PART(codigo, '.', 1), ''), 'CAG')
                       || '.' || TO_CHAR(fecha_emision, 'YY')
                       || '.' || TO_CHAR(fecha_emision, 'MM')
                       || '.' || id_cliente::text
                       || '.' || LPAD(
                           ROW_NUMBER() OVER (
                               PARTITION BY id_cliente,
                                            EXTRACT(YEAR FROM fecha_emision),
                                            EXTRACT(MONTH FROM fecha_emision)
                               ORDER BY fecha_emision, id_liquidacion
                           )::text,
                           3,
                           '0'
                       ) AS nuevo_codigo
                FROM liquidacion
                WHERE codigo IS NOT NULL
            )
            UPDATE liquidacion t
            SET codigo = r.nuevo_codigo
            FROM recalc r
            WHERE t.id_liquidacion = r.id_liquidacion
        """)
    )


def downgrade() -> None:
    pass