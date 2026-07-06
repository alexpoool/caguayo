-- =====================================================
-- SEED REALISTA - CAGUAYO
-- Datos coherentes para testear todos los flujos de negocio
-- Idempotente: se puede re-ejecutar sin duplicar
-- =====================================================
-- Ejecutar con:
--   psql -U solji -d caguayo -f backend/sql/seed_realista.sql
-- =====================================================

BEGIN;

-- =====================================================
-- 1. MONEDAS ADICIONALES (CUP, MLC)
-- =====================================================
INSERT INTO moneda (nombre, denominacion, simbolo)
SELECT 'Peso Cubano', 'Peso Cubano (CUP)', 'CUP'
WHERE NOT EXISTS (SELECT 1 FROM moneda WHERE simbolo = 'CUP');

INSERT INTO moneda (nombre, denominacion, simbolo)
SELECT 'Peso Cubano Convertible', 'Moneda Libremente Convertible (MLC)', 'MLC'
WHERE NOT EXISTS (SELECT 1 FROM moneda WHERE simbolo = 'MLC');

-- =====================================================
-- 2. CATEGORÍAS Y SUBCATEGORÍAS
-- =====================================================
INSERT INTO categorias (nombre, descripcion)
SELECT 'Suministros de Oficina', 'Material de oficina, papelería y consumibles'
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'Suministros de Oficina');

INSERT INTO categorias (nombre, descripcion)
SELECT 'Equipamiento Electrónico', 'Equipos de cómputo, audio, video y accesorios'
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'Equipamiento Electrónico');

INSERT INTO categorias (nombre, descripcion)
SELECT 'Productos Artesanales', 'Artesanía, cerámica, textiles y productos hechos a mano'
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'Productos Artesanales');

INSERT INTO categorias (nombre, descripcion)
SELECT 'Materiales de Arte', 'Pinturas, lienzos, pinceles y materiales para artistas'
WHERE NOT EXISTS (SELECT 1 FROM categorias WHERE nombre = 'Materiales de Arte');

-- Subcategorías
DO $$
DECLARE
    cat_oficina INT;
    cat_elec INT;
    cat_artesanal INT;
    cat_arte INT;
BEGIN
    SELECT id_categoria INTO cat_oficina FROM categorias WHERE nombre = 'Suministros de Oficina';
    SELECT id_categoria INTO cat_elec FROM categorias WHERE nombre = 'Equipamiento Electrónico';
    SELECT id_categoria INTO cat_artesanal FROM categorias WHERE nombre = 'Productos Artesanales';
    SELECT id_categoria INTO cat_arte FROM categorias WHERE nombre = 'Materiales de Arte';

    INSERT INTO subcategorias (id_categoria, nombre, descripcion)
    SELECT cat_oficina, 'Papelería', 'Papel, carpetas, sobres y material de escritura'
    WHERE NOT EXISTS (SELECT 1 FROM subcategorias WHERE id_categoria = cat_oficina AND nombre = 'Papelería');

    INSERT INTO subcategorias (id_categoria, nombre, descripcion)
    SELECT cat_oficina, 'Tintas y Tóneres', 'Cartuchos de tinta, tóneres y consumibles de impresión'
    WHERE NOT EXISTS (SELECT 1 FROM subcategorias WHERE id_categoria = cat_oficina AND nombre = 'Tintas y Tóneres');

    INSERT INTO subcategorias (id_categoria, nombre, descripcion)
    SELECT cat_elec, 'Computadoras', 'Laptops, desktops y componentes'
    WHERE NOT EXISTS (SELECT 1 FROM subcategorias WHERE id_categoria = cat_elec AND nombre = 'Computadoras');

    INSERT INTO subcategorias (id_categoria, nombre, descripcion)
    SELECT cat_elec, 'Equipos de Audio', 'Parlantes, micrófonos y equipos de sonido'
    WHERE NOT EXISTS (SELECT 1 FROM subcategorias WHERE id_categoria = cat_elec AND nombre = 'Equipos de Audio');

    INSERT INTO subcategorias (id_categoria, nombre, descripcion)
    SELECT cat_elec, 'Cámaras y Video', 'Cámaras fotográficas, de video y accesorios'
    WHERE NOT EXISTS (SELECT 1 FROM subcategorias WHERE id_categoria = cat_elec AND nombre = 'Cámaras y Video');

    INSERT INTO subcategorias (id_categoria, nombre, descripcion)
    SELECT cat_artesanal, 'Cerámica', 'Piezas de cerámica artesanal y utilitaria'
    WHERE NOT EXISTS (SELECT 1 FROM subcategorias WHERE id_categoria = cat_artesanal AND nombre = 'Cerámica');

    INSERT INTO subcategorias (id_categoria, nombre, descripcion)
    SELECT cat_artesanal, 'Textiles', 'Tejidos, bordados y confecciones artesanales'
    WHERE NOT EXISTS (SELECT 1 FROM subcategorias WHERE id_categoria = cat_artesanal AND nombre = 'Textiles');

    INSERT INTO subcategorias (id_categoria, nombre, descripcion)
    SELECT cat_arte, 'Pinturas y Barnices', 'Pinturas acrílicas, óleos, barnices y solventes'
    WHERE NOT EXISTS (SELECT 1 FROM subcategorias WHERE id_categoria = cat_arte AND nombre = 'Pinturas y Barnices');

    INSERT INTO subcategorias (id_categoria, nombre, descripcion)
    SELECT cat_arte, 'Lienzos y Soportes', 'Lienzos, bastidores, papeles especiales para arte'
    WHERE NOT EXISTS (SELECT 1 FROM subcategorias WHERE id_categoria = cat_arte AND nombre = 'Lienzos y Soportes');

    INSERT INTO subcategorias (id_categoria, nombre, descripcion)
    SELECT cat_arte, 'Pinceles y Herramientas', 'Pinceles, espátulas y herramientas de pintura'
    WHERE NOT EXISTS (SELECT 1 FROM subcategorias WHERE id_categoria = cat_arte AND nombre = 'Pinceles y Herramientas');
END $$;

-- =====================================================
-- 3. PRODUCTOS (20 productos realistas)
-- =====================================================
DO $$
DECLARE
    sub_papeleria INT; sub_tintas INT; sub_compu INT; sub_audio INT; sub_camara INT;
    sub_ceramica INT; sub_textil INT; sub_pinturas INT; sub_lienzos INT; sub_pinceles INT;
    mon_usd INT; mon_eur INT;
BEGIN
    SELECT id_subcategoria INTO sub_papeleria FROM subcategorias WHERE nombre = 'Papelería';
    SELECT id_subcategoria INTO sub_tintas FROM subcategorias WHERE nombre = 'Tintas y Tóneres';
    SELECT id_subcategoria INTO sub_compu FROM subcategorias WHERE nombre = 'Computadoras';
    SELECT id_subcategoria INTO sub_audio FROM subcategorias WHERE nombre = 'Equipos de Audio';
    SELECT id_subcategoria INTO sub_camara FROM subcategorias WHERE nombre = 'Cámaras y Video';
    SELECT id_subcategoria INTO sub_ceramica FROM subcategorias WHERE nombre = 'Cerámica';
    SELECT id_subcategoria INTO sub_textil FROM subcategorias WHERE nombre = 'Textiles';
    SELECT id_subcategoria INTO sub_pinturas FROM subcategorias WHERE nombre = 'Pinturas y Barnices';
    SELECT id_subcategoria INTO sub_lienzos FROM subcategorias WHERE nombre = 'Lienzos y Soportes';
    SELECT id_subcategoria INTO sub_pinceles FROM subcategorias WHERE nombre = 'Pinceles y Herramientas';
    SELECT id_moneda INTO mon_usd FROM moneda WHERE simbolo = 'USD';
    SELECT id_moneda INTO mon_eur FROM moneda WHERE simbolo = 'EUR';

    -- Papelería
    INSERT INTO productos (codigo, id_subcategoria, nombre, descripcion, moneda_compra, precio_compra, moneda_venta, precio_venta, precio_minimo)
    SELECT 'PAP-001', sub_papeleria, 'Resma de papel A4', 'Resma de 500 hojas, 75g/m²', mon_usd, 3.50, mon_usd, 4.55, 3.15
    WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'PAP-001');

    INSERT INTO productos (codigo, id_subcategoria, nombre, descripcion, moneda_compra, precio_compra, moneda_venta, precio_venta, precio_minimo)
    SELECT 'PAP-002', sub_papeleria, 'Carpetas manila tamaño oficio', 'Paquete de 50 carpetas', mon_usd, 5.00, mon_usd, 6.50, 4.50
    WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'PAP-002');

    -- Tintas
    INSERT INTO productos (codigo, id_subcategoria, nombre, descripcion, moneda_compra, precio_compra, moneda_venta, precio_venta, precio_minimo)
    SELECT 'TIN-001', sub_tintas, 'Tóner HP 26A original', 'Tóner negro para HP LaserJet', mon_usd, 45.00, mon_usd, 58.50, 40.50
    WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'TIN-001');

    INSERT INTO productos (codigo, id_subcategoria, nombre, descripcion, moneda_compra, precio_compra, moneda_venta, precio_venta, precio_minimo)
    SELECT 'TIN-002', sub_tintas, 'Cartucho de tinta Epson 664', 'Tinta negra para impresora Epson', mon_usd, 12.00, mon_usd, 15.60, 10.80
    WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'TIN-002');

    -- Computadoras
    INSERT INTO productos (codigo, id_subcategoria, nombre, descripcion, moneda_compra, precio_compra, moneda_venta, precio_venta, precio_minimo)
    SELECT 'COM-001', sub_compu, 'Laptop Lenovo ThinkPad E14', 'Intel Core i5, 16GB RAM, 512GB SSD', mon_usd, 720.00, mon_usd, 936.00, 648.00
    WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'COM-001');

    INSERT INTO productos (codigo, id_subcategoria, nombre, descripcion, moneda_compra, precio_compra, moneda_venta, precio_venta, precio_minimo)
    SELECT 'COM-002', sub_compu, 'Disco Duro Externo 2TB', 'Western Digital, USB 3.0, portátil', mon_usd, 65.00, mon_usd, 84.50, 58.50
    WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'COM-002');

    -- Audio
    INSERT INTO productos (codigo, id_subcategoria, nombre, descripcion, moneda_compra, precio_compra, moneda_venta, precio_venta, precio_minimo)
    SELECT 'AUD-001', sub_audio, 'Micrófono Shure SM58', 'Micrófono dinámico profesional para voz', mon_usd, 99.00, mon_usd, 128.70, 89.10
    WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'AUD-001');

    INSERT INTO productos (codigo, id_subcategoria, nombre, descripcion, moneda_compra, precio_compra, moneda_venta, precio_venta, precio_minimo)
    SELECT 'AUD-002', sub_audio, 'Parlante JBL PartyBox 110', 'Parlante bluetooth 160W con luces LED', mon_usd, 250.00, mon_usd, 325.00, 225.00
    WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'AUD-002');

    -- Cámaras
    INSERT INTO productos (codigo, id_subcategoria, nombre, descripcion, moneda_compra, precio_compra, moneda_venta, precio_venta, precio_minimo)
    SELECT 'CAM-001', sub_camara, 'Cámara Canon EOS Rebel T7', 'DSLR 24.1MP con lente 18-55mm', mon_usd, 480.00, mon_usd, 624.00, 432.00
    WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'CAM-001');

    INSERT INTO productos (codigo, id_subcategoria, nombre, descripcion, moneda_compra, precio_compra, moneda_venta, precio_venta, precio_minimo)
    SELECT 'CAM-002', sub_camara, 'Trípode Manfrotto Compact', 'Trípode ligero de aluminio para cámara', mon_eur, 55.00, mon_eur, 71.50, 49.50
    WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'CAM-002');

    -- Cerámica (productos artesanales - precio en EUR también)
    INSERT INTO productos (codigo, id_subcategoria, nombre, descripcion, moneda_compra, precio_compra, moneda_venta, precio_venta, precio_minimo)
    SELECT 'CER-001', sub_ceramica, 'Juego de tazas artesanales (6pz)', 'Tazas de cerámica pintadas a mano, 250ml', mon_eur, 18.00, mon_eur, 23.40, 16.20
    WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'CER-001');

    INSERT INTO productos (codigo, id_subcategoria, nombre, descripcion, moneda_compra, precio_compra, moneda_venta, precio_venta, precio_minimo)
    SELECT 'CER-002', sub_ceramica, 'Jarrón decorativo grande', 'Cerámica esmaltada, 35cm alto, diseño exclusivo', mon_eur, 35.00, mon_eur, 45.50, 31.50
    WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'CER-002');

    -- Textiles
    INSERT INTO productos (codigo, id_subcategoria, nombre, descripcion, moneda_compra, precio_compra, moneda_venta, precio_venta, precio_minimo)
    SELECT 'TEX-001', sub_textil, 'Mantel bordado a mano', 'Mantel de lino 150x200cm, bordado tradicional', mon_eur, 28.00, mon_eur, 36.40, 25.20
    WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'TEX-001');

    INSERT INTO productos (codigo, id_subcategoria, nombre, descripcion, moneda_compra, precio_compra, moneda_venta, precio_venta, precio_minimo)
    SELECT 'TEX-002', sub_textil, 'Camiseta de algodón estampada', 'Diseño exclusivo, serigrafía artesanal', mon_usd, 8.00, mon_usd, 10.40, 7.20
    WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'TEX-002');

    -- Pinturas
    INSERT INTO productos (codigo, id_subcategoria, nombre, descripcion, moneda_compra, precio_compra, moneda_venta, precio_venta, precio_minimo)
    SELECT 'PIN-001', sub_pinturas, 'Set de pinturas acrílicas 24 colores', 'Tubos 22ml, colores vibrantes, no tóxicas', mon_usd, 22.00, mon_usd, 28.60, 19.80
    WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'PIN-001');

    INSERT INTO productos (codigo, id_subcategoria, nombre, descripcion, moneda_compra, precio_compra, moneda_venta, precio_venta, precio_minimo)
    SELECT 'PIN-002', sub_pinturas, 'Óleo profesional set 12 colores', 'Tubos 40ml, pigmentos de alta calidad', mon_eur, 38.00, mon_eur, 49.40, 34.20
    WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'PIN-002');

    -- Lienzos
    INSERT INTO productos (codigo, id_subcategoria, nombre, descripcion, moneda_compra, precio_compra, moneda_venta, precio_venta, precio_minimo)
    SELECT 'LIE-001', sub_lienzos, 'Lienzo entelado 60x80cm', 'Bastidor de madera, 100% algodón, triple imprimación', mon_usd, 12.00, mon_usd, 15.60, 10.80
    WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'LIE-001');

    INSERT INTO productos (codigo, id_subcategoria, nombre, descripcion, moneda_compra, precio_compra, moneda_venta, precio_venta, precio_minimo)
    SELECT 'LIE-002', sub_lienzos, 'Block de papel acuarela A4', '20 hojas, 300g/m², prensado en frío', mon_usd, 8.00, mon_usd, 10.40, 7.20
    WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'LIE-002');

    -- Pinceles
    INSERT INTO productos (codigo, id_subcategoria, nombre, descripcion, moneda_compra, precio_compra, moneda_venta, precio_venta, precio_minimo)
    SELECT 'PZC-001', sub_pinceles, 'Set de pinceles profesionales 15pz', 'Cerdas sintéticas, mangos de madera, varios formatos', mon_usd, 25.00, mon_usd, 32.50, 22.50
    WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'PZC-001');

    INSERT INTO productos (codigo, id_subcategoria, nombre, descripcion, moneda_compra, precio_compra, moneda_venta, precio_venta, precio_minimo)
    SELECT 'PZC-002', sub_pinceles, 'Paleta de mezclas profesional', 'Paleta de madera barnizada, 30x40cm, orificio para pulgar', mon_usd, 6.00, mon_usd, 7.80, 5.40
    WHERE NOT EXISTS (SELECT 1 FROM productos WHERE codigo = 'PZC-002');

