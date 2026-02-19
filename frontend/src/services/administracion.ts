import { apiClient } from '../lib/api';
import type { TipoContrato, TipoContratoCreate, TipoContratoUpdate } from '../types/contrato';
import type { EstadoContrato, EstadoContratoCreate, EstadoContratoUpdate } from '../types/contrato';
import type { TipoProveedor, TipoProveedorCreate, TipoProveedorUpdate } from '../types/proveedor';
import type { TipoConvenio, TipoConvenioCreate, TipoConvenioUpdate } from '../types/proveedor';
import type { Cuenta, CuentaCreate, CuentaUpdate } from '../types/cuenta';
import type { Grupo, GrupoCreate, GrupoUpdate, Usuario, UsuarioCreate, UsuarioUpdate } from '../types/usuario';
import type { TipoDependencia, TipoDependenciaCreate, TipoDependenciaUpdate, Dependencia, DependenciaCreate, DependenciaConCuentasCreate, DependenciaUpdate } from '../types/dependencia';
import type { Provincia, Municipio } from '../types/ubicacion';
import type { Moneda } from '../types/moneda';
import type { TipoCuenta, TipoCuentaCreate, TipoCuentaUpdate } from '../types/tipo_cuenta';

export const configuracionService = {
  getTiposContrato: async (): Promise<TipoContrato[]> => {
    return await apiClient.get('/configuracion/tipos-contrato');
  },

  createTipoContrato: async (data: TipoContratoCreate): Promise<TipoContrato> => {
    return await apiClient.post('/configuracion/tipos-contrato', data);
  },

  updateTipoContrato: async (id: number, data: TipoContratoUpdate): Promise<TipoContrato> => {
    return await apiClient.put(`/configuracion/tipos-contrato/${id}`, data);
  },

  deleteTipoContrato: async (id: number): Promise<void> => {
    await apiClient.delete(`/configuracion/tipos-contrato/${id}`);
  },

  getEstadosContrato: async (): Promise<EstadoContrato[]> => {
    return await apiClient.get('/configuracion/estados-contrato');
  },

  createEstadoContrato: async (data: EstadoContratoCreate): Promise<EstadoContrato> => {
    return await apiClient.post('/configuracion/estados-contrato', data);
  },

  updateEstadoContrato: async (id: number, data: EstadoContratoUpdate): Promise<EstadoContrato> => {
    return await apiClient.put(`/configuracion/estados-contrato/${id}`, data);
  },

  deleteEstadoContrato: async (id: number): Promise<void> => {
    await apiClient.delete(`/configuracion/estados-contrato/${id}`);
  },

  getTiposProveedor: async (): Promise<TipoProveedor[]> => {
    return await apiClient.get('/configuracion/tipos-proveedores');
  },

  createTipoProveedor: async (data: TipoProveedorCreate): Promise<TipoProveedor> => {
    return await apiClient.post('/configuracion/tipos-proveedores', data);
  },

  updateTipoProveedor: async (id: number, data: TipoProveedorUpdate): Promise<TipoProveedor> => {
    return await apiClient.put(`/configuracion/tipos-proveedores/${id}`, data);
  },

  deleteTipoProveedor: async (id: number): Promise<void> => {
    await apiClient.delete(`/configuracion/tipos-proveedores/${id}`);
  },

  getTiposConvenio: async (): Promise<TipoConvenio[]> => {
    return await apiClient.get('/configuracion/tipos-convenios');
  },

  createTipoConvenio: async (data: TipoConvenioCreate): Promise<TipoConvenio> => {
    return await apiClient.post('/configuracion/tipos-convenios', data);
  },

  updateTipoConvenio: async (id: number, data: TipoConvenioUpdate): Promise<TipoConvenio> => {
    return await apiClient.put(`/configuracion/tipos-convenios/${id}`, data);
  },

  deleteTipoConvenio: async (id: number): Promise<void> => {
    await apiClient.delete(`/configuracion/tipos-convenios/${id}`);
  },

  getTiposCuenta: async (): Promise<TipoCuenta[]> => {
    return await apiClient.get('/configuracion/tipos-cuenta');
  },

  createTipoCuenta: async (data: TipoCuentaCreate): Promise<TipoCuenta> => {
    return await apiClient.post('/configuracion/tipos-cuenta', data);
  },

  updateTipoCuenta: async (id: number, data: TipoCuentaUpdate): Promise<TipoCuenta> => {
    return await apiClient.put(`/configuracion/tipos-cuenta/${id}`, data);
  },

  deleteTipoCuenta: async (id: number): Promise<void> => {
    await apiClient.delete(`/configuracion/tipos-cuenta/${id}`);
  },
};

