"""estado ANULADO en estado_contrato (borrado lógico de contratos)

Revision ID: add_estado_anulado
Revises: add_estado_convenio
Create Date: 2026-10-26

Un contrato con facturas, solicitudes de servicio o movimientos asociados no
se borra físicamente: pasa al estado ANULADO y deja de listarse.
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "add_estado_anulado"
down_revision: Union[str, None] = "add_estado_convenio"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "INSERT INTO estado_contrato (nombre, descripcion)"
        " SELECT 'ANULADO', 'Contrato anulado (borrado lógico con datos asociados)'"
        " WHERE NOT EXISTS ("
        "   SELECT 1 FROM estado_contrato WHERE nombre = 'ANULADO'"
        " )"
    )


def downgrade() -> None:
    op.execute(
        "DELETE FROM estado_contrato WHERE nombre = 'ANULADO'"
        " AND NOT EXISTS (SELECT 1 FROM contrato WHERE id_estado = estado_contrato.id_estado_contrato)"
    )
