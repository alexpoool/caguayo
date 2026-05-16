-- PersonaEtapa: replace pago_completado with por_cobrar
ALTER TABLE persona_etapa ADD COLUMN por_cobrar DECIMAL(12,2) DEFAULT 0.00;
UPDATE persona_etapa SET por_cobrar = cobro;
ALTER TABLE persona_etapa DROP COLUMN pago_completado;

-- PagoFacturaServicio: add monto_disponible
ALTER TABLE pago_factura_servicio ADD COLUMN monto_disponible DECIMAL(12,2) DEFAULT 0.00;
UPDATE pago_factura_servicio SET monto_disponible = monto;