END $$;

-- =====================================================
-- 4. CLIENTES (10 clientes realistas)
-- =====================================================

-- 4.1 Personas Naturales (creadores/artistas) - id_cliente comenzando desde 1 (si la tabla está vacía)
DO $$
DECLARE
    v_prov_habana INT; v_mun_playa INT; v_mun_plaza INT; v_mun_habana_vieja INT;
    v_mun_matanzas INT; v_mun_santiago INT; v_mun_camaguey INT;
    next_id INT;
BEGIN
    SELECT id_provincia INTO v_prov_habana FROM provincia WHERE nombre = 'La Habana';
    SELECT id_municipio INTO v_mun_playa FROM municipio WHERE nombre = 'Playa' AND id_provincia = v_prov_habana;
    SELECT id_municipio INTO v_mun_plaza FROM municipio WHERE nombre = 'Plaza de la Revolución' AND id_provincia = v_prov_habana;
    SELECT id_municipio INTO v_mun_habana_vieja FROM municipio WHERE nombre = 'La Habana Vieja' AND id_provincia = v_prov_habana;
    SELECT id_municipio INTO v_mun_matanzas FROM municipio WHERE nombre = 'Matanzas' AND id_provincia = (SELECT id_provincia FROM provincia WHERE nombre = 'Matanzas');
    SELECT id_municipio INTO v_mun_santiago FROM municipio WHERE nombre = 'Santiago de Cuba' AND id_provincia = (SELECT id_provincia FROM provincia WHERE nombre = 'Santiago de Cuba');
    SELECT id_municipio INTO v_mun_camaguey FROM municipio WHERE nombre = 'Camagüey' AND id_provincia = (SELECT id_provincia FROM provincia WHERE nombre = 'Camagüey');

    -- Juan Carlos Pérez - artista plástico
    INSERT INTO clientes (nombre, tipo_persona, nit, codigo, direccion, tipo_relacion, estado, fecha_registro, activo)
    SELECT 'Juan Carlos Pérez García', 'NATURAL', 'NAT-900101-001', 'CLI-JCP-001', 'Calle 42 #305, Miramar, Playa, La Habana', 'PROVEEDOR', 'ACTIVO', CURRENT_DATE, true
    WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE nit = 'NAT-900101-001')
    RETURNING id_cliente INTO next_id;
    IF next_id IS NOT NULL THEN
        INSERT INTO clientes_persona_natural (id_cliente, nombre, primer_apellido, segundo_apellido, carnet_identidad, codigo_expediente, numero_registro, catalogo, es_trabajador, en_baja)
        VALUES (next_id, 'Juan Carlos', 'Pérez', 'García', '90010112345', 'EXP-9001', 'REG-CREA-001', 'Artes Plásticas', FALSE, FALSE);
        INSERT INTO cuenta (id_cliente, titular, banco, sucursal, numero_cuenta, direccion, id_moneda)
        VALUES (next_id, 'Juan Carlos Pérez García', 'Banco Metropolitano', 305, '0598765432101234', 'Miramar, Playa, La Habana', (SELECT id_moneda FROM moneda WHERE simbolo = 'USD'));
    END IF;

    -- María Elena Rodríguez - pintora
    INSERT INTO clientes (nombre, tipo_persona, nit, codigo, direccion, tipo_relacion, estado, fecha_registro, activo)
    SELECT 'María Elena Rodríguez Torres', 'NATURAL', 'NAT-850615-002', 'CLI-MER-002', 'Calle Línea #508 e/ E y F, Vedado, Plaza, La Habana', 'PROVEEDOR', 'ACTIVO', CURRENT_DATE, true
    WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE nit = 'NAT-850615-002')
    RETURNING id_cliente INTO next_id;
    IF next_id IS NOT NULL THEN
        INSERT INTO clientes_persona_natural (id_cliente, nombre, primer_apellido, segundo_apellido, carnet_identidad, codigo_expediente, numero_registro, catalogo, es_trabajador, en_baja)
        VALUES (next_id, 'María Elena', 'Rodríguez', 'Torres', '85061523456', 'EXP-8506', 'REG-CREA-002', 'Artes Plásticas', FALSE, FALSE);
        INSERT INTO cuenta (id_cliente, titular, banco, sucursal, numero_cuenta, direccion, id_moneda)
        VALUES (next_id, 'María Elena Rodríguez Torres', 'Banco Popular de Ahorro', 402, '0598765432105678', 'Vedado, Plaza, La Habana', (SELECT id_moneda FROM moneda WHERE simbolo = 'EUR'));
    END IF;

    -- Pedro Luis González - escultor y ceramista
    INSERT INTO clientes (nombre, tipo_persona, nit, codigo, direccion, tipo_relacion, estado, fecha_registro, activo)
    SELECT 'Pedro Luis González Hernández', 'NATURAL', 'NAT-780320-003', 'CLI-PLG-003', 'Calle Independencia #125, Matanzas, Matanzas', 'PROVEEDOR', 'ACTIVO', CURRENT_DATE, true
    WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE nit = 'NAT-780320-003')
    RETURNING id_cliente INTO next_id;
    IF next_id IS NOT NULL THEN
        INSERT INTO clientes_persona_natural (id_cliente, nombre, primer_apellido, segundo_apellido, carnet_identidad, codigo_expediente, numero_registro, catalogo, es_trabajador, en_baja)
        VALUES (next_id, 'Pedro Luis', 'González', 'Hernández', '78032034567', 'EXP-7803', 'REG-CREA-003', 'Cerámica Artística', FALSE, FALSE);
        INSERT INTO cuenta (id_cliente, titular, banco, sucursal, numero_cuenta, direccion, id_moneda)
        VALUES (next_id, 'Pedro Luis González Hernández', 'Banco de Crédito y Comercio', 710, '0598765432109012', 'Matanzas, Matanzas', (SELECT id_moneda FROM moneda WHERE simbolo = 'EUR'));
    END IF;

    -- Ana Victoria Martínez - diseñadora textil
    INSERT INTO clientes (nombre, tipo_persona, nit, codigo, direccion, tipo_relacion, estado, fecha_registro, activo)
    SELECT 'Ana Victoria Martínez Silva', 'NATURAL', 'NAT-920810-004', 'CLI-AVM-004', 'Calle 10 #2015, Miramar, Playa, La Habana', 'PROVEEDOR', 'ACTIVO', CURRENT_DATE, true
    WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE nit = 'NAT-920810-004')
    RETURNING id_cliente INTO next_id;
    IF next_id IS NOT NULL THEN
        INSERT INTO clientes_persona_natural (id_cliente, nombre, primer_apellido, segundo_apellido, carnet_identidad, codigo_expediente, numero_registro, catalogo, es_trabajador, en_baja)
        VALUES (next_id, 'Ana Victoria', 'Martínez', 'Silva', '92081045678', 'EXP-9208', 'REG-CREA-004', 'Diseño Textil', FALSE, FALSE);
        INSERT INTO cuenta (id_cliente, titular, banco, sucursal, numero_cuenta, direccion, id_moneda)
        VALUES (next_id, 'Ana Victoria Martínez Silva', 'Banco Metropolitano', 305, '0598765432103456', 'Miramar, Playa, La Habana', (SELECT id_moneda FROM moneda WHERE simbolo = 'USD'));
    END IF;

    -- Roberto Carlos Díaz - fotógrafo
    INSERT INTO clientes (nombre, tipo_persona, nit, codigo, direccion, tipo_relacion, estado, fecha_registro, activo)
    SELECT 'Roberto Carlos Díaz Fernández', 'NATURAL', 'NAT-880405-005', 'CLI-RCD-005', 'Calle Heredia #308, Santiago de Cuba, Santiago de Cuba', 'PROVEEDOR', 'ACTIVO', CURRENT_DATE, true
    WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE nit = 'NAT-880405-005')
    RETURNING id_cliente INTO next_id;
    IF next_id IS NOT NULL THEN
        INSERT INTO clientes_persona_natural (id_cliente, nombre, primer_apellido, segundo_apellido, carnet_identidad, codigo_expediente, numero_registro, catalogo, es_trabajador, en_baja)
        VALUES (next_id, 'Roberto Carlos', 'Díaz', 'Fernández', '88040556789', 'EXP-8804', 'REG-CREA-005', 'Fotografía', FALSE, FALSE);
        INSERT INTO cuenta (id_cliente, titular, banco, sucursal, numero_cuenta, direccion, id_moneda)
        VALUES (next_id, 'Roberto Carlos Díaz Fernández', 'Banco Popular de Ahorro', 903, '0598765432107890', 'Santiago de Cuba, Santiago de Cuba', (SELECT id_moneda FROM moneda WHERE simbolo = 'USD'));
    END IF;

