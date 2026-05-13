-- Agregar campo tipo_etapa a la tabla etapas
ALTER TABLE etapas ADD COLUMN tipo_etapa VARCHAR(20) DEFAULT 'TAREAS';

-- Actualizar valores existentes si hay certificaciones
UPDATE etapas 
SET tipo_etapa = 'CERTIFICACIONES' 
WHERE id_etapa IN (SELECT DISTINCT id_etapa FROM certificacion);

-- Índice para búsquedas
CREATE INDEX idx_etapas_tipo ON etapas(tipo_etapa);