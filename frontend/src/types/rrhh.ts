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
  codigo_empleado: string;
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

/** El código no se edita: se captura solo en el alta. */
export type RrhhEmpleadoUpdate = Partial<
  Omit<RrhhEmpleadoCreate, 'codigo_empleado'>
>;

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
  /** LIBRE (sin horario pactado) o NO_LIBRE. */
  tipo_asistencia: RrhhTipoAsistencia;
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

/**
 * Una nómina es un **lote** (cabecera) con un detalle por empleado.
 * `pre_nomina` es editable; al confirmarla pasa a `nomina` y queda de solo
 * lectura.
 */
export type RrhhEstadoNomina = 'pre_nomina' | 'nomina';

export const ESTADOS_NOMINA: RrhhEstadoNomina[] = ['pre_nomina', 'nomina'];

/** Colores de la insignia de estado de una nómina. */
export const COLOR_ESTADO_NOMINA: Record<RrhhEstadoNomina, string> = {
  pre_nomina: 'bg-amber-100 text-amber-700',
  nomina: 'bg-green-100 text-green-700',
};

/** Etiquetas visibles de los estados de una nómina. */
export const ETIQUETA_ESTADO_NOMINA: Record<RrhhEstadoNomina, string> = {
  pre_nomina: 'Pre-nómina',
  nomina: 'Nómina',
};

export interface RrhhNominaListado {
  id: number;
  descripcion: string;
  periodo: string;
  inicio_periodo: string;
  fin_periodo: string;
  moneda_id: number;
  tasa: number | string;
  porcentaje_impuesto: number | string;
  estado: RrhhEstadoNomina;
  moneda_nombre: string | null;
  moneda_simbolo: string | null;
  cantidad_empleados: number;
  total_devengado: number | string;
  total_deducciones: number | string;
  total_neto: number | string;
  total_pagado: number | string;
  cantidad_pagos: number;
  created_at?: string;
  updated_at?: string;
}

/** Fila del detalle: los cálculos de un empleado dentro del lote. */
export interface RrhhNominaEmpleadoRead {
  id_nomina_empleado: number;
  empleado_id: number;
  empleado_codigo: string | null;
  empleado_nombre: string | null;
  puesto_nombre: string | null;
  departamento_id: number | null;
  departamento_nombre: string | null;
  salario_base: number | string;
  horas_extras: number | string;
  deducciones: number | string;
  bonificaciones: number | string;
  /** Alias de `neto_a_cobrar`; no se muestran ambos. */
  salario_neto: number | string;
  devengado: number | string;
  impuesto: number | string;
  neto_a_cobrar: number | string;
  /** Pago del empleado; `null` mientras esté pendiente. */
  fecha_pago: string | null;
  monto: number | string | null;
  metodo_id: number | null;
  metodo_nombre: string | null;
  referencia: string | null;
}

/** Empleado activo ofrecido por el selector de la pre-nómina. */
export type RrhhNominaCandidato = Omit<
  RrhhNominaEmpleadoRead,
  'id_nomina_empleado'
> & {
  /** `null` si todavía no forma parte del lote. */
  id_nomina_empleado: number | null;
  seleccionado: boolean;
};

export interface RrhhNominaDetalle extends RrhhNominaListado {
  empleados: RrhhNominaEmpleadoRead[];
}

/** Cabecera del alta de una nómina (nace en `pre_nomina`). */
export interface RrhhNominaCreate {
  descripcion: string;
  periodo: string;
  inicio_periodo: string;
  fin_periodo: string;
  moneda_id: number;
  tasa: number;
  porcentaje_impuesto: number;
}

export type RrhhNominaUpdate = Partial<RrhhNominaCreate>;

/** Pago de un empleado de la nómina (los campos vacíos quitan el pago). */
export interface RrhhNominaPagoItem {
  empleado_id: number;
  fecha_pago?: string | null;
  monto?: number | string | null;
  metodo_id?: number | null;
  referencia?: string | null;
}

