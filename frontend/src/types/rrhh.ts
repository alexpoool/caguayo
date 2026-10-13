// Tipos del módulo RRHH — Departamentos y Puestos (Fase 2)

export interface RrhhPuesto {
  id_puesto: number;
  nombre: string;
  descripcion: string | null;
  departamento_id: number | null;
  salario_minimo: number | null;
  salario_maximo: number | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RrhhPuestoCreate {
  nombre: string;
  descripcion?: string | null;
  departamento_id?: number | null;
  salario_minimo?: number | null;
  salario_maximo?: number | null;
  activo?: boolean;
}

export type RrhhPuestoUpdate = Partial<RrhhPuestoCreate>;

export interface RrhhPuestoDetalle extends RrhhPuesto {
  departamento_nombre: string | null;
  total_empleados: number;
}

/** Fila del listado de puestos (con agregados resueltos en backend). */
export interface RrhhPuestoListado extends RrhhPuesto {
  departamento_nombre: string | null;
  total_empleados: number;
}

export interface RrhhDepartamento {
  id_departamento: number;
  nombre: string;
  descripcion: string | null;
  responsable: number | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RrhhDepartamentoCreate {
  nombre: string;
  descripcion?: string | null;
  responsable?: number | null;
  activo?: boolean;
}

export type RrhhDepartamentoUpdate = Partial<RrhhDepartamentoCreate>;

export interface RrhhDepartamentoDetalle extends RrhhDepartamento {
  responsable_nombre: string | null;
  puestos: RrhhPuesto[];
  total_empleados: number;
}

/** Fila del listado de departamentos (con agregados resueltos en backend). */
export interface RrhhDepartamentoListado extends RrhhDepartamento {
  responsable_nombre: string | null;
  total_puestos: number;
  total_empleados: number;
}

export interface RrhhEmpleadoLite {
  id: number;
  codigo_empleado: string | null;
  nombre: string;
  apellido: string;
  estado: string;
  activo: boolean;
}

export interface RrhhEliminarResponse {
  accion: 'eliminado' | 'desactivado';
  motivo: string | null;
}

// ── Catálogos base (Fase 1) ────────────────────────────────────────────────

export interface RrhhTipoContrato {
  id_tipo_contrato: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RrhhTipoDeduccion {
  id_tipos_deducciones: number;
  nombre: string;
  descripcion: string | null;
  es_porcentaje: boolean;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RrhhTipoBonificacion {
  id_tipos_bonificaciones: number;
  nombre: string;
  descripcion: string | null;
  es_porcentaje: boolean;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RrhhTipoPago {
  id_tipo_pago: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RrhhCalificacion {
  id_calificaciones: number;
  nombre: string;
  valor: number;
  descripcion: string | null;
  created_at?: string;
  updated_at?: string;
}

export type RrhhCatalogo =
  | RrhhTipoContrato
  | RrhhTipoDeduccion
  | RrhhTipoBonificacion
  | RrhhTipoPago
  | RrhhCalificacion;

/** Metadatos por catálogo, para generar la UI de forma genérica. */
export interface RrhhCatalogoConfig {
  /** Clave del catálogo (usada en la navegación y las claves de React Query). */
  id: string;
  /** Nombre visible. */
  nombre: string;
  /** Ruta del endpoint bajo /rrhh/catalogos. */
  ruta: string;
  /** Campo de la clave primaria en el payload. */
  pk: string;
  /** Tiene columna `activo` (los catálogos con baja lógica). */
  tieneActivo: boolean;
  /** Tiene columna `es_porcentaje` (deducciones y bonificaciones). */
  tienePorcentaje: boolean;
  /** Tiene columna `valor` (calificaciones). */
  tieneValor: boolean;
  /** Longitud máxima del nombre según la restricción de BD. */
  maxNombre: number;
  descripcion: string;
}

export const RRHH_CATALOGOS: RrhhCatalogoConfig[] = [
  {
    id: 'tipos-contrato',
    nombre: 'Tipos de contrato',
    ruta: '/rrhh/catalogos/tipos-contrato',
    pk: 'id_tipo_contrato',
    tieneActivo: true,
    tienePorcentaje: false,
    tieneValor: false,
    maxNombre: 50,
    descripcion: 'Modalidades de contratación (indefinido, por obra, etc.).',
  },
  {
    id: 'tipos-deducciones',
    nombre: 'Tipos de deducción',
    ruta: '/rrhh/catalogos/tipos-deducciones',
    pk: 'id_tipos_deducciones',
    tieneActivo: true,
    tienePorcentaje: true,
    tieneValor: false,
    maxNombre: 100,
    descripcion: 'Conceptos que se restan del salario.',
  },
  {
    id: 'tipos-bonificaciones',
    nombre: 'Tipos de bonificación',
    ruta: '/rrhh/catalogos/tipos-bonificaciones',
    pk: 'id_tipos_bonificaciones',
    tieneActivo: true,
    tienePorcentaje: true,
    tieneValor: false,
    maxNombre: 100,
    descripcion: 'Conceptos que se suman al salario.',
  },
  {
    id: 'tipos-pago',
    nombre: 'Tipos de pago',
    ruta: '/rrhh/catalogos/tipos-pago',
    pk: 'id_tipo_pago',
    tieneActivo: true,
    tienePorcentaje: false,
    tieneValor: false,
    maxNombre: 30,
    descripcion: 'Formas en que se entrega el salario.',
  },
  {
    id: 'calificaciones',
    nombre: 'Calificaciones',
    ruta: '/rrhh/catalogos/calificaciones',
    pk: 'id_calificaciones',
    tieneActivo: false,
    tienePorcentaje: false,
    tieneValor: true,
    maxNombre: 100,
    descripcion: 'Escala de valoración usada en las evaluaciones (1 a 5).',
  },
];
