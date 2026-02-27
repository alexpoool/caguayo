-- =====================================================
-- ESQUEMA DE BASE DE DATOS - CAGUAYO
-- =====================================================

-- Monedas
CREATE TABLE moneda (
    id_moneda SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    denominacion VARCHAR(100) NOT NULL,
    simbolo VARCHAR(5) NOT NULL UNIQUE
);

-- Categorías
CREATE TABLE categorias (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT
);

-- Subcategorías
CREATE TABLE subcategorias (
    id_subcategoria SERIAL PRIMARY KEY,
    id_categoria INTEGER NOT NULL REFERENCES categorias(id_categoria) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    UNIQUE (id_categoria, nombre)
);

-- Tipos de Movimiento
CREATE TABLE tipo_movimiento (
    id_tipo_movimiento SERIAL PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL UNIQUE,
    factor INTEGER NOT NULL CHECK (factor IN (1, -1))
);

-- Tipos de Dependencia
CREATE TABLE tipo_dependencia (
    id_tipo_dependencia SERIAL PRIMARY KEY,
    nombre VARCHAR(20) NOT NULL UNIQUE,
    descripcion TEXT
);

-- Tipos de Contrato
CREATE TABLE tipo_contrato (
    id_tipo_contrato SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT
);

-- Estados de Contrato
CREATE TABLE estado_contrato (
    id_estado_contrato SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT
);

-- Provincias
CREATE TABLE provincia (
    id_provincia SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

-- Municipios
CREATE TABLE municipio (
    id_municipio SERIAL PRIMARY KEY,
    id_provincia INTEGER NOT NULL REFERENCES provincia(id_provincia) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    UNIQUE (id_provincia, nombre)
);

-- Tipos de Cuenta
CREATE TABLE tipo_cuenta (
    id_tipo_cuenta SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT
);

-- Cuentas Bancarias
CREATE TABLE cuenta (
    id_cuenta SERIAL PRIMARY KEY,
    id_dependencia INTEGER REFERENCES dependencia(id_dependencia) ON DELETE SET NULL,
    id_tipo_cuenta INTEGER REFERENCES tipo_cuenta(id_tipo_cuenta) ON DELETE SET NULL,
    titular VARCHAR(150) NOT NULL,
    banco VARCHAR(100) NOT NULL,
    sucursal INTEGER,
    direccion VARCHAR(255) NOT NULL
);

-- Grupos de Usuarios
CREATE TABLE grupo (
    id_grupo SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT
);

-- Dependencias (Almacenes/Sucursales)
CREATE TABLE dependencia (
    id_dependencia SERIAL PRIMARY KEY,
    id_tipo_dependencia INTEGER NOT NULL REFERENCES tipo_dependencia(id_tipo_dependencia) ON DELETE CASCADE,
    codigo_padre INTEGER REFERENCES dependencia(id_dependencia) ON DELETE SET NULL,
    nombre VARCHAR(100) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    web VARCHAR(100),
    id_provincia INTEGER REFERENCES provincia(id_provincia) ON DELETE SET NULL,
    id_municipio INTEGER REFERENCES municipio(id_municipio) ON DELETE SET NULL,
    descripcion TEXT
);

-- Datos Generales de Dependencia
CREATE TABLE datos_generales_dependencia (
    id_datos_generales SERIAL PRIMARY KEY,
    direccion VARCHAR(255) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL
);

-- Usuarios del Sistema
CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    ci VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    primer_apellido VARCHAR(100) NOT NULL,
    segundo_apellido VARCHAR(100),
    alias VARCHAR(50) NOT NULL UNIQUE,
    contrasenia VARCHAR(255) NOT NULL,
    id_grupo INTEGER NOT NULL REFERENCES grupo(id_grupo) ON DELETE CASCADE,
    id_dependencia INTEGER REFERENCES dependencia(id_dependencia) ON DELETE SET NULL
);

-- Liquidaciones
CREATE TABLE liquidacion (
    id_liquidacion SERIAL PRIMARY KEY
);

-- Transacciones
CREATE TABLE transaccion (
    id_transaccion SERIAL PRIMARY KEY
);

