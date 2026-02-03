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

-- 4. Tabla: tipo_movimiento (normalización de tipos)
CREATE TABLE tipo_movimiento (
    id_tipo_movimiento SERIAL PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL UNIQUE CHECK (tipo IN ('AJUSTE', 'MERMA', 'DONACION', 'RECEPCION', 'DEVOLUCION')),
    factor INTEGER NOT NULL CHECK (factor IN (1, -1))
);

-- 5. Tabla: tipo_dependencia (normalización de tipos de dependencia)
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

-- 8. Tabla: anexo
CREATE TABLE anexo (
    id_anexo SERIAL PRIMARY KEY
    -- Campos adicionales podrían agregarse según requerimientos del negocio
);

-- 9. Tabla: liquidacion
CREATE TABLE liquidacion (
    id_liquidacion SERIAL PRIMARY KEY
    -- Campos adicionales podrían agregarse según requerimientos del negocio
);

-- 10. Tabla: transaccion 
CREATE TABLE transaccion (
    id_transaccion SERIAL PRIMARY KEY
    -- Campos adicionales podrían agregarse según requerimientos del negocio
);

-- 11. Tabla: productos (CORREGIDA)
CREATE TABLE productos (
    id_producto SERIAL PRIMARY KEY,
    id_subcategoria INTEGER NOT NULL REFERENCES subcategorias(id_subcategoria) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    moneda_compra INTEGER NOT NULL REFERENCES moneda(id_moneda) ON DELETE CASCADE,
    precio_compra NUMERIC(15, 4) NOT NULL CHECK (precio_compra >= 0),
    moneda_venta INTEGER NOT NULL REFERENCES moneda(id_moneda) ON DELETE CASCADE,
    precio_venta NUMERIC(15, 4) NOT NULL CHECK (precio_venta >= 0),
    precio_minimo NUMERIC(15, 4) NOT NULL CHECK (precio_minimo >= 0),
    CHECK (precio_venta >= precio_minimo),
    CHECK (moneda_compra <> moneda_venta OR precio_venta > precio_compra)
);  

-- 12. Tabla: ventas
CREATE TABLE ventas (
    id_venta SERIAL PRIMARY KEY,
    id_anexo INTEGER NOT NULL REFERENCES anexo(id_anexo) ON DELETE CASCADE,
    id_producto INTEGER NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    moneda_venta INTEGER NOT NULL REFERENCES moneda(id_moneda) ON DELETE CASCADE,
    monto NUMERIC(15, 2) NOT NULL CHECK (monto > 0),
    id_transaccion INTEGER NOT NULL REFERENCES transaccion(id_transaccion) ON DELETE CASCADE,
    id_liquidacion INTEGER REFERENCES liquidacion(id_liquidacion) ON DELETE CASCADE,
    observacion TEXT,
    confirmacion BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Tabla: movimiento
CREATE TABLE movimiento (
    id_movimiento SERIAL PRIMARY KEY,  
    id_tipo_movimiento INTEGER NOT NULL REFERENCES tipo_movimiento(id_tipo_movimiento) ON DELETE CASCADE,
    id_dependencia INTEGER NOT NULL REFERENCES dependencia(id_dependencia) ON DELETE CASCADE,
    id_anexo INTEGER NOT NULL REFERENCES anexo(id_anexo) ON DELETE CASCADE,
    id_producto INTEGER NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL CHECK (cantidad <> 0),  -- Positivo/negativo según tipo
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observacion TEXT,  
    id_liquidacion INTEGER REFERENCES liquidacion(id_liquidacion) ON DELETE CASCADE,
    confirmacion BOOLEAN NOT NULL DEFAULT FALSE
);
