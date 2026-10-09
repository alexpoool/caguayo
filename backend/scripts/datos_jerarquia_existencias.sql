-- Datos de jerarquía del reporte de EXISTENCIAS.
--
-- Mantenidos a petición del usuario para poder ver y probar el árbol de
-- dependencias en el filtro de /reportes?report=existencias.
--
-- Árbol:
--   1 Caguayo S.A            (raíz, dependencia del usuario admin)
--     ├─ 2 Sucursal Norte    (hijo directo)
--     │   └─ 4 Almacén Norte (NIETO: NO debe aparecer en la tabla al elegir la raíz)
--     └─ 3 Sucursal Sur      (hijo directo)
--
-- Stock de Iphone 17 (id_producto=1) repartido entre padre, hijo y nieto.
-- Idempotente: se puede ejecutar tantas veces como se quiera.
BEGIN;

INSERT INTO dependencia (id_dependencia, id_tipo_dependencia, codigo_padre, nombre, denominacion, direccion, telefono, base_datos)
SELECT * FROM (VALUES
  (2, 1, 1, 'Sucursal Norte', 'SN', 'Calle Norte 10', '555111', NULL::varchar),
  (3, 1, 1, 'Sucursal Sur',   'SS', 'Calle Sur 20',   '555222', NULL::varchar),
  (4, 2, 2, 'Almacén Norte',  'AN', 'Almacén 4',      '555333', NULL::varchar)
) AS v(id_dependencia, id_tipo_dependencia, codigo_padre, nombre, denominacion, direccion, telefono, base_datos)
WHERE NOT EXISTS (
  SELECT 1 FROM dependencia d WHERE d.id_dependencia = v.id_dependencia
);

INSERT INTO movimiento (id_tipo_movimiento, id_dependencia, id_producto, cantidad, fecha, estado)
SELECT * FROM (VALUES
  (1, 2, 1, 50,  now(), 'confirmado'),
  (1, 3, 1, 30,  now(), 'confirmado'),
  (1, 4, 1, 999, now(), 'confirmado')
) AS v(id_tipo_movimiento, id_dependencia, id_producto, cantidad, fecha, estado)
WHERE NOT EXISTS (
  SELECT 1 FROM movimiento m
  WHERE m.id_dependencia = v.id_dependencia
    AND m.id_producto = v.id_producto
    AND m.cantidad = v.cantidad
    AND m.estado = v.estado
);

COMMIT;
