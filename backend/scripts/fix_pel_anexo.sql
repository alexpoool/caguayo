-- Script de corrección: agregar id_anexo a productos_en_liquidacion
-- Generado automáticamente

-- PEL 56 (prod 156, FACTURA, cant 5): 2 anexos -> 160
UPDATE productos_en_liquidacion SET id_anexo = 160 WHERE id_producto_en_liquidacion = 56;
-- PEL 55 (prod 157, VENTA_EFECTIVO): 1 anexo -> 158
UPDATE productos_en_liquidacion SET id_anexo = 158 WHERE id_producto_en_liquidacion = 55;
-- PEL 52 (prod 157, FACTURA): 1 anexo -> 158
UPDATE productos_en_liquidacion SET id_anexo = 158 WHERE id_producto_en_liquidacion = 52;
-- PEL 51 (prod 156, FACTURA, cant 4): 2 anexos -> 159
UPDATE productos_en_liquidacion SET id_anexo = 159 WHERE id_producto_en_liquidacion = 51;
-- PEL 50 (prod 156, FACTURA, cant 2): 2 anexos -> 160
UPDATE productos_en_liquidacion SET id_anexo = 160 WHERE id_producto_en_liquidacion = 50;
-- PEL 49 (prod 156, FACTURA, cant 4): 2 anexos -> 159
UPDATE productos_en_liquidacion SET id_anexo = 159 WHERE id_producto_en_liquidacion = 49;
-- PEL 48 (prod 156, FACTURA, cant 2): 2 anexos -> 160
UPDATE productos_en_liquidacion SET id_anexo = 160 WHERE id_producto_en_liquidacion = 48;
-- PEL 47 (prod 119, VENTA_EFECTIVO, cant 2): 2 anexos -> 157
UPDATE productos_en_liquidacion SET id_anexo = 157 WHERE id_producto_en_liquidacion = 47;
-- PEL 46 (prod 60, VENTA_EFECTIVO, cant 1): 3 anexos -> 156
UPDATE productos_en_liquidacion SET id_anexo = 156 WHERE id_producto_en_liquidacion = 46;
-- PEL 45 (prod 152, VENTA_EFECTIVO): 1 anexo -> 123
UPDATE productos_en_liquidacion SET id_anexo = 123 WHERE id_producto_en_liquidacion = 45;
-- PEL 44 (prod 60, VENTA_EFECTIVO, cant 1): 3 anexos -> 156
UPDATE productos_en_liquidacion SET id_anexo = 156 WHERE id_producto_en_liquidacion = 44;
-- PEL 43 (prod 151, FACTURA, cant 6): 2 anexos -> 156
UPDATE productos_en_liquidacion SET id_anexo = 156 WHERE id_producto_en_liquidacion = 43;
-- PEL 42 (prod 88, FACTURA): 1 anexo -> 123
UPDATE productos_en_liquidacion SET id_anexo = 123 WHERE id_producto_en_liquidacion = 42;
-- PEL 41 (prod 89, FACTURA): 1 anexo -> 70
UPDATE productos_en_liquidacion SET id_anexo = 70 WHERE id_producto_en_liquidacion = 41;

-- NOTA: Los siguientes registros no tienen anexo en item_anexo:
-- PEL 54 (prod 158, VENTA_EFECTIVO): NO hay anexo con este producto
--   Producto 158 no existe en ningún item_anexo
-- PEL 53 (prod 158, FACTURA): NO hay anexo con este producto
--   Producto 158 no existe en ningún item_anexo