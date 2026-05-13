-- =====================================================
-- ALTER TABLE - Agregar campos para liquidaciones por pago
-- =====================================================

-- 1. Agregar campo liquidado a factura_servicio
ALTER TABLE factura_servicio 
ADD COLUMN IF NOT EXISTS liquidado NUMERIC(15,2) DEFAULT 0.00;

-- 2. Agregar campo id_pago a persona_liquidacion
ALTER TABLE persona_liquidacion 
ADD COLUMN IF NOT EXISTS id_pago INTEGER REFERENCES pago_factura_servicio(id_pago_factura_servicio);

-- 3. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_persona_liquidacion_pago ON persona_liquidacion(id_pago);
CREATE INDEX IF NOT EXISTS idx_persona_liquidacion_etapa_persona_confirmado ON persona_liquidacion(id_etapa, id_persona, confirmado);