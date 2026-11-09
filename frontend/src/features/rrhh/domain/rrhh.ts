import type {
  RrhhAsistencia,
  RrhhAsistenciaCreate,
  RrhhAsistenciaListado,
  RrhhAsistenciaMarcacion,
  RrhhAsistenciaResumenDia,
  RrhhAsistenciaUpdate,
  RrhhAuditoriaFila,
  RrhhBonificacion,
  RrhhBonificacionCreate,
  RrhhBonificacionListado,
  RrhhCatalogo,
  RrhhCatalogoConfig,
  RrhhConsolidado,
  RrhhDeduccion,
  RrhhDeduccionCreate,
  RrhhDeduccionListado,
  RrhhDepartamento,
  RrhhDepartamentoCreate,
  RrhhDepartamentoDetalle,
  RrhhDepartamentoListado,
  RrhhDepartamentoUpdate,
  RrhhEliminarResponse,
  RrhhEmpleado,
  RrhhEmpleadoBusqueda,
  RrhhEmpleadoCreate,
  RrhhEmpleadoDetalle,
  RrhhEmpleadoListado,
  RrhhEmpleadoLite,
  RrhhEmpleadoUpdate,
  RrhhEstadoAsistencia,
  RrhhEstadoNomina,
  RrhhEvaluacionCreate,
  RrhhEvaluacionDetalle,
  RrhhEvaluacionListado,
  RrhhEvaluacionObjetivo,
  RrhhEvaluacionObjetivoUpdate,
  RrhhEvaluacionReporte,
  RrhhEvaluacionUpdate,
  RrhhMovimientoUpdate,
  RrhhNominaCandidato,
  RrhhNominaCreate,
  RrhhNominaDetalle,
  RrhhNominaListado,
  RrhhNominaPagoItem,
  RrhhNominaUpdate,
  RrhhObjetivo,
  RrhhObjetivoCreate,
  RrhhObjetivoDetalle,
  RrhhObjetivoUpdate,
  RrhhPagoListado,
  RrhhPagoResultado,
  RrhhPagoResultadoCreate,
  RrhhPagoResultadoListado,
  RrhhPagoResultadoPreview,
  RrhhPeriodoEvaluacion,
  RrhhPuesto,
  RrhhPuestoCreate,
  RrhhPuestoDetalle,
  RrhhPuestoListado,
  RrhhPuestoUpdate,
  RrhhReporteCosto,
  RrhhSolicitudAccion,
  RrhhSolicitudCalendario,
  RrhhSolicitudCreate,
  RrhhSolicitudListado,
  RrhhSolicitudResumen,
  RrhhTipoAsistencia,
  RrhhTipoBonificacion,
  RrhhTipoContrato,
  RrhhTipoDeduccion,
  RrhhTipoEvaluacion,
  RrhhTipoPago,
} from '@/types/rrhh';
export * from '@/types/rrhh';
import type { Moneda } from '@/types/moneda';
export type { Moneda };

