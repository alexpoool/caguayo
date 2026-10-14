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

// ── Deducciones y bonificaciones (Fase 5) ──────────────────────────────────

/**
 * Movimiento de nómina por empleado. El `valor` es un importe fijo o un
 * porcentaje del salario, según `es_porcentaje` del tipo.
 */
export interface RrhhMovimiento {
  empleado_id: number;
  tipo_deducciones_id?: number;
  tipo_bonificaciones_id?: number;
  valor: number;
  inicio_periodo: string;
  fin_periodo: string;
  observaciones: string | null;
}

export interface RrhhDeduccion extends RrhhMovimiento {
  id_deducciones: number;
  tipo_deducciones_id: number;
}

export interface RrhhBonificacion extends RrhhMovimiento {
  id_bonificaciones: number;
  tipo_bonificaciones_id: number;
}

/** Fila del listado, con el empleado/tipo resueltos y el monto calculado. */
export interface RrhhMovimientoListado {
  empleado_id: number;
  valor: number;
  inicio_periodo: string;
  fin_periodo: string;
  observaciones: string | null;
  empleado_codigo: string | null;
  empleado_nombre: string | null;
  departamento_nombre: string | null;
  tipo_nombre: string | null;
  es_porcentaje: boolean;
  salario: number | null;
  /** Dinero efectivo: el `valor` o, si es porcentual, el % del salario. */
  monto: number | string;
  created_at?: string;
  updated_at?: string;
}

export interface RrhhDeduccionListado extends RrhhMovimientoListado {
  id_deducciones: number;
  tipo_deducciones_id: number;
}

export interface RrhhBonificacionListado extends RrhhMovimientoListado {
  id_bonificaciones: number;
  tipo_bonificaciones_id: number;
}

export interface RrhhMovimientoCreate {
  empleado_id: number;
  valor: number;
  inicio_periodo: string;
  fin_periodo: string;
  observaciones?: string | null;
}

export interface RrhhDeduccionCreate extends RrhhMovimientoCreate {
  tipo_deducciones_id: number;
}

export interface RrhhBonificacionCreate extends RrhhMovimientoCreate {
  tipo_bonificaciones_id: number;
}

export type RrhhMovimientoUpdate = Partial<Omit<RrhhMovimientoCreate, 'empleado_id'>> & {
  tipo_deducciones_id?: number;
  tipo_bonificaciones_id?: number;
};

/** Totales por empleado de los movimientos que cubren un rango. */
export interface RrhhConsolidadoEmpleado {
  empleado_id: number;
  empleado_codigo: string | null;
  empleado_nombre: string;
  departamento_nombre: string | null;
  salario: number | null;
  total_deducciones: number | string;
  total_bonificaciones: number | string;
  saldo: number | string;
  cantidad_deducciones: number;
  cantidad_bonificaciones: number;
}

export interface RrhhConsolidado {
  desde: string | null;
  hasta: string | null;
  total_deducciones: number | string;
  total_bonificaciones: number | string;
  saldo: number | string;
  cantidad_empleados: number;
  empleados: RrhhConsolidadoEmpleado[];
}

// ── Nómina y pagos (Fase 6) ────────────────────────────────────────────────

export type RrhhEstadoNomina = 'pendiente' | 'pagada' | 'anulada';

export const ESTADOS_NOMINA: RrhhEstadoNomina[] = ['pendiente', 'pagada', 'anulada'];

/** Colores de la insignia de estado de una nómina. */
export const COLOR_ESTADO_NOMINA: Record<RrhhEstadoNomina, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  pagada: 'bg-green-100 text-green-700',
  anulada: 'bg-slate-200 text-slate-600',
};

export interface RrhhNomina {
  id: number;
  empleado_id: number;
  periodo: string;
  inicio_periodo: string;
  fin_periodo: string;
  salario_base: number | string;
  horas_extras: number | string;
  deducciones: number | string;
  bonificaciones: number | string;
  salario_neto: number | string | null;
  estado: RrhhEstadoNomina;
  created_at?: string;
  updated_at?: string;
}

export interface RrhhNominaListado extends RrhhNomina {
  empleado_codigo: string | null;
  empleado_nombre: string | null;
  departamento_nombre: string | null;
  total_pagado: number | string;
  cantidad_pagos: number;
}

/** Una deducción/bonificación congelada en la nómina. */
export interface RrhhDetalleNomina {
  tipo_nombre: string | null;
  es_porcentaje: boolean;
  valor_original: number | string | null;
  monto_aplicado: number | string;
}

