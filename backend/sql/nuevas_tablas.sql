-- Script SQL para crear las nuevas tablas en PostgreSQL
-- Proyecto: Caguayo - Módulo de Ventas

-- =====================================================
-- TABLAS PARA CONTRATOS, SUPLEMENTOS, FACTURAS Y VENTAS EN EFECTIVO
-- =====================================================

-- Contratos
CREATE TABLE IF NOT EXISTS contrato (
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
CREATE TABLE IF NOT EXISTS suplemento (
    id_suplemento SERIAL PRIMARY KEY,
    id_contrato INTEGER NOT NULL REFERENCES contrato(id_contrato) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    id_estado INTEGER NOT NULL REFERENCES estado_contrato(id_estado_contrato) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    monto NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    documento VARCHAR(255)
);

-- Facturas
CREATE TABLE IF NOT EXISTS factura (
    id_factura SERIAL PRIMARY KEY,
    id_contrato INTEGER NOT NULL REFERENCES contrato(id_contrato) ON DELETE CASCADE,
    codigo_factura VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    observaciones TEXT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    monto NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    pago_actual NUMERIC(15, 2) NOT NULL DEFAULT 0.00
);

-- Ventas en Efectivo
CREATE TABLE IF NOT EXISTS venta_efectivo (
    id_venta_efectivo SERIAL PRIMARY KEY,
    slip VARCHAR(100) NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    id_dependencia INTEGER NOT NULL REFERENCES dependencia(id_dependencia) ON DELETE CASCADE,
    cajero VARCHAR(100) NOT NULL,
    monto NUMERIC(15, 2) NOT NULL DEFAULT 0.00
);

-- Item-Factura (reemplaza factura_producto)
CREATE TABLE IF NOT EXISTS item_factura (
    id_item_factura SERIAL PRIMARY KEY,
    id_factura INTEGER NOT NULL REFERENCES factura(id_factura) ON DELETE CASCADE,
    id_producto INTEGER NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_compra NUMERIC(15, 4) NOT NULL,
    precio_venta NUMERIC(15, 4) NOT NULL,
    id_moneda INTEGER NOT NULL REFERENCES moneda(id_moneda) ON DELETE CASCADE
);

-- Item-Venta-Efectivo (reemplaza venta_efectivo_producto)
CREATE TABLE IF NOT EXISTS item_venta_efectivo (
    id_item_venta_efectivo SERIAL PRIMARY KEY,
    id_venta_efectivo INTEGER NOT NULL REFERENCES venta_efectivo(id_venta_efectivo) ON DELETE CASCADE,
    id_producto INTEGER NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL DEFAULT 1,
    precio_compra NUMERIC(15, 4) NOT NULL,
    precio_venta NUMERIC(15, 4) NOT NULL,
    id_moneda INTEGER NOT NULL REFERENCES moneda(id_moneda) ON DELETE CASCADE
);

-- =====================================================
-- ÍNDICES PARA NUEVAS TABLAS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_contrato_cliente ON contrato(id_cliente);
CREATE INDEX IF NOT EXISTS idx_contrato_estado ON contrato(id_estado);
CREATE INDEX IF NOT EXISTS idx_contrato_tipo ON contrato(id_tipo_contrato);
CREATE INDEX IF NOT EXISTS idx_contrato_moneda ON contrato(id_moneda);
CREATE INDEX IF NOT EXISTS idx_suplemento_contrato ON suplemento(id_contrato);
CREATE INDEX IF NOT EXISTS idx_suplemento_estado ON suplemento(id_estado);
CREATE INDEX IF NOT EXISTS idx_factura_contrato ON factura(id_contrato);
CREATE INDEX IF NOT EXISTS idx_factura_codigo ON factura(codigo_factura);
CREATE INDEX IF NOT EXISTS idx_item_factura_factura ON item_factura(id_factura);
CREATE INDEX IF NOT EXISTS idx_item_factura_producto ON item_factura(id_producto);
CREATE INDEX IF NOT EXISTS idx_venta_efectivo_dependencia ON venta_efectivo(id_dependencia);
CREATE INDEX IF NOT EXISTS idx_venta_efectivo_fecha ON venta_efectivo(fecha);
CREATE INDEX IF NOT EXISTS idx_item_venta_efectivo_venta ON item_venta_efectivo(id_venta_efectivo);
CREATE INDEX IF NOT EXISTS idx_item_venta_efectivo_producto ON item_venta_efectivo(id_producto);

-- =====================================================
-- DATOS INICIALES - TIPOS DE CONTRATO
-- =====================================================

INSERT INTO tipo_contrato (nombre, descripcion) VALUES 
('SERVICIO', 'Contrato de servicios'),
('OBRA', 'Contrato de obra'),
('MANTENIMIENTO', 'Contrato de mantenimiento'),
('ALQUILER', 'Contrato de alquiler'),
('COMPRA', 'Contrato de compraventa')
ON CONFLICT (nombre) DO NOTHING;

-- =====================================================
-- DATOS INICIALES - ESTADOS DE CONTRATO
-- =====================================================

INSERT INTO estado_contrato (nombre, descripcion) VALUES 
('ACTIVO', 'Contrato vigente'),
('CANCELADO', 'Contrato cancelado'),
('FINALIZADO', 'Contrato finalizado'),
('PENDIENTE', 'Contrato pendiente de aprobación')
ON CONFLICT (nombre) DO NOTHING;

-- =====================================================
-- ACTUALIZAR RELACIÓN EN CLIENTE
-- =====================================================

-- Agregar la relación de contratos al cliente si no existe
-- (La relación ya está definida en el modelo, esto es solo para documentación)

-- Fin del script
