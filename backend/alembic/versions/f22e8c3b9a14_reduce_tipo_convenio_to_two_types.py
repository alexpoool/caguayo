"""Reduce tipo_convenio to only COMPRA VENTA and CONSIGNACION

Revision ID: f22e8c3b9a14
Revises: 128537904b80
Create Date: 2026-07-13 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision: str = "f22e8c3b9a14"
down_revision: Union[str, None] = "128537904b80"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Insert CONSIGNACION if not exists
    conn.execute(
        text("INSERT INTO tipo_convenio (nombre, descripcion) "
             "SELECT 'CONSIGNACION', 'Consignación de productos para liquidación posterior' "
             "WHERE NOT EXISTS (SELECT 1 FROM tipo_convenio WHERE nombre = 'CONSIGNACION')")
    )

    # 2. Get the id of CONSIGNACION
    result = conn.execute(
        text("SELECT id_tipo_convenio FROM tipo_convenio WHERE nombre = 'CONSIGNACION'")
    )
    consignacion_id = result.scalar()

    # 3. Get the id of COMPRA VENTA (to keep it)
    result = conn.execute(
        text("SELECT id_tipo_convenio FROM tipo_convenio WHERE nombre = 'COMPRA VENTA'")
    )
    compra_venta_id = result.scalar()

    # 4. Update convenios that reference old tipos (not COMPRA VENTA or CONSIGNACION)
    if consignacion_id:
        conn.execute(
            text("UPDATE convenio SET id_tipo_convenio = :new_id "
                 "WHERE id_tipo_convenio NOT IN (:keep1, :keep2) "
                 "OR id_tipo_convenio IS NULL"),
            {"new_id": consignacion_id, "keep1": compra_venta_id, "keep2": consignacion_id}
        )

    # 5. Delete old tipo_convenio rows (not COMPRA VENTA or CONSIGNACION)
    conn.execute(
        text("DELETE FROM tipo_convenio WHERE nombre NOT IN ('COMPRA VENTA', 'CONSIGNACION')")
    )


def downgrade() -> None:
    conn = op.get_bind()

    # Re-insert the original tipos
    original_tipos = [
        ("Contrato de Servicios", "Contrato de servicios"),
        ("Acuerdo de Suministro", "Acuerdo de suministro"),
        ("Contrato de Obra", "Contrato de obra"),
        ("Convenio Marco", "Convenio marco"),
    ]

    for nombre, descripcion in original_tipos:
        conn.execute(
            text("INSERT INTO tipo_convenio (nombre, descripcion) "
                 "SELECT :nombre, :descripcion "
                 "WHERE NOT EXISTS (SELECT 1 FROM tipo_convenio WHERE nombre = :nombre)"),
            {"nombre": nombre, "descripcion": descripcion}
        )
