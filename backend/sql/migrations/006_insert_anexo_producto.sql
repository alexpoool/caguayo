-- Migration: Insert test data into anexo_producto
-- Created: 2026-03-18

-- Insertar 30 productos en diferentes anexos
INSERT INTO anexo_producto (id_anexo, id_producto, cantidad, precio_acordado)
SELECT 
    a.id_anexo,
    p.id_producto,
    (RANDOM() * 50 + 1)::int as cantidad,
    ROUND((RANDOM() * 900 + 100)::numeric, 2) as precio_acordado
FROM (
    SELECT id_anexo FROM anexo ORDER BY id_anexo LIMIT 10
) a
CROSS JOIN LATERAL (
    SELECT id_producto FROM productos ORDER BY id_producto LIMIT 3
) p
ON CONFLICT DO NOTHING;

-- Verificar datos insertados
SELECT COUNT(*) as total_insertado FROM anexo_producto;