END $$;

-- 4.2 Personas Jurídicas
DO $$
DECLARE
    next_id INT;
BEGIN
    -- EGREM (Empresa de Grabaciones y Ediciones Musicales)
    INSERT INTO clientes (nombre, tipo_persona, nit, codigo, direccion, tipo_relacion, estado, id_provincia, id_municipio, fecha_registro, activo)
    SELECT 'EGREM', 'JURIDICA', 'JUR-EGREM-001', 'EGREM-001', 'Calle San Miguel #410, Centro Habana, La Habana', 'CLIENTE', 'ACTIVO',
           (SELECT id_provincia FROM provincia WHERE nombre = 'La Habana'),
           (SELECT id_municipio FROM municipio WHERE nombre = 'Centro Habana' AND id_provincia = (SELECT id_provincia FROM provincia WHERE nombre = 'La Habana')),
           CURRENT_DATE, true
    WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE nit = 'JUR-EGREM-001')
    RETURNING id_cliente INTO next_id;
    IF next_id IS NOT NULL THEN
        INSERT INTO clientes_persona_juridica (id_cliente, codigo_reup, id_tipo_entidad)
        VALUES (next_id, 'REUP-EGREM-001', (SELECT id_tipo_entidad FROM tipo_entidad WHERE nombre = 'OSDE'));
    END IF;

    -- Hotel Nacional de Cuba
    INSERT INTO clientes (nombre, tipo_persona, nit, codigo, direccion, tipo_relacion, estado, id_provincia, id_municipio, fecha_registro, activo)
    SELECT 'Hotel Nacional de Cuba', 'JURIDICA', 'JUR-HNAC-001', 'HNAC-001', 'Calle 21 y O, Vedado, Plaza, La Habana', 'CLIENTE', 'ACTIVO',
           (SELECT id_provincia FROM provincia WHERE nombre = 'La Habana'),
           (SELECT id_municipio FROM municipio WHERE nombre = 'Plaza de la Revolución' AND id_provincia = (SELECT id_provincia FROM provincia WHERE nombre = 'La Habana')),
           CURRENT_DATE, true
    WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE nit = 'JUR-HNAC-001')
    RETURNING id_cliente INTO next_id;
    IF next_id IS NOT NULL THEN
        INSERT INTO clientes_persona_juridica (id_cliente, codigo_reup, id_tipo_entidad)
        VALUES (next_id, 'REUP-HNAC-001', (SELECT id_tipo_entidad FROM tipo_entidad WHERE nombre = 'UEB'));
    END IF;

    -- Consejo Nacional de Artes Escénicas
    INSERT INTO clientes (nombre, tipo_persona, nit, codigo, direccion, tipo_relacion, estado, id_provincia, id_municipio, fecha_registro, activo)
    SELECT 'Consejo Nacional de Artes Escénicas', 'JURIDICA', 'JUR-CNAE-001', 'CNAE-001', 'Calle 4 #258 e/ 11 y 13, Vedado, Plaza, La Habana', 'CLIENTE', 'ACTIVO',
           (SELECT id_provincia FROM provincia WHERE nombre = 'La Habana'),
           (SELECT id_municipio FROM municipio WHERE nombre = 'Plaza de la Revolución' AND id_provincia = (SELECT id_provincia FROM provincia WHERE nombre = 'La Habana')),
           CURRENT_DATE, true
    WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE nit = 'JUR-CNAE-001')
    RETURNING id_cliente INTO next_id;
    IF next_id IS NOT NULL THEN
        INSERT INTO clientes_persona_juridica (id_cliente, codigo_reup, id_tipo_entidad)
        VALUES (next_id, 'REUP-CNAE-001', (SELECT id_tipo_entidad FROM tipo_entidad WHERE nombre = 'Empresas Presupuestadas'));
    END IF;

END $$;

-- 4.3 TCPs (Trabajador por Cuenta Propia)
DO $$
DECLARE
    next_id INT;
BEGIN
    -- Taller de Cerámica Artemisa
    INSERT INTO clientes (nombre, tipo_persona, nit, codigo, direccion, tipo_relacion, estado, fecha_registro, activo)
    SELECT 'Taller de Cerámica Artemisa', 'TCP', 'TCP-ART-001', 'TCP-ART-001', 'Calle 23 #405, Artemisa, Artemisa', 'PROVEEDOR', 'ACTIVO', CURRENT_DATE, true
    WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE nit = 'TCP-ART-001')
    RETURNING id_cliente INTO next_id;
    IF next_id IS NOT NULL THEN
        INSERT INTO cliente_tcp (id_cliente, nombre, primer_apellido, segundo_apellido, direccion, numero_registro_proyecto, fecha_aprobacion)
        VALUES (next_id, 'Luis Miguel', 'Valdés', 'Acosta', 'Calle 23 #405, Artemisa', 'PROY-ART-2020-001', '2020-06-15');
    END IF;

    -- Proyecto de Diseño Independiente
    INSERT INTO clientes (nombre, tipo_persona, nit, codigo, direccion, tipo_relacion, estado, fecha_registro, activo)
    SELECT 'Diseño Independiente Caribe', 'TCP', 'TCP-DIC-002', 'TCP-DIC-002', 'Avenida 5ta #6804, Miramar, Playa, La Habana', 'PROVEEDOR', 'ACTIVO', CURRENT_DATE, true
    WHERE NOT EXISTS (SELECT 1 FROM clientes WHERE nit = 'TCP-DIC-002')
    RETURNING id_cliente INTO next_id;
    IF next_id IS NOT NULL THEN
        INSERT INTO cliente_tcp (id_cliente, nombre, primer_apellido, segundo_apellido, direccion, numero_registro_proyecto, fecha_aprobacion)
        VALUES (next_id, 'Caridad', 'López', 'Ruiz', 'Avenida 5ta #6804, Miramar, Playa, La Habana', 'PROY-DIC-2021-003', '2021-03-10');
    END IF;

END $$;

-- =====================================================
-- 5. FLUJO INVENTARIO: CONVENIOS → ANEXOS → ITEMS → MOVIMIENTOS (RECEPCIONES)
-- =====================================================

-- 5.1 Convenio 1: Convenio con Juan Carlos Pérez (pinturas y lienzos)
DO $$
DECLARE
    v_cliente_jcp INT;
    v_tipo_compraventa INT;
    v_convenio_id INT;
    v_anexo1_id INT; v_anexo2_id INT;
    v_prod_lienzo INT; v_prod_pincel INT; v_prod_acrilica INT; v_prod_oleo INT; v_prod_paleta INT; v_prod_papel INT;
BEGIN
    SELECT id_cliente INTO v_cliente_jcp FROM clientes WHERE nit = 'NAT-900101-001';
    SELECT id_tipo_convenio INTO v_tipo_compraventa FROM tipo_convenio WHERE nombre = 'COMPRA VENTA';

    IF v_cliente_jcp IS NOT NULL THEN
        -- Convenio
        INSERT INTO convenio (id_cliente, nombre_convenio, fecha, vigencia, id_tipo_convenio, codigo)
        SELECT v_cliente_jcp, 'Convenio de Suministro de Materiales de Arte', '2025-01-15', '2026-12-31', v_tipo_compraventa, 'CONV-JCP-2025'
        WHERE NOT EXISTS (SELECT 1 FROM convenio WHERE codigo = 'CONV-JCP-2025')
        RETURNING id_convenio INTO v_convenio_id;

        IF v_convenio_id IS NOT NULL THEN
            -- Anexo 1: Lote inicial materiales
            INSERT INTO anexo (id_convenio, nombre_anexo, fecha, codigo_anexo, id_dependencia, comision)
            SELECT v_convenio_id, 'Anexo 1 - Lote Materiales Arte Enero 2025', '2025-01-20', 'ANX-JCP-001', 1, 10.00
            WHERE NOT EXISTS (SELECT 1 FROM anexo WHERE codigo_anexo = 'ANX-JCP-001')
            RETURNING id_anexo INTO v_anexo1_id;

            -- Anexo 2: Segundo lote
            INSERT INTO anexo (id_convenio, nombre_anexo, fecha, codigo_anexo, id_dependencia, comision)
            SELECT v_convenio_id, 'Anexo 2 - Lote Materiales Arte Marzo 2025', '2025-03-10', 'ANX-JCP-002', 1, 10.00
            WHERE NOT EXISTS (SELECT 1 FROM anexo WHERE codigo_anexo = 'ANX-JCP-002')
            RETURNING id_anexo INTO v_anexo2_id;

            -- Obtener IDs de productos
            SELECT id_producto INTO v_prod_lienzo FROM productos WHERE codigo = 'LIE-001';
            SELECT id_producto INTO v_prod_pincel FROM productos WHERE codigo = 'PZC-001';
            SELECT id_producto INTO v_prod_acrilica FROM productos WHERE codigo = 'PIN-001';
            SELECT id_producto INTO v_prod_oleo FROM productos WHERE codigo = 'PIN-002';
            SELECT id_producto INTO v_prod_paleta FROM productos WHERE codigo = 'PZC-002';
            SELECT id_producto INTO v_prod_papel FROM productos WHERE codigo = 'LIE-002';

            -- Items Anexo 1
            IF v_anexo1_id IS NOT NULL THEN
                INSERT INTO item_anexo (id_anexo, id_producto, cantidad, cantidad_vendida, precio_compra, precio_venta, id_moneda)
                SELECT v_anexo1_id, v_prod_lienzo, 50, 0, 12.00, 15.60, (SELECT id_moneda FROM moneda WHERE simbolo='USD')
                WHERE NOT EXISTS (SELECT 1 FROM item_anexo WHERE id_anexo = v_anexo1_id AND id_producto = v_prod_lienzo);

                INSERT INTO item_anexo (id_anexo, id_producto, cantidad, cantidad_vendida, precio_compra, precio_venta, id_moneda)
                SELECT v_anexo1_id, v_prod_pincel, 30, 0, 25.00, 32.50, (SELECT id_moneda FROM moneda WHERE simbolo='USD')
                WHERE NOT EXISTS (SELECT 1 FROM item_anexo WHERE id_anexo = v_anexo1_id AND id_producto = v_prod_pincel);

                INSERT INTO item_anexo (id_anexo, id_producto, cantidad, cantidad_vendida, precio_compra, precio_venta, id_moneda)
                SELECT v_anexo1_id, v_prod_acrilica, 40, 0, 22.00, 28.60, (SELECT id_moneda FROM moneda WHERE simbolo='USD')
                WHERE NOT EXISTS (SELECT 1 FROM item_anexo WHERE id_anexo = v_anexo1_id AND id_producto = v_prod_acrilica);

                INSERT INTO item_anexo (id_anexo, id_producto, cantidad, cantidad_vendida, precio_compra, precio_venta, id_moneda)
                SELECT v_anexo1_id, v_prod_papel, 60, 0, 8.00, 10.40, (SELECT id_moneda FROM moneda WHERE simbolo='USD')
                WHERE NOT EXISTS (SELECT 1 FROM item_anexo WHERE id_anexo = v_anexo1_id AND id_producto = v_prod_papel);
            END IF;

            -- Items Anexo 2
            IF v_anexo2_id IS NOT NULL THEN
                INSERT INTO item_anexo (id_anexo, id_producto, cantidad, cantidad_vendida, precio_compra, precio_venta, id_moneda)
                SELECT v_anexo2_id, v_prod_oleo, 25, 0, 38.00, 49.40, (SELECT id_moneda FROM moneda WHERE simbolo='EUR')
                WHERE NOT EXISTS (SELECT 1 FROM item_anexo WHERE id_anexo = v_anexo2_id AND id_producto = v_prod_oleo);

                INSERT INTO item_anexo (id_anexo, id_producto, cantidad, cantidad_vendida, precio_compra, precio_venta, id_moneda)
                SELECT v_anexo2_id, v_prod_lienzo, 30, 0, 12.00, 15.60, (SELECT id_moneda FROM moneda WHERE simbolo='USD')
                WHERE NOT EXISTS (SELECT 1 FROM item_anexo WHERE id_anexo = v_anexo2_id AND id_producto = v_prod_lienzo);

                INSERT INTO item_anexo (id_anexo, id_producto, cantidad, cantidad_vendida, precio_compra, precio_venta, id_moneda)
                SELECT v_anexo2_id, v_prod_paleta, 20, 0, 6.00, 7.80, (SELECT id_moneda FROM moneda WHERE simbolo='USD')
                WHERE NOT EXISTS (SELECT 1 FROM item_anexo WHERE id_anexo = v_anexo2_id AND id_producto = v_prod_paleta);

                INSERT INTO item_anexo (id_anexo, id_producto, cantidad, cantidad_vendida, precio_compra, precio_venta, id_moneda)
                SELECT v_anexo2_id, v_prod_pincel, 15, 0, 25.00, 32.50, (SELECT id_moneda FROM moneda WHERE simbolo='USD')
                WHERE NOT EXISTS (SELECT 1 FROM item_anexo WHERE id_anexo = v_anexo2_id AND id_producto = v_prod_pincel);
            END IF;
        END IF;
    END IF;
