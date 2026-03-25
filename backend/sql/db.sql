-- =====================================================
-- ESQUEMA DE BASE DE DATOS - CAGUAYO
-- =====================================================
-- Organización: Primero tablas, luego inserciones de datos

-- =====================================================
-- TABLAS DE CATÁLOGO
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

-- Tipos de Cuenta
CREATE TABLE tipo_cuenta (
    id_tipo_cuenta SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT
);

-- Tipos de Entidad (para personas jurídicas)
CREATE TABLE tipo_entidad (
    id_tipo_entidad SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT
);

-- Tipos de Cliente
CREATE TABLE tipo_cliente (
    id_tipo_cliente SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

-- Tipos de Proveedor
CREATE TABLE tipo_proveedor (
    id_tipo_proveedor SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

-- Tipos de Convenio
CREATE TABLE tipo_convenio (
    id_tipo_convenio SERIAL PRIMARY KEY,
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

-- =====================================================
-- TABLAS GEOGRÁFICAS
-- =====================================================

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

-- =====================================================
-- TABLAS DE CLIENTES
-- =====================================================

-- Clientes
CREATE TABLE clientes (
    id_cliente SERIAL PRIMARY KEY,
    numero_cliente VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(200) NOT NULL,
    tipo_persona VARCHAR(20) NOT NULL CHECK (tipo_persona IN ('NATURAL', 'JURIDICA', 'TCP')),
    cedula_rif VARCHAR(20) NOT NULL UNIQUE,
    telefono VARCHAR(20),
    email VARCHAR(100),
    fax VARCHAR(20),
    web VARCHAR(100),
    id_provincia INTEGER REFERENCES provincia(id_provincia) ON DELETE SET NULL,
    id_municipio INTEGER REFERENCES municipio(id_municipio) ON DELETE SET NULL,
    codigo_postal VARCHAR(10),
    direccion TEXT NOT NULL,
    tipo_relacion VARCHAR(20) NOT NULL CHECK (tipo_relacion IN ('CLIENTE', 'PROVEEDOR', 'AMBAS')),
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('ACTIVO', 'INACTIVO')),
    fecha_registro DATE NOT NULL DEFAULT CURRENT_DATE,
    activo BOOLEAN NOT NULL DEFAULT true
);

-- Clientes - Persona Natural
CREATE TABLE clientes_persona_natural (
    id_cliente INTEGER PRIMARY KEY REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    nombre VARCHAR(50) NOT NULL,
    primer_apellido VARCHAR(50) NOT NULL,
    segundo_apellido VARCHAR(50),
    carnet_identidad VARCHAR(11) NOT NULL UNIQUE,
    codigo_expediente VARCHAR(50),
    numero_registro VARCHAR(50),
    catalogo VARCHAR(100),
    es_trabajador BOOLEAN NOT NULL DEFAULT false,
    ocupacion VARCHAR(100),
    centro_trabajo VARCHAR(200),
    correo_trabajo VARCHAR(100),
    direccion_trabajo TEXT,
    telefono_trabajo VARCHAR(20),
    en_baja BOOLEAN NOT NULL DEFAULT false,
    fecha_baja DATE,
    vigencia DATE
);

-- Clientes - Persona Jurídica
CREATE TABLE clientes_persona_juridica (
    id_cliente INTEGER PRIMARY KEY REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    codigo_reup VARCHAR(50) NOT NULL UNIQUE,
    id_tipo_entidad INTEGER REFERENCES tipo_entidad(id_tipo_entidad) ON DELETE SET NULL
);

-- Clientes - TCP (Trabajador por Cuenta Propia)
CREATE TABLE cliente_tcp (
    id_cliente INTEGER PRIMARY KEY REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    nombre VARCHAR(50) NOT NULL,
    primer_apellido VARCHAR(50) NOT NULL,
    segundo_apellido VARCHAR(50),
    direccion TEXT NOT NULL,
    numero_registro_proyecto VARCHAR(50),
    fecha_aprobacion DATE
);

-- =====================================================
-- TABLAS DE ORGANIZACIÓN
-- =====================================================

-- Grupos de Usuarios
CREATE TABLE grupo (
    id_grupo SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT
);

-- Funcionalidades
CREATE TABLE funcionalidad (
    id_funcionalidad SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE
);

-- Grupo-Funcionalidad (relación muchos a muchos)
CREATE TABLE grupo_funcionalidad (
    id_grupo INTEGER NOT NULL REFERENCES grupo(id_grupo),
    id_funcionalidad INTEGER NOT NULL REFERENCES funcionalidad(id_funcionalidad),
    PRIMARY KEY (id_grupo, id_funcionalidad)
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
    base_datos VARCHAR(100),
    host VARCHAR(100) DEFAULT 'localhost',
    puerto INTEGER DEFAULT 5432,
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

-- Sesiones
CREATE TABLE sesion (
    id_sesion SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    token VARCHAR(500) NOT NULL UNIQUE,
    base_datos VARCHAR(100) NOT NULL,
    fecha_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP NOT NULL
);

-- Conexión a Database
CREATE TABLE conexion_database (
    id_conexion SERIAL PRIMARY KEY,
    host VARCHAR(100) DEFAULT 'localhost',
    puerto INTEGER DEFAULT 5432,
    usuario VARCHAR(100),
    contrasenia VARCHAR(255),
    nombre_database VARCHAR(100) NOT NULL
);

-- Cuentas Bancarias
CREATE TABLE cuenta (
    id_cuenta SERIAL PRIMARY KEY,
    id_cliente INTEGER REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    id_dependencia INTEGER REFERENCES dependencia(id_dependencia) ON DELETE SET NULL,
    id_tipo_cuenta INTEGER REFERENCES tipo_cuenta(id_tipo_cuenta) ON DELETE SET NULL,
    id_moneda INTEGER REFERENCES moneda(id_moneda) ON DELETE SET NULL,
    titular VARCHAR(150) NOT NULL,
    banco VARCHAR(100) NOT NULL,
    sucursal INTEGER,
    numero_cuenta VARCHAR(50) NOT NULL,
    direccion VARCHAR(255) NOT NULL
);

-- =====================================================
-- TABLAS DE PRODUCTOS
-- =====================================================

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

-- =====================================================
-- TABLAS DE CONVENIOS Y ANEXOS
-- =====================================================

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
    id_moneda INTEGER REFERENCES moneda(id_moneda) ON DELETE SET NULL,
    nombre_anexo VARCHAR(200) NOT NULL,
    fecha DATE NOT NULL,
    codigo_anexo VARCHAR(50),
    id_dependencia INTEGER REFERENCES dependencia(id_dependencia) ON DELETE SET NULL,
    comision NUMERIC(10, 2)
);

-- Item-Anexo (reemplaza anexo_producto)
CREATE TABLE item_anexo (
    id_item_anexo SERIAL PRIMARY KEY,
    id_anexo INTEGER NOT NULL REFERENCES anexo(id_anexo) ON DELETE CASCADE,
    id_producto INTEGER NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_compra NUMERIC(15, 4) NOT NULL,
    precio_venta NUMERIC(15, 4) NOT NULL,
    id_moneda INTEGER NOT NULL REFERENCES moneda(id_moneda) ON DELETE CASCADE
);

-- =====================================================
-- TABLAS DE CONTRATOS
-- =====================================================

-- Contratos
CREATE TABLE contrato (
    id_contrato SERIAL PRIMARY KEY,
    id_cliente INTEGER NOT NULL REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    proforma VARCHAR(100),
    id_estado INTEGER NOT NULL REFERENCES estado_contrato(id_estado_contrato) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    vigencia DATE NOT NULL,
    id_tipo_contrato INTEGER NOT NULL REFERENCES tipo_contrato(id_tipo_contrato) ON DELETE CASCADE,
    id_moneda INTEGER NOT NULL REFERENCES moneda(id_moneda) ON DELETE CASCADE,
    monto NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    documento_final VARCHAR(255)
);



-- Suplementos
CREATE TABLE suplemento (
    id_suplemento SERIAL PRIMARY KEY,
    id_contrato INTEGER NOT NULL REFERENCES contrato(id_contrato) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    id_estado INTEGER NOT NULL REFERENCES estado_contrato(id_estado_contrato) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    monto NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    documento VARCHAR(255)
);



-- Facturas
CREATE TABLE factura (
    id_factura SERIAL PRIMARY KEY,
    id_contrato INTEGER NOT NULL REFERENCES contrato(id_contrato) ON DELETE CASCADE,
    codigo_factura VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    observaciones TEXT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    monto NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    pago_actual NUMERIC(15, 2) NOT NULL DEFAULT 0.00
);

-- Item-Factura (reemplaza factura_producto)
CREATE TABLE item_factura (
    id_item_factura SERIAL PRIMARY KEY,
    id_factura INTEGER NOT NULL REFERENCES factura(id_factura) ON DELETE CASCADE,
    id_producto INTEGER NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_compra NUMERIC(15, 4) NOT NULL,
    precio_venta NUMERIC(15, 4) NOT NULL,
    id_moneda INTEGER NOT NULL REFERENCES moneda(id_moneda) ON DELETE CASCADE
);

-- =====================================================
-- TABLAS DE VENTAS
-- =====================================================

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

-- Ventas en Efectivo
CREATE TABLE venta_efectivo (
    id_venta_efectivo SERIAL PRIMARY KEY,
    slip VARCHAR(100) NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    id_dependencia INTEGER NOT NULL REFERENCES dependencia(id_dependencia) ON DELETE CASCADE,
    cajero VARCHAR(100) NOT NULL,
    monto NUMERIC(15, 2) NOT NULL DEFAULT 0.00
);

-- Item-Venta-Efectivo (reemplaza venta_efectivo_producto)
CREATE TABLE item_venta_efectivo (
    id_item_venta_efectivo SERIAL PRIMARY KEY,
    id_venta_efectivo INTEGER NOT NULL REFERENCES venta_efectivo(id_venta_efectivo) ON DELETE CASCADE,
    id_producto INTEGER NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_compra NUMERIC(15, 4) NOT NULL,
    precio_venta NUMERIC(15, 4) NOT NULL,
    id_moneda INTEGER NOT NULL REFERENCES moneda(id_moneda) ON DELETE CASCADE
);

-- =====================================================
-- TABLAS DE LIQUIDACIONES
-- =====================================================

-- Liquidaciones
CREATE TABLE liquidacion (
    id_liquidacion SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    id_cliente INTEGER NOT NULL REFERENCES clientes(id_cliente),
    id_convenio INTEGER REFERENCES convenio(id_convenio),
    id_anexo INTEGER REFERENCES anexo(id_anexo),
    id_moneda INTEGER NOT NULL REFERENCES moneda(id_moneda),
    liquidada BOOLEAN DEFAULT FALSE,
    fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_liquidacion DATE,
    observaciones TEXT,
    devengado NUMERIC(15, 2) DEFAULT 0.00,
    tributario NUMERIC(15, 2) DEFAULT 0.00,
    comision_bancaria NUMERIC(15, 2) DEFAULT 0.00,
    gasto_empresa NUMERIC(15, 2) DEFAULT 0.00,
    importe NUMERIC(15, 2) DEFAULT 0.00,
    neto_pagar NUMERIC(15, 2) DEFAULT 0.00,
    tipo_pago VARCHAR(20) DEFAULT 'TRANSFERENCIA'
);

-- Productos en Liquidación
CREATE TABLE productos_en_liquidacion (
    id_producto_en_liquidacion SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    id_producto INTEGER NOT NULL REFERENCES productos(id_producto),
    cantidad INTEGER NOT NULL,
    precio NUMERIC(15, 4) NOT NULL,
    id_moneda INTEGER NOT NULL REFERENCES moneda(id_moneda),
    tipo_compra VARCHAR(20) NOT NULL,
    id_factura INTEGER REFERENCES factura(id_factura),
    id_venta_efectivo INTEGER REFERENCES venta_efectivo(id_venta_efectivo),
    id_anexo INTEGER REFERENCES anexo(id_anexo),
    id_liquidacion INTEGER REFERENCES liquidacion(id_liquidacion),
    liquidada BOOLEAN DEFAULT FALSE,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_liquidacion TIMESTAMP
);

-- Transacciones
CREATE TABLE transaccion (
    id_transaccion SERIAL PRIMARY KEY
);

-- =====================================================
-- TABLAS DE MOVIMIENTOS
-- =====================================================

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
    id_convenio INTEGER REFERENCES convenio(id_convenio) ON DELETE CASCADE,
    id_cliente INTEGER REFERENCES clientes(id_cliente) ON DELETE SET NULL,
    precio_compra NUMERIC(15, 4),
    moneda_compra INTEGER REFERENCES moneda(id_moneda) ON DELETE CASCADE,
    precio_venta NUMERIC(15, 4),
    moneda_venta INTEGER REFERENCES moneda(id_moneda) ON DELETE CASCADE,
    id_factura INTEGER REFERENCES factura(id_factura) ON DELETE CASCADE,
    id_venta_efectivo INTEGER REFERENCES venta_efectivo(id_venta_efectivo) ON DELETE CASCADE,
    id_contrato INTEGER REFERENCES contrato(id_contrato) ON DELETE CASCADE
);

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX idx_productos_codigo ON productos(codigo);
CREATE INDEX idx_productos_subcategoria ON productos(id_subcategoria);
CREATE INDEX idx_anexo_codigo ON anexo(codigo_anexo);
CREATE INDEX idx_anexo_convenio ON anexo(id_convenio);
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
CREATE INDEX idx_cuenta_cliente ON cuenta(id_cliente);
CREATE INDEX idx_anexo_dependencia ON anexo(id_dependencia);
CREATE INDEX idx_item_anexo_anexo ON item_anexo(id_anexo);
CREATE INDEX idx_item_anexo_producto ON item_anexo(id_producto);
CREATE INDEX idx_contrato_cliente ON contrato(id_cliente);
CREATE INDEX idx_contrato_estado ON contrato(id_estado);
CREATE INDEX idx_contrato_tipo ON contrato(id_tipo_contrato);
CREATE INDEX idx_contrato_moneda ON contrato(id_moneda);
CREATE INDEX idx_suplemento_contrato ON suplemento(id_contrato);
CREATE INDEX idx_suplemento_estado ON suplemento(id_estado);
CREATE INDEX idx_factura_contrato ON factura(id_contrato);
CREATE INDEX idx_factura_codigo ON factura(codigo_factura);
CREATE INDEX idx_item_factura_factura ON item_factura(id_factura);
CREATE INDEX idx_item_factura_producto ON item_factura(id_producto);
CREATE INDEX idx_venta_efectivo_dependencia ON venta_efectivo(id_dependencia);
CREATE INDEX idx_venta_efectivo_fecha ON venta_efectivo(fecha);
CREATE INDEX idx_item_venta_efectivo_venta ON item_venta_efectivo(id_venta_efectivo);
CREATE INDEX idx_item_venta_efectivo_producto ON item_venta_efectivo(id_producto);

-- =====================================================
-- DATOS INICIALES
-- =====================================================

-- Monedas
INSERT INTO moneda (nombre, denominacion, simbolo) VALUES 
('Dólar Americano', 'Dólar Estadounidense', 'USD'),
('Euro', 'Euro de la Unión Europea', 'EUR'),
('Peso Mexicano', 'Peso Mexicano', 'MXN'),
('Peso Colombiano', 'Peso Colombiano', 'COP'),
('Peso Cubano', 'Peso Cubano', 'CUP'),
('BRICS', 'Alinza BRICS', 'BRICS');

-- Tipos de Contrato
INSERT INTO tipo_contrato (nombre, descripcion) VALUES 
('SERVICIO', 'Contrato de servicios'),
('OBRA', 'Contrato de obra'),
('MANTENIMIENTO', 'Contrato de mantenimiento'),
('ALQUILER', 'Contrato de alquiler'),
('COMPRA', 'Contrato de compraventa');

-- Tipos de Convenio
INSERT INTO tipo_convenio (nombre, descripcion) VALUES 
('Contrato de Servicios', 'Contrato de servicios'),
('Acuerdo de Suministro', 'Acuerdo de suministro'),
('Contrato de Obra', 'Contrato de obra'),
('Convenio Marco', 'Convenio marco'),
('COMPRA VENTA', 'Convenio de compraventa de productos');

-- Estados de Contrato
INSERT INTO estado_contrato (nombre, descripcion) VALUES 
('ACTIVO', 'Contrato vigente'),
('CANCELADO', 'Contrato cancelado'),
('FINALIZADO', 'Contrato finalizado'),
('PENDIENTE', 'Contrato pendiente de aprobación');

-- Tipos de Movimiento
INSERT INTO tipo_movimiento (tipo, factor) VALUES 
('compra', 1),
('venta', -1),
('RECEPCION', 1),
('MERMA', -1),
('DONACION', -1),
('DEVOLUCION', -1),
('AJUSTE_QUITAR', -1),
('AJUSTE_AGREGAR', 1);

-- Tipos de Entidad
INSERT INTO tipo_entidad (nombre, descripcion) VALUES 
('OSDE', 'Organización Superior de Dirección Empresarial'),
('UEB', 'Unidad Empresarial de Base'),
('Empresas Presupuestadas', 'Entidades presupuestadas del Estado'),
('Instituciones MINSAP', 'Instituciones rectoras del Ministerio de Salud Pública');

-- Tipos de Proveedor
INSERT INTO tipo_proveedor (nombre, descripcion) VALUES 
('Nacional', 'Proveedor nacional'),
('Internacional', 'Proveedor internacional'),
('Persona Natural', 'Persona física como proveedor'),
('Persona Jurídica', 'Empresa o entidad jurídica como proveedor');

-- Tipos de Cuenta
INSERT INTO tipo_cuenta (nombre, descripcion) VALUES 
('Corriente', 'Cuenta corriente'),
('Ahorros', 'Cuenta de ahorros'),
('Moneda Nacional', 'Cuenta en moneda nacional'),
('Moneda Extranjera', 'Cuenta en moneda extranjera');

-- Categorías
INSERT INTO categorias (nombre, descripcion) VALUES 
('General', 'Categoría general de productos');

-- Subcategorías
INSERT INTO subcategorias (id_categoria, nombre, descripcion) VALUES 
(1, 'General', 'Subcategoría general de productos');

-- Provincias de Cuba
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

-- Municipios de Cuba
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

-- =====================================================
-- USUARIO SUPERADMINISTRADOR
-- =====================================================

-- Grupos
INSERT INTO grupo (nombre, descripcion) VALUES 
('ADMINISTRADOR', 'Grupo con acceso total al sistema');

-- Funcionalidades del sistema (solo items de sidebar y tabs de configuración)
INSERT INTO funcionalidad (nombre) VALUES 
('movimientos'),
('pendientes'),
('productos'),
('configuracion'),
('monedas'),
('usuarios'),
('grupos'),
('proveedores'),
('convenios'),
('anexos'),
('liquidaciones'),
('productos_liquidacion'),
('clientes'),
('contratos'),
('suplementos'),
('facturas'),
('efectivo');

-- Asignar todas las funcionalidades al grupo ADMINISTRADOR
INSERT INTO grupo_funcionalidad (id_grupo, id_funcionalidad)
SELECT 1, id_funcionalidad FROM funcionalidad;


-- Tipo de dependencia para la matriz
INSERT INTO tipo_dependencia (nombre, descripcion) VALUES 
('SUCURSAL', 'Sucursal o agencia'),
('ALMACEN', 'Almacén de productos');

-- Dependencia matriz (oficina principal)
INSERT INTO dependencia (id_tipo_dependencia, nombre, direccion, telefono, email, web, id_provincia, id_municipio, descripcion)
VALUES (1, 'Caguayo', 'Vista Alegre', '+53 7 1234567', 'info@caguayo.cu', 'https://caguayo.cu', 14, 14, 'Oficina principal de Caguayo');

-- Usuario superadministrador (contraseña: Admin123@)
INSERT INTO usuarios (ci, nombre, primer_apellido, segundo_apellido, alias, contrasenia, id_grupo, id_dependencia)
VALUES 
('00000000000', 'Administrador', 'Sistema', 'Caguayo', 'admin', '$2b$12$21cZipaElHLRaXOxScHGjOPbMVXpvxn2aSwQus/P4/Vs0z0bouTb2', 1, 1);
