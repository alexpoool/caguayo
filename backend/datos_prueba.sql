-- Insertar monedas
INSERT INTO moneda (nombre, denominacion, simbolo) VALUES
('Bolívar', 'Bolívares', 'Bs.'),
('Dolar', 'Dolares', '$'),
('Euro', 'Euros', '€');

-- Insertar categorías
INSERT INTO categorias (nombre, descripcion) VALUES
('Electronica', 'Productos electronicos'),
('Hogar', 'Articulos para el hogar'),
('Deportes', 'Equipamiento deportivo');

-- Insertar subcategorías (asumiendo categorías con IDs 1, 2, 3)
INSERT INTO subcategorias (id_categoria, nombre, descripcion) VALUES
(1, 'Smartphones', 'Telefonos inteligentes'),
(1, 'Laptops', 'Computadoras portatiles'),
(1, 'Accesorios PC', 'Teclados, mouse, etc'),
(2, 'Muebles', 'Sillas, mesas, estanterias'),
(2, 'Decoracion', 'Cuadros, lamparas, adornos'),
(3, 'Fitness', 'Pesas, colchonetas, etc'),
(3, 'Deportes', 'Bicicletas, pelotas, raquetas');

-- Insertar productos
INSERT INTO productos (id_subcategoria, nombre, descripcion, moneda_compra, precio_compra, moneda_venta, precio_venta, precio_minimo, stock) VALUES
(1, 'iPhone 15 Pro', 'Smartphone Apple', 2, 800, 2, 999, 950, 50),
(1, 'Samsung S24', 'Smartphone Samsung', 2, 700, 2, 899, 850, 45),
(1, 'Xiaomi 14', 'Smartphone Xiaomi', 2, 400, 2, 599, 550, 60),
(2, 'MacBook Pro 16', 'Laptop Apple', 2, 2000, 2, 2499, 2400, 20),
(2, 'Dell XPS 15', 'Laptop Dell', 2, 1200, 2, 1599, 1500, 30),
(2, 'Lenovo ThinkPad', 'Laptop Lenovo', 2, 900, 2, 1199, 1100, 25),
(3, 'Teclado Mecanico', 'Teclado gaming RGB', 2, 80, 2, 149, 129, 100),
(3, 'Mouse Logitech', 'Mouse inalambrico', 2, 40, 2, 79, 69, 150),
(4, 'Silla Ergonomica', 'Silla de oficina', 2, 150, 2, 299, 249, 40),
(4, 'Escritorio', 'Escritorio de madera', 2, 200, 2, 399, 349, 35),
(5, 'Lampara LED', 'Lampara de escritorio', 2, 25, 2, 59, 49, 80),
(6, 'Mancuernas 10kg', 'Set de mancuernas', 2, 30, 2, 69, 59, 60),
(7, 'Bicicleta MTB', 'Bicicleta montaña', 2, 300, 2, 599, 549, 15),
(7, 'Pelota Futbol', 'Pelota de futbol', 2, 15, 2, 39, 34, 100),
(7, 'Raqueta Tenis', 'Raqueta profesional', 2, 80, 2, 179, 159, 25);
