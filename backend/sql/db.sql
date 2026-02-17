-- ============================================================================
-- CAGUAYO WEBAPP - SISTEMA DE INVENTARIO
-- Script de creación de base de datos basado en modelos SQLModel
-- ============================================================================

-- 1. Tabla: moneda
CREATE TABLE moneda (
    id_moneda SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    denominacion VARCHAR(100) NOT NULL,
    simbolo VARCHAR(5) NOT NULL UNIQUE
);

-- 2. Tabla: categorias
CREATE TABLE categorias (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT
);

-- 3. Tabla: subcategorias
CREATE TABLE subcategorias (
    id_subcategoria SERIAL PRIMARY KEY,
    id_categoria INTEGER NOT NULL REFERENCES categorias(id_categoria) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    UNIQUE (id_categoria, nombre)
);

-- 4. Tabla: tipo_movimiento
CREATE TABLE tipo_movimiento (
    id_tipo_movimiento SERIAL PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL UNIQUE,
    factor INTEGER NOT NULL CHECK (factor IN (1, -1))
);

-- 5. Tabla: tipo_dependencia
CREATE TABLE tipo_dependencia (
    id_tipo_dependencia SERIAL PRIMARY KEY,
    nombre VARCHAR(20) NOT NULL UNIQUE,
    descripcion TEXT
);

-- 6. Tabla: datos_generales_dependencia
CREATE TABLE datos_generales_dependencia (
    id_datos_generales SERIAL PRIMARY KEY,
    direccion VARCHAR(255) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL
);

-- 7. Tabla: dependencia
CREATE TABLE dependencia (
    id_dependencia SERIAL PRIMARY KEY,
    id_tipo_dependencia INTEGER NOT NULL REFERENCES tipo_dependencia(id_tipo_dependencia) ON DELETE CASCADE,
    id_datos_generales INTEGER NOT NULL REFERENCES datos_generales_dependencia(id_datos_generales) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL
);

-- 8. Tabla: liquidacion
CREATE TABLE liquidacion (
    id_liquidacion SERIAL PRIMARY KEY
);

-- 9. Tabla: transaccion
CREATE TABLE transaccion (
    id_transaccion SERIAL PRIMARY KEY
);

