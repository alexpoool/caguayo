-- Trigger para actualizar existencia en productos
-- Este script crea funciones y triggers para mantener actualizado el campo existencia
-- IMPORTANTE: Excluye los anexos de tipo 'COMPRA VENTA' del cálculo de existencias

-- 1. Función para recalcular existencia de un producto
CREATE OR REPLACE FUNCTION recalcular_existencia_producto()
RETURNS TRIGGER AS $$
DECLARE
    id_prod INTEGER;
    existencia_konsignacion INTEGER := 0;
    existencia_mov INTEGER := 0;
    nueva_existencia INTEGER := 0;
BEGIN
    -- Determinar qué producto affected based on the operation
    IF TG_TABLE_NAME = 'item_anexo' THEN
        id_prod := COALESCE(NEW.id_producto, OLD.id_producto);
    ELSIF TG_TABLE_NAME = 'productos_en_liquidacion' THEN
        id_prod := COALESCE(NEW.id_producto, OLD.id_producto);
    ELSIF TG_TABLE_NAME = 'movimiento' THEN
        id_prod := COALESCE(NEW.id_producto, OLD.id_producto);
    ELSE
        RETURN NEW;
    END IF;
    
    -- Calcular desde item_anexo (konsignación) usando cantidad - cantidad_vendida
    SELECT COALESCE(SUM(ia.cantidad - ia.cantidad_vendida), 0) INTO existencia_konsignacion
    FROM item_anexo ia
    WHERE ia.id_producto = id_prod;
    
    -- Ya no se resta desde productos_en_liquidacion (el flujo FIFO maneja esto)
    -- La existencia se calcula desde item_anexo disponible
    
    -- Calcular desde movimientos confirmados (usando factor)
    SELECT COALESCE(SUM(m.cantidad * tm.factor), 0) INTO existencia_mov
    FROM movimiento m
    JOIN tipo_movimiento tm ON m.id_tipo_movimiento = tm.id_tipo_movimiento
    WHERE m.id_producto = id_prod
    AND m.estado = 'confirmado';
    
    -- Calcular existencia total
    nueva_existencia := COALESCE(existencia_konsignacion, 0) + COALESCE(existencia_mov, 0);
    
    -- Actualizar el producto
    UPDATE productos SET existencia = nueva_existencia
    WHERE id_producto = id_prod;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger para item_anexo
DROP TRIGGER IF EXISTS trg_existencia_item_anexo ON item_anexo;
CREATE TRIGGER trg_existencia_item_anexo
AFTER INSERT OR UPDATE OR DELETE ON item_anexo
FOR EACH ROW EXECUTE FUNCTION recalcular_existencia_producto();

-- 3. Trigger para productos_en_liquidacion
DROP TRIGGER IF EXISTS trg_existencia_productos_en_liquidacion ON productos_en_liquidacion;
CREATE TRIGGER trg_existencia_productos_en_liquidacion
AFTER INSERT OR UPDATE OR DELETE ON productos_en_liquidacion
FOR EACH ROW EXECUTE FUNCTION recalcular_existencia_producto();

-- 4. Trigger para movimiento
DROP TRIGGER IF EXISTS trg_existencia_movimiento ON movimiento;
CREATE TRIGGER trg_existencia_movimiento
AFTER INSERT OR UPDATE OR DELETE ON movimiento
FOR EACH ROW EXECUTE FUNCTION recalcular_existencia_producto();

-- Nota: Ejecutar este script en la base de datos del tenant
-- psql -d nombre_database -f triggers_existencia.sql