-- Tipos de Cliente
CREATE TABLE tipo_cliente (
    id_tipo_cliente SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

-- Especialidades Artísticas
CREATE TABLE especialidades_artisticas (
    id_especialidad SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    categoria VARCHAR(50),
    activo BOOLEAN DEFAULT true
);

-- Clientes (fusionado con provedores)
CREATE TABLE clientes (
    id_cliente SERIAL PRIMARY KEY,
    id_tipo_cliente INTEGER REFERENCES tipo_cliente(id_tipo_cliente) ON DELETE SET NULL,
    nombre VARCHAR(150),
    email VARCHAR(100),
    direccion VARCHAR(255),
    tipo_persona VARCHAR(20) DEFAULT 'JURIDICA',
    nombre_artistico VARCHAR(150),
    telefono_principal VARCHAR(20),
    telefono_secundario VARCHAR(20),
    telefono VARCHAR(20),
    direccion_fiscal VARCHAR(255),
    direccion_estudio TEXT,
    especialidad_id INTEGER REFERENCES especialidades_artisticas(id_especialidad) ON DELETE SET NULL,
    estilo_artistico VARCHAR(100),
    tecnicas_principales TEXT[],
    ano_inicio_carrera INTEGER,
    estado VARCHAR(20) DEFAULT 'ACTIVO',
    fecha_registro VARCHAR(100) DEFAULT CURRENT_TIMESTAMP,
    fecha_ultima_actualizacion VARCHAR(100),
    etiquetas TEXT[],
    id_provincia INTEGER REFERENCES provincia(id_provincia) ON DELETE SET NULL,
    id_municipio INTEGER REFERENCES municipio(id_municipio) ON DELETE SET NULL,
    cedula_rif VARCHAR(20),
    activo BOOLEAN DEFAULT true
);

-- Clientes - Persona Natural
CREATE TABLE clientes_persona_natural (
    id_cliente INTEGER PRIMARY KEY REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    carnet_identidad VARCHAR(11) NOT NULL UNIQUE,
    primer_nombre VARCHAR(50) NOT NULL,
    segundo_nombre VARCHAR(50),
    primer_apellido VARCHAR(50) NOT NULL,
    segundo_apellido VARCHAR(50),
    genero VARCHAR(10) CHECK (genero IN ('MASCULINO', 'FEMENINO'))
);

-- Clientes - Persona Jurídica
CREATE TABLE clientes_persona_juridica (
    id_cliente INTEGER PRIMARY KEY REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    rif VARCHAR(20) NOT NULL UNIQUE,
    razon_social VARCHAR(200) NOT NULL,
    nombre_comercial VARCHAR(150),
    denominacion_comercial VARCHAR(100),
    numero_registro_mercantil VARCHAR(50),
    numero_artistas_asociados INTEGER,
    es_cooperativa BOOLEAN DEFAULT false,
    es_asociacion BOOLEAN DEFAULT false,
    es_fundacion BOOLEAN DEFAULT false,
    es_empresa_comercial BOOLEAN DEFAULT false,
    representante_legal_nombre VARCHAR(150) NOT NULL,
    representante_legal_cedula VARCHAR(20) NOT NULL,
    representante_legal_cargo VARCHAR(100) NOT NULL,
    representante_legal_telefono VARCHAR(20),
    representante_legal_email VARCHAR(100)
);

-- Tipos de Convenio
CREATE TABLE tipo_convenio (
    id_tipo_convenio SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

-- Convenios
CREATE TABLE convenio (
    id_convenio SERIAL PRIMARY KEY,
    id_cliente INTEGER NOT NULL REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    nombre_convenio VARCHAR(200) NOT NULL,
    fecha DATE NOT NULL,
    vigencia DATE NOT NULL,
    id_tipo_convenio INTEGER NOT NULL REFERENCES tipo_convenio(id_tipo_convenio) ON DELETE CASCADE
);

-- Anexos
CREATE TABLE anexo (
    id_anexo SERIAL PRIMARY KEY,
    id_convenio INTEGER NOT NULL REFERENCES convenio(id_convenio) ON DELETE CASCADE,
    nombre_anexo VARCHAR(200) NOT NULL,
    fecha DATE NOT NULL,
    numero_anexo VARCHAR(50) NOT NULL,
    id_dependencia INTEGER REFERENCES dependencia(id_dependencia) ON DELETE SET NULL,
    comision NUMERIC(10, 2)
);

-- Productos
CREATE TABLE productos (
    id_producto SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE,
    id_subcategoria INTEGER NOT NULL REFERENCES subcategorias(id_subcategoria) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    moneda_compra INTEGER NOT NULL REFERENCES moneda(id_moneda) ON DELETE CASCADE,
    precio_compra NUMERIC NOT NULL,
    moneda_venta INTEGER NOT NULL REFERENCES moneda(id_moneda) ON DELETE CASCADE,
    precio_venta NUMERIC NOT NULL,
    precio_minimo NUMERIC NOT NULL
);

-- Anexo-Producto (relación muchos a muchos)
CREATE TABLE anexo_producto (
    id_anexo INTEGER NOT NULL REFERENCES anexo(id_anexo) ON DELETE CASCADE,
    id_producto INTEGER NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    cantidad INTEGER DEFAULT 1,
    precio_acordado NUMERIC(15, 4),
    PRIMARY KEY (id_anexo, id_producto)
);

-- Ventas
CREATE TABLE ventas (
    id_venta SERIAL PRIMARY KEY,
    id_cliente INTEGER NOT NULL REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total NUMERIC DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'COMPLETADA', 'ANULADA')),
    observacion TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP
);

