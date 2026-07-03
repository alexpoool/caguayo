"""rename item_anexo fields: cantidad->entrada, cantidad_vendida->vendido, drop existencia

Revision ID: rename_item_anexo_fields
Revises: add_fk_id_dependencia_movimiento
Create Date: 2026-06-24

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "rename_item_anexo_fields"
down_revision: Union[str, None] = "add_fk_id_dependencia_movimiento"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    from sqlalchemy import inspect

    inspector = inspect(conn)
    columns = [col["name"] for col in inspector.get_columns("item_anexo")]

    if "cantidad" in columns:
        op.alter_column("item_anexo", "cantidad", new_column_name="entrada")

    if "cantidad_vendida" in columns:
        op.alter_column("item_anexo", "cantidad_vendida", new_column_name="vendido")

    if "existencia" in columns:
        op.drop_column("item_anexo", "existencia")

    # Update the PostgreSQL trigger function to use new column names
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


def downgrade() -> None:
    conn = op.get_bind()
    from sqlalchemy import inspect

    inspector = inspect(conn)
    columns = [col["name"] for col in inspector.get_columns("item_anexo")]

    if "existencia" not in columns:
        op.add_column(
            "item_anexo",
            sa.Column("existencia", sa.Integer(), nullable=False, server_default="0"),
        )

    if "cantidad" not in columns:
        op.alter_column("item_anexo", "entrada", new_column_name="cantidad")

    if "cantidad_vendida" not in columns:
        op.alter_column("item_anexo", "vendido", new_column_name="cantidad_vendida")

    # Restore trigger function with old column names
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

    UPDATE productos SET stock = nueva_existencia
    WHERE id_producto = id_prod;

    RETURN NEW;
END;
$function$;
""")
