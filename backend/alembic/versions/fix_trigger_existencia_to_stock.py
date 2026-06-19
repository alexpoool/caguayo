"""fix trigger function to use stock instead of existencia

Revision ID: fix_trigger_existencia_to_stock
Revises: cdaa5f831ee2
Create Date: 2026-06-16 14:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "fix_trigger_existencia_to_stock"
down_revision: Union[str, None] = "cdaa5f831ee2"
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
    -- Determinar qué producto afectar según la operación
    IF TG_TABLE_NAME = 'item_anexo' THEN
        id_prod := COALESCE(NEW.id_producto, OLD.id_producto);
    ELSIF TG_TABLE_NAME = 'productos_en_liquidacion' THEN
        id_prod := COALESCE(NEW.id_producto, OLD.id_producto);
    ELSIF TG_TABLE_NAME = 'movimiento' THEN
        id_prod := COALESCE(NEW.id_producto, OLD.id_producto);
    ELSE
        RETURN NEW;
    END IF;

    -- Calcular desde item_anexo (konsignación)
    SELECT COALESCE(SUM(ia.cantidad - ia.cantidad_vendida), 0) INTO existencia_konsignacion
    FROM item_anexo ia
    WHERE ia.id_producto = id_prod;

    -- Calcular desde movimientos confirmados
    SELECT COALESCE(SUM(m.cantidad * tm.factor), 0) INTO existencia_mov
    FROM movimiento m
    JOIN tipo_movimiento tm ON m.id_tipo_movimiento = tm.id_tipo_movimiento
    WHERE m.id_producto = id_prod
    AND m.estado = 'confirmado';

    -- Calcular existencia total
    nueva_existencia := COALESCE(existencia_konsignacion, 0) + COALESCE(existencia_mov, 0);

    -- Actualizar el producto
    UPDATE productos SET stock = nueva_existencia
    WHERE id_producto = id_prod;

    RETURN NEW;
END;
$function$;
"""


def upgrade() -> None:
    op.execute(TRIGGER_FUNCTION)


def downgrade() -> None:
    op.execute("""
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

    UPDATE productos SET existencia = nueva_existencia
    WHERE id_producto = id_prod;

    RETURN NEW;
END;
$function$;
""")
