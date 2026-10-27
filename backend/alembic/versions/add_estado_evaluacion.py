"""estado anulada de nomina + estado en evaluaciones

Revision ID: add_estado_evaluacion
Revises: add_estado_factura
Create Date: 2026-10-27

- `nomina.estado` admite 'anulada': una nómina confirmada no se borra
  físicamente (arrastraría los pagos de salario registrados), pasa a estado
  'anulada' conservando el detalle y los pagos.
- `evaluaciones.estado` ('activa'/'anulada'): borrado lógico de una
  evaluación ya usada en pagos por resultado.
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "add_estado_evaluacion"
down_revision: Union[str, None] = "add_estado_factura"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Nómina en 'anulada' (borrado lógico conservando el detalle y pagos).
    op.execute("ALTER TABLE nomina DROP CONSTRAINT IF EXISTS chk_nomina_estado")
    op.execute(
        "ALTER TABLE nomina ADD CONSTRAINT chk_nomina_estado CHECK "
        "(estado IN ('pre_nomina','nomina','anulada'))"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE nomina DROP CONSTRAINT IF EXISTS chk_nomina_estado")
    op.execute(
        "ALTER TABLE nomina ADD CONSTRAINT chk_nomina_estado CHECK "
        "(estado IN ('pre_nomina','nomina'))"
    )
