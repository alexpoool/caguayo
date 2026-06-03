"""Migrate existing codes to new format with NIT prefix

Revision ID: migrate_codes_to_new_format
Revises: cf42c599529a
Create Date: 2026-06-03

"""

from typing import Sequence, Union
from alembic import op
from sqlalchemy import text

revision: str = "migrate_codes_to_new_format"
down_revision: Union[str, None] = "cf42c599529a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    result = conn.execute(text("SELECT nit FROM dependencia LIMIT 1"))
    row = result.fetchone()
    nit = row[0] if row and row[0] else ""

    # 1. servicios: SERV-001 → {nit}.2024.1
    if nit:
        conn.execute(
            text(
                "UPDATE servicios SET codigo_servicio = :prefijo || '2024.' || id_servicio::text "
                "WHERE codigo_servicio LIKE 'SERV-%'"
            ),
            {"prefijo": f"{nit}."},
        )
    else:
        conn.execute(
            text(
                "UPDATE servicios SET codigo_servicio = '2024.' || id_servicio::text "
                "WHERE codigo_servicio LIKE 'SERV-%'"
            )
        )

    # 2. solicitud_servicio.codigo_solicitud: SOL-26-1 → {nit}.{año}.{seq_x_contrato}
    if nit:
        conn.execute(
            text("""
                WITH numbered AS (
                    SELECT s.id_solicitud_servicio,
                           ROW_NUMBER() OVER (PARTITION BY s.id_contrato ORDER BY s.id_solicitud_servicio) as seq
                    FROM solicitud_servicio s
                    WHERE s.codigo_solicitud IS NOT NULL
                )
                UPDATE solicitud_servicio s
                SET codigo_solicitud = :prefijo || EXTRACT(YEAR FROM s.fecha_solicitud)::text || '.' || n.seq::text
                FROM numbered n
                WHERE s.id_solicitud_servicio = n.id_solicitud_servicio
            """),
            {"prefijo": f"{nit}."},
        )
    else:
        conn.execute(
            text("""
                WITH numbered AS (
                    SELECT s.id_solicitud_servicio,
                           ROW_NUMBER() OVER (PARTITION BY s.id_contrato ORDER BY s.id_solicitud_servicio) as seq
                    FROM solicitud_servicio s
                    WHERE s.codigo_solicitud IS NOT NULL
                )
                UPDATE solicitud_servicio s
                SET codigo_solicitud = EXTRACT(YEAR FROM s.fecha_solicitud)::text || '.' || n.seq::text
                FROM numbered n
                WHERE s.id_solicitud_servicio = n.id_solicitud_servicio
            """)
        )

    # 3. solicitud_servicio.codigo_proyecto: PROY-26-1 → {nit}.{año}.{seq_x_contrato}
    if nit:
        conn.execute(
            text("""
                WITH numbered AS (
                    SELECT s.id_solicitud_servicio,
                           ROW_NUMBER() OVER (PARTITION BY s.id_contrato ORDER BY s.id_solicitud_servicio) as seq
                    FROM solicitud_servicio s
                    WHERE s.codigo_proyecto IS NOT NULL
                )
                UPDATE solicitud_servicio s
                SET codigo_proyecto = :prefijo || EXTRACT(YEAR FROM COALESCE(s.fecha_solicitud, NOW()))::text || '.' || n.seq::text
                FROM numbered n
                WHERE s.id_solicitud_servicio = n.id_solicitud_servicio
            """),
            {"prefijo": f"{nit}."},
        )
    else:
        conn.execute(
            text("""
                WITH numbered AS (
                    SELECT s.id_solicitud_servicio,
                           ROW_NUMBER() OVER (PARTITION BY s.id_contrato ORDER BY s.id_solicitud_servicio) as seq
                    FROM solicitud_servicio s
                    WHERE s.codigo_proyecto IS NOT NULL
                )
                UPDATE solicitud_servicio s
                SET codigo_proyecto = EXTRACT(YEAR FROM COALESCE(s.fecha_solicitud, NOW()))::text || '.' || n.seq::text
                FROM numbered n
                WHERE s.id_solicitud_servicio = n.id_solicitud_servicio
            """)
        )

    # 4. factura_servicio.codigo_factura: FAC-2026-0002 → {nit}{letra}.2026.2
    if nit:
        conn.execute(
            text("""
                UPDATE factura_servicio
                SET codigo_factura = :nit || CASE WHEN id_certificacion IS NOT NULL THEN 'C' ELSE 'S' END
                    || '.' || EXTRACT(YEAR FROM fecha)::text || '.' || SPLIT_PART(codigo_factura, '-', 3)::int::text
                WHERE codigo_factura LIKE 'FAC-%'
            """),
            {"nit": nit},
        )
    else:
        conn.execute(
            text("""
                UPDATE factura_servicio
                SET codigo_factura = CASE WHEN id_certificacion IS NOT NULL THEN 'C' ELSE 'S' END
                    || '.' || EXTRACT(YEAR FROM fecha)::text || '.' || SPLIT_PART(codigo_factura, '-', 3)::int::text
                WHERE codigo_factura LIKE 'FAC-%'
            """)
        )

    # 5. persona_liquidacion.numero: LIQ-2026-0001 → {nit}L.2026.1
    if nit:
        conn.execute(
            text("""
                UPDATE persona_liquidacion
                SET numero = :nit || 'L.' || EXTRACT(YEAR FROM fecha_emision)::text || '.' || SPLIT_PART(numero, '-', 3)::int::text
                WHERE numero LIKE 'LIQ-%'
            """),
            {"nit": nit},
        )
    else:
        conn.execute(
            text("""
                UPDATE persona_liquidacion
                SET numero = 'L.' || EXTRACT(YEAR FROM fecha_emision)::text || '.' || SPLIT_PART(numero, '-', 3)::int::text
                WHERE numero LIKE 'LIQ-%'
            """)
        )


def downgrade() -> None:
    pass