-- Detalle de Ventas
CREATE TABLE detalle_ventas (
    id_detalle SERIAL PRIMARY KEY,
    id_venta INTEGER NOT NULL REFERENCES ventas(id_venta) ON DELETE CASCADE,
    id_producto INTEGER NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC NOT NULL,
    subtotal NUMERIC NOT NULL
);

-- Movimientos (Inventario)
CREATE TABLE movimiento (
    id_movimiento SERIAL PRIMARY KEY,
    id_tipo_movimiento INTEGER NOT NULL REFERENCES tipo_movimiento(id_tipo_movimiento) ON DELETE CASCADE,
    id_dependencia INTEGER NOT NULL REFERENCES dependencia(id_dependencia) ON DELETE CASCADE,
    id_anexo INTEGER REFERENCES anexo(id_anexo) ON DELETE CASCADE,
    id_producto INTEGER NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observacion TEXT,
    id_liquidacion INTEGER REFERENCES liquidacion(id_liquidacion) ON DELETE CASCADE,
    estado VARCHAR(20) DEFAULT 'pendiente',
    codigo VARCHAR(100),
    id_convenio INTEGER REFERENCES anexo(id_anexo) ON DELETE CASCADE,
    id_cliente INTEGER REFERENCES clientes(id_cliente) ON DELETE SET NULL,
    precio_compra NUMERIC(15, 4),
    id_moneda_compra INTEGER REFERENCES moneda(id_moneda) ON DELETE CASCADE,
    precio_venta NUMERIC(15, 4),
    id_moneda_venta INTEGER REFERENCES moneda(id_moneda) ON DELETE CASCADE
);

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX idx_productos_codigo ON productos(codigo);
CREATE INDEX idx_productos_subcategoria ON productos(id_subcategoria);
CREATE INDEX idx_anexo_numero ON anexo(numero_anexo);
CREATE INDEX idx_anexo_convenio ON anexo(id_convenio);
CREATE INDEX idx_anexo_producto ON anexo(id_producto);
CREATE INDEX idx_movimiento_codigo ON movimiento(codigo);
CREATE INDEX idx_movimiento_convenio ON movimiento(id_convenio);
CREATE INDEX idx_movimiento_cliente ON movimiento(id_cliente);
CREATE INDEX idx_movimiento_producto ON movimiento(id_producto);
CREATE INDEX idx_movimiento_dependencia ON movimiento(id_dependencia);
CREATE INDEX idx_movimiento_tipo ON movimiento(id_tipo_movimiento);
CREATE INDEX idx_movimiento_estado ON movimiento(estado);
CREATE INDEX idx_movimiento_fecha ON movimiento(fecha);
CREATE INDEX idx_ventas_cliente ON ventas(id_cliente);
CREATE INDEX idx_ventas_estado ON ventas(estado);
CREATE INDEX idx_ventas_fecha ON ventas(fecha);
CREATE INDEX idx_detalle_venta_venta ON detalle_ventas(id_venta);
CREATE INDEX idx_detalle_venta_producto ON detalle_ventas(id_producto);
CREATE INDEX idx_clientes_cedula ON clientes(cedula_rif);
CREATE INDEX idx_convenio_cliente ON clientes(id_cliente);
CREATE INDEX idx_dependencia_padre ON dependencia(codigo_padre);
CREATE INDEX idx_dependencia_tipo ON dependencia(id_tipo_dependencia);
CREATE INDEX idx_usuarios_grupo ON usuarios(id_grupo);
CREATE INDEX idx_usuarios_dependencia ON usuarios(id_dependencia);
CREATE INDEX idx_cuenta_dependencia ON cuenta(id_dependencia);
CREATE INDEX idx_cuenta_tipo ON cuenta(id_tipo_cuenta);
CREATE INDEX idx_anexo_dependencia ON anexo(id_dependencia);

