"""merge heads (nomina/pago por resultado + proyectos/moneda)

Revision ID: merge_nomina_proyectos
Revises: pago_resultado_impuesto, persona_etapa_pk_moneda
Create Date: 2026-10-23

"""
from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = "merge_nomina_proyectos"
down_revision: Union[str, None] = (
    "pago_resultado_impuesto",
    "persona_etapa_pk_moneda",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
