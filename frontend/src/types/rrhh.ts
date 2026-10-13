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

// ── Empleados (Fase 3) ─────────────────────────────────────────────────────

export type RrhhEstadoEmpleado =
  | 'activo'
  | 'suspendido'
  | 'vacaciones'
  | 'terminado';

export type RrhhTipoAsistencia = 'LIBRE' | 'NO_LIBRE';

export interface RrhhEmpleado {
  id: number;
  codigo_empleado: string | null;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  carnet_identidad: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  puesto_id: number | null;
  puesto_descripcion: string | null;
  departamento_id: number | null;
  fecha_contratacion: string | null;
  tipo_contrato_id: number | null;
  salario: string | number | null;
  supervisor: number | null;
  estado: RrhhEstadoEmpleado;
  tipo_asistencia: RrhhTipoAsistencia;
  horas_a_trabajar: number | null;
  dias_a_trabajar: number | null;
  horario_inicio: string | null;
  horario_final: string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RrhhEmpleadoCreate {
  nombre: string;
  apellido: string;
  fecha_nacimiento?: string | null;
  carnet_identidad?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
  puesto_id?: number | null;
  puesto_descripcion?: string | null;
  departamento_id?: number | null;
  fecha_contratacion?: string | null;
  tipo_contrato_id?: number | null;
  salario?: number | null;
  supervisor?: number | null;
  estado?: RrhhEstadoEmpleado;
  tipo_asistencia?: RrhhTipoAsistencia;
  horas_a_trabajar?: number | null;
  dias_a_trabajar?: number | null;
  horario_inicio?: string | null;
  horario_final?: string | null;
  activo?: boolean;
}

export type RrhhEmpleadoUpdate = Partial<RrhhEmpleadoCreate>;

export interface RrhhEmpleadoListado extends RrhhEmpleado {
  puesto_nombre: string | null;
  departamento_nombre: string | null;
  tipo_contrato_nombre: string | null;
  supervisor_nombre: string | null;
}

export interface RrhhEmpleadoDetalle extends RrhhEmpleado {
  puesto_nombre: string | null;
  departamento_nombre: string | null;
  tipo_contrato_nombre: string | null;
  supervisor_nombre: string | null;
  /** Alias del usuario del sistema vinculado por carnet de identidad. */
  usuario_vinculado: string | null;
}

/** Resultado del selector abreviado `/rrhh/empleados/buscar`. */
export interface RrhhEmpleadoBusqueda {
  id: number;
  codigo_empleado: string | null;
  nombre: string;
  apellido: string;
  estado: RrhhEstadoEmpleado;
  activo: boolean;
}

export const RRHH_ESTADOS_EMPLEADO: {
  valor: RrhhEstadoEmpleado;
  etiqueta: string;
}[] = [
  { valor: 'activo', etiqueta: 'Activo' },
  { valor: 'suspendido', etiqueta: 'Suspendido' },
  { valor: 'vacaciones', etiqueta: 'Vacaciones' },
  { valor: 'terminado', etiqueta: 'Terminado' },
];

// ── Asistencia (Fase 4) ────────────────────────────────────────────────────

/**
 * Estados del catálogo de asistencia. Coinciden con el CHECK de la BD.
 * `presente` y `tardanza` exigen hora de entrada.
 */
export type RrhhEstadoAsistencia =
  | 'presente'
  | 'ausente'
  | 'tardanza'
  | 'permiso'
  | 'vacaciones'
  | 'feriado'
  | 'incapacidad';

export interface RrhhAsistencia {
  id: number;
  empleado_id: number;
  fecha: string;
  hora_entrada: string | null;
  hora_salida: string | null;
  estado: RrhhEstadoAsistencia;
  observaciones: string | null;
}

export interface RrhhAsistenciaListado extends RrhhAsistencia {
  empleado_codigo: string | null;
  empleado_nombre: string | null;
  departamento_nombre: string | null;
  /** Horario pactado del empleado, para dar contexto en la tabla. */
  horario_inicio: string | null;
  horario_final: string | null;
  /** Cálculos derivados del horario (no persistidos en la BD). */
  tardanza_minutos: number;
  horas_trabajadas_minutos: number;
  horas_extras_minutos: number;
}

export interface RrhhAsistenciaCreate {
  empleado_id: number;
  fecha: string;
  hora_entrada?: string | null;
  hora_salida?: string | null;
  estado?: RrhhEstadoAsistencia;
  observaciones?: string | null;
}

export type RrhhAsistenciaUpdate = Partial<
  Omit<RrhhAsistenciaCreate, 'empleado_id' | 'fecha'>
>;

/** Payload de marcación rápida de entrada/salida. */
export interface RrhhAsistenciaMarcacion {
  empleado_id: number;
  /** Si se omite, usa la fecha de hoy en el servidor. */
  fecha?: string | null;
  /** Si se omite, usa la hora actual en el servidor. */
  hora?: string | null;
  observaciones?: string | null;
}

export interface RrhhAsistenciaResumenDia {
  fecha: string;
  total_empleados: number;
  presentes: number;
  ausentes: number;
  tardanzas: number;
  permisos: number;
  vacaciones: number;
  feriados: number;
  incapacidades: number;
  total_tardanza_minutos: number;
  total_horas_extras_minutos: number;
}

export const RRHH_ESTADOS_ASISTENCIA: {
  valor: RrhhEstadoAsistencia;
  etiqueta: string;
}[] = [
  { valor: 'presente', etiqueta: 'Presente' },
  { valor: 'ausente', etiqueta: 'Ausente' },
  { valor: 'tardanza', etiqueta: 'Tardanza' },
  { valor: 'permiso', etiqueta: 'Permiso' },
  { valor: 'vacaciones', etiqueta: 'Vacaciones' },
  { valor: 'feriado', etiqueta: 'Feriado' },
  { valor: 'incapacidad', etiqueta: 'Incapacidad' },
];

/** Estados que exigen hora de entrada (según el CHECK de BD). */
export const RRHH_ESTADOS_CON_HORAS: RrhhEstadoAsistencia[] = [
  'presente',
  'tardanza',
];

/** Colores de la insignia de cada estado de asistencia. */
export const RRHH_ESTADO_ASISTENCIA_BADGE: Record<RrhhEstadoAsistencia, string> = {
  presente: 'bg-green-100 text-green-700',
  ausente: 'bg-red-100 text-red-700',
  tardanza: 'bg-amber-100 text-amber-700',
  permiso: 'bg-purple-100 text-purple-700',
  vacaciones: 'bg-blue-100 text-blue-700',
  feriado: 'bg-slate-200 text-slate-600',
  incapacidad: 'bg-orange-100 text-orange-700',
};

/**
 * Formatea minutos como `H:MM` para mostrar en pantalla.
 * Equivale a `minutos_a_horas_minutos` del backend.
 */
export function formatearMinutos(minutos: number): string {
  const signo = minutos < 0 ? '-' : '';
  const total = Math.abs(minutos);
  return `${signo}${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
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