-- 10. Tabla: tipo_provedores
CREATE TABLE tipo_provedores (
    id_tipo_provedores SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

-- 11. Tabla: provedores
CREATE TABLE provedores (
    id_provedores SERIAL PRIMARY KEY,
    id_tipo_provedor INTEGER NOT NULL REFERENCES tipo_provedores(id_tipo_provedores) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    email VARCHAR(100),
    direccion VARCHAR(255)
);

-- 12. Tabla: tipo_convenio
CREATE TABLE tipo_convenio (
    id_tipo_convenio SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

-- 13. Tabla: convenio
CREATE TABLE convenio (
    id_convenio SERIAL PRIMARY KEY,
    id_provedor INTEGER NOT NULL REFERENCES provedores(id_provedores) ON DELETE CASCADE,
    nombre_convenio VARCHAR(200) NOT NULL,
    fecha DATE NOT NULL,
    vigencia DATE NOT NULL,
    id_tipo_convenio INTEGER NOT NULL REFERENCES tipo_convenio(id_tipo_convenio) ON DELETE CASCADE
);

-- 14. Tabla: anexo (ACTUALIZADA - Migración o5p6q7r8s9t0)
CREATE TABLE anexo (
    id_anexo SERIAL PRIMARY KEY,
    id_convenio INTEGER NOT NULL REFERENCES convenio(id_convenio) ON DELETE CASCADE,
    id_producto INTEGER REFERENCES productos(id_producto) ON DELETE CASCADE,
    nombre_anexo VARCHAR(200) NOT NULL,
    fecha DATE NOT NULL,
    numero_anexo VARCHAR(50) NOT NULL,
    id_dependencia INTEGER NOT NULL,
    comision NUMERIC(10, 2)
);

-- 15. Tabla: productos (ACTUALIZADA - Migración l2m3n4o5p6q7)
CREATE TABLE productos (
    id_producto SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE,
    id_subcategoria INTEGER NOT NULL REFERENCES subcategorias(id_subcategoria) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    moneda_compra INTEGER NOT NULL REFERENCES moneda(id_moneda) ON DELETE CASCADE,
    precio_compra NUMERIC(15, 4) NOT NULL,
    moneda_venta INTEGER NOT NULL REFERENCES moneda(id_moneda) ON DELETE CASCADE,
    precio_venta NUMERIC(15, 4) NOT NULL,
    precio_minimo NUMERIC(15, 4) NOT NULL
);

-- 16. Tabla: clientes (NUEVO - Migración 4afe28ed5947)
CREATE TABLE clientes (
    id_cliente SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(100),
    cedula_rif VARCHAR(20),
    direccion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 17. Tabla: ventas (ACTUALIZADA - Migración 4afe28ed5947)
CREATE TABLE ventas (
    id_venta SERIAL PRIMARY KEY,
    id_cliente INTEGER NOT NULL REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total NUMERIC(15, 2) NOT NULL DEFAULT 0,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'COMPLETADA', 'ANULADA')),
    observacion TEXT,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP
);

-- 18. Tabla: detalle_ventas (NUEVO - Migración 4afe28ed5947)
CREATE TABLE detalle_ventas (
    id_detalle SERIAL PRIMARY KEY,
    id_venta INTEGER NOT NULL REFERENCES ventas(id_venta) ON DELETE CASCADE,
    id_producto INTEGER NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(15, 2) NOT NULL,
    subtotal NUMERIC(15, 2) NOT NULL
);

-- 19. Tabla: movimiento (ACTUALIZADA - Migraciones m3n4o5p6q7r8, o5p6q7r8s9t0)
CREATE TABLE movimiento (
    id_movimiento SERIAL PRIMARY KEY,
    id_tipo_movimiento INTEGER NOT NULL REFERENCES tipo_movimiento(id_tipo_movimiento) ON DELETE CASCADE,
    id_dependencia INTEGER NOT NULL REFERENCES dependencia(id_dependencia) ON DELETE CASCADE,
    id_anexo INTEGER REFERENCES anexo(id_anexo) ON DELETE CASCADE,
    id_producto INTEGER NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL,
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observacion TEXT,
    id_liquidacion INTEGER REFERENCES liquidacion(id_liquidacion) ON DELETE CASCADE,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    codigo VARCHAR(100),
    id_convenio INTEGER REFERENCES convenio(id_convenio) ON DELETE CASCADE,
    id_provedor INTEGER REFERENCES provedores(id_provedores) ON DELETE CASCADE,
    precio_compra NUMERIC(15, 4),
    id_moneda_compra INTEGER REFERENCES moneda(id_moneda) ON DELETE CASCADE,
    precio_venta NUMERIC(15, 4),
    id_moneda_venta INTEGER REFERENCES moneda(id_moneda) ON DELETE CASCADE
);

-- ============================================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ============================================================================

CREATE INDEX idx_productos_codigo ON productos(codigo);
CREATE INDEX idx_productos_subcategoria ON productos(id_subcategoria);
CREATE INDEX idx_anexo_numero ON anexo(numero_anexo);
CREATE INDEX idx_anexo_convenio ON anexo(id_convenio);
CREATE INDEX idx_anexo_producto ON anexo(id_producto);
CREATE INDEX idx_movimiento_codigo ON movimiento(codigo);
CREATE INDEX idx_movimiento_convenio ON movimiento(id_convenio);
CREATE INDEX idx_movimiento_provedor ON movimiento(id_provedor);
CREATE INDEX idx_movimiento_producto ON movimiento(id_producto);
CREATE INDEX idx_movimiento_dependencia ON movimiento(id_dependencia);
CREATE INDEX idx_movimiento_tipo ON movimiento(id_tipo_movimiento);
CREATE INDEX idx_movimiento_estado ON movimiento(estado);
CREATE INDEX idx_ventas_cliente ON ventas(id_cliente);
CREATE INDEX idx_ventas_estado ON ventas(estado);
CREATE INDEX idx_detalle_venta_venta ON detalle_ventas(id_venta);
CREATE INDEX idx_detalle_venta_producto ON detalle_ventas(id_producto);
CREATE INDEX idx_clientes_cedula ON clientes(cedula_rif);
CREATE INDEX idx_convenio_provedor ON convenio(id_provedor);

-- Foreign Key para anexo.id_producto (Migración o5p6q7r8s9t0)
ALTER TABLE anexo ADD CONSTRAINT fk_anexo_producto FOREIGN KEY (id_producto) REFERENCES productos(id_producto);

