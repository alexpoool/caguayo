"""rename existencia to stock and fix trigger function

Revision ID: rename_existencia_stock_v2
Revises: remove_id_moneda_from_anexo
Create Date: 2026-06-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "rename_existencia_stock_v2"
down_revision: Union[str, None] = "remove_id_moneda_from_anexo"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TRIGGER_FUNCTION = """
CREATE OR REPLACE FUNCTION public.recalcular_existencia_producto()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    id_prod INTEGER;
    existencia_konsignacion INTEGER := 0;
    existencia_mov INTEGER := 0;
    nueva_existencia INTEGER := 0;
BEGIN
    IF TG_TABLE_NAME = 'item_anexo' THEN
        id_prod := COALESCE(NEW.id_producto, OLD.id_producto);
    ELSIF TG_TABLE_NAME = 'productos_en_liquidacion' THEN
        id_prod := COALESCE(NEW.id_producto, OLD.id_producto);
    ELSIF TG_TABLE_NAME = 'movimiento' THEN
        id_prod := COALESCE(NEW.id_producto, OLD.id_producto);
    ELSE
        RETURN NEW;
    END IF;

    SELECT COALESCE(SUM(ia.cantidad - ia.cantidad_vendida), 0) INTO existencia_konsignacion
    FROM item_anexo ia
    WHERE ia.id_producto = id_prod;

    SELECT COALESCE(SUM(m.cantidad * tm.factor), 0) INTO existencia_mov
    FROM movimiento m
    JOIN tipo_movimiento tm ON m.id_tipo_movimiento = tm.id_tipo_movimiento
    WHERE m.id_producto = id_prod
    AND m.estado = 'confirmado';

    nueva_existencia := COALESCE(existencia_konsignacion, 0) + COALESCE(existencia_mov, 0);

    UPDATE productos SET stock = nueva_existencia
    WHERE id_producto = id_prod;

    RETURN NEW;
END;
$function$;
"""


def upgrade() -> None:
    op.alter_column("productos", "existencia", new_column_name="stock")
    op.execute(TRIGGER_FUNCTION)


def downgrade() -> None:
    op.alter_column("productos", "stock", new_column_name="existencia")
