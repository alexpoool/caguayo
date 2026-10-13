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
  RrhhEmpleadoDetalle,
  RrhhEmpleadoBusqueda,
  RrhhTipoContrato,
  RrhhTipoDeduccion,
  RrhhTipoBonificacion,
  RrhhAsistencia,
  RrhhAsistenciaCreate,
  RrhhAsistenciaUpdate,
  RrhhAsistenciaListado,
  RrhhAsistenciaMarcacion,
  RrhhAsistenciaResumenDia,
  RrhhEstadoAsistencia,
  RrhhDeduccionListado,
  RrhhBonificacionListado,
  RrhhDeduccion,
  RrhhBonificacion,
  RrhhDeduccionCreate,
  RrhhBonificacionCreate,
  RrhhMovimientoUpdate,
  RrhhConsolidado,
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
  }): Promise<RrhhEmpleadoListado[]> => {
    return await apiClient.get('/rrhh/empleados', params);
  },

  buscarEmpleados: async (q: string): Promise<RrhhEmpleadoBusqueda[]> => {
    return await apiClient.get('/rrhh/empleados/buscar', { q });
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
  resumenAsistenciaDia: async (params: {
    fecha: string;
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
};
