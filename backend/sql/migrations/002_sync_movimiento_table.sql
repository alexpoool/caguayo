-- Migration: Sync movimiento table with model
-- This script updates the movimiento table to match the SQLModel definition

-- Step 1: Rename columns if they exist with old names
ALTER TABLE movimiento RENAME COLUMN id_moneda_compra TO moneda_compra;
ALTER TABLE movimiento RENAME COLUMN id_moneda_venta TO moneda_venta;

-- Step 2: Drop unused columns (if they exist and have no data)
-- These columns are not used by the application:
-- id_convenio - handled through anexo
-- id_contrato - handled through anexo
-- id_factura - not used
-- id_venta_efectivo - not used
-- id_liquidacion - not used

-- Uncomment the following lines ONLY if you want to remove these columns:
-- WARNING: This will delete data if the columns exist and have values

-- ALTER TABLE movimiento DROP COLUMN IF EXISTS id_convenio;
-- ALTER TABLE movimiento DROP COLUMN IF EXISTS id_contrato;
-- ALTER TABLE movimiento DROP COLUMN IF EXISTS id_factura;
-- ALTER TABLE movimiento DROP COLUMN IF EXISTS id_venta_efectivo;
-- ALTER TABLE movimiento DROP COLUMN IF EXISTS id_liquidacion;

-- Step 3: Add missing columns if they don't exist
ALTER TABLE movimiento ADD COLUMN IF NOT EXISTS id_convenio INTEGER REFERENCES convenio(id_convenio) ON DELETE CASCADE;
ALTER TABLE movimiento ADD COLUMN IF NOT EXISTS id_contrato INTEGER REFERENCES contrato(id_contrato) ON DELETE CASCADE;
ALTER TABLE movimiento ADD COLUMN IF NOT EXISTS id_factura INTEGER REFERENCES factura(id_factura) ON DELETE CASCADE;
ALTER TABLE movimiento ADD COLUMN IF NOT EXISTS id_venta_efectivo INTEGER REFERENCES venta_efectivo(id_venta_efectivo) ON DELETE CASCADE;
ALTER TABLE movimiento ADD COLUMN IF NOT EXISTS id_liquidacion INTEGER REFERENCES liquidacion(id_liquidacion) ON DELETE CASCADE;

-- Step 4: Update foreign key references for id_convenio (should reference convenio, not anexo)
-- First, drop the wrong constraint if it exists
ALTER TABLE movimiento DROP CONSTRAINT IF EXISTS movimiento_id_convenio_fkey;
-- Then add the correct one
ALTER TABLE movimiento ADD CONSTRAINT movimiento_id_convenio_fkey 
    FOREIGN KEY (id_convenio) REFERENCES convenio(id_convenio) ON DELETE CASCADE;

-- Step 5: Add indices for commonly queried columns
CREATE INDEX IF NOT EXISTS idx_movimiento_codigo ON movimiento(codigo);
CREATE INDEX IF NOT EXISTS idx_movimiento_fecha ON movimiento(fecha);
CREATE INDEX IF NOT EXISTS idx_movimiento_estado ON movimiento(estado);
CREATE INDEX IF NOT EXISTS idx_movimiento_id_dependencia ON movimiento(id_dependencia);
CREATE INDEX IF NOT EXISTS idx_movimiento_id_producto ON movimiento(id_producto);

-- Step 6: Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'movimiento' 
ORDER BY ordinal_position;
