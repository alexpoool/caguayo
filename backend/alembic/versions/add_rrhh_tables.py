"""Módulo RRHH — tablas del esquema v3

Crea las 17 tablas del script `rrhh.sql` v3 más las 2 tablas puente de
trazabilidad de nómina (`nomina_deducciones`, `nomina_bonificaciones`), la
secuencia `empleado_codigo_seq` (códigos `EMP-XXXX`) y los índices del script.

Ajustes respecto al script v3 (acordados, ver docs/rrhh/tecnica/fase-0.md):
- `evaluaciones.estado` ('borrador' | 'finalizada'): la funcionalidad
  «editar mientras esté en borrador» no tenía respaldo en el esquema.
- `empleados.foto`: NO se crea (fuera de alcance).
- Tablas puente `nomina_deducciones` / `nomina_bonificaciones` para registrar
  qué deducciones/bonificaciones componen cada nómina y evitar doble cobro.

Las FKs cíclicas (departamentos.responsable → empleados,
empleados.departamento_id → departamentos, empleados.supervisor → empleados)
se agregan con ALTER TABLE al final, igual que el script original.

Revision ID: add_rrhh_tables
Revises: add_especialidad_artista
Create Date: 2026-10-13

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_rrhh_tables"
down_revision: Union[str, None] = "add_especialidad_artista"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Columnas comunes de auditoría de fila (sin triggers: la app maneja updated_at)
_AUDIT_COLS = """
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
"""


def upgrade() -> None:
    conn = op.get_bind()

    # ── Secuencia de códigos de empleado ──────────────────────────────────
    conn.execute(
        sa.text("CREATE SEQUENCE IF NOT EXISTS empleado_codigo_seq START 1000")
    )

    # ── 1. Catálogos base ─────────────────────────────────────────────────
    conn.execute(sa.text(f"""
        CREATE TABLE IF NOT EXISTS tipos_contrato (
            id_tipo_contrato SERIAL PRIMARY KEY,
            nombre VARCHAR(50) NOT NULL UNIQUE,
            descripcion TEXT,
            activo BOOLEAN DEFAULT TRUE,
            {_AUDIT_COLS},
            CONSTRAINT chk_tipos_contrato_updated CHECK (updated_at >= created_at)
        )
    """))
    conn.execute(sa.text(f"""
        CREATE TABLE IF NOT EXISTS tipos_deducciones (
            id_tipos_deducciones SERIAL PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL UNIQUE,
            descripcion TEXT,
            es_porcentaje BOOLEAN DEFAULT FALSE,
            activo BOOLEAN DEFAULT TRUE,
            {_AUDIT_COLS},
            CONSTRAINT chk_tipos_deducciones_updated CHECK (updated_at >= created_at)
        )
    """))
    conn.execute(sa.text(f"""
        CREATE TABLE IF NOT EXISTS tipos_bonificaciones (
            id_tipos_bonificaciones SERIAL PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL UNIQUE,
            descripcion TEXT,
            es_porcentaje BOOLEAN DEFAULT FALSE,
            activo BOOLEAN DEFAULT TRUE,
            {_AUDIT_COLS},
            CONSTRAINT chk_tipos_bonif_updated CHECK (updated_at >= created_at)
        )
    """))
    conn.execute(sa.text(f"""
        CREATE TABLE IF NOT EXISTS calificaciones (
            id_calificaciones SERIAL PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL UNIQUE,
            valor INT NOT NULL CHECK (valor BETWEEN 1 AND 5),
            descripcion TEXT,
            {_AUDIT_COLS},
            CONSTRAINT chk_calificaciones_updated CHECK (updated_at >= created_at)
        )
    """))
    conn.execute(sa.text(f"""
        CREATE TABLE IF NOT EXISTS tipos_pago (
            id_tipo_pago SERIAL PRIMARY KEY,
            nombre VARCHAR(30) NOT NULL UNIQUE,
            descripcion TEXT,
            activo BOOLEAN DEFAULT TRUE,
            {_AUDIT_COLS},
            CONSTRAINT chk_tipos_pago_updated CHECK (updated_at >= created_at)
        )
    """))

    # ── 2. Empleados (sin FKs cíclicas; se agregan al final) ─────────────
    conn.execute(sa.text(f"""
        CREATE TABLE IF NOT EXISTS empleados (
            id SERIAL PRIMARY KEY,
            codigo_empleado VARCHAR(20) UNIQUE
                DEFAULT 'EMP-' || nextval('empleado_codigo_seq'),
            nombre VARCHAR(100) NOT NULL,
            apellido VARCHAR(100) NOT NULL,
            fecha_nacimiento DATE CHECK (
                fecha_nacimiento IS NULL
                OR (fecha_nacimiento >= '1900-01-01' AND fecha_nacimiento <= CURRENT_DATE)
            ),
            carnet_identidad VARCHAR(20) UNIQUE,
            direccion TEXT,
            telefono VARCHAR(20),
            correo VARCHAR(100) UNIQUE,
            puesto_id INT,
            puesto_descripcion TEXT,
            departamento_id INT,
            fecha_contratacion DATE DEFAULT CURRENT_DATE,
            tipo_contrato_id INT REFERENCES tipos_contrato(id_tipo_contrato) ON DELETE SET NULL,
            salario DECIMAL(10,2) CHECK (salario IS NULL OR salario >= 0),
            supervisor INT,
            estado VARCHAR(20) DEFAULT 'activo'
                CHECK (estado IN ('activo','suspendido','vacaciones','terminado')),
            tipo_asistencia VARCHAR(20) DEFAULT 'NO_LIBRE'
                CHECK (tipo_asistencia IN ('LIBRE','NO_LIBRE')),
            horas_a_trabajar INT CHECK (horas_a_trabajar IS NULL OR horas_a_trabajar > 0),
            dias_a_trabajar INT CHECK (dias_a_trabajar IS NULL OR dias_a_trabajar > 0),
            horario_inicio TIME,
            horario_final TIME,
            activo BOOLEAN DEFAULT TRUE,
            {_AUDIT_COLS},
            CONSTRAINT chk_horario CHECK (
                horario_inicio IS NULL OR horario_final IS NULL OR horario_final > horario_inicio
            ),
            CONSTRAINT chk_empleados_updated CHECK (updated_at >= created_at)
        )
    """))

    # ── 3. Departamentos y puestos ────────────────────────────────────────
    conn.execute(sa.text(f"""
        CREATE TABLE IF NOT EXISTS departamentos (
            id_departamento SERIAL PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL UNIQUE,
            descripcion TEXT,
            responsable INT,
            activo BOOLEAN DEFAULT TRUE,
            {_AUDIT_COLS},
            CONSTRAINT chk_departamentos_updated CHECK (updated_at >= created_at)
        )
    """))
    conn.execute(sa.text(f"""
        CREATE TABLE IF NOT EXISTS puestos (
            id_puesto SERIAL PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            descripcion TEXT,
            departamento_id INT REFERENCES departamentos(id_departamento) ON DELETE SET NULL,
            salario_minimo DECIMAL(10,2) CHECK (salario_minimo IS NULL OR salario_minimo >= 0),
            salario_maximo DECIMAL(10,2) CHECK (salario_maximo IS NULL OR salario_maximo >= 0),
            activo BOOLEAN DEFAULT TRUE,
            {_AUDIT_COLS},
            CONSTRAINT uq_puesto_departamento UNIQUE (nombre, departamento_id),
            CONSTRAINT chk_rango_salario CHECK (
                salario_minimo IS NULL OR salario_maximo IS NULL OR salario_maximo >= salario_minimo
            ),
            CONSTRAINT chk_puestos_updated CHECK (updated_at >= created_at)
        )
    """))

    # ── 4. FKs diferidas en empleados (ciclo con departamentos) ───────────
    conn.execute(sa.text("""
        ALTER TABLE empleados
            ADD CONSTRAINT fk_empleados_puesto
                FOREIGN KEY (puesto_id) REFERENCES puestos(id_puesto) ON DELETE SET NULL
    """))
    conn.execute(sa.text("""
        ALTER TABLE empleados
            ADD CONSTRAINT fk_empleados_departamento
                FOREIGN KEY (departamento_id) REFERENCES departamentos(id_departamento) ON DELETE SET NULL
    """))
    conn.execute(sa.text("""
        ALTER TABLE empleados
            ADD CONSTRAINT fk_empleados_supervisor
                FOREIGN KEY (supervisor) REFERENCES empleados(id) ON DELETE SET NULL
    """))
    conn.execute(sa.text("""
        ALTER TABLE departamentos
            ADD CONSTRAINT fk_departamentos_responsable
                FOREIGN KEY (responsable) REFERENCES empleados(id) ON DELETE SET NULL
    """))

    # ── 5. Deducciones y bonificaciones ───────────────────────────────────
    conn.execute(sa.text(f"""
        CREATE TABLE IF NOT EXISTS deducciones (
            id_deducciones SERIAL PRIMARY KEY,
            empleados_id INT NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
            tipo_deducciones_id INT NOT NULL REFERENCES tipos_deducciones(id_tipos_deducciones) ON DELETE RESTRICT,
            valor DECIMAL(10,2) NOT NULL CHECK (valor >= 0),
            inicio_periodo DATE NOT NULL,
            fin_periodo DATE NOT NULL,
            observaciones TEXT,
            {_AUDIT_COLS},
            CONSTRAINT chk_deduccion_fechas CHECK (fin_periodo >= inicio_periodo),
            CONSTRAINT chk_deducciones_updated CHECK (updated_at >= created_at)
        )
    """))
    conn.execute(sa.text(f"""
        CREATE TABLE IF NOT EXISTS bonificaciones (
            id_bonificaciones SERIAL PRIMARY KEY,
            empleados_id INT NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
            tipo_bonificaciones_id INT NOT NULL REFERENCES tipos_bonificaciones(id_tipos_bonificaciones) ON DELETE RESTRICT,
            valor DECIMAL(10,2) NOT NULL CHECK (valor >= 0),
            inicio_periodo DATE NOT NULL,
            fin_periodo DATE NOT NULL,
            observaciones TEXT,
            {_AUDIT_COLS},
            CONSTRAINT chk_bonificacion_fechas CHECK (fin_periodo >= inicio_periodo),
            CONSTRAINT chk_bonificaciones_updated CHECK (updated_at >= created_at)
        )
    """))

    # ── 6. Asistencia ─────────────────────────────────────────────────────
    conn.execute(sa.text(f"""
        CREATE TABLE IF NOT EXISTS asistencia (
            id SERIAL PRIMARY KEY,
            empleado_id INT NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
            fecha DATE NOT NULL,
            hora_entrada TIME,
            hora_salida TIME,
            estado VARCHAR(20) DEFAULT 'ausente'
                CHECK (estado IN ('presente','ausente','tardanza','permiso','vacaciones','feriado','incapacidad')),
            observaciones TEXT,
            {_AUDIT_COLS},
            CONSTRAINT uq_asistencia_empleado_fecha UNIQUE (empleado_id, fecha),
            CONSTRAINT chk_horas_asistencia CHECK (
                hora_entrada IS NULL OR hora_salida IS NULL OR hora_salida > hora_entrada
            ),
            CONSTRAINT chk_presente_con_horas CHECK (
                estado NOT IN ('presente','tardanza')
                OR hora_entrada IS NOT NULL
            ),
            CONSTRAINT chk_asistencia_updated CHECK (updated_at >= created_at)
        )
    """))

    # ── 7. Evaluaciones, objetivos y metas ────────────────────────────────
    # Ajuste v3→v4: se añade `estado` ('borrador' | 'finalizada') porque la
    # funcionalidad «editar evaluación en borrador» no tenía respaldo.
    conn.execute(sa.text(f"""
        CREATE TABLE IF NOT EXISTS evaluaciones (
            id SERIAL PRIMARY KEY,
            empleado_id INT NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
            evaluador_id INT REFERENCES empleados(id) ON DELETE SET NULL,
            periodo VARCHAR(20) NOT NULL,
            tipo_evaluacion VARCHAR(20) NOT NULL DEFAULT 'formal'
                CHECK (tipo_evaluacion IN ('formal','autoevaluacion','parcial','final')),
            estado VARCHAR(20) DEFAULT 'borrador'
                CHECK (estado IN ('borrador','finalizada')),
            inicio_periodo DATE NOT NULL,
            fin_periodo DATE NOT NULL,
            puntualidad INT REFERENCES calificaciones(id_calificaciones) ON DELETE SET NULL,
            productividad INT REFERENCES calificaciones(id_calificaciones) ON DELETE SET NULL,
            trabajo_equipo INT REFERENCES calificaciones(id_calificaciones) ON DELETE SET NULL,
            calidad INT REFERENCES calificaciones(id_calificaciones) ON DELETE SET NULL,
            promedio_objetivos DECIMAL(4,2) CHECK (promedio_objetivos IS NULL OR promedio_objetivos BETWEEN 0 AND 100),
            comentarios TEXT,
            fecha DATE DEFAULT CURRENT_DATE,
            {_AUDIT_COLS},
            CONSTRAINT chk_evaluacion_fechas CHECK (fin_periodo >= inicio_periodo),
            CONSTRAINT uq_evaluacion_empleado_periodo_tipo UNIQUE (empleado_id, periodo, tipo_evaluacion),
            CONSTRAINT chk_evaluaciones_updated CHECK (updated_at >= created_at)
        )
    """))
    conn.execute(sa.text(f"""
        CREATE TABLE IF NOT EXISTS objetivos (
            id_objetivos SERIAL PRIMARY KEY,
            evaluacion_id INT NOT NULL REFERENCES evaluaciones(id) ON DELETE CASCADE,
            nombre VARCHAR(255) NOT NULL,
            resultado_objetivo TEXT,
            valoracion INT CHECK (valoracion IS NULL OR valoracion BETWEEN 1 AND 5),
            observaciones TEXT,
            {_AUDIT_COLS},
            CONSTRAINT chk_objetivos_updated CHECK (updated_at >= created_at)
        )
    """))
    conn.execute(sa.text(f"""
        CREATE TABLE IF NOT EXISTS metas (
            id_metas SERIAL PRIMARY KEY,
            objetivo_id INT NOT NULL REFERENCES objetivos(id_objetivos) ON DELETE CASCADE,
            nombre VARCHAR(255) NOT NULL,
            resultado_meta INT,
            valoracion INT CHECK (valoracion IS NULL OR valoracion BETWEEN 1 AND 5),
            observaciones TEXT,
            {_AUDIT_COLS},
            CONSTRAINT chk_metas_updated CHECK (updated_at >= created_at)
        )
    """))

    # ── 8. Solicitudes ────────────────────────────────────────────────────
    conn.execute(sa.text(f"""
        CREATE TABLE IF NOT EXISTS solicitudes (
            id SERIAL PRIMARY KEY,
            empleado_id INT NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
            tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('vacaciones','permiso')),
            fecha_inicio DATE NOT NULL,
            fecha_fin DATE NOT NULL,
            motivo TEXT,
            estado VARCHAR(20) DEFAULT 'pendiente'
                CHECK (estado IN ('pendiente','aprobada','rechazada','cancelada')),
            aprobado_por INT REFERENCES empleados(id) ON DELETE SET NULL,
            fecha_aprobacion TIMESTAMP,
            observaciones TEXT,
            {_AUDIT_COLS},
            CONSTRAINT chk_solicitud_fechas CHECK (fecha_fin >= fecha_inicio),
            CONSTRAINT chk_solicitudes_updated CHECK (updated_at >= created_at)
        )
    """))

    # ── 9. Nómina, detalle y pagos ────────────────────────────────────────
    conn.execute(sa.text(f"""
        CREATE TABLE IF NOT EXISTS nomina (
            id SERIAL PRIMARY KEY,
            empleado_id INT NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
            periodo DATE NOT NULL,
            inicio_periodo DATE NOT NULL,
            fin_periodo DATE NOT NULL,
            salario_base DECIMAL(10,2) NOT NULL CHECK (salario_base >= 0),
            horas_extras DECIMAL(10,2) DEFAULT 0 CHECK (horas_extras >= 0),
            deducciones DECIMAL(10,2) DEFAULT 0 CHECK (deducciones >= 0),
            bonificaciones DECIMAL(10,2) DEFAULT 0 CHECK (bonificaciones >= 0),
            salario_neto DECIMAL(10,2) CHECK (salario_neto IS NULL OR salario_neto >= 0),
            estado VARCHAR(20) DEFAULT 'pendiente'
                CHECK (estado IN ('pendiente','pagada','anulada')),
            {_AUDIT_COLS},
            CONSTRAINT uq_nomina_empleado_periodo UNIQUE (empleado_id, periodo),
            CONSTRAINT chk_nomina_fechas CHECK (fin_periodo >= inicio_periodo),
            CONSTRAINT chk_neto_coherente CHECK (
                salario_neto IS NULL
                OR salario_neto <= (salario_base + horas_extras + bonificaciones - deducciones)
            ),
            CONSTRAINT chk_nomina_updated CHECK (updated_at >= created_at)
        )
    """))
    # Tablas puente (trazabilidad; no existían en el SQL v3).
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS nomina_deducciones (
            id SERIAL PRIMARY KEY,
            nomina_id INT NOT NULL REFERENCES nomina(id) ON DELETE CASCADE,
            deduccion_id INT NOT NULL REFERENCES deducciones(id_deducciones) ON DELETE RESTRICT,
            monto_aplicado DECIMAL(10,2) NOT NULL CHECK (monto_aplicado >= 0),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_nomina_deduccion UNIQUE (nomina_id, deduccion_id)
        )
    """))
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS nomina_bonificaciones (
            id SERIAL PRIMARY KEY,
            nomina_id INT NOT NULL REFERENCES nomina(id) ON DELETE CASCADE,
            bonificacion_id INT NOT NULL REFERENCES bonificaciones(id_bonificaciones) ON DELETE RESTRICT,
            monto_aplicado DECIMAL(10,2) NOT NULL CHECK (monto_aplicado >= 0),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_nomina_bonificacion UNIQUE (nomina_id, bonificacion_id)
        )
    """))
    conn.execute(sa.text(f"""
        CREATE TABLE IF NOT EXISTS pagos (
            id SERIAL PRIMARY KEY,
            nomina_id INT NOT NULL REFERENCES nomina(id) ON DELETE CASCADE,
            fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
            monto DECIMAL(10,2) NOT NULL CHECK (monto > 0),
            metodo_id INT NOT NULL REFERENCES tipos_pago(id_tipo_pago) ON DELETE RESTRICT,
            referencia VARCHAR(50),
            observaciones TEXT,
            {_AUDIT_COLS},
            CONSTRAINT chk_pagos_updated CHECK (updated_at >= created_at)
        )
    """))

    # ── 10. Índices del script v3 ─────────────────────────────────────────
    INDICES = [
        "CREATE INDEX IF NOT EXISTS idx_empleados_departamento ON empleados(departamento_id)",
        "CREATE INDEX IF NOT EXISTS idx_empleados_puesto ON empleados(puesto_id)",
        "CREATE INDEX IF NOT EXISTS idx_empleados_estado ON empleados(estado)",
        "CREATE INDEX IF NOT EXISTS idx_empleados_supervisor ON empleados(supervisor)",
        "CREATE INDEX IF NOT EXISTS idx_empleados_activo ON empleados(activo)",
        "CREATE INDEX IF NOT EXISTS idx_asistencia_fecha ON asistencia(fecha)",
        "CREATE INDEX IF NOT EXISTS idx_asistencia_estado ON asistencia(estado)",
        "CREATE INDEX IF NOT EXISTS idx_deducciones_empleado ON deducciones(empleados_id)",
        "CREATE INDEX IF NOT EXISTS idx_deducciones_periodo ON deducciones(inicio_periodo, fin_periodo)",
        "CREATE INDEX IF NOT EXISTS idx_bonificaciones_empleado ON bonificaciones(empleados_id)",
        "CREATE INDEX IF NOT EXISTS idx_bonificaciones_periodo ON bonificaciones(inicio_periodo, fin_periodo)",
        "CREATE INDEX IF NOT EXISTS idx_evaluaciones_empleado ON evaluaciones(empleado_id)",
        "CREATE INDEX IF NOT EXISTS idx_evaluaciones_periodo ON evaluaciones(periodo)",
        "CREATE INDEX IF NOT EXISTS idx_evaluaciones_tipo ON evaluaciones(tipo_evaluacion)",
        "CREATE INDEX IF NOT EXISTS idx_objetivos_evaluacion ON objetivos(evaluacion_id)",
        "CREATE INDEX IF NOT EXISTS idx_metas_objetivo ON metas(objetivo_id)",
        "CREATE INDEX IF NOT EXISTS idx_solicitudes_empleado ON solicitudes(empleado_id)",
        "CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes(estado)",
        "CREATE INDEX IF NOT EXISTS idx_solicitudes_tipo ON solicitudes(tipo)",
        "CREATE INDEX IF NOT EXISTS idx_solicitudes_fechas ON solicitudes(fecha_inicio, fecha_fin)",
        "CREATE INDEX IF NOT EXISTS idx_nomina_empleado ON nomina(empleado_id)",
        "CREATE INDEX IF NOT EXISTS idx_nomina_periodo ON nomina(periodo)",
        "CREATE INDEX IF NOT EXISTS idx_nomina_estado ON nomina(estado)",
        "CREATE INDEX IF NOT EXISTS idx_pagos_nomina ON pagos(nomina_id)",
        "CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON pagos(fecha_pago)",
        "CREATE INDEX IF NOT EXISTS idx_pagos_metodo ON pagos(metodo_id)",
    ]
    for stmt in INDICES:
        conn.execute(sa.text(stmt))


def downgrade() -> None:
    conn = op.get_bind()
    TABLAS = [
        "pagos", "nomina_bonificaciones", "nomina_deducciones", "nomina",
        "solicitudes", "metas", "objetivos", "evaluaciones", "asistencia",
        "deducciones", "bonificaciones", "empleados", "puestos", "departamentos",
        "tipos_pago", "calificaciones", "tipos_bonificaciones",
        "tipos_deducciones", "tipos_contrato",
    ]
    for tabla in TABLAS:
        conn.execute(sa.text(f"DROP TABLE IF EXISTS {tabla} CASCADE"))
    conn.execute(sa.text("DROP SEQUENCE IF EXISTS empleado_codigo_seq"))
