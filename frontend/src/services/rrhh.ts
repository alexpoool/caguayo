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
} from '../types/rrhh';

export const rrhhService = {
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
};