-- =====================================================
-- DATOS INICIALES - PROVINCIAS DE CUBA
-- =====================================================

INSERT INTO provincia (nombre) VALUES 
('Pinar del Río'),
('Artemisa'),
('La Habana'),
('Mayabeque'),
('Matanzas'),
('Cienfuegos'),
('Villa Clara'),
('Sancti Spiritus'),
('Ciego de Ávila'),
('Camagüey'),
('Las Tunas'),
('Holguín'),
('Granma'),
('Santiago de Cuba'),
('Guantánamo'),
('Isla de la Juventud');

-- =====================================================
-- DATOS INICIALES - MUNICIPIOS DE CUBA
-- =====================================================

INSERT INTO municipio (id_provincia, nombre) VALUES
-- Pinar del Río (id=1)
(1, 'Sandino'),
(1, 'Mantua'),
(1, 'Minas de Matahambre'),
(1, 'Viñales'),
(1, 'La Palma'),
(1, 'Los Palacios'),
(1, 'Consolación del Sur'),
(1, 'Pinar del Río'),
(1, 'San Luis'),
(1, 'San Juan y Martínez'),
(1, 'Guane'),

-- Artemisa (id=2)
(2, 'Bahía Honda'),
(2, 'Mariel'),
(2, 'Guanajay'),
(2, 'Caimito'),
(2, 'Bauta'),
(2, 'San Antonio de los Baños'),
(2, 'Güira de Melena'),
(2, 'Artemisa'),
(2, 'Candelaria'),
(2, 'San Cristóbal'),
(2, 'Alquízar'),
(2, 'Güines'),
(2, 'Batabanó'),
(2, 'Melena del Sur'),
(2, 'Quivicán'),

-- La Habana (id=3)
(3, 'Playa'),
(3, 'Plaza de la Revolución'),
(3, 'Centro Habana'),
(3, 'La Habana Vieja'),
(3, 'Regla'),
(3, 'La Habana del Este'),
(3, 'Guanabacoa'),
(3, 'San Miguel del Padrón'),
(3, 'Diez de Octubre'),
(3, 'Cerro'),
(3, 'Marianao'),
(3, 'La Lisa'),
(3, 'Boyeros'),
(3, 'Arroyo Naranjo'),
(3, 'Cotorro'),

-- Mayabeque (id=4)
(4, 'Bejucal'),
(4, 'San José de las Lajas'),
(4, 'Jaruco'),
(4, 'Santa Cruz del Norte'),
(4, 'Madruga'),
(4, 'Nueva Paz'),
(4, 'San Nicolás'),
(4, 'Güines'),
(4, 'Melena del Sur'),
(4, 'Batabanó'),

-- Matanzas (id=5)
(5, 'Matanzas'),
(5, 'Cárdenas'),
(5, 'Martí'),
(5, 'Colón'),
(5, 'Perico'),
(5, 'Jovellanos'),
(5, 'Pedro Betancourt'),
(5, 'Limonar'),
(5, 'Unión de Reyes'),
(5, 'Ciénaga de Zapata'),
(5, 'Jagüey Grande'),
(5, 'Calimete'),
(5, 'Los Arabos'),

