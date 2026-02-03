-- Datos de prueba para el sistema de inventario

-- 1. Monedas
INSERT INTO moneda (nombre, denominacion, simbolo) VALUES
('Dólar Americano', 'Dólar Estadounidense', 'USD'),
('Euro', 'Euro de la Unión Europea', 'EUR'),
('Peso Mexicano', 'Peso Mexicano', 'MXN'),
('Peso Colombiano', 'Peso Colombiano', 'COP');

-- 2. Tipo Movimiento
INSERT INTO tipo_movimiento (tipo, factor) VALUES
('AJUSTE', 1),
('MERMA', -1),
('DONACION', -1),
('RECEPCION', 1),
('DEVOLUCION', 1);

-- 3. Tipo Dependencia
INSERT INTO tipo_dependencia (nombre, descripcion) VALUES
('Sucursal', 'Punto de venta físico'),
('Almacén Central', 'Almacenamiento principal'),
('Tienda Online', 'Ventas por internet'),
('Depósito', 'Almacenamiento temporal');

-- 4. Datos Generales Dependencia
INSERT INTO datos_generales_dependencia (direccion, telefono, email) VALUES
('Calle Principal #123, Ciudad', '+1-555-0101', 'sucursal1@ejemplo.com'),
('Avenida Central #456, Ciudad', '+1-555-0102', 'almacen@ejemplo.com'),
('Plaza Digital #789, Ciudad', '+1-555-0103', 'online@ejemplo.com'),
('Zona Industrial #101, Ciudad', '+1-555-0104', 'deposito@ejemplo.com');

-- 5. Dependencia
INSERT INTO dependencia (id_tipo_dependencia, id_datos_generales, nombre) VALUES
(1, 1, 'Sucursal Norte'),
(2, 2, 'Almacén Principal'),
(3, 3, 'Tienda Virtual'),
(4, 4, 'Depósito Sur');

-- 6. Anexos (para transacciones)
INSERT INTO anexo (id_anexo) VALUES
(1),
(2),
(3),
(4),
(5);

-- 7. Transacciones
INSERT INTO transaccion (id_transaccion) VALUES
(1),
(2),
(3),
(4),
(5);

-- 8. Liquidaciones
INSERT INTO liquidacion (id_liquidacion) VALUES
(1),
(2);

-- 9. Categorías
INSERT INTO categorias (nombre, descripcion) VALUES
('Electrónica', 'Dispositivos electrónicos y accesorios'),
('Ropa y Accesorios', 'Vestimenta y complementos'),
('Hogar y Jardín', 'Artículos para el hogar y jardinería'),
('Deportes y Aire Libre', 'Equipamiento deportivo y actividades al aire libre'),
('Libros y Papelería', 'Material de lectura y oficina'),
('Juguetes y Juegos', 'Juguetes para niños y adultos'),
('Salud y Belleza', 'Productos de cuidado personal'),
('Alimentos y Bebidas', 'Comestibles y bebidas');

-- 10. Subcategorías
INSERT INTO subcategorias (id_categoria, nombre, descripcion) VALUES
-- Electrónica
(1, 'Smartphones', 'Teléfonos inteligentes'),
(1, 'Laptops', 'Computadoras portátiles'),
(1, 'Tablets', 'Tablets y accesorios'),
(1, 'Audio', 'Auriculares y bocinas'),
(1, 'Cámaras', 'Fotografía y video'),
-- Ropa y Accesorios
(2, 'Ropa Hombre', 'Vestimenta masculina'),
(2, 'Ropa Mujer', 'Vestimenta femenina'),
(2, 'Calzado', 'Zapatos y botas'),
(2, 'Accesorios', 'Bolsos, relojes y joyas'),
-- Hogar y Jardín
(3, 'Muebles', 'Sofás, mesas y sillas'),
(3, 'Electrodomésticos', 'Neveras, lavadoras, etc.'),
(3, 'Cocina', 'Utensilios y pequeños electrodomésticos'),
(3, 'Jardinería', 'Herramientas y plantas'),
-- Deportes y Aire Libre
(4, 'Fitness', 'Equipamiento para gimnasio'),
(4, 'Ciclismo', 'Bicicletas y accesorios'),
(4, 'Camping', 'Carpas y equipo de acampada'),
(4, 'Deportes Acuáticos', 'Natación y deportes acuáticos'),
-- Libros y Papelería
(5, 'Ficción', 'Novelas y cuentos'),
(5, 'No Ficción', 'Libros educativos y técnicos'),
(5, 'Oficina', 'Material de oficina'),
(5, 'Arte y Manualidades', 'Material creativo'),
-- Juguetes y Juegos
(6, 'Juguetes Educativos', 'Juguetes para aprender'),
(6, 'Videojuegos', 'Consolas y juegos'),
(6, 'Juegos de Mesa', 'Juegos familiares y de estrategia'),
(6, 'Construcción', 'Legos y bloques de construcción'),
-- Salud y Belleza
(7, 'Cuidado Facial', 'Cremas y limpiadores faciales'),
(7, 'Cuidado Corporal', 'Lociones y jabones'),
(7, 'Maquillaje', 'Cosméticos y maquillaje'),
(7, 'Suplementos', 'Vitaminas y suplementos dietéticos'),
-- Alimentos y Bebidas
(8, 'Bebidas', 'Refrescos, jugos y agua'),
(8, 'Snacks', 'Papitas, galletas y dulces'),
(8, 'Productos Orgánicos', 'Alimentos naturales y orgánicos'),
(8, 'Café y Té', 'Granos de café y hojas de té');

