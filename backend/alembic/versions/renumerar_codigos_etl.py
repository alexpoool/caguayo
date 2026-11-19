"""Renumerar códigos de 2 dígitos que rompen las series migradas por el ETL.

Los códigos migrados usan `{prefijo}.{AAAA}.{secuencia}`. Las versiones
anteriores de la aplicación generaban `{prefijo}.{AA}.{secuencia}` con una
secuencia global (o por ROW_NUMBER), lo que producía saltos como
`FT.26.3728` en vez de `FT.2026.046`.

Esta migración detecta los códigos de año de 2 dígitos cuya secuencia supera
el máximo de la serie de 4 dígitos del mismo año y los renumera a partir de
ese máximo. Los códigos con prefijo de copia (`1.`/`2.`) no se tocan.

Revision ID: renumerar_codigos_etl
Revises: seed_pre_facturas_tienda
Create Date: 2026-11-19

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import text


revision: str = "renumerar_codigos_etl"
down_revision: Union[str, None] = "seed_pre_facturas_tienda"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _renumerar(conn, tabla: str, campo: str, pk: str) -> None:
    """Renombra los códigos `PREFIJO.AA.NNN` fuera de la serie del año."""
    conn.execute(
        text(
            rf"""
            WITH pendientes AS (
                SELECT {pk} AS id,
                       split_part({campo}, '.', 1) AS prefijo,
                       split_part({campo}, '.', 2) AS anio2,
                       split_part({campo}, '.', -1)::int AS seq
                FROM {tabla}
                WHERE {campo} ~ '^[^.]+\.([0-9]{{2}})\.[0-9]+$'
            ),
            filtrados AS (
                SELECT p.*, '20' || p.anio2 AS anio4
                FROM pendientes p
                WHERE p.seq > COALESCE((
                    SELECT MAX(
                        split_part(split_part(c.{campo}, '.', -1), '-', 1)::int
                    )
                    FROM {tabla} c
                    WHERE c.{campo} ~ (
                        '^([0-9]+\.)?[^.]+\.' || '20' || p.anio2
                        || '\.[0-9]+(-[0-9]+)?$'
                    )
                ), 0)
            ),
            renumerados AS (
                SELECT f.id, f.prefijo, f.anio4,
                       f.base + ROW_NUMBER() OVER (
                           PARTITION BY f.anio4 ORDER BY f.id
                       ) AS nueva
                FROM (
                    SELECT f.*, COALESCE((
                        SELECT MAX(
                            split_part(
                                split_part(c.{campo}, '.', -1), '-', 1
                            )::int
                        )
                        FROM {tabla} c
                        WHERE c.{campo} ~ (
                            '^([0-9]+\.)?[^.]+\.' || f.anio4
                            || '\.[0-9]+(-[0-9]+)?$'
                        )
                    ), 0) AS base
                    FROM filtrados f
                ) f
            )
            UPDATE {tabla} t
            SET {campo} = r.prefijo || '.' || r.anio4
                          || '.' || LPAD(r.nueva::text, 3, '0')
            FROM renumerados r
            WHERE t.{pk} = r.id
            """
        )
    )


def upgrade() -> None:
    conn = op.get_bind()
    _renumerar(conn, "contrato", "codigo", "id_contrato")
    _renumerar(
        conn, "solicitud_servicio", "codigo_solicitud",
        "id_solicitud_servicio",
    )
    _renumerar(
        conn, "solicitud_servicio", "codigo_proyecto",
        "id_solicitud_servicio",
    )


def downgrade() -> None:
    pass
