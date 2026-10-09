-- Estructura de registro de la migración (regla §17)
CREATE TABLE IF NOT EXISTS migracion_log (
    id_log        SERIAL PRIMARY KEY,
    tabla_origen  VARCHAR(50)  NOT NULL,
    id_origen     INTEGER      NOT NULL,
    nombre        VARCHAR(200),
    motivo        VARCHAR(200) NOT NULL,
    detalle       TEXT,
    severidad     VARCHAR(20)  NOT NULL DEFAULT 'DESCARTE',
    fecha         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_migracion_log_severidad ON migracion_log (severidad);
CREATE INDEX IF NOT EXISTS idx_migracion_log_tabla     ON migracion_log (tabla_origen);
CREATE INDEX IF NOT EXISTS idx_migracion_log_motivo    ON migracion_log (motivo);
