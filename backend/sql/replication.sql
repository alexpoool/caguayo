-- =====================================================
-- CONFIGURACIÓN DE REPLICACIÓN VIA POSTGRES_FDW
-- Este archivo crea las foreign tables hacia la BD central (caguayosa)
-- =====================================================

-- 1. Crear extensión postgres_fdw
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- 2. Crear servidor hacia la BD central
DROP SERVER IF EXISTS servidor_central CASCADE;
CREATE SERVER servidor_central
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (
    host 'localhost',
    dbname 'caguayosa',
    port '5432'
);

-- 3. Crear user mapping
CREATE USER MAPPING IF NOT EXISTS FOR CURRENT_USER
SERVER servidor_central
OPTIONS (user 'postgres', password 'debianpostgres');

-- 4. Crear foreign tables (reemplazan las tablas locales)

-- tipo_dependencia
DROP TABLE IF EXISTS tipo_dependencia CASCADE;
CREATE FOREIGN TABLE tipo_dependencia (
    id_tipo_dependencia INTEGER,
    nombre VARCHAR(20),
    descripcion TEXT
) SERVER servidor_central OPTIONS (table_name 'tipo_dependencia');

-- dependencia
DROP TABLE IF EXISTS dependencia CASCADE;
CREATE FOREIGN TABLE dependencia (
    id_dependencia INTEGER,
    id_tipo_dependencia INTEGER,
    codigo_padre INTEGER,
    nombre VARCHAR(100),
    direccion VARCHAR(255),
    telefono VARCHAR(20),
    email VARCHAR(100),
    web VARCHAR(100),
    base_datos VARCHAR(100),
    host VARCHAR(100),
    puerto INTEGER,
    id_provincia INTEGER,
    id_municipio INTEGER,
    descripcion TEXT
) SERVER servidor_central OPTIONS (table_name 'dependencia');

-- cuenta_dependencias
DROP TABLE IF EXISTS cuenta_dependencias CASCADE;
CREATE FOREIGN TABLE cuenta_dependencias (
    id_cuenta INTEGER,
    id_dependencia INTEGER,
    id_moneda INTEGER,
    titular VARCHAR(150),
    banco VARCHAR(100),
    sucursal INTEGER,
    numero_cuenta VARCHAR(50),
    direccion VARCHAR(255)
) SERVER servidor_central OPTIONS (table_name 'cuenta_dependencias');