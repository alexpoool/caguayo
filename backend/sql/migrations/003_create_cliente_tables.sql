-- Migration: Create missing client type tables
-- Created: 2026-03-18

-- Clientes - Persona Natural
CREATE TABLE clientes_persona_natural (
    id_cliente INTEGER PRIMARY KEY REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    nombre VARCHAR(50) NOT NULL,
    primer_apellido VARCHAR(50) NOT NULL,
    segundo_apellido VARCHAR(50),
    carnet_identidad VARCHAR(11) NOT NULL UNIQUE,
    codigo_expediente VARCHAR(50),
    numero_registro VARCHAR(50),
    catalogo VARCHAR(100),
    es_trabajador BOOLEAN NOT NULL DEFAULT false,
    ocupacion VARCHAR(100),
    centro_trabajo VARCHAR(200),
    correo_trabajo VARCHAR(100),
    direccion_trabajo TEXT,
    telefono_trabajo VARCHAR(20),
    en_baja BOOLEAN NOT NULL DEFAULT false,
    fecha_baja DATE,
    vigencia DATE
);

-- Clientes - Persona Jurídica
CREATE TABLE clientes_persona_juridica (
    id_cliente INTEGER PRIMARY KEY REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    codigo_reup VARCHAR(50) NOT NULL UNIQUE,
    id_tipo_entidad INTEGER REFERENCES tipo_entidad(id_tipo_entidad) ON DELETE SET NULL
);

-- Clientes - TCP (Trabajador por Cuenta Propia)
CREATE TABLE cliente_tcp (
    id_cliente INTEGER PRIMARY KEY REFERENCES clientes(id_cliente) ON DELETE CASCADE,
    nombre VARCHAR(50) NOT NULL,
    primer_apellido VARCHAR(50) NOT NULL,
    segundo_apellido VARCHAR(50),
    direccion TEXT NOT NULL,
    numero_registro_proyecto VARCHAR(50),
    fecha_aprobacion DATE
);