export const administracionService = {
  getCuentas: async (): Promise<Cuenta[]> => {
    return await apiClient.get('/administracion/cuentas');
  },

  createCuenta: async (data: CuentaCreate): Promise<Cuenta> => {
    return await apiClient.post('/administracion/cuentas', data);
  },

  updateCuenta: async (id: number, data: CuentaUpdate): Promise<Cuenta> => {
    return await apiClient.put(`/administracion/cuentas/${id}`, data);
  },

  deleteCuenta: async (id: number): Promise<void> => {
    await apiClient.delete(`/administracion/cuentas/${id}`);
  },

  getGrupos: async (): Promise<Grupo[]> => {
    return await apiClient.get('/administracion/grupos');
  },

  createGrupo: async (data: GrupoCreate): Promise<Grupo> => {
    return await apiClient.post('/administracion/grupos', data);
  },

  updateGrupo: async (id: number, data: GrupoUpdate): Promise<Grupo> => {
    return await apiClient.put(`/administracion/grupos/${id}`, data);
  },

  deleteGrupo: async (id: number): Promise<void> => {
    await apiClient.delete(`/administracion/grupos/${id}`);
  },

  getUsuarios: async (): Promise<Usuario[]> => {
    return await apiClient.get('/administracion/usuarios');
  },

  createUsuario: async (data: UsuarioCreate): Promise<Usuario> => {
    return await apiClient.post('/administracion/usuarios', data);
  },

  updateUsuario: async (id: number, data: UsuarioUpdate): Promise<Usuario> => {
    return await apiClient.put(`/administracion/usuarios/${id}`, data);
  },

  deleteUsuario: async (id: number): Promise<void> => {
    await apiClient.delete(`/administracion/usuarios/${id}`);
  },

  getMonedas: async (): Promise<Moneda[]> => {
    return await apiClient.get('/monedas');
  },
};

export const dependenciasService = {
  getDependencias: async (): Promise<Dependencia[]> => {
    return await apiClient.get('/dependencias');
  },

  getDependenciasJerarquia: async (padreId?: number): Promise<Dependencia[]> => {
    const params = padreId !== undefined ? { padre_id: padreId } : {};
    return await apiClient.get('/dependencias/jerarquia', { params });
  },

  createDependencia: async (data: DependenciaConCuentasCreate): Promise<Dependencia> => {
    return await apiClient.post('/dependencias', data);
  },

  updateDependencia: async (id: number, data: DependenciaUpdate): Promise<Dependencia> => {
    return await apiClient.put(`/dependencias/${id}`, data);
  },

  deleteDependencia: async (id: number): Promise<void> => {
    await apiClient.delete(`/dependencias/${id}`);
  },

  getTiposDependencia: async (): Promise<TipoDependencia[]> => {
    return await apiClient.get('/configuracion/tipos-dependencia');
  },

  createTipoDependencia: async (data: TipoDependenciaCreate): Promise<TipoDependencia> => {
    return await apiClient.post('/configuracion/tipos-dependencia', data);
  },

  updateTipoDependencia: async (id: number, data: TipoDependenciaUpdate): Promise<TipoDependencia> => {
    return await apiClient.put(`/configuracion/tipos-dependencia/${id}`, data);
  },

  deleteTipoDependencia: async (id: number): Promise<void> => {
    await apiClient.delete(`/configuracion/tipos-dependencia/${id}`);
  },

  getProvincias: async (): Promise<Provincia[]> => {
    return await apiClient.get('/dependencias/ubicaciones/provincias');
  },

  getMunicipios: async (provinciaId?: number): Promise<Municipio[]> => {
    const params = provinciaId !== undefined ? { provincia_id: provinciaId } : {};
    return await apiClient.get('/dependencias/ubicaciones/municipios', params);
  },
};
