"""Evaluaciones v2: N:M con objetivos ponderados, sin metas ni criterios

Rediseño de la Fase 8 (decidido con el usuario):

- Se **elimina la tabla `metas`** y los 4 criterios con escala de la
  evaluación (`{criterio}_estrellas` 0–10 + `escala_criterios_id`).
- Nueva tabla puente **`evaluaciones_objetivos`** (N:M evaluación ↔ objetivo):
  `peso` (copia editable del peso del objetivo), `resultado` (estrellas 0–5),
  `valoracion` y `recomendaciones` (texto libre), con
  `UNIQUE (id_evaluacion, id_objetivo)`.
- `evaluaciones` gana `recomendaciones` (texto general) y
  `promedio_objetivos` pasa a guardar el **promedio ponderado 0–5**
  (Σ estrellas×peso / Σ pesos de las filas puntuadas).
- `objetivos`: `fecha_inicio`/`fecha_fin` → `periodo_inicio`/`periodo_fin`
  (NOT NULL) y nuevo `peso NUMERIC(6,2)` NOT NULL > 0; desaparece
  `resultado_objetivo` (nacía de las metas).

**Datos existentes**: se vacían `evaluaciones`, `objetivos` y `metas` antes
del rework («empezar de cero» decidido: los pesos no se podían deducir de
las metas antiguas). El catálogo `calificaciones` no se toca.

Revision ID: evaluaciones_objetivos
Revises: criterios_por_estrellas
Create Date: 2026-10-16

"""

from typing import Sequence, Union

from alembic import op


revision: str = "evaluaciones_objetivos"
down_revision: Union[str, None] = "criterios_por_estrellas"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) Limpieza previa («empezar de cero»): sin filas, los ALTER son seguros.
    op.execute("DELETE FROM metas")
    op.execute("DELETE FROM evaluaciones")
    op.execute("DELETE FROM objetivos")

    # 2) Fuera la tabla `metas`.
    op.execute("DROP TABLE metas")

    # 3) Puente N:M evaluación ↔ objetivo.
    op.execute(
        """
        CREATE TABLE evaluaciones_objetivos (
            id_evaluaciones_objetivo SERIAL PRIMARY KEY,
            id_evaluacion INTEGER NOT NULL
                CONSTRAINT fk_evaluaciones_objetivos_evaluacion
                REFERENCES evaluaciones(id) ON DELETE CASCADE,
            id_objetivo INTEGER NOT NULL
                CONSTRAINT fk_evaluaciones_objetivos_objetivo
                REFERENCES objetivos(id_objetivos) ON DELETE CASCADE,
            peso NUMERIC(6,2) NOT NULL
                CONSTRAINT chk_evaluaciones_objetivos_peso CHECK (peso > 0),
            resultado INTEGER
                CONSTRAINT chk_evaluaciones_objetivos_resultado
                CHECK (resultado IS NULL OR resultado BETWEEN 0 AND 5),
            valoracion TEXT,
            recomendaciones TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_evaluaciones_objetivo
                UNIQUE (id_evaluacion, id_objetivo)
        )
        """
    )

    # 4) Objetivos: periodo obligatorio + peso fijo; sin `resultado_objetivo`.
    #    (PostgreSQL no admite RENAME junto a DROP/ADD en un mismo ALTER.)
    op.execute("ALTER TABLE objetivos DROP COLUMN resultado_objetivo")
    op.execute("ALTER TABLE objetivos RENAME COLUMN fecha_inicio TO periodo_inicio")
    op.execute("ALTER TABLE objetivos RENAME COLUMN fecha_fin TO periodo_fin")
    op.execute(
        """
        ALTER TABLE objetivos
            ALTER COLUMN periodo_inicio SET NOT NULL,
            ALTER COLUMN periodo_fin SET NOT NULL,
            ADD COLUMN peso NUMERIC(6,2) NOT NULL DEFAULT 1,
            ADD CONSTRAINT chk_objetivos_peso CHECK (peso > 0)
        """
    )

    # 5) Evaluaciones: + recomendaciones; fuera criterios, estrellas y escala;
    #    `promedio_objetivos` guarda ya el promedio ponderado (0–5).
    op.execute("ALTER TABLE evaluaciones ADD COLUMN recomendaciones TEXT")
    op.execute(
        """
        ALTER TABLE evaluaciones
            DROP CONSTRAINT IF EXISTS chk_evaluacion_estrellas,
            DROP CONSTRAINT IF EXISTS chk_evaluacion_promedio_objetivos,
            DROP COLUMN escala_criterios_id,
            DROP COLUMN puntualidad_estrellas,
            DROP COLUMN productividad_estrellas,
            DROP COLUMN trabajo_equipo_estrellas,
            DROP COLUMN calidad_estrellas
        """
    )
    op.execute(
        """
        ALTER TABLE evaluaciones
            ALTER COLUMN promedio_objetivos TYPE NUMERIC(4,2),
            ADD CONSTRAINT chk_evaluacion_promedio_objetivos CHECK (
                promedio_objetivos IS NULL
                    OR promedio_objetivos BETWEEN 0 AND 5
            )
        """
    )


