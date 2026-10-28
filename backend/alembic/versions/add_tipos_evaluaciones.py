"""añade catálogo `tipos_evaluaciones` y FK desde `evaluaciones`

`evaluaciones.tipo_evaluacion` era un `VARCHAR(20)` con `CHECK` contra cuatro
valores fijos ('formal', 'autoevaluacion', 'parcial', 'final'). Se sustituye
por una FK al nuevo catálogo `tipos_evaluaciones`, que se siembra con esos
mismos cuatro tipos (con su nombre visible) y sobre el que ahora trabaja el
formulario de Evaluaciones.

El volcado de los datos existentes se hace **por nombre** (no por posición),
la restricción de unicidad pasa a incluir la columna nueva y el índice se
recrea sobre ella. La FK es `ON DELETE RESTRICT`: los tipos en uso se
desactivan (`activo=false`) en lugar de eliminarse, igual que el resto de
catálogos del módulo.

Revision ID: add_tipos_evaluaciones
Revises: widen_promedio_objetivos
Create Date: 2026-10-14

"""

from typing import Sequence, Union

from alembic import op


revision: str = "add_tipos_evaluaciones"
down_revision: Union[str, None] = "widen_promedio_objetivos"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Catálogo ────────────────────────────────────────────────────────
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS tipos_evaluaciones (
            id_tipos_evaluaciones SERIAL PRIMARY KEY,
            nombre VARCHAR(50) NOT NULL UNIQUE,
            descripcion TEXT,
            activo BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT chk_tipos_evaluaciones_updated CHECK (updated_at >= created_at)
        )
        """
    )

    # Semilla idempotente de los cuatro tipos originales (con ids fijos para
    # que el DEFAULT de la columna nueva apunte a 'Formal').
    op.execute(
        """
        INSERT INTO tipos_evaluaciones (id_tipos_evaluaciones, nombre, descripcion)
        SELECT v.id, v.nombre, v.descripcion
        FROM (VALUES
            (1, 'Formal', 'Evaluación formal de desempeño'),
            (2, 'Autoevaluación', 'Autoevaluación del propio empleado'),
            (3, 'Parcial', 'Evaluación de seguimiento a mitad de periodo'),
            (4, 'Final', 'Evaluación de cierre de periodo')
        ) AS v(id, nombre, descripcion)
        WHERE NOT EXISTS (SELECT 1 FROM tipos_evaluaciones)
        """
    )
    # Los ids insertados a mano no avanzan el SERIAL: hay que poner la
    # secuencia en el máximo para que los próximos no colisionen.
    op.execute(
        """
        SELECT setval(
            pg_get_serial_sequence('tipos_evaluaciones', 'id_tipos_evaluaciones'),
            GREATEST(
                (SELECT COALESCE(MAX(id_tipos_evaluaciones), 1)
                 FROM tipos_evaluaciones),
                1
            )
        )
        """
    )

    # ── 2. Columna nueva en `evaluaciones` + volcado por nombre ───────────
    op.execute("ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS tipo_evaluacion_id INT")
    op.execute(
        """
        UPDATE evaluaciones e
        SET tipo_evaluacion_id = t.id_tipos_evaluaciones
        FROM tipos_evaluaciones t
        WHERE t.nombre = CASE e.tipo_evaluacion
            WHEN 'formal' THEN 'Formal'
            WHEN 'autoevaluacion' THEN 'Autoevaluación'
            WHEN 'parcial' THEN 'Parcial'
            WHEN 'final' THEN 'Final'
        END
        """
    )
    op.execute("ALTER TABLE evaluaciones ALTER COLUMN tipo_evaluacion_id SET NOT NULL")
    op.execute("ALTER TABLE evaluaciones ALTER COLUMN tipo_evaluacion_id SET DEFAULT 1")

    # ── 3. FK, unicidad e índice ───────────────────────────────────────────
    op.execute(
        """
        ALTER TABLE evaluaciones
        ADD CONSTRAINT fk_evaluaciones_tipo
        FOREIGN KEY (tipo_evaluacion_id)
        REFERENCES tipos_evaluaciones(id_tipos_evaluaciones)
        ON DELETE RESTRICT
        """
    )
    op.execute(
        "ALTER TABLE evaluaciones DROP CONSTRAINT IF EXISTS uq_evaluacion_empleado_periodo_tipo"
    )
    op.execute(
        """
        ALTER TABLE evaluaciones
        ADD CONSTRAINT uq_evaluacion_empleado_periodo_tipo
        UNIQUE (empleado_id, periodo, tipo_evaluacion_id)
        """
    )
    op.execute("DROP INDEX IF EXISTS idx_evaluaciones_tipo")
    op.execute("CREATE INDEX idx_evaluaciones_tipo ON evaluaciones(tipo_evaluacion_id)")

    # ── 4. Retirada de la columna vieja (se lleva su CHECK inline) ────────
    op.execute("ALTER TABLE evaluaciones DROP CONSTRAINT IF EXISTS chk_evaluacion_tipo")
    op.execute("ALTER TABLE evaluaciones DROP COLUMN IF EXISTS tipo_evaluacion")


def downgrade() -> None:
    # Vuelta al VARCHAR. Los tipos creados por el usuario (id > 4 o renombrados)
    # se degradan a 'formal'; si eso duplicara una clave única, el `UPDATE`
    # fallará y habrá que resolverlo a mano.
    op.execute("ALTER TABLE evaluaciones ADD COLUMN tipo_evaluacion VARCHAR(20)")
    op.execute(
        """
        UPDATE evaluaciones
        SET tipo_evaluacion = CASE tipo_evaluacion_id
            WHEN 2 THEN 'autoevaluacion'
            WHEN 3 THEN 'parcial'
            WHEN 4 THEN 'final'
            ELSE 'formal'
        END
        """
    )
    op.execute("ALTER TABLE evaluaciones ALTER COLUMN tipo_evaluacion SET NOT NULL")
    op.execute(
        "ALTER TABLE evaluaciones ALTER COLUMN tipo_evaluacion SET DEFAULT 'formal'"
    )
    op.execute(
        """
        ALTER TABLE evaluaciones ADD CONSTRAINT chk_evaluacion_tipo
        CHECK (tipo_evaluacion IN ('formal','autoevaluacion','parcial','final'))
        """
    )
    op.execute(
        "ALTER TABLE evaluaciones DROP CONSTRAINT IF EXISTS uq_evaluacion_empleado_periodo_tipo"
    )
    op.execute(
        """
        ALTER TABLE evaluaciones
        ADD CONSTRAINT uq_evaluacion_empleado_periodo_tipo
        UNIQUE (empleado_id, periodo, tipo_evaluacion)
        """
    )
    op.execute("DROP INDEX IF EXISTS idx_evaluaciones_tipo")
    op.execute(
        "CREATE INDEX idx_evaluaciones_tipo ON evaluaciones(tipo_evaluacion)"
    )
    op.execute("ALTER TABLE evaluaciones DROP CONSTRAINT IF EXISTS fk_evaluaciones_tipo")
    op.execute("ALTER TABLE evaluaciones DROP COLUMN IF EXISTS tipo_evaluacion_id")
    op.execute("DROP TABLE IF EXISTS tipos_evaluaciones")
