"""objetivos pasan de `evaluaciones` a `empleados` y ganan fechas

Los objetivos ya no cuelgan de una evaluación concreta: se **definen** en el
empleado (siempre editables) y se **califican** dentro de cualquier
evaluación cuyo periodo solape sus fechas. Cambios:

- `objetivos.evaluacion_id` (FK `CASCADE`) → `objetivos.empleado_id`
  (FK `CASCADE` a `empleados`, igual que antes: al borrar el empleado se van
  sus objetivos), rellenado desde la evaluación original.
- `objetivos.valoracion` desaparece: la nota del objetivo pasa a ser
  `resultado_objetivo` = media (1–5) de las valoraciones de sus metas, que
  es lo que promedia `evaluaciones.promedio_objetivos` (0–100). Se cambia el
  tipo de `TEXT` a `DECIMAL(3,2)` y se recalcula desde las metas existentes.
- `objetivos.fecha_inicio/fecha_fin` y `metas.fecha_inicio/fecha_fin`
  (ambas `DATE`, opcionales): delimitan el rango en el que el objetivo cuenta
  para una evaluación (sin fechas cuenta siempre).

Revision ID: objetivos_a_empleados
Revises: add_tipos_evaluaciones
Create Date: 2026-10-14

"""

from typing import Sequence, Union

from alembic import op


revision: str = "objetivos_a_empleados"
down_revision: Union[str, None] = "add_tipos_evaluaciones"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Dueño nuevo: empleado (desde la evaluación original) ─────────────
    op.execute("ALTER TABLE objetivos ADD COLUMN empleado_id INT")
    op.execute(
        """
        UPDATE objetivos SET empleado_id = (
            SELECT e.empleado_id FROM evaluaciones e
            WHERE e.id = objetivos.evaluacion_id
        )
        """
    )
    # Sin huérfanos: los objetivos se borraban en cascada con su evaluación.
    op.execute("DELETE FROM objetivos WHERE empleado_id IS NULL")
    op.execute("ALTER TABLE objetivos ALTER COLUMN empleado_id SET NOT NULL")
    op.execute(
        """
        ALTER TABLE objetivos
            ADD CONSTRAINT fk_objetivos_empleado
            FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE
        """
    )

    # ── 2. Se suelta la evaluación ──────────────────────────────────────────
    op.execute("DROP INDEX IF EXISTS idx_objetivos_evaluacion")
    op.execute(
        "ALTER TABLE objetivos DROP CONSTRAINT IF EXISTS objetivos_evaluacion_id_fkey"
    )
    op.execute("ALTER TABLE objetivos DROP COLUMN evaluacion_id")

    # ── 3. Nota del objetivo: media de sus metas, en escala 1–5 ─────────────
    op.execute("ALTER TABLE objetivos DROP COLUMN valoracion")
    op.execute("ALTER TABLE objetivos DROP COLUMN resultado_objetivo")
    op.execute(
        "ALTER TABLE objetivos ADD COLUMN resultado_objetivo DECIMAL(3,2)"
    )
    op.execute(
        """
        UPDATE objetivos SET resultado_objetivo = (
            SELECT ROUND(AVG(m.valoracion), 2) FROM metas m
            WHERE m.objetivo_id = objetivos.id_objetivos
              AND m.valoracion IS NOT NULL
        )
        """
    )
    # `evaluaciones.promedio_objetivos` conserva su valor: con las mismas
    # valoraciones de metas el nuevo cálculo da el mismo resultado al
    # recalcular (borrador) o se recalcula solo al calificar/finalizar.

    # ── 4. Fechas en objetivos y metas ──────────────────────────────────────
    op.execute("ALTER TABLE objetivos ADD COLUMN fecha_inicio DATE")
    op.execute("ALTER TABLE objetivos ADD COLUMN fecha_fin DATE")
    op.execute("ALTER TABLE metas ADD COLUMN fecha_inicio DATE")
    op.execute("ALTER TABLE metas ADD COLUMN fecha_fin DATE")


def downgrade() -> None:
    # A la evaluación más reciente del empleado; sin ninguna, el objetivo
    # queda sin dueño y se elimina (era una fila de prueba o el empleado se
    # evaluó en el pasado antes de que existieran las evaluaciones).
    op.execute("ALTER TABLE objetivos ADD COLUMN evaluacion_id INT")
    op.execute(
        """
        UPDATE objetivos SET evaluacion_id = (
            SELECT e.id FROM evaluaciones e
            WHERE e.empleado_id = objetivos.empleado_id
            ORDER BY e.id DESC LIMIT 1
        )
        """
    )
    op.execute("DELETE FROM objetivos WHERE evaluacion_id IS NULL")
    op.execute("ALTER TABLE objetivos ALTER COLUMN evaluacion_id SET NOT NULL")
    op.execute(
        """
        ALTER TABLE objetivos
            ADD CONSTRAINT objetivos_evaluacion_id_fkey
            FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones(id) ON DELETE CASCADE
        """
    )
    op.execute(
        "CREATE INDEX idx_objetivos_evaluacion ON objetivos(evaluacion_id)"
    )

    # Vuelve al texto libre; las valoraciones (1–5) vivían en `metas` y se
    # conservan, así que el objetivo recupera su valoración anterior (media).
    op.execute("ALTER TABLE objetivos DROP COLUMN resultado_objetivo")
    op.execute("ALTER TABLE objetivos ADD COLUMN resultado_objetivo TEXT")
    op.execute(
        """
        ALTER TABLE objetivos ADD COLUMN valoracion INT
            CHECK (valoracion IS NULL OR valoracion BETWEEN 1 AND 5)
        """
    )
    op.execute(
        """
        UPDATE objetivos SET valoracion = (
            SELECT ROUND(AVG(m.valoracion)) FROM metas m
            WHERE m.objetivo_id = objetivos.id_objetivos
              AND m.valoracion IS NOT NULL
        )
        """
    )

    op.execute("ALTER TABLE objetivos DROP COLUMN fecha_fin")
    op.execute("ALTER TABLE objetivos DROP COLUMN fecha_inicio")
    op.execute("ALTER TABLE metas DROP COLUMN fecha_fin")
    op.execute("ALTER TABLE metas DROP COLUMN fecha_inicio")

    op.execute("ALTER TABLE objetivos DROP CONSTRAINT fk_objetivos_empleado")
    op.execute("ALTER TABLE objetivos DROP COLUMN empleado_id")