END $$;

-- 5.2 Convenio 2: Convenio con Taller de Cerámica Artemisa (productos cerámicos)
DO $$
DECLARE
    v_cliente_tcp INT;
    v_tipo_compraventa INT;
    v_convenio_id INT;
    v_anexo_id INT;
    v_prod_tazas INT; v_prod_jarron INT;
BEGIN
    SELECT id_cliente INTO v_cliente_tcp FROM clientes WHERE nit = 'TCP-ART-001';
    SELECT id_tipo_convenio INTO v_tipo_compraventa FROM tipo_convenio WHERE nombre = 'COMPRA VENTA';

    IF v_cliente_tcp IS NOT NULL THEN
        INSERT INTO convenio (id_cliente, nombre_convenio, fecha, vigencia, id_tipo_convenio, codigo)
        SELECT v_cliente_tcp, 'Convenio de Suministro de Cerámica Artesanal', '2025-02-01', '2026-12-31', v_tipo_compraventa, 'CONV-ART-2025'
        WHERE NOT EXISTS (SELECT 1 FROM convenio WHERE codigo = 'CONV-ART-2025')
        RETURNING id_convenio INTO v_convenio_id;

        IF v_convenio_id IS NOT NULL THEN
            INSERT INTO anexo (id_convenio, nombre_anexo, fecha, codigo_anexo, id_dependencia, comision)
            SELECT v_convenio_id, 'Anexo 1 - Cerámica Febrero 2025', '2025-02-15', 'ANX-ART-001', 1, 8.00
            WHERE NOT EXISTS (SELECT 1 FROM anexo WHERE codigo_anexo = 'ANX-ART-001')
            RETURNING id_anexo INTO v_anexo_id;

            SELECT id_producto INTO v_prod_tazas FROM productos WHERE codigo = 'CER-001';
            SELECT id_producto INTO v_prod_jarron FROM productos WHERE codigo = 'CER-002';

            IF v_anexo_id IS NOT NULL THEN
                INSERT INTO item_anexo (id_anexo, id_producto, cantidad, cantidad_vendida, precio_compra, precio_venta, id_moneda)
                SELECT v_anexo_id, v_prod_tazas, 20, 0, 18.00, 23.40, (SELECT id_moneda FROM moneda WHERE simbolo='EUR')
                WHERE NOT EXISTS (SELECT 1 FROM item_anexo WHERE id_anexo = v_anexo_id AND id_producto = v_prod_tazas);

                INSERT INTO item_anexo (id_anexo, id_producto, cantidad, cantidad_vendida, precio_compra, precio_venta, id_moneda)
                SELECT v_anexo_id, v_prod_jarron, 15, 0, 35.00, 45.50, (SELECT id_moneda FROM moneda WHERE simbolo='EUR')
                WHERE NOT EXISTS (SELECT 1 FROM item_anexo WHERE id_anexo = v_anexo_id AND id_producto = v_prod_jarron);
            END IF;
        END IF;
    END IF;
END $$;

-- 5.3 Movimientos RECEPCION (dar entrada al inventario)
DO $$
DECLARE
    v_tipo_recepcion INT;
    r_item RECORD;
BEGIN
    SELECT id_tipo_movimiento INTO v_tipo_recepcion FROM tipo_movimiento WHERE tipo = 'RECEPCION';

    FOR r_item IN SELECT * FROM item_anexo LOOP
        INSERT INTO movimiento (id_tipo_movimiento, id_dependencia, id_anexo, id_producto, cantidad, fecha, observacion, estado, codigo)
        SELECT v_tipo_recepcion, 1, r_item.id_anexo, r_item.id_producto, r_item.cantidad, CURRENT_DATE - (random() * 180)::int,
               'Recepción automática - seed realista', 'confirmado', 'MOV-REC-' || r_item.id_item_anexo
        WHERE NOT EXISTS (SELECT 1 FROM movimiento WHERE codigo = 'MOV-REC-' || r_item.id_item_anexo);
    END LOOP;
END $$;

-- =====================================================
-- 6. FLUJO VENTAS: CONTRATOS → FACTURAS → PAGOS
-- =====================================================

DO $$
DECLARE
    v_cli_egrem INT; v_cli_hotel INT; v_cli_cnae INT;
    v_estado_activo INT; v_tipo_servicio INT; v_tipo_obra INT;
    v_mon_usd INT; v_mon_eur INT;
    v_contrato1 INT; v_contrato2 INT; v_contrato3 INT;
    v_factura INT;
    v_prod_camara INT; v_prod_tripode INT; v_prod_parlante INT; v_prod_micro INT;
    v_prod_laptop INT; v_prod_disco INT; v_prod_papel INT; v_prod_toner INT;
BEGIN
    SELECT id_cliente INTO v_cli_egrem FROM clientes WHERE nit = 'JUR-EGREM-001';
    SELECT id_cliente INTO v_cli_hotel FROM clientes WHERE nit = 'JUR-HNAC-001';
    SELECT id_cliente INTO v_cli_cnae FROM clientes WHERE nit = 'JUR-CNAE-001';
    SELECT id_moneda INTO v_mon_usd FROM moneda WHERE simbolo = 'USD';
    SELECT id_moneda INTO v_mon_eur FROM moneda WHERE simbolo = 'EUR';
    SELECT id_estado_contrato INTO v_estado_activo FROM estado_contrato WHERE nombre = 'ACTIVO';
    SELECT id_tipo_contrato INTO v_tipo_servicio FROM tipo_contrato WHERE nombre = 'SERVICIO';
    SELECT id_tipo_contrato INTO v_tipo_obra FROM tipo_contrato WHERE nombre = 'OBRA';

    -- Contrato 1: EGREM - equipamiento de grabación
    IF v_cli_egrem IS NOT NULL THEN
        INSERT INTO contrato (id_cliente, nombre, id_estado, fecha, vigencia, id_tipo_contrato, id_moneda, monto, codigo)
        SELECT v_cli_egrem, 'Suministro de Equipamiento de Audio para Estudio', v_estado_activo,
               '2025-02-01', '2025-08-01', v_tipo_servicio, v_mon_usd, 15000.00, 'CTR-EGREM-2025-01'
        WHERE NOT EXISTS (SELECT 1 FROM contrato WHERE codigo = 'CTR-EGREM-2025-01')
        RETURNING id_contrato INTO v_contrato1;
    END IF;

    -- Contrato 2: Hotel Nacional - equipamiento audiovisual
    IF v_cli_hotel IS NOT NULL THEN
        INSERT INTO contrato (id_cliente, nombre, id_estado, fecha, vigencia, id_tipo_contrato, id_moneda, monto, codigo)
        SELECT v_cli_hotel, 'Equipamiento Audiovisual para Salones de Eventos', v_estado_activo,
               '2025-03-15', '2025-10-15', v_tipo_servicio, v_mon_eur, 22000.00, 'CTR-HNAC-2025-01'
        WHERE NOT EXISTS (SELECT 1 FROM contrato WHERE codigo = 'CTR-HNAC-2025-01')
        RETURNING id_contrato INTO v_contrato2;
    END IF;

    -- Contrato 3: CNAE - suministros de oficina
    IF v_cli_cnae IS NOT NULL THEN
        INSERT INTO contrato (id_cliente, nombre, id_estado, fecha, vigencia, id_tipo_contrato, id_moneda, monto, codigo)
        SELECT v_cli_cnae, 'Suministros de Oficina y Papelería', v_estado_activo,
               '2025-04-01', '2025-12-31', v_tipo_servicio, v_mon_usd, 5000.00, 'CTR-CNAE-2025-01'
        WHERE NOT EXISTS (SELECT 1 FROM contrato WHERE codigo = 'CTR-CNAE-2025-01')
        RETURNING id_contrato INTO v_contrato3;
    END IF;

    -- Obtener IDs de productos
    SELECT id_producto INTO v_prod_camara FROM productos WHERE codigo = 'CAM-001';
    SELECT id_producto INTO v_prod_tripode FROM productos WHERE codigo = 'CAM-002';
    SELECT id_producto INTO v_prod_parlante FROM productos WHERE codigo = 'AUD-002';
    SELECT id_producto INTO v_prod_micro FROM productos WHERE codigo = 'AUD-001';
    SELECT id_producto INTO v_prod_laptop FROM productos WHERE codigo = 'COM-001';
    SELECT id_producto INTO v_prod_disco FROM productos WHERE codigo = 'COM-002';
    SELECT id_producto INTO v_prod_papel FROM productos WHERE codigo = 'PAP-001';
    SELECT id_producto INTO v_prod_toner FROM productos WHERE codigo = 'TIN-001';

    -- Factura 1: Para Contrato EGREM
    IF v_contrato1 IS NOT NULL THEN
        INSERT INTO factura (id_contrato, codigo_factura, descripcion, fecha, monto, pago_actual)
        SELECT v_contrato1, 'FAC-EGREM-2025-001', 'Factura por equipos de audio profesionales', '2025-02-15', 8200.00, 8200.00
        WHERE NOT EXISTS (SELECT 1 FROM factura WHERE codigo_factura = 'FAC-EGREM-2025-001')
        RETURNING id_factura INTO v_factura;

        IF v_factura IS NOT NULL THEN
            INSERT INTO item_factura (id_factura, id_producto, cantidad, precio_compra, precio_venta, id_moneda, codigo)
            SELECT v_factura, v_prod_micro, 4, 99.00, 128.70, v_mon_usd, 'ITF-001-MIC'
            WHERE NOT EXISTS (SELECT 1 FROM item_factura WHERE codigo = 'ITF-001-MIC');

            INSERT INTO item_factura (id_factura, id_producto, cantidad, precio_compra, precio_venta, id_moneda, codigo)
            SELECT v_factura, v_prod_parlante, 6, 250.00, 325.00, v_mon_usd, 'ITF-001-PAR'
            WHERE NOT EXISTS (SELECT 1 FROM item_factura WHERE codigo = 'ITF-001-PAR');

            INSERT INTO item_factura (id_factura, id_producto, cantidad, precio_compra, precio_venta, id_moneda, codigo)
            SELECT v_factura, v_prod_tripode, 3, 55.00, 71.50, v_mon_eur, 'ITF-001-TRI'
            WHERE NOT EXISTS (SELECT 1 FROM item_factura WHERE codigo = 'ITF-001-TRI');

            -- Pago de la factura
            INSERT INTO pago (id_factura, fecha, monto, id_moneda, tipo_pago, referencia)
            SELECT v_factura, '2025-02-20', 5000.00, v_mon_usd, 'TRANSFERENCIA', 'PAGO-EGREM-001'
            WHERE NOT EXISTS (SELECT 1 FROM pago WHERE referencia = 'PAGO-EGREM-001');

            INSERT INTO pago (id_factura, fecha, monto, id_moneda, tipo_pago, referencia)
            SELECT v_factura, '2025-03-05', 3200.00, v_mon_usd, 'TRANSFERENCIA', 'PAGO-EGREM-002'
            WHERE NOT EXISTS (SELECT 1 FROM pago WHERE referencia = 'PAGO-EGREM-002');

            -- Movimiento de venta (descuenta stock del item_anexo)
            INSERT INTO movimiento (id_tipo_movimiento, id_dependencia, id_producto, cantidad, fecha, observacion, estado, codigo, id_factura, id_contrato)
            SELECT (SELECT id_tipo_movimiento FROM tipo_movimiento WHERE tipo = 'venta'), 1, v_prod_micro, 4, '2025-02-15',
                   'Venta por factura FAC-EGREM-2025-001', 'confirmado', 'MOV-VTA-EGREM-001', v_factura, v_contrato1
            WHERE NOT EXISTS (SELECT 1 FROM movimiento WHERE codigo = 'MOV-VTA-EGREM-001');

            INSERT INTO movimiento (id_tipo_movimiento, id_dependencia, id_producto, cantidad, fecha, observacion, estado, codigo, id_factura, id_contrato)
            SELECT (SELECT id_tipo_movimiento FROM tipo_movimiento WHERE tipo = 'venta'), 1, v_prod_parlante, 6, '2025-02-15',
                   'Venta por factura FAC-EGREM-2025-001', 'confirmado', 'MOV-VTA-EGREM-002', v_factura, v_contrato1
            WHERE NOT EXISTS (SELECT 1 FROM movimiento WHERE codigo = 'MOV-VTA-EGREM-002');
        END IF;
    END IF;

    -- Factura 2: Para Contrato Hotel Nacional
    IF v_contrato2 IS NOT NULL THEN
        INSERT INTO factura (id_contrato, codigo_factura, descripcion, fecha, monto, pago_actual)
        SELECT v_contrato2, 'FAC-HNAC-2025-001', 'Factura por equipos audiovisuales para salones', '2025-04-01', 12500.00, 7000.00
        WHERE NOT EXISTS (SELECT 1 FROM factura WHERE codigo_factura = 'FAC-HNAC-2025-001')
        RETURNING id_factura INTO v_factura;

        IF v_factura IS NOT NULL THEN
            INSERT INTO item_factura (id_factura, id_producto, cantidad, precio_compra, precio_venta, id_moneda, codigo)
            SELECT v_factura, v_prod_camara, 5, 480.00, 624.00, v_mon_usd, 'ITF-002-CAM'
            WHERE NOT EXISTS (SELECT 1 FROM item_factura WHERE codigo = 'ITF-002-CAM');

            INSERT INTO item_factura (id_factura, id_producto, cantidad, precio_compra, precio_venta, id_moneda, codigo)
            SELECT v_factura, v_prod_laptop, 3, 720.00, 936.00, v_mon_usd, 'ITF-002-LAP'
            WHERE NOT EXISTS (SELECT 1 FROM item_factura WHERE codigo = 'ITF-002-LAP');

            INSERT INTO item_factura (id_factura, id_producto, cantidad, precio_compra, precio_venta, id_moneda, codigo)
            SELECT v_factura, v_prod_disco, 10, 65.00, 84.50, v_mon_usd, 'ITF-002-DIS'
            WHERE NOT EXISTS (SELECT 1 FROM item_factura WHERE codigo = 'ITF-002-DIS');

            -- Pagos parciales
            INSERT INTO pago (id_factura, fecha, monto, id_moneda, tipo_pago, referencia)
            SELECT v_factura, '2025-04-15', 7000.00, v_mon_usd, 'TRANSFERENCIA', 'PAGO-HNAC-001'
            WHERE NOT EXISTS (SELECT 1 FROM pago WHERE referencia = 'PAGO-HNAC-001');

            -- Movimientos de venta
            INSERT INTO movimiento (id_tipo_movimiento, id_dependencia, id_producto, cantidad, fecha, observacion, estado, codigo, id_factura, id_contrato)
            SELECT (SELECT id_tipo_movimiento FROM tipo_movimiento WHERE tipo = 'venta'), 1, v_prod_camara, 5, '2025-04-01',
                   'Venta por factura FAC-HNAC-2025-001', 'confirmado', 'MOV-VTA-HNAC-001', v_factura, v_contrato2
            WHERE NOT EXISTS (SELECT 1 FROM movimiento WHERE codigo = 'MOV-VTA-HNAC-001');
        END IF;
    END IF;

    -- Factura 3: Para Contrato CNAE (consumibles)
    IF v_contrato3 IS NOT NULL THEN
        INSERT INTO factura (id_contrato, codigo_factura, descripcion, fecha, monto, pago_actual)
        SELECT v_contrato3, 'FAC-CNAE-2025-001', 'Suministro de papelería y consumibles oficina', '2025-04-20', 1200.00, 1200.00
        WHERE NOT EXISTS (SELECT 1 FROM factura WHERE codigo_factura = 'FAC-CNAE-2025-001')
        RETURNING id_factura INTO v_factura;

        IF v_factura IS NOT NULL THEN
            INSERT INTO item_factura (id_factura, id_producto, cantidad, precio_compra, precio_venta, id_moneda, codigo)
            SELECT v_factura, v_prod_papel, 50, 3.50, 4.55, v_mon_usd, 'ITF-003-PAP'
            WHERE NOT EXISTS (SELECT 1 FROM item_factura WHERE codigo = 'ITF-003-PAP');

            INSERT INTO item_factura (id_factura, id_producto, cantidad, precio_compra, precio_venta, id_moneda, codigo)
            SELECT v_factura, v_prod_toner, 8, 45.00, 58.50, v_mon_usd, 'ITF-003-TON'
            WHERE NOT EXISTS (SELECT 1 FROM item_factura WHERE codigo = 'ITF-003-TON');

            -- Pago completo
            INSERT INTO pago (id_factura, fecha, monto, id_moneda, tipo_pago, referencia)
            SELECT v_factura, '2025-05-05', 1200.00, v_mon_usd, 'CHEQUE', 'PAGO-CNAE-001'
            WHERE NOT EXISTS (SELECT 1 FROM pago WHERE referencia = 'PAGO-CNAE-001');
        END IF;
    END IF;