-- 11. Productos (ejemplo)
INSERT INTO productos (id_subcategoria, nombre, descripcion, moneda_compra, precio_compra, moneda_venta, precio_venta, precio_minimo) VALUES
-- Smartphones
(1, 'iPhone 15 Pro', 'Último modelo de iPhone con cámara profesional', 1, 999.99, 1, 1299.99, 1199.99),
(1, 'Samsung Galaxy S24', 'Flagship de Samsung con pantalla AMOLED', 1, 799.99, 1, 999.99, 899.99),
(1, 'Google Pixel 8', 'Teléfono Google con IA integrada', 1, 699.99, 1, 899.99, 799.99),
-- Laptops
(2, 'MacBook Air M2', 'Ultrabook ligero con chip M2', 1, 999.99, 1, 1299.99, 1199.99),
(2, 'Dell XPS 13', 'Laptop ultraportátil de 13 pulgadas', 1, 899.99, 1, 1099.99, 999.99),
(2, 'Lenovo ThinkPad X1', 'Laptop empresarial robusta', 1, 1299.99, 1, 1599.99, 1499.99),
-- Tablets
(3, 'iPad Pro 12.9', 'Tableta profesional con chip M2', 1, 899.99, 1, 1099.99, 999.99),
(3, 'Samsung Galaxy Tab S9', 'Tableta Android premium', 1, 699.99, 1, 899.99, 799.99),
-- Audio
(4, 'AirPods Pro', 'Auriculares inalámbricos con cancelación de ruido', 1, 199.99, 1, 249.99, 229.99),
(4, 'Sony WH-1000XM5', 'Auriculares over-ear premium', 1, 299.99, 1, 399.99, 349.99),
(4, 'JBL Charge 5', 'Bocina portátil resistente al agua', 1, 89.99, 1, 129.99, 109.99),
-- Ropa Hombre
(6, 'Camiseta Nike Dry Fit', 'Camiseta deportiva transpirable', 1, 19.99, 1, 29.99, 24.99),
(6, 'Jeans Levi''s 501', 'Jeans clásicos de corte recto', 1, 49.99, 1, 79.99, 69.99),
(6, 'Chaqueta Adidas', 'Chaqueta deportiva con capucha', 1, 39.99, 1, 59.99, 49.99),
-- Ropa Mujer
(7, 'Vestido Floral', 'Vestido estampado de verano', 1, 29.99, 1, 49.99, 39.99),
(7, 'Blusa Silk', 'Blusa elegante de seda sintética', 1, 34.99, 1, 54.99, 44.99),
(7, 'Falda Midi', 'Falda de longitud media', 1, 24.99, 1, 39.99, 34.99),
-- Muebles
(11, 'Sofá de 3 Plazas', 'Sofá cómodo con tapizado resistente', 1, 299.99, 1, 499.99, 449.99),
(11, 'Mesa de Comedor 6 Personas', 'Mesa extensible de madera', 1, 199.99, 1, 349.99, 299.99),
(11, 'Silla Ergonómica', 'Silla de oficina con apoyo lumbar', 1, 149.99, 1, 249.99, 199.99),
-- Electrodomésticos
(12, 'Nevera Samsung', 'Nevera con dispensador de agua', 1, 699.99, 1, 999.99, 899.99),
(12, 'Lavadora LG', 'Lavadora de carga frontal 9kg', 1, 499.99, 1, 699.99, 649.99),
(12, 'Horno Eléctrico', 'Horno con función de convección', 1, 199.99, 1, 299.99, 249.99),
-- Deportes
(15, 'Banda de Resistencia', 'Banda elástica para ejercicios', 1, 9.99, 1, 19.99, 14.99),
(15, 'Set de Mancuernas', 'Juego de mancuernas ajustables', 1, 49.99, 1, 79.99, 69.99),
(15, 'Esterilla de Yoga', 'Esterilla antideslizante 6mm', 1, 19.99, 1, 29.99, 24.99),
-- Libros
(18, '1984 - George Orwell', 'Novela distópica clásica', 1, 9.99, 1, 14.99, 12.99),
(18, 'Cien Años de Soledad', 'Obra maestra del realismo mágico', 1, 12.99, 1, 19.99, 16.99),
(18, 'El Principito', 'Clásico infantil y adulto', 1, 7.99, 1, 11.99, 9.99),
-- Juguetes
(22, 'LEGO Creator Expert', 'Set LEGO para adultos', 1, 79.99, 1, 119.99, 99.99),
(22, 'Puzzle 1000 Piezas', 'Puzzle de alta calidad', 1, 9.99, 1, 19.99, 14.99),
(22, 'Monopoly Edición Especial', 'Juego de mesa clásico', 1, 19.99, 1, 34.99, 29.99),
-- Salud y Belleza
(25, 'Crema Facial Hidratante', 'Crema para todo tipo de piel', 1, 14.99, 1, 24.99, 19.99),
(25, 'Protector Solar SPF 50', 'Protector solar de amplio espectro', 1, 12.99, 1, 19.99, 16.99),
(25, 'Champú y Acondicionador', 'Set para cabello dañado', 1, 16.99, 1, 29.99, 24.99),
-- Alimentos
(29, 'Café Orgánico 1kg', 'Granos de café tostado orgánico', 1, 19.99, 1, 29.99, 24.99),
(29, 'Té Verde Matcha', 'Polvo de té verde japonés', 1, 14.99, 1, 24.99, 19.99),
(29, 'Mix de Frutos Secos', 'Snack saludable de frutos secos', 1, 6.99, 1, 12.99, 9.99);

