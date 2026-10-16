"""criterios de evaluación: de FK-a-calificación a estrellas + una escala

Antes cada criterio (`puntualidad`, `productividad`, `trabajo_equipo`,
`calidad`) era una FK a `calificaciones` y su `valor` crudo (escala libre
1–100) era la puntuación. Ahora:

- `evaluaciones.escala_criterios_id` → FK a `calificaciones`: **una escala
  por evaluación**, cuyo `valor` es el último número de la escala
  (5, 10 o 100; CHECK en `calificaciones`).
- `evaluaciones.{criterio}_estrellas` INTEGER 0–10 (NULL = sin puntuar),
  con CHECK `chk_evaluacion_estrellas`. El valor en escala y el promedio se
  calculan al leer (estrellas/10 × escala).
- Se eliminan las 4 FK antiguas.
- `calificaciones.valor` queda restringido a {5, 10, 100}; las entradas con
  otro valor (residuos de pruebas) se eliminan al final, ya sin referencias.

Migración de datos: la única evaluación existente («hgg», finalizada) tenía
escala 1–5; cada valor crudo pasa a estrellas (valor × 2) y la escala es la
entrada `valor = 5` más antigua (se siembra «Escala 1–5» si no existe).

Revision ID: criterios_por_estrellas
Revises: calificaciones_escala_100
Create Date: 2026-10-15

"""

from typing import Sequence, Union

from alembic import op


revision: str = "criterios_por_estrellas"
down_revision: Union[str, None] = "calificaciones_escala_100"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) Columnas nuevas (las estrellas están a NULL: el CHECK no falla).
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
            )
        """
    )

    # 2) Escala 1–5 de referencia si el catálogo no tiene ninguna.
    op.execute(
        """
        INSERT INTO calificaciones (nombre, valor, created_at, updated_at)
        SELECT 'Escala 1-5', 5, NOW(), NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM calificaciones WHERE valor = 5
        )
        """
    )

    # 3) Backfill: la escala antigua era 1–5 → estrellas = valor crudo × 2.
    #    (Las columnas antiguas guardan el id de la calificación, no el valor.)
    op.execute(
        """
        UPDATE evaluaciones e
           SET escala_criterios_id = (
                   SELECT MIN(c.id_calificaciones)
                     FROM calificaciones c WHERE c.valor = 5
               ),
               puntualidad_estrellas = (
                   SELECT c.valor * 2 FROM calificaciones c
                    WHERE c.id_calificaciones = e.puntualidad
               ),
               productividad_estrellas = (
                   SELECT c.valor * 2 FROM calificaciones c
                    WHERE c.id_calificaciones = e.productividad
               ),
               trabajo_equipo_estrellas = (
                   SELECT c.valor * 2 FROM calificaciones c
                    WHERE c.id_calificaciones = e.trabajo_equipo
               ),
               calidad_estrellas = (
                   SELECT c.valor * 2 FROM calificaciones c
                    WHERE c.id_calificaciones = e.calidad
               )
        """
    )

    # 4) Fuera las 4 FK antiguas.
    op.execute(
        """
        ALTER TABLE evaluaciones
            DROP COLUMN puntualidad,
            DROP COLUMN productividad,
            DROP COLUMN trabajo_equipo,
            DROP COLUMN calidad
        """
    )

    # 5) Escalas fuera de {5, 10, 100}: ya nadie las referencia.
    op.execute("DELETE FROM calificaciones WHERE valor NOT IN (5, 10, 100)")

    # 6) El valor de `calificaciones` es el último número de la escala.
    op.execute(
        "ALTER TABLE calificaciones "
        "DROP CONSTRAINT IF EXISTS chk_calificaciones_valor"
    )
    op.execute(
        """
        ALTER TABLE calificaciones
            ADD CONSTRAINT chk_calificaciones_valor CHECK (valor IN (5, 10, 100))
        """
    )


def downgrade() -> None:
    # Reversible a medias: se restaura el CHECK 1–100 y las 4 columnas FK
    # (vacías). Las estrellas no se pueden traducir de vuelta sin conocer la
    # escala usada en cada evaluación, así que los datos de criterios se
    # pierden (misma política que otras migraciones de este módulo).
    op.execute(
        "ALTER TABLE calificaciones "
        "DROP CONSTRAINT IF EXISTS chk_calificaciones_valor"
    )
    op.execute(
        """
        ALTER TABLE calificaciones
            ADD CONSTRAINT chk_calificaciones_valor CHECK (valor BETWEEN 1 AND 100)
        """
    )
    op.execute(
        "ALTER TABLE evaluaciones "
        "DROP CONSTRAINT IF EXISTS chk_evaluacion_estrellas"
    )
    op.execute(
        """
        ALTER TABLE evaluaciones
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
            ADD COLUMN puntualidad INTEGER
                CONSTRAINT fk_evaluaciones_puntualidad
                REFERENCES calificaciones(id_calificaciones)
                ON DELETE SET NULL,
            ADD COLUMN productividad INTEGER
                CONSTRAINT fk_evaluaciones_productividad
                REFERENCES calificaciones(id_calificaciones)
                ON DELETE SET NULL,
            ADD COLUMN trabajo_equipo INTEGER
                CONSTRAINT fk_evaluaciones_trabajo_equipo
                REFERENCES calificaciones(id_calificaciones)
                ON DELETE SET NULL,
            ADD COLUMN calidad INTEGER
                CONSTRAINT fk_evaluaciones_calidad
                REFERENCES calificaciones(id_calificaciones)
                ON DELETE SET NULL
        """
    )
