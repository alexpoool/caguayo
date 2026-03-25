-- Migration: Create anexo_producto table with correct schema
-- Created: 2026-03-18

DROP TABLE IF EXISTS anexo_producto CASCADE;

CREATE TABLE anexo_producto (
    id_anexo_producto SERIAL PRIMARY KEY,
    id_anexo INTEGER NOT NULL REFERENCES anexo(id_anexo) ON DELETE CASCADE,
    id_producto INTEGER NOT NULL REFERENCES productos(id_producto) ON DELETE CASCADE,
    cantidad INTEGER DEFAULT 1,
    precio_acordado NUMERIC(15, 4),
    UNIQUE (id_anexo, id_producto)
);

CREATE INDEX IF NOT EXISTS idx_anexo_producto_producto ON anexo_producto(id_producto);