-- Cienfuegos (id=6)
(6, 'Aguada de Pasajeros'),
(6, 'Rodas'),
(6, 'Palmira'),
(6, 'Lajas'),
(6, 'Cruces'),
(6, 'Cumanayagua'),
(6, 'Cienfuegos'),
(6, 'Abreus'),

-- Villa Clara (id=7)
(7, 'Corralillo'),
(7, 'Quemado de Güines'),
(7, 'Sagua la Grande'),
(7, 'Encrucijada'),
(7, 'Camajuaní'),
(7, 'Caibarién'),
(7, 'Remedios'),
(7, 'Placetas'),
(7, 'Santa Clara'),
(7, 'Cifuentes'),
(7, 'Santo Domingo'),
(7, 'Ranchuelo'),
(7, 'Manicaragua'),

-- Sancti Spiritus (id=8)
(8, 'Yaguajay'),
(8, 'Jatibonico'),
(8, 'Taguasco'),
(8, 'Cabaiguán'),
(8, 'Fomento'),
(8, 'Trinidad'),
(8, 'Sancti Spíritus'),
(8, 'La Sierpe'),

-- Ciego de Ávila (id=9)
(9, 'Chambas'),
(9, 'Morón'),
(9, 'Bolivia'),
(9, 'Primero de Enero'),
(9, 'Ciro Redondo'),
(9, 'Florencia'),
(9, 'Majagua'),
(9, 'Ciego de Ávila'),
(9, 'Venezuela'),
(9, 'Baraguá'),

-- Camagüey (id=10)
(10, 'Carlos Manuel de Céspedes'),
(10, 'Esmeralda'),
(10, 'Sierra de Cubitas'),
(10, 'Minas'),
(10, 'Nuevitas'),
(10, 'Guáimaro'),
(10, 'Sibanicú'),
(10, 'Najasa'),
(10, 'Santa Cruz del Sur'),
(10, 'Camagüey'),
(10, 'Florida'),
(10, 'Vertientes'),
(10, 'Jimaguayú'),

-- Las Tunas (id=11)
(11, 'Manatí'),
(11, 'Puerto Padre'),
(11, 'Jesús Menéndez'),
(11, 'Majibacoa'),
(11, 'Las Tunas'),
(11, 'Jobabo'),
(11, 'Colombia'),
(11, 'Amancio'),

-- Holguín (id=12)
(12, 'Gibara'),
(12, 'Rafael Freyre'),
(12, 'Banes'),
(12, 'Antilla'),
(12, 'Báguanos'),
(12, 'Holguín'),
(12, 'Calixto García'),
(12, 'Cacocum'),
(12, 'Urbano Noris'),
(12, 'Cueto'),
(12, 'Mayarí'),
(12, 'Frank País'),
(12, 'Sagua de Tánamo'),
(12, 'Moa'),

-- Granma (id=13)
(13, 'Río Cauto'),
(13, 'Cauto Cristo'),
(13, 'Jiguaní'),
(13, 'Bayamo'),
(13, 'Yara'),
(13, 'Manzanillo'),
(13, 'Media Luna'),
(13, 'Campechuela'),
(13, 'Niquero'),
(13, 'Pilón'),
(13, 'Bartolomé Masó'),
(13, 'Buey Arriba'),
(13, 'Guisa'),

-- Santiago de Cuba (id=14)
(14, 'Contramaestre'),
(14, 'Mella'),
(14, 'San Luis'),
(14, 'Segundo Frente'),
(14, 'Songo-La Maya'),
(14, 'Santiago de Cuba'),
(14, 'Palma Soriano'),
(14, 'Tercer Frente'),
(14, 'Guama'),

-- Guantánamo (id=15)
(15, 'Yateras'),
(15, 'Baracoa'),
(15, 'Maisí'),
(15, 'Imías'),
(15, 'San Antonio del Sur'),
(15, 'Caimanera'),
(15, 'Guantánamo'),
(15, 'Niceto Pérez'),
(15, 'Manuel Tames'),
(15, 'El Salvador'),

-- Isla de la Juventud (id=16)
(16, 'Isla de la Juventud');
