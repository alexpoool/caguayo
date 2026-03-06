-- Actualización para agregar la tabla de pagos
CREATE TABLE pago (
    id_pago SERIAL PRIMARY KEY,
    id_factura INTEGER NOT NULL REFERENCES factura(id_factura) ON DELETE CASCADE,
    numero_cheque_transferencia VARCHAR(50),
    monto NUMERIC(10, 2) NOT NULL,
    numero_factura_rodas VARCHAR(50) NOT NULL,
    fecha DATE NOT NULL,
    id_moneda INTEGER NOT NULL REFERENCES moneda(id_moneda) ON DELETE RESTRICT
);

-- Índices para la tabla pago (si no existen)
CREATE INDEX IF NOT EXISTS idx_pago_factura ON pago(id_factura);
CREATE INDEX IF NOT EXISTS idx_pago_moneda ON pago(id_moneda);
