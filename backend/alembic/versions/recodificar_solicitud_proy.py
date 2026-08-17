"""Recodificar solicitudes y proyectos al formato correlativo global.

- solicitud: {den}.YY.{sec:03d}   (serie global, MAX+1 al crear)
- proyecto:  {den}.YY.{sec:03d}   (serie global independiente, MAX+1 al aprobar)

El .YY del backfill usa fecha_solicitud (no existe fecha de aprobación).

Revision ID: recodificar_solicitud_proy
Revises: completar_codigos_contrato_supl
Create Date: 2026-08-17

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text


revision: str = "recodificar_solicitud_proy"
down_revision: Union[str, None] = "completar_codigos_contrato_supl"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Solicitudes: todas las filas por id (los NULL usan el prefijo 'CAG')
    conn.execute(
        text("""
            WITH recalc AS (
                SELECT id_solicitud_servicio,
                       COALESCE(NULLIF(SPLIT_PART(codigo_solicitud, '.', 1), ''), 'CAG')
                       || '.' || TO_CHAR(fecha_solicitud, 'YY')
                       || '.' || LPAD(
                           ROW_NUMBER() OVER (ORDER BY id_solicitud_servicio)::text,
                           3,
                           '0'
                       ) AS nuevo_codigo
                FROM solicitud_servicio
            )
            UPDATE solicitud_servicio t
            SET codigo_solicitud = r.nuevo_codigo
            FROM recalc r
            WHERE t.id_solicitud_servicio = r.id_solicitud_servicio
        """)
    )

    # Proyectos: solo filas con código (los NULL se mantienen NULL)
    conn.execute(
        text("""
            WITH recalc AS (
                SELECT id_solicitud_servicio,
                       COALESCE(NULLIF(SPLIT_PART(codigo_proyecto, '.', 1), ''), 'CAG')
                       || '.' || TO_CHAR(fecha_solicitud, 'YY')
                       || '.' || LPAD(
                           ROW_NUMBER() OVER (ORDER BY id_solicitud_servicio)::text,
                           3,
                           '0'
                       ) AS nuevo_codigo
                FROM solicitud_servicio
                WHERE codigo_proyecto IS NOT NULL AND codigo_proyecto <> ''
            )
            UPDATE solicitud_servicio t
            SET codigo_proyecto = r.nuevo_codigo
            FROM recalc r
            WHERE t.id_solicitud_servicio = r.id_solicitud_servicio
        """)
    )


def downgrade() -> None:
    pass