export interface RrhhPago {
  id: number;
  nomina_id: number;
  metodo_id: number;
  monto: number | string;
  fecha_pago: string;
  referencia: string | null;
  observaciones: string | null;
  metodo_nombre: string | null;
  created_at?: string;
}

export interface RrhhNominaDetalle extends RrhhNominaListado {
  deducciones_aplicadas: RrhhDetalleNomina[];
  bonificaciones_aplicadas: RrhhDetalleNomina[];
  pagos: RrhhPago[];
}

export interface RrhhNominaGenerar {
  inicio_periodo: string;
  fin_periodo: string;
  empleado_id?: number | null;
  departamento_id?: number | null;
  periodo?: string | null;
}

export interface RrhhNominaGenerada {
  creadas: number;
  omitidas: number;
  detalle: string[];
}

export interface RrhhPagoInput {
  metodo_id: number;
  monto: number | string;
  fecha_pago?: string | null;
  referencia?: string | null;
  observaciones?: string | null;
}

export interface RrhhCostoDepartamento {
  departamento_id: number | null;
  departamento_nombre: string | null;
  cantidad_empleados: number;
  salario_base: number | string;
  horas_extras: number | string;
  deducciones: number | string;
  bonificaciones: number | string;
  salario_neto: number | string;
}

export interface RrhhReporteCosto {
  desde: string | null;
  hasta: string | null;
  total_salario_base: number | string;
  total_horas_extras: number | string;
  total_deducciones: number | string;
  total_bonificaciones: number | string;
  total_neto: number | string;
  cantidad_nominas: number;
  departamentos: RrhhCostoDepartamento[];
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

// ── Solicitudes de vacaciones y permisos (Fase 7) ───────────────────────────

export type RrhhTipoSolicitud = 'vacaciones' | 'permiso';
export type RrhhEstadoSolicitud = 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada';

export const TIPOS_SOLICITUD: RrhhTipoSolicitud[] = ['vacaciones', 'permiso'];
export const ESTADOS_SOLICITUD: RrhhEstadoSolicitud[] = [
  'pendiente',
  'aprobada',
  'rechazada',
  'cancelada',
];

/** Colores de la insignia de estado de una solicitud. */
export const COLOR_ESTADO_SOLICITUD: Record<RrhhEstadoSolicitud, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  aprobada: 'bg-green-100 text-green-700',
  rechazada: 'bg-red-100 text-red-700',
  cancelada: 'bg-slate-200 text-slate-600',
};

/** Colores por tipo, para el calendario. */
export const COLOR_TIPO_SOLICITUD: Record<RrhhTipoSolicitud, string> = {
  vacaciones: 'bg-blue-500',
  permiso: 'bg-violet-500',
};