END $$;

-- =====================================================
-- 7. FLUJO SERVICIOS: SOLICITUDES → ETAPAS → TAREAS → FACTURAS → PAGOS
-- =====================================================

DO $$
DECLARE
    v_cli_egrem INT; v_cli_cnae INT;
    v_contrato_egrem INT; v_contrato_cnae INT;
    v_sol1 INT; v_sol2 INT; v_sol3 INT;
    v_etapa INT;
    v_srv1 INT; v_srv2 INT; v_srv3 INT; v_srv4 INT; v_srv5 INT;
    v_pers_jcp INT; v_pers_mer INT; v_pers_plg INT; v_pers_avm INT; v_pers_rcd INT;
    v_fact_serv INT;
    v_mon_usd INT; v_mon_eur INT;
BEGIN
    SELECT id_cliente INTO v_cli_egrem FROM clientes WHERE nit = 'JUR-EGREM-001';
    SELECT id_cliente INTO v_cli_cnae FROM clientes WHERE nit = 'JUR-CNAE-001';
    SELECT id_contrato INTO v_contrato_egrem FROM contrato WHERE codigo = 'CTR-EGREM-2025-01';
    SELECT id_contrato INTO v_contrato_cnae FROM contrato WHERE codigo = 'CTR-CNAE-2025-01';
    SELECT id_moneda INTO v_mon_usd FROM moneda WHERE simbolo = 'USD';
    SELECT id_moneda INTO v_mon_eur FROM moneda WHERE simbolo = 'EUR';

    -- Personas (clientes tipo PROVEEDOR) que ejecutarán los servicios
    SELECT id_cliente INTO v_pers_jcp FROM clientes WHERE nit = 'NAT-900101-001';
    SELECT id_cliente INTO v_pers_mer FROM clientes WHERE nit = 'NAT-850615-002';
    SELECT id_cliente INTO v_pers_plg FROM clientes WHERE nit = 'NAT-780320-003';
    SELECT id_cliente INTO v_pers_avm FROM clientes WHERE nit = 'NAT-920810-004';
    SELECT id_cliente INTO v_pers_rcd FROM clientes WHERE nit = 'NAT-880405-005';

    -- Crear servicios del catálogo
    INSERT INTO servicios (codigo_servicio, concepto, unidad_medida, precio, id_moneda)
    SELECT 'SRV-CONSULT', 'Consultoría en diseño y producción artística', 'Hora', 50.00, v_mon_usd
    WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE codigo_servicio = 'SRV-CONSULT')
    RETURNING id_servicio INTO v_srv1;

    INSERT INTO servicios (codigo_servicio, concepto, unidad_medida, precio, id_moneda)
    SELECT 'SRV-EVENTOS', 'Organización de eventos culturales', 'Evento', 2500.00, v_mon_usd
    WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE codigo_servicio = 'SRV-EVENTOS')
    RETURNING id_servicio INTO v_srv2;

    INSERT INTO servicios (codigo_servicio, concepto, unidad_medida, precio, id_moneda)
    SELECT 'SRV-FOTO', 'Sesión fotográfica profesional', 'Sesión', 350.00, v_mon_usd
    WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE codigo_servicio = 'SRV-FOTO')
    RETURNING id_servicio INTO v_srv3;

    INSERT INTO servicios (codigo_servicio, concepto, unidad_medida, precio, id_moneda)
    SELECT 'SRV-DISENO', 'Diseño gráfico y branding', 'Proyecto', 1200.00, v_mon_eur
    WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE codigo_servicio = 'SRV-DISENO')
    RETURNING id_servicio INTO v_srv4;

    INSERT INTO servicios (codigo_servicio, concepto, unidad_medida, precio, id_moneda)
    SELECT 'SRV-RESTAUR', 'Restauración de obras de arte', 'Obra', 800.00, v_mon_eur
    WHERE NOT EXISTS (SELECT 1 FROM servicios WHERE codigo_servicio = 'SRV-RESTAUR')
    RETURNING id_servicio INTO v_srv5;

    -- ── Solicitud 1: EGREM - Producción evento musical ──
    IF v_cli_egrem IS NOT NULL THEN
        INSERT INTO solicitud_servicio (id_cliente, id_contrato, codigo_solicitud, nombres_rep, apellido1_rep, apellido2_rep,
            ci_rep, telefono_rep, cargo, descripcion, fecha_solicitud, fecha_entrega, estado, aprobado, material_asumido_x, id_usuario)
        SELECT v_cli_egrem, v_contrato_egrem, 'SOL-EGREM-2025-001', 'Armando', 'López', 'Cárdenas',
               '75051298765', '+53 52567890', 'Director de Producción',
               'Producción y cobertura audiovisual del Festival de Música Cubana 2025', '2025-05-01', '2025-09-15', 'EN PROCESO', true, FALSE, 1
        WHERE NOT EXISTS (SELECT 1 FROM solicitud_servicio WHERE codigo_solicitud = 'SOL-EGREM-2025-001')
        RETURNING id_solicitud_servicio INTO v_sol1;

        IF v_sol1 IS NOT NULL THEN
            -- Etapa 1: Pre-producción
            INSERT INTO etapas (id_solicitud_servicio, numero_etapa, nombre_etapa, fecha_entrega, descripcion, valor, id_moneda, pagada)
            SELECT v_sol1, 1, 'Pre-producción y Logística', '2025-06-15', 'Planificación del festival, selección de locaciones, coordinación de artistas',
                   3500.00, v_mon_usd, true
            WHERE NOT EXISTS (SELECT 1 FROM etapas WHERE id_solicitud_servicio = v_sol1 AND numero_etapa = 1)
            RETURNING id_etapa INTO v_etapa;

            IF v_etapa IS NOT NULL THEN
                INSERT INTO tareas_etapa (id_etapa, id_servicio, codigo_extendido, concepto_modificado, unidad_medida, cantidad, precio_ajustado, id_moneda, facturada)
                SELECT v_etapa, v_srv1, 'TAR-001-CONSULT', 'Consultoría para planificación del festival', 'Hora', 40, 50.00, v_mon_usd, FALSE
                WHERE NOT EXISTS (SELECT 1 FROM tareas_etapa WHERE codigo_extendido = 'TAR-001-CONSULT');

                INSERT INTO tareas_etapa (id_etapa, id_servicio, codigo_extendido, concepto_modificado, unidad_medida, cantidad, precio_ajustado, id_moneda, facturada)
                SELECT v_etapa, v_srv3, 'TAR-001-FOTO', 'Fotografía de locaciones', 'Sesión', 4, 350.00, v_mon_usd, FALSE
                WHERE NOT EXISTS (SELECT 1 FROM tareas_etapa WHERE codigo_extendido = 'TAR-001-FOTO');

                -- Asignar personas a la etapa
                INSERT INTO persona_etapa (id_etapa, id_persona, cobro, id_moneda, liquidada, por_cobrar)
                SELECT v_etapa, v_pers_jcp, 1500.00, v_mon_usd, true, 0.00
                WHERE NOT EXISTS (SELECT 1 FROM persona_etapa WHERE id_etapa = v_etapa AND id_persona = v_pers_jcp);

                INSERT INTO persona_etapa (id_etapa, id_persona, cobro, id_moneda, liquidada, por_cobrar)
                SELECT v_etapa, v_pers_rcd, 2000.00, v_mon_usd, true, 0.00
                WHERE NOT EXISTS (SELECT 1 FROM persona_etapa WHERE id_etapa = v_etapa AND id_persona = v_pers_rcd);

                -- Factura servicio para esta etapa
                INSERT INTO factura_servicio (id_etapa, alcance, codigo_factura, id_moneda, fecha, descripcion, importe, pagado, id_usuario)
                SELECT v_etapa, 'TOTAL', 'FS-001-2025', v_mon_usd, '2025-06-10', 'Factura por etapa de pre-producción', 3500.00, 3500.00, 1
                WHERE NOT EXISTS (SELECT 1 FROM factura_servicio WHERE codigo_factura = 'FS-001-2025')
                RETURNING id_factura_servicio INTO v_fact_serv;

                IF v_fact_serv IS NOT NULL THEN
                    INSERT INTO pago_factura_servicio (id_factura_servicio, monto, id_moneda, fecha, doc_traza, monto_disponible)
                    SELECT v_fact_serv, 3500.00, v_mon_usd, '2025-06-12', 'TRAZA-FS-001-A', 0.00
                    WHERE NOT EXISTS (SELECT 1 FROM pago_factura_servicio WHERE doc_traza = 'TRAZA-FS-001-A');
                END IF;
            END IF;

            -- Etapa 2: Cobertura del evento
            INSERT INTO etapas (id_solicitud_servicio, numero_etapa, nombre_etapa, fecha_entrega, descripcion, valor, id_moneda, pagada)
            SELECT v_sol1, 2, 'Cobertura Audiovisual del Festival', '2025-09-15', 'Grabación y transmisión del festival, edición de contenido',
                   8500.00, v_mon_usd, false
            WHERE NOT EXISTS (SELECT 1 FROM etapas WHERE id_solicitud_servicio = v_sol1 AND numero_etapa = 2)
            RETURNING id_etapa INTO v_etapa;

            IF v_etapa IS NOT NULL THEN
                INSERT INTO tareas_etapa (id_etapa, id_servicio, codigo_extendido, concepto_modificado, unidad_medida, cantidad, precio_ajustado, id_moneda, facturada)
                SELECT v_etapa, v_srv2, 'TAR-002-EVENTO', 'Cobertura integral del festival de 3 días', 'Evento', 1, 5000.00, v_mon_usd, FALSE
                WHERE NOT EXISTS (SELECT 1 FROM tareas_etapa WHERE codigo_extendido = 'TAR-002-EVENTO');

                INSERT INTO tareas_etapa (id_etapa, id_servicio, codigo_extendido, concepto_modificado, unidad_medida, cantidad, precio_ajustado, id_moneda, facturada)
                SELECT v_etapa, v_srv3, 'TAR-002-FOTO', 'Sesiones fotográficas del evento', 'Sesión', 10, 350.00, v_mon_usd, FALSE
                WHERE NOT EXISTS (SELECT 1 FROM tareas_etapa WHERE codigo_extendido = 'TAR-002-FOTO');

                INSERT INTO persona_etapa (id_etapa, id_persona, cobro, id_moneda, liquidada, por_cobrar)
                SELECT v_etapa, v_pers_rcd, 3000.00, v_mon_usd, false, 0.00
                WHERE NOT EXISTS (SELECT 1 FROM persona_etapa WHERE id_etapa = v_etapa AND id_persona = v_pers_rcd);

                INSERT INTO persona_etapa (id_etapa, id_persona, cobro, id_moneda, liquidada, por_cobrar)
                SELECT v_etapa, v_pers_mer, 2500.00, v_mon_usd, false, 0.00
                WHERE NOT EXISTS (SELECT 1 FROM persona_etapa WHERE id_etapa = v_etapa AND id_persona = v_pers_mer);

                INSERT INTO factura_servicio (id_etapa, alcance, codigo_factura, id_moneda, fecha, descripcion, importe, pagado, id_usuario)
                SELECT v_etapa, 'PARCIAL', 'FS-002-2025', v_mon_usd, '2025-07-01', 'Anticipo 40% cobertura audiovisual', 3400.00, 3400.00, 1
                WHERE NOT EXISTS (SELECT 1 FROM factura_servicio WHERE codigo_factura = 'FS-002-2025')
                RETURNING id_factura_servicio INTO v_fact_serv;

                IF v_fact_serv IS NOT NULL THEN
                    INSERT INTO pago_factura_servicio (id_factura_servicio, monto, id_moneda, fecha, doc_traza, monto_disponible)
                    SELECT v_fact_serv, 3400.00, v_mon_usd, '2025-07-05', 'TRAZA-FS-002-A', 0.00
                    WHERE NOT EXISTS (SELECT 1 FROM pago_factura_servicio WHERE doc_traza = 'TRAZA-FS-002-A');
                END IF;
            END IF;
        END IF;
    END IF;

    -- ── Solicitud 2: CNAE - Diseño de catálogo institucional ──
    IF v_cli_cnae IS NOT NULL THEN
        INSERT INTO solicitud_servicio (id_cliente, id_contrato, codigo_solicitud, nombres_rep, apellido1_rep, apellido2_rep,
            ci_rep, telefono_rep, cargo, descripcion, fecha_solicitud, fecha_entrega, estado, aprobado, material_asumido_x, id_usuario)
        SELECT v_cli_cnae, v_contrato_cnae, 'SOL-CNAE-2025-001', 'Marta', 'González', 'Prieto',
               '68030145678', '+53 52345678', 'Directora de Comunicación',
               'Diseño y maquetación del catálogo institucional 2025 de artes escénicas', '2025-05-15', '2025-08-30', 'EN PROCESO', true, FALSE, 1
        WHERE NOT EXISTS (SELECT 1 FROM solicitud_servicio WHERE codigo_solicitud = 'SOL-CNAE-2025-001')
        RETURNING id_solicitud_servicio INTO v_sol2;

        IF v_sol2 IS NOT NULL THEN
            -- Etapa única: Diseño y entrega
            INSERT INTO etapas (id_solicitud_servicio, numero_etapa, nombre_etapa, fecha_entrega, descripcion, valor, id_moneda, pagada)
            SELECT v_sol2, 1, 'Diseño Gráfico y Maquetación', '2025-08-30',
                   'Creación del catálogo completo con diseño gráfico, fotografía y maquetación editorial',
                   4500.00, v_mon_eur, false
            WHERE NOT EXISTS (SELECT 1 FROM etapas WHERE id_solicitud_servicio = v_sol2 AND numero_etapa = 1)
            RETURNING id_etapa INTO v_etapa;

            IF v_etapa IS NOT NULL THEN
                INSERT INTO tareas_etapa (id_etapa, id_servicio, codigo_extendido, concepto_modificado, unidad_medida, cantidad, precio_ajustado, id_moneda, facturada)
                SELECT v_etapa, v_srv4, 'TAR-003-DISENO', 'Diseño gráfico de catálogo 80 páginas', 'Proyecto', 1, 2500.00, v_mon_eur, FALSE
                WHERE NOT EXISTS (SELECT 1 FROM tareas_etapa WHERE codigo_extendido = 'TAR-003-DISENO');

                INSERT INTO tareas_etapa (id_etapa, id_servicio, codigo_extendido, concepto_modificado, unidad_medida, cantidad, precio_ajustado, id_moneda, facturada)
                SELECT v_etapa, v_srv3, 'TAR-003-FOTO', 'Fotografía de obras y espacios escénicos', 'Sesión', 6, 333.33, v_mon_eur, FALSE
                WHERE NOT EXISTS (SELECT 1 FROM tareas_etapa WHERE codigo_extendido = 'TAR-003-FOTO');

                INSERT INTO persona_etapa (id_etapa, id_persona, cobro, id_moneda, liquidada, por_cobrar)
                SELECT v_etapa, v_pers_avm, 2500.00, v_mon_eur, false, 0.00
                WHERE NOT EXISTS (SELECT 1 FROM persona_etapa WHERE id_etapa = v_etapa AND id_persona = v_pers_avm);

                INSERT INTO persona_etapa (id_etapa, id_persona, cobro, id_moneda, liquidada, por_cobrar)
                SELECT v_etapa, v_pers_rcd, 1500.00, v_mon_eur, false, 0.00
                WHERE NOT EXISTS (SELECT 1 FROM persona_etapa WHERE id_etapa = v_etapa AND id_persona = v_pers_rcd);
            END IF;
        END IF;
    END IF;

    -- ── Solicitud 3: CNAE - Restauración de obras ──
    IF v_cli_cnae IS NOT NULL THEN
        INSERT INTO solicitud_servicio (id_cliente, id_contrato, codigo_solicitud, nombres_rep, apellido1_rep, apellido2_rep,
            ci_rep, telefono_rep, cargo, descripcion, fecha_solicitud, fecha_entrega, estado, aprobado, material_asumido_x, id_usuario)
        SELECT v_cli_cnae, v_contrato_cnae, 'SOL-CNAE-2025-002', 'Fernando', 'Acosta', 'Díaz',
               '72061234567', '+53 53456789', 'Conservador Jefe',
               'Restauración de 3 pinturas al óleo del siglo XIX del patrimonio institucional', '2025-06-01', '2025-10-15', 'PENDIENTE', true, FALSE, 1
        WHERE NOT EXISTS (SELECT 1 FROM solicitud_servicio WHERE codigo_solicitud = 'SOL-CNAE-2025-002')
        RETURNING id_solicitud_servicio INTO v_sol3;

        IF v_sol3 IS NOT NULL THEN
            INSERT INTO etapas (id_solicitud_servicio, numero_etapa, nombre_etapa, fecha_entrega, descripcion, valor, id_moneda, pagada)
            SELECT v_sol3, 1, 'Diagnóstico y Restauración de Obras', '2025-10-15',
                   'Evaluación del estado de conservación y restauración completa de 3 óleos',
                   6200.00, v_mon_eur, false
            WHERE NOT EXISTS (SELECT 1 FROM etapas WHERE id_solicitud_servicio = v_sol3 AND numero_etapa = 1)
            RETURNING id_etapa INTO v_etapa;

            IF v_etapa IS NOT NULL THEN
                INSERT INTO tareas_etapa (id_etapa, id_servicio, codigo_extendido, concepto_modificado, unidad_medida, cantidad, precio_ajustado, id_moneda, facturada)
                SELECT v_etapa, v_srv5, 'TAR-004-RESTAUR', 'Restauración de 3 óleos del siglo XIX', 'Obra', 3, 2000.00, v_mon_eur, FALSE
                WHERE NOT EXISTS (SELECT 1 FROM tareas_etapa WHERE codigo_extendido = 'TAR-004-RESTAUR');

                INSERT INTO persona_etapa (id_etapa, id_persona, cobro, id_moneda, liquidada, por_cobrar)
                SELECT v_etapa, v_pers_mer, 4000.00, v_mon_eur, false, 0.00
                WHERE NOT EXISTS (SELECT 1 FROM persona_etapa WHERE id_etapa = v_etapa AND id_persona = v_pers_mer);

                INSERT INTO persona_etapa (id_etapa, id_persona, cobro, id_moneda, liquidada, por_cobrar)
                SELECT v_etapa, v_pers_plg, 2200.00, v_mon_eur, false, 0.00
                WHERE NOT EXISTS (SELECT 1 FROM persona_etapa WHERE id_etapa = v_etapa AND id_persona = v_pers_plg);
            END IF;
        END IF;
    END IF;