/** Puerto de persistencia de RRHH. Adaptador heredado transitorio. */
export interface RrhhRepositorio {
  listarEmpleados: (params?: { skip?: number; limit?: number; buscar?: string; estado?: string; departamento_id?: number; puesto_id?: number; activo?: boolean; orden?: "apellido" | "recientes"; }) => Promise<RrhhEmpleadoListado[]>;
  buscarEmpleados: (q: string) => Promise<RrhhEmpleadoBusqueda[]>;
  candidatosEmpleados: (q: string, tipo_asistencia?: RrhhTipoAsistencia) => Promise<RrhhEmpleadoBusqueda[]>;
  getEmpleado: (id: number) => Promise<RrhhEmpleadoDetalle>;
  createEmpleado: (data: RrhhEmpleadoCreate) => Promise<RrhhEmpleado>;
  updateEmpleado: (id: number, data: RrhhEmpleadoUpdate) => Promise<RrhhEmpleado>;
  deleteEmpleado: (id: number) => Promise<RrhhEliminarResponse>;
  listarCatalogo: (config: RrhhCatalogoConfig, params?: { skip?: number; limit?: number; activo?: boolean; buscar?: string; }) => Promise<RrhhCatalogo[]>;
  getCatalogo: (config: RrhhCatalogoConfig, id: number) => Promise<RrhhCatalogo>;
  createCatalogo: (config: RrhhCatalogoConfig, data: Record<string, unknown>) => Promise<RrhhCatalogo>;
  updateCatalogo: (config: RrhhCatalogoConfig, id: number, data: Record<string, unknown>) => Promise<RrhhCatalogo>;
  deleteCatalogo: (config: RrhhCatalogoConfig, id: number) => Promise<RrhhEliminarResponse>;
  listarTiposContrato: (params?: { skip?: number; limit?: number; activo?: boolean; buscar?: string; }) => Promise<RrhhTipoContrato[]>;
  listarTiposDeduccion: (params?: { skip?: number; limit?: number; activo?: boolean; buscar?: string; }) => Promise<RrhhTipoDeduccion[]>;
  listarTiposBonificacion: (params?: { skip?: number; limit?: number; activo?: boolean; buscar?: string; }) => Promise<RrhhTipoBonificacion[]>;
  listarTiposPago: (params?: { skip?: number; limit?: number; activo?: boolean; buscar?: string; }) => Promise<RrhhTipoPago[]>;
  listarTiposEvaluacion: (params?: { skip?: number; limit?: number; activo?: boolean; buscar?: string; }) => Promise<RrhhTipoEvaluacion[]>;
  listarPeriodosEvaluacion: (params?: { skip?: number; limit?: number; activo?: boolean; buscar?: string; }) => Promise<RrhhPeriodoEvaluacion[]>;
  crearPeriodoEvaluacion: (data: { nombre: string; descripcion?: string | null; }) => Promise<RrhhPeriodoEvaluacion>;
  listarDepartamentos: (params?: { skip?: number; limit?: number; activo?: boolean; buscar?: string; }) => Promise<RrhhDepartamentoListado[]>;
  getDepartamento: (id: number) => Promise<RrhhDepartamentoDetalle>;
  createDepartamento: (data: RrhhDepartamentoCreate) => Promise<RrhhDepartamento>;
  updateDepartamento: (id: number, data: RrhhDepartamentoUpdate) => Promise<RrhhDepartamento>;
  deleteDepartamento: (id: number) => Promise<RrhhEliminarResponse>;
  listarPuestos: (params?: { skip?: number; limit?: number; departamento_id?: number; activo?: boolean; buscar?: string; }) => Promise<RrhhPuestoListado[]>;
  getPuesto: (id: number) => Promise<RrhhPuestoDetalle>;
  createPuesto: (data: RrhhPuestoCreate) => Promise<RrhhPuesto>;
  updatePuesto: (id: number, data: RrhhPuestoUpdate) => Promise<RrhhPuesto>;
  deletePuesto: (id: number) => Promise<RrhhEliminarResponse>;
  empleadosDelPuesto: (id: number) => Promise<RrhhEmpleadoLite[]>;
  listarAsistencias: (params?: { skip?: number; limit?: number; empleado_id?: number; departamento_id?: number; desde?: string; hasta?: string; estado?: string; buscar?: string; }) => Promise<RrhhAsistenciaListado[]>;
  listarEstadosAsistencia: () => Promise<RrhhEstadoAsistencia[]>;
  resumenAsistenciaDia: (params: { fecha?: string; desde?: string; hasta?: string; estado?: RrhhEstadoAsistencia; buscar?: string; departamento_id?: number; }) => Promise<RrhhAsistenciaResumenDia>;
  getAsistencia: (id: number) => Promise<RrhhAsistenciaListado>;
  marcarAsistencia: (data: RrhhAsistenciaMarcacion) => Promise<RrhhAsistencia>;
  createAsistencia: (data: RrhhAsistenciaCreate) => Promise<RrhhAsistencia>;
  updateAsistencia: (id: number, data: RrhhAsistenciaUpdate) => Promise<RrhhAsistencia>;
  deleteAsistencia: (id: number) => Promise<RrhhEliminarResponse>;
  listarDeducciones: (params?: { skip?: number; limit?: number; empleado_id?: number; tipo_id?: number; desde?: string; hasta?: string; buscar?: string; }) => Promise<RrhhDeduccionListado[]>;
  createDeduccion: (data: RrhhDeduccionCreate) => Promise<RrhhDeduccion>;
  updateDeduccion: (id: number, data: RrhhMovimientoUpdate) => Promise<RrhhDeduccion>;
  deleteDeduccion: (id: number) => Promise<RrhhEliminarResponse>;
  listarBonificaciones: (params?: { skip?: number; limit?: number; empleado_id?: number; tipo_id?: number; desde?: string; hasta?: string; buscar?: string; }) => Promise<RrhhBonificacionListado[]>;
  createBonificacion: (data: RrhhBonificacionCreate) => Promise<RrhhBonificacion>;
  updateBonificacion: (id: number, data: RrhhMovimientoUpdate) => Promise<RrhhBonificacion>;
  deleteBonificacion: (id: number) => Promise<RrhhEliminarResponse>;
  consolidadoMovimientos: (params?: { desde?: string; hasta?: string; }) => Promise<RrhhConsolidado>;
  listarNominas: (params?: { skip?: number; limit?: number; estado?: RrhhEstadoNomina; desde?: string; hasta?: string; buscar?: string; }) => Promise<RrhhNominaListado[]>;
  obtenerNomina: (id: number) => Promise<RrhhNominaDetalle>;
  crearNomina: (data: RrhhNominaCreate) => Promise<RrhhNominaDetalle>;
  actualizarNomina: (id: number, data: RrhhNominaUpdate) => Promise<RrhhNominaDetalle>;
  eliminarNomina: (id: number) => Promise<{ accion: string; }>;
  confirmarNomina: (id: number) => Promise<RrhhNominaDetalle>;
  candidatosNomina: (id: number) => Promise<RrhhNominaCandidato[]>;
  guardarEmpleadosNomina: (id: number, empleadoIds: number[]) => Promise<RrhhNominaDetalle>;
  listarPagos: (params?: { skip?: number; limit?: number; nomina_id?: number; metodo_id?: number; desde?: string; hasta?: string; }) => Promise<RrhhPagoListado[]>;
  guardarPagosNomina: (id: number, pagos: RrhhNominaPagoItem[]) => Promise<RrhhNominaDetalle>;
  reporteCosto: (params?: { desde?: string; hasta?: string; departamento_id?: number; }) => Promise<RrhhReporteCosto>;
  descargarReciboNomina: (id: number) => Promise<{ blob: Blob; nombre: string; }>;
  listarSolicitudes: (params?: { skip?: number; limit?: number; empleado_id?: number; departamento_id?: number; estado?: string; tipo?: string; desde?: string; hasta?: string; buscar?: string; }) => Promise<RrhhSolicitudListado[]>;
  obtenerSolicitud: (id: number) => Promise<RrhhSolicitudListado>;
  crearSolicitud: (data: RrhhSolicitudCreate) => Promise<RrhhSolicitudListado>;
  aprobarSolicitud: (id: number, data: RrhhSolicitudAccion) => Promise<RrhhSolicitudListado>;
  rechazarSolicitud: (id: number, data: RrhhSolicitudAccion) => Promise<RrhhSolicitudListado>;
  cancelarSolicitud: (id: number, data: RrhhSolicitudAccion) => Promise<RrhhSolicitudListado>;
  resumenSolicitudes: (params?: { empleado_id?: number; }) => Promise<RrhhSolicitudResumen[]>;
  solicitudesCalendario: (params: { desde: string; hasta: string; departamento_id?: number; empleado_id?: number; }) => Promise<RrhhSolicitudCalendario[]>;
  tiposSolicitud: () => Promise<string[]>;
  estadosSolicitud: () => Promise<string[]>;
  listarEvaluaciones: (params?: { skip?: number; limit?: number; empleado_id?: number; departamento_id?: number; tipo_evaluacion_id?: number; desde?: string; hasta?: string; buscar?: string; }) => Promise<RrhhEvaluacionListado[]>;
  obtenerEvaluacion: (id: number) => Promise<RrhhEvaluacionDetalle>;
  crearEvaluacion: (data: RrhhEvaluacionCreate) => Promise<RrhhEvaluacionListado>;
  editarEvaluacion: (id: number, data: RrhhEvaluacionUpdate) => Promise<RrhhEvaluacionListado>;
  eliminarEvaluacion: (id: number) => Promise<RrhhEliminarResponse>;
  seleccionarObjetivos: (evaluacionId: number, objetivoIds: number[]) => Promise<RrhhEvaluacionDetalle>;
  puntuarObjetivo: (evaluacionId: number, filaId: number, data: RrhhEvaluacionObjetivoUpdate) => Promise<RrhhEvaluacionObjetivo>;
  quitarObjetivoEvaluacion: (evaluacionId: number, filaId: number) => Promise<{ mensaje: string; id: number; }>;
  reporteEvaluaciones: (params?: { empleado_id?: number; departamento_id?: number; desde?: string; hasta?: string; }) => Promise<RrhhEvaluacionReporte>;
  previewPagoResultado: (periodoEvaluacionId: number) => Promise<RrhhPagoResultadoPreview>;
  listarPagosResultado: (params?: { skip?: number; limit?: number; periodo_evaluacion_id?: number; nomina_id?: number; }) => Promise<RrhhPagoResultadoListado[]>;
  getPagoResultado: (id: number) => Promise<RrhhPagoResultado>;
  descargarDocumentoPagoResultado: (id: number) => Promise<{ blob: Blob; nombre: string; }>;
  crearPagoResultado: (data: RrhhPagoResultadoCreate) => Promise<RrhhPagoResultado>;
  eliminarPagoResultado: (id: number) => Promise<RrhhEliminarResponse>;
  listarObjetivos: (params?: { empleado_id?: number; skip?: number; limit?: number; }) => Promise<RrhhObjetivo[]>;
  crearObjetivo: (data: RrhhObjetivoCreate) => Promise<RrhhObjetivo>;
  editarObjetivo: (objetivoId: number, data: RrhhObjetivoUpdate) => Promise<RrhhObjetivo>;
  eliminarObjetivo: (objetivoId: number) => Promise<RrhhEliminarResponse>;
  obtenerObjetivo: (objetivoId: number) => Promise<RrhhObjetivoDetalle>;
  listarAuditoria: (params?: { skip?: number; limit?: number; desde?: string; hasta?: string; tipo?: string; nivel?: string; buscar?: string; }) => Promise<RrhhAuditoriaFila[]>;
  tiposAuditoria: () => Promise<string[]>;
  nivelesAuditoria: () => Promise<string[]>;
  getMonedas: (
    skip?: number,
    limit?: number,
    onTotal?: (total: number | null) => void,
  ) => Promise<Moneda[]>;
}