export interface RrhhSolicitud {
  id: number;
  empleado_id: number;
  tipo: RrhhTipoSolicitud;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string | null;
  estado: RrhhEstadoSolicitud;
  aprobado_por: number | null;
  fecha_aprobacion: string | null;
  observaciones: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RrhhSolicitudListado extends RrhhSolicitud {
  empleado_codigo: string | null;
  empleado_nombre: string | null;
  departamento_nombre: string | null;
  aprobador_nombre: string | null;
  /** Supervisor del solicitante: quién debe aprobar (se precarga). */
  supervisor_id: number | null;
  supervisor_nombre: string | null;
  /** Días naturales que cubre (calculado). */
  dias: number;
}

export interface RrhhSolicitudCreate {
  empleado_id: number;
  tipo: RrhhTipoSolicitud;
  fecha_inicio: string;
  fecha_fin: string;
  motivo?: string | null;
}

/** Quién ejecuta aprobar/rechazar/cancelar (sin auth en backend). */
export interface RrhhSolicitudAccion {
  empleado_id: number;
  observaciones?: string | null;
}

export interface RrhhSolicitudCalendario {
  id: number;
  empleado_id: number;
  empleado_nombre: string | null;
  departamento_nombre: string | null;
  tipo: RrhhTipoSolicitud;
  estado: RrhhEstadoSolicitud;
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
  motivo: string | null;
}

export interface RrhhSolicitudResumen {
  estado: RrhhEstadoSolicitud;
  cantidad: number;
}

// ── Evaluaciones, objetivos y metas (Fase 8) ────────────────────────────────

export type RrhhTipoEvaluacion = 'formal' | 'autoevaluacion' | 'parcial' | 'final';
export type RrhhEstadoEvaluacion = 'borrador' | 'finalizada';

export const TIPOS_EVALUACION: RrhhTipoEvaluacion[] = [
  'formal',
  'autoevaluacion',
  'parcial',
  'final',
];
export const ESTADOS_EVALUACION: RrhhEstadoEvaluacion[] = ['borrador', 'finalizada'];

export const ETIQUETA_TIPO_EVALUACION: Record<RrhhTipoEvaluacion, string> = {
  formal: 'Formal',
  autoevaluacion: 'Autoevaluación',
  parcial: 'Parcial',
  final: 'Final',
};

/** Insignias de estado: el borrador se edita, la finalizada está congelada. */
export const COLOR_ESTADO_EVALUACION: Record<RrhhEstadoEvaluacion, string> = {
  borrador: 'bg-amber-100 text-amber-700',
  finalizada: 'bg-green-100 text-green-700',
};

/** Los 4 criterios son columnas FK fijas a `calificaciones`. */
export const CRITERIOS_EVALUACION = [
  'puntualidad',
  'productividad',
  'trabajo_equipo',
  'calidad',
] as const;

export type RrhhCriterio = (typeof CRITERIOS_EVALUACION)[number];

export interface RrhhMeta {
  id_metas: number;
  objetivo_id: number;
  nombre: string;
  resultado_meta: number | null;
  valoracion: number | null;
  observaciones: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RrhhObjetivo {
  id_objetivos: number;
  evaluacion_id: number;
  nombre: string;
  resultado_objetivo: string | null;
  valoracion: number | null;
  observaciones: string | null;
  /** Aporte al promedio global, en 0–100. */
  aporte: string | null;
  metas: RrhhMeta[];
  created_at?: string;
  updated_at?: string;
}

export interface RrhhEvaluacion {
  id: number;
  empleado_id: number;
  evaluador_id: number | null;
  periodo: string;
  tipo_evaluacion: RrhhTipoEvaluacion;
  estado: RrhhEstadoEvaluacion;
  inicio_periodo: string;
  fin_periodo: string;
  /** Criterios: ids de `calificaciones` (no valores). */
  puntualidad: number | null;
  productividad: number | null;
  trabajo_equipo: number | null;
  calidad: number | null;
  /** Escala 0–100, persistido y recalculado en cada cambio de objetivo/meta. */
  promedio_objetivos: string | null;
  comentarios: string | null;
  fecha: string;
  created_at?: string;
  updated_at?: string;
}

export interface RrhhEvaluacionListado extends RrhhEvaluacion {
  empleado_codigo: string | null;
  empleado_nombre: string | null;
  departamento_nombre: string | null;
  evaluador_nombre: string | null;
  /** Escala 1–5, calculado al leer (no persistido en el backend). */
  promedio_criterios: string | null;
  cantidad_objetivos: number;
  cantidad_metas: number;
}

/** Criterio con su calificación resuelta, listo para el radar. */
export interface RrhhCriterioEvaluacion {
  criterio: RrhhCriterio;
  etiqueta: string;
  /** `calificaciones.valor` (1–5) o 0 si todavía no está puntuado. */
  valor: number;
  calificacion_nombre: string | null;
}

export interface RrhhEvaluacionDetalle extends RrhhEvaluacionListado {
  criterios: RrhhCriterioEvaluacion[];
  objetivos: RrhhObjetivo[];
  /** Valoración media de objetivos+metas en 1–5. */
  promedio_valoracion_1a5: string | null;
}

export interface RrhhEvaluacionCreate {
  empleado_id: number;
  evaluador_id?: number | null;
  periodo: string;
  tipo_evaluacion: RrhhTipoEvaluacion;
  inicio_periodo: string;
  fin_periodo: string;
  puntualidad?: number | null;
  productividad?: number | null;
  trabajo_equipo?: number | null;
  calidad?: number | null;
  comentarios?: string | null;
  fecha?: string | null;
}

export type RrhhEvaluacionUpdate = Partial<
  Omit<RrhhEvaluacionCreate, 'empleado_id'>
>;

export interface RrhhObjetivoCreate {
  nombre: string;
  resultado_objetivo?: string | null;
  valoracion?: number | null;
  observaciones?: string | null;
}

export interface RrhhMetaCreate extends RrhhObjetivoCreate {
  resultado_meta?: number | null;
}

export interface RrhhEvaluacionEmpleadoReporte {
  empleado_id: number;
  empleado_codigo: string | null;
  empleado_nombre: string | null;
  departamento_nombre: string | null;
  cantidad_evaluaciones: number;
  promedio_criterios: string | null;
  promedio_objetivos: string | null;
}

export interface RrhhEvaluacionReporte {
  desde: string | null;
  hasta: string | null;
  cantidad_evaluaciones: number;
  cantidad_borradores: number;
  cantidad_finalizadas: number;
  promedio_criterios: string | null;
  promedio_objetivos: string | null;
  empleados: RrhhEvaluacionEmpleadoReporte[];
}