END $$;

-- =====================================================
-- 8. VENTAS EN EFECTIVO
-- =====================================================

DO $$
DECLARE
    v_prod_papel INT; v_prod_carpetas INT; v_prod_toner INT; v_prod_tinta INT;
    v_prod_lienzo INT; v_prod_pincel INT; v_prod_tazas INT; v_prod_mantel INT;
    v_prod_camiseta INT;
    v_ve_id INT;
    v_mon_usd INT;
BEGIN
    SELECT id_moneda INTO v_mon_usd FROM moneda WHERE simbolo = 'USD';
    SELECT id_producto INTO v_prod_papel FROM productos WHERE codigo = 'PAP-001';
    SELECT id_producto INTO v_prod_carpetas FROM productos WHERE codigo = 'PAP-002';
    SELECT id_producto INTO v_prod_toner FROM productos WHERE codigo = 'TIN-001';
    SELECT id_producto INTO v_prod_tinta FROM productos WHERE codigo = 'TIN-002';
    SELECT id_producto INTO v_prod_lienzo FROM productos WHERE codigo = 'LIE-001';
    SELECT id_producto INTO v_prod_pincel FROM productos WHERE codigo = 'PZC-001';
    SELECT id_producto INTO v_prod_tazas FROM productos WHERE codigo = 'CER-001';
    SELECT id_producto INTO v_prod_mantel FROM productos WHERE codigo = 'TEX-001';
    SELECT id_producto INTO v_prod_camiseta FROM productos WHERE codigo = 'TEX-002';

    -- Venta efectivo 1
    INSERT INTO venta_efectivo (slip, fecha, id_dependencia, cajero, monto, codigo)
    SELECT 'SLIP-20250501-001', '2025-05-01', 1, 'Laura Fernández', 250.00, 'VE-001-2025'
    WHERE NOT EXISTS (SELECT 1 FROM venta_efectivo WHERE codigo = 'VE-001-2025')
    RETURNING id_venta_efectivo INTO v_ve_id;
    IF v_ve_id IS NOT NULL THEN
        INSERT INTO item_venta_efectivo (id_venta_efectivo, id_producto, cantidad, precio_compra, precio_venta, id_moneda, codigo)
        SELECT v_ve_id, v_prod_papel, 20, 3.50, 4.55, v_mon_usd, 'IVE-001-PAP'
        WHERE NOT EXISTS (SELECT 1 FROM item_venta_efectivo WHERE codigo = 'IVE-001-PAP');
        INSERT INTO item_venta_efectivo (id_venta_efectivo, id_producto, cantidad, precio_compra, precio_venta, id_moneda, codigo)
        SELECT v_ve_id, v_prod_toner, 2, 45.00, 58.50, v_mon_usd, 'IVE-001-TON'
        WHERE NOT EXISTS (SELECT 1 FROM item_venta_efectivo WHERE codigo = 'IVE-001-TON');
    END IF;

    -- Venta efectivo 2
    INSERT INTO venta_efectivo (slip, fecha, id_dependencia, cajero, monto, codigo)
    SELECT 'SLIP-20250615-002', '2025-06-15', 1, 'Laura Fernández', 380.00, 'VE-002-2025'
    WHERE NOT EXISTS (SELECT 1 FROM venta_efectivo WHERE codigo = 'VE-002-2025')
    RETURNING id_venta_efectivo INTO v_ve_id;
    IF v_ve_id IS NOT NULL THEN
        INSERT INTO item_venta_efectivo (id_venta_efectivo, id_producto, cantidad, precio_compra, precio_venta, id_moneda, codigo)
        SELECT v_ve_id, v_prod_lienzo, 10, 12.00, 15.60, v_mon_usd, 'IVE-002-LIE'
        WHERE NOT EXISTS (SELECT 1 FROM item_venta_efectivo WHERE codigo = 'IVE-002-LIE');
        INSERT INTO item_venta_efectivo (id_venta_efectivo, id_producto, cantidad, precio_compra, precio_venta, id_moneda, codigo)
        SELECT v_ve_id, v_prod_pincel, 5, 25.00, 32.50, v_mon_usd, 'IVE-002-PZC'
        WHERE NOT EXISTS (SELECT 1 FROM item_venta_efectivo WHERE codigo = 'IVE-002-PZC');
    END IF;

    -- Venta efectivo 3
    INSERT INTO venta_efectivo (slip, fecha, id_dependencia, cajero, monto, codigo)
    SELECT 'SLIP-20250710-003', '2025-07-10', 1, 'Miguel Torres', 180.00, 'VE-003-2025'
    WHERE NOT EXISTS (SELECT 1 FROM venta_efectivo WHERE codigo = 'VE-003-2025')
    RETURNING id_venta_efectivo INTO v_ve_id;
    IF v_ve_id IS NOT NULL THEN
        INSERT INTO item_venta_efectivo (id_venta_efectivo, id_producto, cantidad, precio_compra, precio_venta, id_moneda, codigo)
        SELECT v_ve_id, v_prod_tazas, 4, 18.00, 23.40, v_mon_usd, 'IVE-003-CER'
        WHERE NOT EXISTS (SELECT 1 FROM item_venta_efectivo WHERE codigo = 'IVE-003-CER');
        INSERT INTO item_venta_efectivo (id_venta_efectivo, id_producto, cantidad, precio_compra, precio_venta, id_moneda, codigo)
        SELECT v_ve_id, v_prod_mantel, 3, 28.00, 36.40, v_mon_usd, 'IVE-003-TEX'
        WHERE NOT EXISTS (SELECT 1 FROM item_venta_efectivo WHERE codigo = 'IVE-003-TEX');
    END IF;

    -- Venta efectivo 4
    INSERT INTO venta_efectivo (slip, fecha, id_dependencia, cajero, monto, codigo)
    SELECT 'SLIP-20250820-004', '2025-08-20', 1, 'Laura Fernández', 95.00, 'VE-004-2025'
    WHERE NOT EXISTS (SELECT 1 FROM venta_efectivo WHERE codigo = 'VE-004-2025')
    RETURNING id_venta_efectivo INTO v_ve_id;
    IF v_ve_id IS NOT NULL THEN
        INSERT INTO item_venta_efectivo (id_venta_efectivo, id_producto, cantidad, precio_compra, precio_venta, id_moneda, codigo)
        SELECT v_ve_id, v_prod_carpetas, 5, 5.00, 6.50, v_mon_usd, 'IVE-004-PAP'
        WHERE NOT EXISTS (SELECT 1 FROM item_venta_efectivo WHERE codigo = 'IVE-004-PAP');
        INSERT INTO item_venta_efectivo (id_venta_efectivo, id_producto, cantidad, precio_compra, precio_venta, id_moneda, codigo)
        SELECT v_ve_id, v_prod_tinta, 3, 12.00, 15.60, v_mon_usd, 'IVE-004-TIN'
        WHERE NOT EXISTS (SELECT 1 FROM item_venta_efectivo WHERE codigo = 'IVE-004-TIN');
    END IF;

    -- Venta efectivo 5
    INSERT INTO venta_efectivo (slip, fecha, id_dependencia, cajero, monto, codigo)
    SELECT 'SLIP-20250905-005', '2025-09-05', 1, 'Miguel Torres', 210.00, 'VE-005-2025'
    WHERE NOT EXISTS (SELECT 1 FROM venta_efectivo WHERE codigo = 'VE-005-2025')
    RETURNING id_venta_efectivo INTO v_ve_id;
    IF v_ve_id IS NOT NULL THEN
        INSERT INTO item_venta_efectivo (id_venta_efectivo, id_producto, cantidad, precio_compra, precio_venta, id_moneda, codigo)
        SELECT v_ve_id, v_prod_lienzo, 5, 12.00, 15.60, v_mon_usd, 'IVE-005-LIE'
        WHERE NOT EXISTS (SELECT 1 FROM item_venta_efectivo WHERE codigo = 'IVE-005-LIE');
        INSERT INTO item_venta_efectivo (id_venta_efectivo, id_producto, cantidad, precio_compra, precio_venta, id_moneda, codigo)
        SELECT v_ve_id, v_prod_camiseta, 8, 8.00, 10.40, v_mon_usd, 'IVE-005-TEX'
        WHERE NOT EXISTS (SELECT 1 FROM item_venta_efectivo WHERE codigo = 'IVE-005-TEX');
    END IF;
