import { apiClient } from '../lib/api';
import type {
  RrhhDepartamento,
  RrhhDepartamentoCreate,
  RrhhDepartamentoUpdate,
  RrhhDepartamentoDetalle,
  RrhhDepartamentoListado,
  RrhhPuesto,
  RrhhPuestoCreate,
  RrhhPuestoUpdate,
  RrhhPuestoListado,
  RrhhPuestoDetalle,
  RrhhEmpleadoLite,
  RrhhEliminarResponse,
  RrhhCatalogo,
  RrhhCatalogoConfig,
  RrhhEmpleado,
  RrhhEmpleadoCreate,
  RrhhEmpleadoUpdate,
  RrhhEmpleadoListado,
  RrhhTipoAsistencia,
  RrhhEmpleadoDetalle,
  RrhhEmpleadoBusqueda,
  RrhhTipoContrato,
  RrhhTipoDeduccion,
  RrhhTipoBonificacion,
  RrhhTipoPago,
  RrhhTipoEvaluacion,
  RrhhPeriodoEvaluacion,
  RrhhAsistencia,
  RrhhAsistenciaCreate,
  RrhhAsistenciaUpdate,
  RrhhAsistenciaListado,
  RrhhAsistenciaMarcacion,
  RrhhAsistenciaResumenDia,
  RrhhEstadoAsistencia,
  RrhhEstadoNomina,
  RrhhDeduccionListado,
  RrhhBonificacionListado,
  RrhhDeduccion,
  RrhhBonificacion,
  RrhhDeduccionCreate,
  RrhhBonificacionCreate,
  RrhhMovimientoUpdate,
  RrhhConsolidado,
  RrhhNominaListado,
  RrhhNominaDetalle,
  RrhhNominaCreate,
  RrhhNominaUpdate,
  RrhhNominaCandidato,
  RrhhNominaPagoItem,
  RrhhPagoListado,
  RrhhReporteCosto,
  RrhhSolicitudListado,
  RrhhSolicitudCreate,
  RrhhSolicitudAccion,
  RrhhSolicitudCalendario,
  RrhhSolicitudResumen,
  RrhhEvaluacionListado,
  RrhhEvaluacionDetalle,
  RrhhEvaluacionCreate,
  RrhhEvaluacionUpdate,
  RrhhEvaluacionObjetivo,
  RrhhEvaluacionObjetivoUpdate,
  RrhhObjetivo,
  RrhhObjetivoCreate,
  RrhhObjetivoUpdate,
  RrhhObjetivoDetalle,
  RrhhEvaluacionReporte,
  RrhhAuditoriaFila,
  RrhhPagoResultado,
  RrhhPagoResultadoListado,
  RrhhPagoResultadoPreview,
  RrhhPagoResultadoCreate,
} from '../types/rrhh';