def downgrade() -> None:
    # Reversible a medias (política del módulo): se restaura el esquema
    # antiguo **vacío**; los datos del modelo v2 no se traducen de vuelta
    # (no había criterios ni metas que reconstruir).
    op.execute(
        """
        ALTER TABLE evaluaciones
            DROP CONSTRAINT IF EXISTS chk_evaluacion_promedio_objetivos,
            ALTER COLUMN promedio_objetivos TYPE NUMERIC(5,2),
            DROP COLUMN recomendaciones
        """
    )
    op.execute(
        """
        ALTER TABLE evaluaciones
            ADD COLUMN escala_criterios_id INTEGER
                CONSTRAINT fk_evaluaciones_escala_criterios
                REFERENCES calificaciones(id_calificaciones)
                ON DELETE SET NULL,
            ADD COLUMN puntualidad_estrellas INTEGER,
            ADD COLUMN productividad_estrellas INTEGER,
            ADD COLUMN trabajo_equipo_estrellas INTEGER,
            ADD COLUMN calidad_estrellas INTEGER,
            ADD CONSTRAINT chk_evaluacion_estrellas CHECK (
                (puntualidad_estrellas IS NULL
                    OR puntualidad_estrellas BETWEEN 0 AND 10)
                AND (productividad_estrellas IS NULL
                    OR productividad_estrellas BETWEEN 0 AND 10)
                AND (trabajo_equipo_estrellas IS NULL
                    OR trabajo_equipo_estrellas BETWEEN 0 AND 10)
                AND (calidad_estrellas IS NULL
                    OR calidad_estrellas BETWEEN 0 AND 10)
            ),
            ADD CONSTRAINT chk_evaluacion_promedio_objetivos CHECK (
                promedio_objetivos IS NULL
                    OR promedio_objetivos BETWEEN 0 AND 100
            )
        """
    )
    op.execute("DROP TABLE evaluaciones_objetivos")
    # (Mismo motivo que en el upgrade: los RENAME van solos.)
    op.execute(
        """
        ALTER TABLE objetivos
            DROP CONSTRAINT IF EXISTS chk_objetivos_peso,
            DROP COLUMN peso
        """
    )
    op.execute("ALTER TABLE objetivos RENAME COLUMN periodo_inicio TO fecha_inicio")
    op.execute("ALTER TABLE objetivos RENAME COLUMN periodo_fin TO fecha_fin")
    op.execute(
        """
        ALTER TABLE objetivos
            ALTER COLUMN fecha_inicio DROP NOT NULL,
            ALTER COLUMN fecha_fin DROP NOT NULL,
            ADD COLUMN resultado_objetivo NUMERIC(3,2)
        """
    )
    op.execute(
        """
        CREATE TABLE metas (
            id_metas SERIAL PRIMARY KEY,
            objetivo_id INTEGER NOT NULL
                CONSTRAINT fk_metas_objetivo
                REFERENCES objetivos(id_objetivos) ON DELETE CASCADE,
            nombre VARCHAR(255) NOT NULL,
            resultado_meta INTEGER,
            valoracion INTEGER
                CONSTRAINT chk_metas_valoracion
                CHECK (valoracion IS NULL OR valoracion BETWEEN 1 AND 5),
            fecha_inicio DATE,
            fecha_fin DATE,
            observaciones TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