END $$;

-- =====================================================
-- 9. COMPRAS (a proveedores)
-- =====================================================

DO $$
DECLARE
    v_prov_art INT; v_prov_dic INT;
    v_mon_usd INT; v_mon_eur INT;
    v_compra INT;
    v_prod_tazas INT; v_prod_jarron INT; v_prod_mantel INT; v_prod_camiseta INT;
    v_prod_acrilica INT; v_prod_oleo INT;
BEGIN
    SELECT id_cliente INTO v_prov_art FROM clientes WHERE nit = 'TCP-ART-001';
    SELECT id_cliente INTO v_prov_dic FROM clientes WHERE nit = 'TCP-DIC-002';
    SELECT id_moneda INTO v_mon_usd FROM moneda WHERE simbolo = 'USD';
    SELECT id_moneda INTO v_mon_eur FROM moneda WHERE simbolo = 'EUR';
    SELECT id_producto INTO v_prod_tazas FROM productos WHERE codigo = 'CER-001';
    SELECT id_producto INTO v_prod_jarron FROM productos WHERE codigo = 'CER-002';
    SELECT id_producto INTO v_prod_mantel FROM productos WHERE codigo = 'TEX-001';
    SELECT id_producto INTO v_prod_camiseta FROM productos WHERE codigo = 'TEX-002';
    SELECT id_producto INTO v_prod_acrilica FROM productos WHERE codigo = 'PIN-001';
    SELECT id_producto INTO v_prod_oleo FROM productos WHERE codigo = 'PIN-002';

    -- Compra 1: Cerámica al Taller de Artemisa
    IF v_prov_art IS NOT NULL THEN
        INSERT INTO compras (id_cliente, fecha, total, estado, observacion)
        SELECT v_prov_art, '2025-03-01 10:00:00', 1200.00, 'COMPLETADA', 'Compra de cerámica artesanal - lote marzo'
        WHERE NOT EXISTS (SELECT 1 FROM compras WHERE id_cliente = v_prov_art AND observacion LIKE '%lote marzo%')
        RETURNING id_compra INTO v_compra;

        IF v_compra IS NOT NULL THEN
            INSERT INTO detalle_compras (id_compra, id_producto, cantidad, precio_unitario, subtotal)
            SELECT v_compra, v_prod_tazas, 15, 18.00, 270.00
            WHERE NOT EXISTS (SELECT 1 FROM detalle_compras WHERE id_compra = v_compra AND id_producto = v_prod_tazas);

            INSERT INTO detalle_compras (id_compra, id_producto, cantidad, precio_unitario, subtotal)
            SELECT v_compra, v_prod_jarron, 10, 35.00, 350.00
            WHERE NOT EXISTS (SELECT 1 FROM detalle_compras WHERE id_compra = v_compra AND id_producto = v_prod_jarron);

            INSERT INTO detalle_compras (id_compra, id_producto, cantidad, precio_unitario, subtotal)
            SELECT v_compra, v_prod_mantel, 8, 28.00, 224.00
            WHERE NOT EXISTS (SELECT 1 FROM detalle_compras WHERE id_compra = v_compra AND id_producto = v_prod_mantel);

            INSERT INTO detalle_compras (id_compra, id_producto, cantidad, precio_unitario, subtotal)
            SELECT v_compra, v_prod_camiseta, 20, 8.00, 160.00
            WHERE NOT EXISTS (SELECT 1 FROM detalle_compras WHERE id_compra = v_compra AND id_producto = v_prod_camiseta);
        END IF;
    END IF;

    -- Compra 2: Diseño textil a Diseño Independiente Caribe
    IF v_prov_dic IS NOT NULL THEN
        INSERT INTO compras (id_cliente, fecha, total, estado, observacion)
        SELECT v_prov_dic, '2025-04-15 14:30:00', 850.00, 'COMPLETADA', 'Compra de textiles artesanales'
        WHERE NOT EXISTS (SELECT 1 FROM compras WHERE id_cliente = v_prov_dic AND observacion LIKE '%textiles artesanales%')
        RETURNING id_compra INTO v_compra;

        IF v_compra IS NOT NULL THEN
            INSERT INTO detalle_compras (id_compra, id_producto, cantidad, precio_unitario, subtotal)
            SELECT v_compra, v_prod_mantel, 12, 28.00, 336.00
            WHERE NOT EXISTS (SELECT 1 FROM detalle_compras WHERE id_compra = v_compra AND id_producto = v_prod_mantel);

            INSERT INTO detalle_compras (id_compra, id_producto, cantidad, precio_unitario, subtotal)
            SELECT v_compra, v_prod_camiseta, 25, 8.00, 200.00
            WHERE NOT EXISTS (SELECT 1 FROM detalle_compras WHERE id_compra = v_compra AND id_producto = v_prod_camiseta);
        END IF;
    END IF;

    -- Compra 3: Materiales de arte a Juan Carlos Pérez
    IF (SELECT count(*) FROM clientes WHERE nit = 'NAT-900101-001') > 0 THEN
        INSERT INTO compras (id_cliente, fecha, total, estado, observacion)
        SELECT id_cliente, '2025-05-10 09:15:00', 1800.00, 'PENDIENTE', 'Compra de materiales de arte - reposición stock'
        FROM clientes WHERE nit = 'NAT-900101-001'
        AND NOT EXISTS (SELECT 1 FROM compras WHERE id_cliente = (SELECT id_cliente FROM clientes WHERE nit = 'NAT-900101-001') AND observacion LIKE '%reposición stock%')
        RETURNING id_compra INTO v_compra;

        IF v_compra IS NOT NULL THEN
            INSERT INTO detalle_compras (id_compra, id_producto, cantidad, precio_unitario, subtotal)
            SELECT v_compra, v_prod_acrilica, 30, 22.00, 660.00
            WHERE NOT EXISTS (SELECT 1 FROM detalle_compras WHERE id_compra = v_compra AND id_producto = v_prod_acrilica);

            INSERT INTO detalle_compras (id_compra, id_producto, cantidad, precio_unitario, subtotal)
            SELECT v_compra, v_prod_oleo, 15, 38.00, 570.00
            WHERE NOT EXISTS (SELECT 1 FROM detalle_compras WHERE id_compra = v_compra AND id_producto = v_prod_oleo);
        END IF;
    END IF;