-- 12. Ventas (ejemplo)
INSERT INTO ventas (id_anexo, id_producto, codigo, cantidad, moneda_venta, monto, id_transaccion, id_liquidacion, observacion, confirmacion, fecha_registro) VALUES
(1, 1, 'VENTA-001', 2, 1, 2599.98, 1, 1, 'Venta en sucursal norte', true, '2024-01-15 10:30:00'),
(2, 2, 'VENTA-002', 1, 1, 999.99, 2, 1, 'Venta online con envío', true, '2024-01-15 11:45:00'),
(3, 3, 'VENTA-003', 3, 1, 2699.97, 3, NULL, 'Venta mayorista', true, '2024-01-15 14:20:00'),
(1, 10, 'VENTA-004', 1, 1, 79.99, 4, 2, 'Venta en sucursal', true, '2024-01-16 09:15:00'),
(2, 15, 'VENTA-005', 2, 1, 999.98, 5, 2, 'Venta telefónica', true, '2024-01-16 13:30:00'),
(1, 20, 'VENTA-006', 1, 1, 499.99, 1, NULL, 'Venta showroom', true, '2024-01-16 16:45:00'),
(3, 25, 'VENTA-007', 5, 1, 124.95, 2, NULL, 'Venta online', true, '2024-01-17 10:00:00'),
(1, 30, 'VENTA-008', 1, 1, 34.99, 3, 2, 'Venta en efectivo', true, '2024-01-17 11:30:00'),
(2, 5, 'VENTA-009', 2, 1, 2499.98, 4, 2, 'Venta con tarjetá', true, '2024-01-17 15:00:00'),
(1, 35, 'VENTA-010', 3, 1, 89.97, 5, NULL, 'Venta surtidor', true, '2024-01-18 12:00:00');

-- 13. Movimientos (ejemplo)
INSERT INTO movimiento (id_tipo_movimiento, id_dependencia, id_anexo, id_producto, cantidad, fecha, observacion, id_liquidacion, confirmacion) VALUES
(4, 2, 1, 1, 10, '2024-01-10 09:00:00', 'Recepción de stock nuevo', NULL, true),
(2, 1, 2, 2, -2, '2024-01-12 14:30:00', 'Merma por devolución', 1, true),
(3, 3, 3, 3, -5, '2024-01-13 10:15:00', 'Donación a fundación', NULL, true),
(1, 1, 4, 10, 50, '2024-01-11 11:00:00', 'Ajuste de inventario', NULL, true),
(5, 2, 5, 15, -3, '2024-01-14 16:45:00', 'Devolución de cliente', 2, true),
(4, 3, 1, 20, 25, '2024-01-09 08:30:00', 'Recepción mensual', NULL, true),
(2, 1, 2, 25, -1, '2024-01-15 13:20:00', 'Producto dañado', 2, true),
(1, 2, 3, 30, 15, '2024-01-16 10:00:00', 'Ajuste por conteo', NULL, true),
(3, 3, 4, 35, -10, '2024-01-17 09:30:00', 'Donación evento', NULL, true),
(5, 1, 5, 38, -2, '2024-01-18 14:00:00', 'Devolución proveedor', 2, true);