-- Agregar campos descripcion y observaciones a certificacion
ALTER TABLE certificacion ADD COLUMN descripcion TEXT;
ALTER TABLE certificacion ADD COLUMN observaciones TEXT;