/** Fila del listado de pagos, con su nómina y empleado resueltos. */
export interface RrhhPagoListado {
  id: number;
  nomina_id: number;
  nomina_descripcion: string | null;
  empleado_id: number;
  empleado_codigo: string | null;
  empleado_nombre: string | null;
  fecha_pago: string;
  monto: number | string;
  metodo_id: number;
  metodo_nombre: string | null;
  referencia: string | null;
  periodo: string;
  inicio_periodo: string;
  fin_periodo: string;
  estado_nomina: RrhhEstadoNomina;
  created_at?: string;
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

/** Fila del catálogo `tipos_evaluaciones` (del que tira el formulario de Evaluaciones). */
export interface RrhhTipoEvaluacion {
  id_tipos_evaluaciones: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Fila del catálogo `periodo_evaluaciones` (selector del formulario). */
export interface RrhhPeriodoEvaluacion {
  id_periodo_evaluacion: number;
  nombre: string;
  descripcion: string | null;
  /** Rango que desambigua periodos con el mismo nombre. */
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  /** Derivado: ya existe un lote de pago por resultado para este periodo. */
  pagado_x_resultado: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Entrada del catálogo «Calificaciones»: es una **escala completa** de
 * puntuación. Su `valor` solo puede ser 5, 10 o 100 (5 → escala 1–5,
 * 10 → 1–10, 100 → 1–100); el backend rechaza con 422 cualquier otro.
 * Vale como Create como como Read (el CRUD de catálogos es genérico).
 */
export interface RrhhCalificacion {
  id_calificaciones: number;
  nombre: string;
  /** Escala que define: ∈ {5, 10, 100} (nunca un valor libre). */
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
  | RrhhTipoEvaluacion
  | RrhhPeriodoEvaluacion
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
  /** Tiene columna `valor` (calificaciones: escala ∈ {5, 10, 100}). */
  tieneValor: boolean;
  /** Tiene rango de fechas obligatorio (periodos de evaluación). */
  tieneFechas?: boolean;
  /** Muestra el estado derivado `pagado_x_resultado`. */
  tienePagado?: boolean;
  /** Longitud máxima del nombre según la restricción de BD. */
  maxNombre: number;
  descripcion: string;
  /**
   * Pestaña con UI propia (formularios con FK que el CRUD genérico no cubre):
   * se embebe la página completa de la sección en vez de la lista genérica.
   */
  custom?: 'departamentos' | 'puestos';
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
    id: 'departamentos',
    nombre: 'Departamentos',
    ruta: '/rrhh/departamentos',
    pk: 'id_departamento',
    tieneActivo: true,
    tienePorcentaje: false,
    tieneValor: false,
    maxNombre: 100,
    descripcion: 'Estructura organizativa (con responsable y puestos).',
    custom: 'departamentos',
  },
  {
    id: 'puestos',
    nombre: 'Puestos',
    ruta: '/rrhh/puestos',
    pk: 'id_puesto',
    tieneActivo: true,
    tienePorcentaje: false,
    tieneValor: false,
    maxNombre: 100,
    descripcion: 'Puestos de cada departamento, con rango salarial.',
    custom: 'puestos',
  },
  {
    id: 'tipos-evaluacion',
    nombre: 'Tipos de evaluación',
    ruta: '/rrhh/catalogos/tipos-evaluacion',
    pk: 'id_tipos_evaluaciones',
    tieneActivo: true,
    tienePorcentaje: false,
    tieneValor: false,
    maxNombre: 50,
    descripcion: 'Clasificación de las evaluaciones (formal, parcial, etc.).',
  },
  {
    id: 'periodos-evaluacion',
    nombre: 'Periodos de evaluación',
    ruta: '/rrhh/catalogos/periodos-evaluacion',
    pk: 'id_periodo_evaluacion',
    tieneActivo: true,
    tienePorcentaje: false,
    tieneValor: false,
    tieneFechas: true,
    tienePagado: true,
    maxNombre: 100,
    descripcion:
      'Periodos reutilizables para evaluar y repartir el pago por resultado.',
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
    descripcion:
      'Escala de valoración usada en las evaluaciones (su valor es el último número: 5 → 1–5, 100 → 1–100).',
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

// ── Evaluaciones y objetivos (Fase 8 v2 — objetivos ponderados) ─────────────

/**
 * Definición de un objetivo de un empleado: se define con su periodo
 * (obligatorio: decide en qué evaluaciones puede seleccionarse) y su peso
 * fijo (> 0), que dice cuánto aporta al promedio ponderado de la evaluación
 * que lo incluya. La puntuación vive en la evaluación (`RrhhEvaluacionObjetivo`).
 */
export interface RrhhObjetivo {
  id_objetivos: number;
  empleado_id: number;
  nombre: string;
  periodo_inicio: string;
  periodo_fin: string;
  /** Peso fijo del objetivo (Decimal del backend → string). */
  peso: string;
  observaciones: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Detalle de un objetivo, con los datos de su empleado resueltos. */
export interface RrhhObjetivoDetalle extends RrhhObjetivo {
  empleado_nombre: string | null;
  empleado_codigo: string | null;
}

export interface RrhhObjetivoCreate {
  empleado_id: number;
  nombre: string;
  periodo_inicio: string;
  periodo_fin: string;
  /** Defecto 1; el backend exige > 0. */
  peso?: number | string;
  observaciones?: string | null;
}

export type RrhhObjetivoUpdate = Partial<Omit<RrhhObjetivoCreate, 'empleado_id'>>;

/**
 * Fila de la relación N:M `evaluaciones_objetivos`: un objetivo seleccionado
 * en la evaluación, con su peso efectivo y su puntuación (estrellas 0–5,
 * valoración y recomendaciones).
 */
export interface RrhhEvaluacionObjetivo {
  /** Fila en `evaluaciones_objetivos`; `null` = aún no seleccionado. */
  fila_id: number | null;
  id_objetivo: number;
  nombre: string;
  periodo_inicio: string;
  periodo_fin: string;
  /** Peso fijo del objetivo (Decimal → string), el de partida al seleccionarlo. */
  peso_objetivo: string;
  seleccionado: boolean;
  /** Peso efectivo de la fila, editable al puntuar (Decimal → string). */
  peso: string;
  /** Estrellas 0–5 (`null` = sin puntuar); solo con `seleccionado`. */
  resultado: number | null;
  valoracion: string | null;
  recomendaciones: string | null;
}

export interface RrhhEvaluacion {
  id: number;
  empleado_id: number;
  evaluador_id: number | null;
  periodo: string;
  /** FK al catálogo `periodo_evaluaciones` (nullable en datos legados). */
  periodo_evaluacion_id: number | null;
  /** FK al catálogo `tipos_evaluaciones`. */
  tipo_evaluacion_id: number;
  /** Nombre del tipo, resuelto del catálogo (solo lectura). */
  tipo_evaluacion: string | null;
  inicio_periodo: string;
  fin_periodo: string;
  /**
   * Promedio **ponderado 0–5** de las filas puntuadas
   * (Σ estrellas×peso ÷ Σ pesos; Decimal → string); `null` sin puntuar.
   */
  promedio_objetivos: string | null;
  comentarios: string | null;
  /** Recomendaciones generales de la evaluación (texto libre). */
  recomendaciones: string | null;
  fecha: string;
  created_at?: string;
  updated_at?: string;
}

export interface RrhhEvaluacionListado extends RrhhEvaluacion {
  empleado_codigo: string | null;
  empleado_nombre: string | null;
  departamento_nombre: string | null;
  evaluador_nombre: string | null;
  /** Objetivos del empleado en alcance del periodo… */
  cantidad_objetivos: number;
  /** …y los ya seleccionados en esta evaluación. */
  cantidad_seleccionados: number;
}

export interface RrhhEvaluacionDetalle extends RrhhEvaluacionListado {
  /** Objetivos del empleado en alcance del periodo (y los seleccionados que
   * quedaron fuera de rango), con su fila si están seleccionados. */
  objetivos: RrhhEvaluacionObjetivo[];
}

/** Payload de alta: solo cabecera (sin criterios ni escalas). */
export interface RrhhEvaluacionCreate {
  empleado_id: number;
  evaluador_id?: number | null;
  /** Texto legible; el formulario lo rellena desde el catálogo. */
  periodo?: string | null;
  /** FK al catálogo `periodo_evaluaciones` (selector del formulario). */
  periodo_evaluacion_id?: number | null;
  /** FK al catálogo `tipos_evaluaciones` (selector del formulario). */
  tipo_evaluacion_id: number;
  inicio_periodo: string;
  fin_periodo: string;
  comentarios?: string | null;
  recomendaciones?: string | null;
  fecha?: string | null;
}

export type RrhhEvaluacionUpdate = Partial<
  Omit<RrhhEvaluacionCreate, 'empleado_id'>
>;

/** Selección masiva de objetivos en una evaluación (siempre editable). */
export interface RrhhEvaluacionObjetivoSeleccion {
  objetivo_ids: number[];
}

/** Edición parcial de una fila seleccionada (siempre editable). */
export interface RrhhEvaluacionObjetivoUpdate {
  peso?: number | string;
  /** Estrellas 0–5. */
  resultado?: number;
  valoracion?: string | null;
  recomendaciones?: string | null;
}

export interface RrhhEvaluacionEmpleadoReporte {
  empleado_id: number;
  empleado_codigo: string | null;
  empleado_nombre: string | null;
  departamento_nombre: string | null;
  cantidad_evaluaciones: number;
  /** Promedio ponderado medio 0–5 (Decimal → string). */
  promedio_objetivos: string | null;
}

export interface RrhhEvaluacionReporte {
  desde: string | null;
  hasta: string | null;
  cantidad_evaluaciones: number;
  /** Promedio ponderado medio 0–5 del rango (Decimal → string). */
  promedio_objetivos: string | null;
  empleados: RrhhEvaluacionEmpleadoReporte[];
}

// ── Pago por resultado ─────────────────────────────────────────────────────

/** Empleado con evaluación en el periodo (candidato del formulario). */
export interface RrhhPagoResultadoCandidato {
  empleado_id: number;
  evaluacion_id: number;
  empleado_codigo: string | null;
  empleado_nombre: string | null;
  departamento_nombre: string | null;
  /** Promedio 0–5 (Decimal → string). */
  puntuacion: number | string;
  /** `false` si la evaluación todavía no tiene objetivos puntuados. */
  puntuada: boolean;
}

export interface RrhhPagoResultadoPreview {
  periodo_evaluacion_id: number;
  periodo_nombre: string | null;
  inicio_periodo: string | null;
  fin_periodo: string | null;
  /** El periodo ya tiene un lote de pago por resultado. */
  pagado_x_resultado: boolean;
  empleados: RrhhPagoResultadoCandidato[];
}

export interface RrhhPagoResultadoEmpleado {
  id_pago_x_resultado_empleado: number;
  empleado_id: number;
  evaluacion_id: number;
  empleado_codigo: string | null;
  empleado_nombre: string | null;
  departamento_nombre: string | null;
  puntuacion: number | string;
  coeficiente: number | string;
  monto_individual: number | string;
}

export interface RrhhPagoResultado {
  id_pago_x_resultado: number;
  periodo_evaluacion_id: number;
  periodo_nombre: string | null;
  descripcion: string | null;
  inicio_periodo: string;
  fin_periodo: string;
  monto: number | string;
  promedio_general: number | string;
  suma_coeficientes_empleados: number | string;
  empleados: RrhhPagoResultadoEmpleado[];
  created_at?: string;
  updated_at?: string;
}

export interface RrhhPagoResultadoListado {
  id_pago_x_resultado: number;
  periodo_evaluacion_id: number;
  periodo_nombre: string | null;
  descripcion: string | null;
  inicio_periodo: string;
  fin_periodo: string;
  monto: number | string;
  promedio_general: number | string;
  suma_coeficientes_empleados: number | string;
  empleados_count: number;
  total_pagado: number | string;
  created_at?: string;
}

export interface RrhhPagoResultadoCreate {
  periodo_evaluacion_id: number;
  descripcion?: string | null;
  inicio_periodo: string;
  fin_periodo: string;
  monto: number;
  empleado_ids: number[];
}

// ── Auditoría (Fase 9) ──────────────────────────────────────────────────────

/**
 * Fila del registro de auditoría del módulo (Fase 9): una entrada de la tabla
 * `log` con el contexto completo de la petición o acción — cuándo ocurrió, qué
 * severidad tiene, quién la ejecutó y desde dónde. `nivel` y `tipo` llegan en
 * mayúsculas (`INFO`/`WARNING`/`ERROR` y `REQUEST`/`SOLICITUD`/`ACTION`/
 * `NOMINA`/`FRONTEND`); `detalle` es un JSON guardado como texto (p. ej.
 * `{"duration_ms":126}`) y `null` cuando no hay contexto extra.
 */
export interface RrhhAuditoriaFila {
  /** Identificador de la entrada de log. */
  id: number;
  /** Marca de tiempo ISO (p. ej. `2026-10-16T12:34:56`). */
  timestamp: string;
  /** Severidad del evento: `INFO`, `WARNING` o `ERROR`. */
  nivel: string;
  /** Categoría del evento: `REQUEST`, `SOLICITUD`, `ACTION`, `NOMINA` o `FRONTEND`. */
  tipo: string;
  /** Descripción legible (p. ej. `GET /rrhh/nomina/costo - 200`). */
  mensaje: string;
  /** Contexto extra en JSON como texto; `null` si no existe. */
  detalle: string | null;
  /** IP desde la que llegó la petición, si se registró. */
  ip: string | null;
  /** Usuario autenticado que ejecutó la acción; `null` si no había sesión. */
  usuario_id: number | null;
  usuario_nombre: string | null;
  /** Endpoint asociado a la petición (para REQUEST). */
  endpoint: string | null;
  /** Método HTTP de la petición (`GET`, `POST`…); `null` si no aplica. */
  method: string | null;
  /** Código de estado HTTP devuelto; `null` si no aplica. */
  status_code: number | null;
  /** User-Agent recortado; se muestra en la fila expandida. */
  navegador: string | null;
}