END $$;

-- =====================================================
-- 10. LIQUIDACIONES (de productos consignados)
-- =====================================================

DO $$
DECLARE
    v_cli_jcp INT; v_cli_mer INT;
    v_conv_jcp INT; v_conv_art INT;
    v_anx_jcp1 INT; v_anx_art1 INT;
    v_mon_usd INT; v_mon_eur INT;
    v_liq_id INT;
    v_prod_lienzo INT; v_prod_acrilica INT; v_prod_oleo INT;
    v_prod_tazas INT; v_prod_jarron INT;
BEGIN
    SELECT id_cliente INTO v_cli_jcp FROM clientes WHERE nit = 'NAT-900101-001';
    SELECT id_cliente INTO v_cli_mer FROM clientes WHERE nit = 'NAT-850615-002';
    SELECT id_convenio INTO v_conv_jcp FROM convenio WHERE codigo = 'CONV-JCP-2025';
    SELECT id_convenio INTO v_conv_art FROM convenio WHERE codigo = 'CONV-ART-2025';
    SELECT id_anexo INTO v_anx_jcp1 FROM anexo WHERE codigo_anexo = 'ANX-JCP-001';
    SELECT id_anexo INTO v_anx_art1 FROM anexo WHERE codigo_anexo = 'ANX-ART-001';
    SELECT id_moneda INTO v_mon_usd FROM moneda WHERE simbolo = 'USD';
    SELECT id_moneda INTO v_mon_eur FROM moneda WHERE simbolo = 'EUR';
    SELECT id_producto INTO v_prod_lienzo FROM productos WHERE codigo = 'LIE-001';
    SELECT id_producto INTO v_prod_acrilica FROM productos WHERE codigo = 'PIN-001';
    SELECT id_producto INTO v_prod_oleo FROM productos WHERE codigo = 'PIN-002';
    SELECT id_producto INTO v_prod_tazas FROM productos WHERE codigo = 'CER-001';
    SELECT id_producto INTO v_prod_jarron FROM productos WHERE codigo = 'CER-002';

    -- Liquidación 1: Productos de Juan Carlos Pérez (materiales de arte)
    IF v_cli_jcp IS NOT NULL AND v_conv_jcp IS NOT NULL AND v_anx_jcp1 IS NOT NULL THEN
        INSERT INTO liquidacion (codigo, id_cliente, id_convenio, id_anexo, id_moneda, liquidada,
            fecha_emision, fecha_liquidacion, observaciones, importe, neto_pagar, devengado, tributario, comision_bancaria, gasto_empresa, porcentaje_caguayo, importe_caguayo, tributario_monto, tipo_pago)
        SELECT 'LIQ-JCP-2025-001', v_cli_jcp, v_conv_jcp, v_anx_jcp1, v_mon_usd, true,
               '2025-06-30', '2025-07-05', 'Liquidación de materiales de arte vendidos en Q2 2025',
               1850.00, 1580.00, 1700.00, 60.00, 35.00, 25.00, 10.00, 185.00, 85.00, 'TRANSFERENCIA'
        WHERE NOT EXISTS (SELECT 1 FROM liquidacion WHERE codigo = 'LIQ-JCP-2025-001')
        RETURNING id_liquidacion INTO v_liq_id;

        IF v_liq_id IS NOT NULL THEN
            INSERT INTO productos_en_liquidacion (codigo, id_producto, cantidad, precio, id_moneda, tipo_compra, id_anexo, id_liquidacion, liquidada, fecha, fecha_liquidacion)
            SELECT 'PL-LIE-001', v_prod_lienzo, 15, 15.60, v_mon_usd, 'COMPRA VENTA', v_anx_jcp1, v_liq_id, true, CURRENT_TIMESTAMP, '2025-07-05'
            WHERE NOT EXISTS (SELECT 1 FROM productos_en_liquidacion WHERE codigo = 'PL-LIE-001');

            INSERT INTO productos_en_liquidacion (codigo, id_producto, cantidad, precio, id_moneda, tipo_compra, id_anexo, id_liquidacion, liquidada, fecha, fecha_liquidacion)
            SELECT 'PL-PIN-001', v_prod_acrilica, 10, 28.60, v_mon_usd, 'COMPRA VENTA', v_anx_jcp1, v_liq_id, true, CURRENT_TIMESTAMP, '2025-07-05'
            WHERE NOT EXISTS (SELECT 1 FROM productos_en_liquidacion WHERE codigo = 'PL-PIN-001');
        END IF;
    END IF;

    -- Liquidación 2: Cerámica del Taller Artemisa
    IF v_conv_art IS NOT NULL AND v_anx_art1 IS NOT NULL THEN
        INSERT INTO liquidacion (codigo, id_cliente, id_convenio, id_anexo, id_moneda, liquidada,
            fecha_emision, fecha_liquidacion, observaciones, importe, neto_pagar, devengado, tributario, comision_bancaria, gasto_empresa, porcentaje_caguayo, importe_caguayo, tributario_monto, tipo_pago)
        SELECT 'LIQ-ART-2025-001', v_cli_mer, v_conv_art, v_anx_art1, v_mon_eur, false,
               '2025-08-15', NULL, 'Liquidación pendiente de cerámica artesanal',
               950.00, 810.00, 890.00, 30.00, 25.00, 25.00, 10.00, 95.00, 44.50, 'TRANSFERENCIA'
        WHERE NOT EXISTS (SELECT 1 FROM liquidacion WHERE codigo = 'LIQ-ART-2025-001')
        RETURNING id_liquidacion INTO v_liq_id;

        IF v_liq_id IS NOT NULL THEN
            INSERT INTO productos_en_liquidacion (codigo, id_producto, cantidad, precio, id_moneda, tipo_compra, id_anexo, id_liquidacion, liquidada, fecha)
            SELECT 'PL-CER-001', v_prod_tazas, 8, 23.40, v_mon_eur, 'COMPRA VENTA', v_anx_art1, v_liq_id, false, CURRENT_TIMESTAMP
            WHERE NOT EXISTS (SELECT 1 FROM productos_en_liquidacion WHERE codigo = 'PL-CER-001');

            INSERT INTO productos_en_liquidacion (codigo, id_producto, cantidad, precio, id_moneda, tipo_compra, id_anexo, id_liquidacion, liquidada, fecha)
            SELECT 'PL-CER-002', v_prod_jarron, 5, 45.50, v_mon_eur, 'COMPRA VENTA', v_anx_art1, v_liq_id, false, CURRENT_TIMESTAMP
            WHERE NOT EXISTS (SELECT 1 FROM productos_en_liquidacion WHERE codigo = 'PL-CER-002');
        END IF;
    END IF;
END $$;

-- =====================================================
-- 11. CUENTAS BANCARIAS DE DEPENDENCIAS
-- =====================================================
INSERT INTO cuenta_dependencias (id_dependencia, id_moneda, titular, banco, sucursal, numero_cuenta, direccion)
SELECT 1, (SELECT id_moneda FROM moneda WHERE simbolo = 'USD'), 'Caguayo S.A', 'Banco Financiero Internacional', 1, '0598765432100000', 'Miramar, Playa, La Habana'
WHERE NOT EXISTS (SELECT 1 FROM cuenta_dependencias WHERE id_dependencia = 1 AND numero_cuenta = '0598765432100000');

INSERT INTO cuenta_dependencias (id_dependencia, id_moneda, titular, banco, sucursal, numero_cuenta, direccion)
SELECT 1, (SELECT id_moneda FROM moneda WHERE simbolo = 'EUR'), 'Caguayo S.A', 'Banco Financiero Internacional', 1, '0598765432100001', 'Miramar, Playa, La Habana'
WHERE NOT EXISTS (SELECT 1 FROM cuenta_dependencias WHERE id_dependencia = 1 AND numero_cuenta = '0598765432100001');

INSERT INTO cuenta_dependencias (id_dependencia, id_moneda, titular, banco, sucursal, numero_cuenta, direccion)
SELECT 1, (SELECT id_moneda FROM moneda WHERE simbolo = 'CUP'), 'Caguayo S.A', 'Banco Metropolitano', 305, '0598765432100002', 'Miramar, Playa, La Habana'
WHERE NOT EXISTS (SELECT 1 FROM cuenta_dependencias WHERE id_dependencia = 1 AND numero_cuenta = '0598765432100002');

-- =====================================================
-- RESUMEN FINAL
-- =====================================================
-- Para verificar el seed, ejecutar después:
--   SELECT 'clientes', count(*) FROM clientes UNION ALL
--   SELECT 'productos', count(*) FROM productos UNION ALL
--   SELECT 'convenio', count(*) FROM convenio UNION ALL
--   SELECT 'anexo', count(*) FROM anexo UNION ALL
--   SELECT 'item_anexo', count(*) FROM item_anexo UNION ALL
--   SELECT 'contrato', count(*) FROM contrato UNION ALL
--   SELECT 'factura', count(*) FROM factura UNION ALL
--   SELECT 'pago', count(*) FROM pago UNION ALL
--   SELECT 'movimiento', count(*) FROM movimiento UNION ALL
--   SELECT 'venta_efectivo', count(*) FROM venta_efectivo UNION ALL
--   SELECT 'servicios', count(*) FROM servicios UNION ALL
--   SELECT 'solicitud_servicio', count(*) FROM solicitud_servicio UNION ALL
--   SELECT 'etapas', count(*) FROM etapas UNION ALL
--   SELECT 'tareas_etapa', count(*) FROM tareas_etapa UNION ALL
--   SELECT 'persona_etapa', count(*) FROM persona_etapa UNION ALL
--   SELECT 'factura_servicio', count(*) FROM factura_servicio UNION ALL
--   SELECT 'liquidacion', count(*) FROM liquidacion UNION ALL
--   SELECT 'compras', count(*) FROM compras;

COMMIT;
