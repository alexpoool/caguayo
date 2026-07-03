"""drop productos.stock column and make trigger no-op

Revision ID: drop_productos_stock
Revises: rename_item_anexo_fields
Create Date: 2026-06-24

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "drop_productos_stock"
down_revision: Union[str, None] = "rename_item_anexo_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    from sqlalchemy import inspect

    inspector = inspect(conn)
    columns = [col["name"] for col in inspector.get_columns("productos")]

    if "stock" in columns:
        op.drop_column("productos", "stock")

    op.execute("""
CREATE OR REPLACE FUNCTION public.recalcular_existencia_producto()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN NEW;
END;
$function$;
""")


def downgrade() -> None:
    conn = op.get_bind()
    from sqlalchemy import inspect

    inspector = inspect(conn)
    columns = [col["name"] for col in inspector.get_columns("productos")]

    if "stock" not in columns:
        op.add_column(
            "productos",
            sa.Column("stock", sa.Integer(), nullable=False, server_default="0"),
        )

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

    SELECT COALESCE(SUM(ia.entrada - ia.vendido), 0) INTO existencia_konsignacion
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
""")
