"""change_persona_etapa_fk_to_clientes

Revision ID: 7707c2a751cf
Revises: merge_liq_and_drop_numero
Create Date: 2026-04-07 09:44:33.845227

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7707c2a751cf"
down_revision: Union[str, None] = "merge_liq_and_drop_numero"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint(
        "persona_etapa_id_persona_fkey", "persona_etapa", type_="foreignkey"
    )
    op.create_foreign_key(
        "persona_etapa_id_persona_fkey",
        "persona_etapa",
        "clientes",
        ["id_persona"],
        ["id_cliente"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "persona_etapa_id_persona_fkey", "persona_etapa", type_="foreignkey"
    )
    op.create_foreign_key(
        "persona_etapa_id_persona_fkey",
        "persona_etapa",
        "clientes_persona_natural",
        ["id_persona"],
        ["id_cliente"],
    )