export const rrhhService = {
  // ── Empleados (Fase 3) ──────────────────────────────────────────────────
  listarEmpleados: async (params?: {
    skip?: number;
    limit?: number;
    buscar?: string;
    estado?: string;
    departamento_id?: number;
    puesto_id?: number;
    activo?: boolean;
    orden?: 'apellido' | 'recientes';
  }): Promise<RrhhEmpleadoListado[]> => {
    return await apiClient.get('/rrhh/empleados', params);
  },

  buscarEmpleados: async (q: string): Promise<RrhhEmpleadoBusqueda[]> => {
    return await apiClient.get('/rrhh/empleados/buscar', { q });
  },

  /**
   * Candidatos para un selector con buscador: con menos de 2 letras
   * devuelve una lista inicial (los primeros activos, para poder elegir
   * sin escribir); desde 2 letras busca por nombre/código/carnet.
   *
   * `tipo_asistencia` filtra en el servidor: `'NO_LIBRE'` deja fuera al
   * personal sin horario pactado (el que sí se marca en Asistencia).
   */
  candidatosEmpleados: async (
    q: string,
    tipo_asistencia?: RrhhTipoAsistencia
  ): Promise<RrhhEmpleadoBusqueda[]> => {
    if (q.trim().length >= 2)
      return await apiClient.get('/rrhh/empleados/buscar', {
        q,
        tipo_asistencia,
      });
    const activos: RrhhEmpleadoListado[] = await apiClient.get('/rrhh/empleados', {
      activo: true,
      tipo_asistencia,
      limit: 20,
    });
    return activos.map((e) => ({
      id: e.id,
      codigo_empleado: e.codigo_empleado,
      nombre: e.nombre,
      apellido: e.apellido,
      estado: e.estado,
      activo: e.activo,
      tipo_asistencia: e.tipo_asistencia,
    }));
  },

  getEmpleado: async (id: number): Promise<RrhhEmpleadoDetalle> => {
    return await apiClient.get(`/rrhh/empleados/${id}`);
  },

  createEmpleado: async (data: RrhhEmpleadoCreate): Promise<RrhhEmpleado> => {
    return await apiClient.post('/rrhh/empleados', data);
  },

  updateEmpleado: async (
    id: number,
    data: RrhhEmpleadoUpdate
  ): Promise<RrhhEmpleado> => {
    return await apiClient.put(`/rrhh/empleados/${id}`, data);
  },

  deleteEmpleado: async (id: number): Promise<RrhhEliminarResponse> => {
    return await apiClient.delete(`/rrhh/empleados/${id}`);
  },

  // ── Catálogos (Fase 1) ──────────────────────────────────────────────────
  listarCatalogo: async (
    config: RrhhCatalogoConfig,
    params?: { skip?: number; limit?: number; activo?: boolean; buscar?: string }
  ): Promise<RrhhCatalogo[]> => {
    return await apiClient.get(config.ruta, params);
  },

  getCatalogo: async (
    config: RrhhCatalogoConfig,
    id: number
  ): Promise<RrhhCatalogo> => {
    return await apiClient.get(`${config.ruta}/${id}`);
  },

  createCatalogo: async (
    config: RrhhCatalogoConfig,
    data: Record<string, unknown>
  ): Promise<RrhhCatalogo> => {
    return await apiClient.post(config.ruta, data);
  },

  updateCatalogo: async (
    config: RrhhCatalogoConfig,
    id: number,
    data: Record<string, unknown>
  ): Promise<RrhhCatalogo> => {
    return await apiClient.put(`${config.ruta}/${id}`, data);
  },

  deleteCatalogo: async (
    config: RrhhCatalogoConfig,
    id: number
  ): Promise<RrhhEliminarResponse> => {
    return await apiClient.delete(`${config.ruta}/${id}`);
  },

  /** Listado tipado de tipos de contrato (para los selectores). */
  listarTiposContrato: async (params?: {
    skip?: number;
    limit?: number;
    activo?: boolean;
    buscar?: string;
  }): Promise<RrhhTipoContrato[]> => {
    return await apiClient.get('/rrhh/catalogos/tipos-contrato', params);
  },

  /** Listado tipado de tipos de deducción (para los selectores). */
  listarTiposDeduccion: async (params?: {
    skip?: number;
    limit?: number;
    activo?: boolean;
    buscar?: string;
  }): Promise<RrhhTipoDeduccion[]> => {
    return await apiClient.get('/rrhh/catalogos/tipos-deducciones', params);
  },

  /** Listado tipado de tipos de bonificación (para los selectores). */
  listarTiposBonificacion: async (params?: {
    skip?: number;
    limit?: number;
    activo?: boolean;
    buscar?: string;
  }): Promise<RrhhTipoBonificacion[]> => {
    return await apiClient.get('/rrhh/catalogos/tipos-bonificaciones', params);
  },

  /** Listado tipado de tipos de pago (para el modal de pago de nómina). */
  listarTiposPago: async (params?: {
    skip?: number;
    limit?: number;
    activo?: boolean;
    buscar?: string;
  }): Promise<RrhhTipoPago[]> => {
    return await apiClient.get('/rrhh/catalogos/tipos-pago', params);
  },

  /** Tipos de evaluación: de aquí tira el formulario de Evaluaciones. */
  listarTiposEvaluacion: async (params?: {
    skip?: number;
    limit?: number;
    activo?: boolean;
    buscar?: string;
  }): Promise<RrhhTipoEvaluacion[]> => {
    return await apiClient.get('/rrhh/catalogos/tipos-evaluacion', params);
  },

  /** Periodos de evaluación: alimenta el formulario y el pago por resultado. */
  listarPeriodosEvaluacion: async (params?: {
    skip?: number;
    limit?: number;
    activo?: boolean;
    buscar?: string;
  }): Promise<RrhhPeriodoEvaluacion[]> => {
    return await apiClient.get('/rrhh/catalogos/periodos-evaluacion', params);
  },

  // ── Departamentos ────────────────────────────────────────────────────────
  listarDepartamentos: async (params?: {
    skip?: number;
    limit?: number;
    activo?: boolean;
    buscar?: string;
  }): Promise<RrhhDepartamentoListado[]> => {
    return await apiClient.get('/rrhh/departamentos', params);
  },

  getDepartamento: async (id: number): Promise<RrhhDepartamentoDetalle> => {
    return await apiClient.get(`/rrhh/departamentos/${id}`);
  },

  createDepartamento: async (
    data: RrhhDepartamentoCreate
  ): Promise<RrhhDepartamento> => {
    return await apiClient.post('/rrhh/departamentos', data);
  },

  updateDepartamento: async (
    id: number,
    data: RrhhDepartamentoUpdate
  ): Promise<RrhhDepartamento> => {
    return await apiClient.put(`/rrhh/departamentos/${id}`, data);
  },

  deleteDepartamento: async (id: number): Promise<RrhhEliminarResponse> => {
    return await apiClient.delete(`/rrhh/departamentos/${id}`);
  },

  // ── Puestos ──────────────────────────────────────────────────────────────
  listarPuestos: async (params?: {
    skip?: number;
    limit?: number;
    departamento_id?: number;
    activo?: boolean;
    buscar?: string;
  }): Promise<RrhhPuestoListado[]> => {
    return await apiClient.get('/rrhh/puestos', params);
  },

  getPuesto: async (id: number): Promise<RrhhPuestoDetalle> => {
    return await apiClient.get(`/rrhh/puestos/${id}`);
  },

  createPuesto: async (data: RrhhPuestoCreate): Promise<RrhhPuesto> => {
    return await apiClient.post('/rrhh/puestos', data);
  },

  updatePuesto: async (
    id: number,
    data: RrhhPuestoUpdate
  ): Promise<RrhhPuesto> => {
    return await apiClient.put(`/rrhh/puestos/${id}`, data);
  },

  deletePuesto: async (id: number): Promise<RrhhEliminarResponse> => {
    return await apiClient.delete(`/rrhh/puestos/${id}`);
  },

  empleadosDelPuesto: async (id: number): Promise<RrhhEmpleadoLite[]> => {
    return await apiClient.get(`/rrhh/puestos/${id}/empleados`);
  },

  // ── Asistencia (Fase 4) ─────────────────────────────────────────────────
  listarAsistencias: async (params?: {
    skip?: number;
    limit?: number;
    empleado_id?: number;
    departamento_id?: number;
    desde?: string;
    hasta?: string;
    estado?: string;
    buscar?: string;
  }): Promise<RrhhAsistenciaListado[]> => {
    return await apiClient.get('/rrhh/asistencia', params);
  },

  /** Catálogo de estados de asistencia. */
  listarEstadosAsistencia: async (): Promise<RrhhEstadoAsistencia[]> => {
    return await apiClient.get('/rrhh/asistencia/estados');
  },

  /** Conteo de asistencias por estado para una fecha. */
  /** Resumen de asistencia por estado (un día o un rango, con filtros). */
  resumenAsistenciaDia: async (params: {
    fecha?: string;
    desde?: string;
    hasta?: string;
    estado?: RrhhEstadoAsistencia;
    buscar?: string;
    departamento_id?: number;
  }): Promise<RrhhAsistenciaResumenDia> => {
    return await apiClient.get('/rrhh/asistencia/resumen', params);
  },

  getAsistencia: async (id: number): Promise<RrhhAsistenciaListado> => {
    return await apiClient.get(`/rrhh/asistencia/${id}`);
  },

  /** Marcación rápida de entrada o salida del día. */
  marcarAsistencia: async (
    data: RrhhAsistenciaMarcacion
  ): Promise<RrhhAsistencia> => {
    return await apiClient.post('/rrhh/asistencia/marcar', data);
  },

  /** Alta o corrección: si ya existe ese día, la sobrescribe. */
  createAsistencia: async (data: RrhhAsistenciaCreate): Promise<RrhhAsistencia> => {
    return await apiClient.post('/rrhh/asistencia', data);
  },

  updateAsistencia: async (
    id: number,
    data: RrhhAsistenciaUpdate
  ): Promise<RrhhAsistencia> => {
    return await apiClient.put(`/rrhh/asistencia/${id}`, data);
  },

  deleteAsistencia: async (id: number): Promise<RrhhEliminarResponse> => {
    return await apiClient.delete(`/rrhh/asistencia/${id}`);
  },

  // ── Deducciones (Fase 5) ────────────────────────────────────────────────
  listarDeducciones: async (params?: {
    skip?: number;
    limit?: number;
    empleado_id?: number;
    tipo_id?: number;
    desde?: string;
    hasta?: string;
    buscar?: string;
  }): Promise<RrhhDeduccionListado[]> => {
    return await apiClient.get('/rrhh/deducciones', params);
  },

  createDeduccion: async (data: RrhhDeduccionCreate): Promise<RrhhDeduccion> => {
    return await apiClient.post('/rrhh/deducciones', data);
  },

  updateDeduccion: async (
    id: number,
    data: RrhhMovimientoUpdate
  ): Promise<RrhhDeduccion> => {
    return await apiClient.put(`/rrhh/deducciones/${id}`, data);
  },

  deleteDeduccion: async (id: number): Promise<RrhhEliminarResponse> => {
    return await apiClient.delete(`/rrhh/deducciones/${id}`);
  },

  // ── Bonificaciones (Fase 5) ─────────────────────────────────────────────
  listarBonificaciones: async (params?: {
    skip?: number;
    limit?: number;
    empleado_id?: number;
    tipo_id?: number;
    desde?: string;
    hasta?: string;
    buscar?: string;
  }): Promise<RrhhBonificacionListado[]> => {
    return await apiClient.get('/rrhh/bonificaciones', params);
  },

  createBonificacion: async (
    data: RrhhBonificacionCreate
  ): Promise<RrhhBonificacion> => {
    return await apiClient.post('/rrhh/bonificaciones', data);
  },

  updateBonificacion: async (
    id: number,
    data: RrhhMovimientoUpdate
  ): Promise<RrhhBonificacion> => {
    return await apiClient.put(`/rrhh/bonificaciones/${id}`, data);
  },

  deleteBonificacion: async (id: number): Promise<RrhhEliminarResponse> => {
    return await apiClient.delete(`/rrhh/bonificaciones/${id}`);
  },

  /** Totales por empleado de deducciones y bonificaciones en un rango. */
  consolidadoMovimientos: async (params?: {
    desde?: string;
    hasta?: string;
  }): Promise<RrhhConsolidado> => {
    return await apiClient.get('/rrhh/movimientos/consolidado', params);
  },

  // ── Nómina (Fase 6) ─────────────────────────────────────────────────────
  listarNominas: async (params?: {
    skip?: number;
    limit?: number;
    estado?: RrhhEstadoNomina;
    desde?: string;
    hasta?: string;
    buscar?: string;
  }): Promise<RrhhNominaListado[]> => {
    return await apiClient.get('/rrhh/nomina', params);
  },

  obtenerNomina: async (id: number): Promise<RrhhNominaDetalle> => {
    return await apiClient.get(`/rrhh/nomina/${id}`);
  },

  crearNomina: async (data: RrhhNominaCreate): Promise<RrhhNominaDetalle> => {
    return await apiClient.post('/rrhh/nomina', data);
  },

  /** Edición parcial; el backend solo la permite en `pre_nomina`. */
  actualizarNomina: async (
    id: number,
    data: RrhhNominaUpdate
  ): Promise<RrhhNominaDetalle> => {
    return await apiClient.put(`/rrhh/nomina/${id}`, data);
  },

  /** Solo se puede eliminar una nómina en `pre_nomina`. */
  eliminarNomina: async (id: number): Promise<{ accion: string }> => {
    return await apiClient.delete(`/rrhh/nomina/${id}`);
  },

  /** Confirma el lote (exige al menos un empleado) y lo bloquea. */
  confirmarNomina: async (id: number): Promise<RrhhNominaDetalle> => {
    return await apiClient.post(`/rrhh/nomina/${id}/confirmar`, {});
  },

  /** Todos los empleados activos con su estado de selección en el lote. */
  candidatosNomina: async (id: number): Promise<RrhhNominaCandidato[]> => {
    return await apiClient.get(`/rrhh/nomina/${id}/candidatos`);
  },

  /** Reemplaza la selección de empleados del lote y recalcula los totales. */
  guardarEmpleadosNomina: async (
    id: number,
    empleadoIds: number[]
  ): Promise<RrhhNominaDetalle> => {
    return await apiClient.put(`/rrhh/nomina/${id}/empleados`, {
      empleado_ids: empleadoIds,
    });
  },

  /** Pagos por empleado de las nóminas confirmadas. */
  listarPagos: async (params?: {
    skip?: number;
    limit?: number;
    nomina_id?: number;
    metodo_id?: number;
    desde?: string;
    hasta?: string;
  }): Promise<RrhhPagoListado[]> => {
    return await apiClient.get('/rrhh/nomina/pagos', params);
  },

  /** Guarda o corrige el pago de cada empleado del lote confirmado. */
  guardarPagosNomina: async (
    id: number,
    pagos: RrhhNominaPagoItem[]
  ): Promise<RrhhNominaDetalle> => {
    return await apiClient.put(`/rrhh/nomina/${id}/pagos`, { pagos });
  },

  reporteCosto: async (params?: {
    desde?: string;
    hasta?: string;
    departamento_id?: number;
  }): Promise<RrhhReporteCosto> => {
    return await apiClient.get('/rrhh/nomina/costo', params);
  },

  /**
   * Descarga el recibo de una nómina en PDF.
   *
   * Usa `fetch` directamente porque `apiClient` devuelve JSON; aquí la
   * respuesta es un blob, igual que en la exportación de fichas de costo.
   */
  descargarReciboNomina: async (
    id: number
  ): Promise<{ blob: Blob; nombre: string }> => {
    const token = localStorage.getItem('auth_token');
    const base = import.meta.env.VITE_API_BASE_URL;
    const resp = await fetch(`${base}/rrhh/nomina/${id}/recibo`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!resp.ok) throw new Error('No se pudo generar el recibo');
    const blob = await resp.blob();
    const disp = resp.headers.get('Content-Disposition') || '';
    const m = /filename\*?=(?:"([^"]+)"|([^;]+))/.exec(disp);
    const nombre = (m && (m[1] || m[2])?.replace(/"/g, '').trim()) || `RECIBO-NOMINA-${id}.pdf`;
    return { blob, nombre };
  },

  // ── Solicitudes (Fase 7) ─────────────────────────────────────────────────
  listarSolicitudes: async (params?: {
    skip?: number;
    limit?: number;
    empleado_id?: number;
    departamento_id?: number;
    estado?: string;
    tipo?: string;
    desde?: string;
    hasta?: string;
    buscar?: string;
  }): Promise<RrhhSolicitudListado[]> => {
    return await apiClient.get('/rrhh/solicitudes', params);
  },

  obtenerSolicitud: async (id: number): Promise<RrhhSolicitudListado> => {
    return await apiClient.get(`/rrhh/solicitudes/${id}`);
  },

  crearSolicitud: async (data: RrhhSolicitudCreate): Promise<RrhhSolicitudListado> => {
    return await apiClient.post('/rrhh/solicitudes', data);
  },

  aprobarSolicitud: async (
    id: number,
    data: RrhhSolicitudAccion
  ): Promise<RrhhSolicitudListado> => {
    return await apiClient.put(`/rrhh/solicitudes/${id}/aprobar`, data);
  },

  rechazarSolicitud: async (
    id: number,
    data: RrhhSolicitudAccion
  ): Promise<RrhhSolicitudListado> => {
    return await apiClient.put(`/rrhh/solicitudes/${id}/rechazar`, data);
  },

  cancelarSolicitud: async (
    id: number,
    data: RrhhSolicitudAccion
  ): Promise<RrhhSolicitudListado> => {
    return await apiClient.put(`/rrhh/solicitudes/${id}/cancelar`, data);
  },

  resumenSolicitudes: async (params?: {
    empleado_id?: number;
  }): Promise<RrhhSolicitudResumen[]> => {
    return await apiClient.get('/rrhh/solicitudes/resumen', params);
  },

  /** Ausencias aprobadas y pendientes de un rango (calendario de equipo). */
  solicitudesCalendario: async (params: {
    desde: string;
    hasta: string;
    departamento_id?: number;
    empleado_id?: number;
  }): Promise<RrhhSolicitudCalendario[]> => {
    return await apiClient.get('/rrhh/solicitudes/calendario', params);
  },

  /** El tipo de la solicitud: se reexporta para los selectores. */
  tiposSolicitud: async (): Promise<string[]> => {
    return await apiClient.get('/rrhh/solicitudes/tipos');
  },

  estadosSolicitud: async (): Promise<string[]> => {
    return await apiClient.get('/rrhh/solicitudes/estados');
  },

  // ── Evaluaciones y objetivos (Fase 8 v2 — objetivos ponderados) ─────────

  listarEvaluaciones: async (params?: {
    skip?: number;
    limit?: number;
    empleado_id?: number;
    departamento_id?: number;
    tipo_evaluacion_id?: number;
    desde?: string;
    hasta?: string;
    buscar?: string;
  }): Promise<RrhhEvaluacionListado[]> => {
    return await apiClient.get('/rrhh/evaluaciones', params);
  },

  obtenerEvaluacion: async (id: number): Promise<RrhhEvaluacionDetalle> => {
    return await apiClient.get(`/rrhh/evaluaciones/${id}`);
  },

  crearEvaluacion: async (
    data: RrhhEvaluacionCreate
  ): Promise<RrhhEvaluacionListado> => {
    return await apiClient.post('/rrhh/evaluaciones', data);
  },

  editarEvaluacion: async (
    id: number,
    data: RrhhEvaluacionUpdate
  ): Promise<RrhhEvaluacionListado> => {
    return await apiClient.put(`/rrhh/evaluaciones/${id}`, data);
  },

  eliminarEvaluacion: async (id: number): Promise<RrhhEliminarResponse> => {
    return await apiClient.delete(`/rrhh/evaluaciones/${id}`);
  },

  /** Selecciona objetivos en la evaluación (siempre editable). Devuelve el
   * detalle completo ya con el promedio recalculado. */
  seleccionarObjetivos: async (
    evaluacionId: number,
    objetivoIds: number[]
  ): Promise<RrhhEvaluacionDetalle> => {
    return await apiClient.post(`/rrhh/evaluaciones/${evaluacionId}/objetivos`, {
      objetivo_ids: objetivoIds,
    });
  },

  /** Puntúa/ajusta la fila de un objetivo seleccionado (siempre editable):
   * estrellas 0–5, valoración, recomendaciones y peso. */
  puntuarObjetivo: async (
    evaluacionId: number,
    filaId: number,
    data: RrhhEvaluacionObjetivoUpdate
  ): Promise<RrhhEvaluacionObjetivo> => {
    return await apiClient.put(
      `/rrhh/evaluaciones/${evaluacionId}/objetivos/${filaId}`,
      data
    );
  },

  /** Quita un objetivo de la selección (siempre editable). */
  quitarObjetivoEvaluacion: async (
    evaluacionId: number,
    filaId: number
  ): Promise<{ mensaje: string; id: number }> => {
    return await apiClient.delete(
      `/rrhh/evaluaciones/${evaluacionId}/objetivos/${filaId}`
    );
  },

  /** Reporte consolidado (totales globales y promedios 0–5 por empleado). */
  reporteEvaluaciones: async (params?: {
    empleado_id?: number;
    departamento_id?: number;
    desde?: string;
    hasta?: string;
  }): Promise<RrhhEvaluacionReporte> => {
    return await apiClient.get('/rrhh/evaluaciones/reporte', params);
  },

  // ── Pago por resultado ─────────────────────────────────────────────────

  /** Empleados con evaluación en el periodo y rango sugerido de fechas. */
  previewPagoResultado: async (
    periodoEvaluacionId: number
  ): Promise<RrhhPagoResultadoPreview> => {
    return await apiClient.get('/rrhh/pagos-resultado/preview', {
      periodo_evaluacion_id: periodoEvaluacionId,
    });
  },

  listarPagosResultado: async (params?: {
    skip?: number;
    limit?: number;
    periodo_evaluacion_id?: number;
    nomina_id?: number;
  }): Promise<RrhhPagoResultadoListado[]> => {
    return await apiClient.get('/rrhh/pagos-resultado', params);
  },

  getPagoResultado: async (id: number): Promise<RrhhPagoResultado> => {
    return await apiClient.get(`/rrhh/pagos-resultado/${id}`);
  },

  crearPagoResultado: async (
    data: RrhhPagoResultadoCreate
  ): Promise<RrhhPagoResultado> => {
    return await apiClient.post('/rrhh/pagos-resultado', data);
  },

  eliminarPagoResultado: async (
    id: number
  ): Promise<RrhhEliminarResponse> => {
    return await apiClient.delete(`/rrhh/pagos-resultado/${id}`);
  },

  // ── Objetivos (definición en el empleado, siempre editable) ─────────────

  listarObjetivos: async (params?: {
    empleado_id?: number;
    skip?: number;
    limit?: number;
  }): Promise<RrhhObjetivo[]> => {
    return await apiClient.get('/rrhh/objetivos', params);
  },

  crearObjetivo: async (data: RrhhObjetivoCreate): Promise<RrhhObjetivo> => {
    return await apiClient.post('/rrhh/objetivos', data);
  },

  editarObjetivo: async (
    objetivoId: number,
    data: RrhhObjetivoUpdate
  ): Promise<RrhhObjetivo> => {
    return await apiClient.put(`/rrhh/objetivos/${objetivoId}`, data);
  },

  eliminarObjetivo: async (objetivoId: number): Promise<RrhhEliminarResponse> => {
    return await apiClient.delete(`/rrhh/objetivos/${objetivoId}`);
  },

  /** Detalle de un objetivo con los datos de su empleado. */
  obtenerObjetivo: async (objetivoId: number): Promise<RrhhObjetivoDetalle> => {
    return await apiClient.get(`/rrhh/objetivos/${objetivoId}`);
  },

  // ── Auditoría (Fase 9) ──────────────────────────────────────────────────

  /** Entradas del registro de auditoría, de más reciente a más antigua. */
  listarAuditoria: async (params?: {
    skip?: number;
    limit?: number;
    desde?: string;
    hasta?: string;
    tipo?: string;
    nivel?: string;
    buscar?: string;
  }): Promise<RrhhAuditoriaFila[]> => {
    return await apiClient.get('/rrhh/auditoria', params);
  },

  /** Tipos distintos que existen en el registro (para el filtro). */
  tiposAuditoria: async (): Promise<string[]> => {
    return await apiClient.get('/rrhh/auditoria/tipos');
  },

  /** Niveles distintos que existen en el registro (para el filtro). */
  nivelesAuditoria: async (): Promise<string[]> => {
    return await apiClient.get('/rrhh/auditoria/niveles');
  },
};
