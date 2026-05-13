-- =====================================================
-- Tabla Certificaciones
-- =====================================================

CREATE TABLE certificacion (
    id_certificacion SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    id_etapa INTEGER NOT NULL REFERENCES etapas(id_etapa) ON DELETE CASCADE,
    constructor TEXT,
    inversionista TEXT,
    obra TEXT,
    objeto_obra TEXT,
    actividad TEXT,
    fecha DATE,
    precio_servicio NUMERIC(15,2),
    gasto_caguayo INTEGER DEFAULT 0,
    a_cobrar NUMERIC(15,2)
);

-- Índice para búsquedas por etapa
CREATE INDEX idx_certificacion_etapa ON certificacion(id_etapa);