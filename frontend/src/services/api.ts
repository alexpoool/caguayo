import { apiClient } from '../lib/api';
import { configuracionService as configService } from './administracion';
import type {
  Productos, 
  ProductosCreate, 
  ProductosUpdate,
  ProductoConCantidad,
  Categorias,
  CategoriasCreate,
  CategoriasUpdate,
  Subcategorias,
  SubcategoriasCreate,
  SubcategoriasUpdate,
  Movimiento,
  MovimientoCreate,
  TipoMovimiento,
  Provedor,
  Convenio,
  Anexo,
  Dependencia,
  OrigenRecepcion
} from '../types/index';
import type { DashboardStats, VentasTrends, MovimientosTrends } from '../types/dashboard';
import type {
  Venta,
  VentaCreate,
  VentaUpdate,
  Cliente,
  ClienteCreate,
  ClienteUpdate,
  ClienteWithVentas,
  ClienteNatural,
  ClienteNaturalCreate,
  ClienteTCP,
  ClienteTCPCreate,
  TipoEntidad,
  Cuenta
} from '../types/ventas';
import type {
  Moneda,
  MonedaCreate,
  MonedaUpdate
} from '../types/moneda';

export const productosService = {
  async getProductos(skip = 0, limit = 100, search?: string): Promise<Productos[]> {
    let url = `/productos?skip=${skip}&limit=${limit}`;
    if (search && search.trim()) {
      url += `&search=${encodeURIComponent(search.trim())}`;
    }
    return apiClient.get<Productos[]>(url);
  },

  async getProducto(id: number): Promise<Productos> {
    return apiClient.get<Productos>(`/productos/${id}`);
  },

  async createProducto(data: ProductosCreate): Promise<Productos> {
    return apiClient.post<Productos>('/productos', data);
  },

  async updateProducto(id: number, data: ProductosUpdate): Promise<Productos> {
    return apiClient.put<Productos>(`/productos/${id}`, data);
  },

  async deleteProducto(id: number): Promise<void> {
    return apiClient.delete<void>(`/productos/${id}`);
  },

  async searchProductos(nombre: string): Promise<Productos[]> {
    return apiClient.get<Productos[]>(`/productos/search/${encodeURIComponent(nombre)}`);
  },

  // Nuevos métodos para movimientos
  async getProductosByAnexo(anexoId: number): Promise<ProductoConCantidad[]> {
    return apiClient.get<ProductoConCantidad[]>(`/productos/anexo/${anexoId}`);
  },

  async getProductosConStock(): Promise<ProductoConCantidad[]> {
    return apiClient.get<ProductoConCantidad[]>('/productos/con-stock');
  }
};

export const categoriasService = {
  async getCategorias(skip = 0, limit = 100): Promise<Categorias[]> {
    return apiClient.get<Categorias[]>(`/categorias?skip=${skip}&limit=${limit}`);
  },

  async getCategoria(id: number): Promise<Categorias> {
    return apiClient.get<Categorias>(`/categorias/${id}`);
  },

  async createCategoria(data: CategoriasCreate): Promise<Categorias> {
    return apiClient.post<Categorias>('/categorias', data);
  },

  async updateCategoria(id: number, data: CategoriasUpdate): Promise<Categorias> {
    return apiClient.put<Categorias>(`/categorias/${id}`, data);
  },

  async deleteCategoria(id: number): Promise<void> {
    return apiClient.delete<void>(`/categorias/${id}`);
  }
};

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    return apiClient.get<DashboardStats>('/dashboard/stats');
  },

  async getTrends(dias: number = 7): Promise<VentasTrends> {
    return apiClient.get<VentasTrends>(`/dashboard/trends?dias=${dias}`);
  },

  async getMovimientosTrends(dias: number = 7): Promise<MovimientosTrends> {
    return apiClient.get<MovimientosTrends>(`/dashboard/movimientos-trends?dias=${dias}`);
  },

  async refreshStats(): Promise<DashboardStats> {
    // Adding cache-busting query param
    const timestamp = new Date().getTime();
    return apiClient.get<DashboardStats>(`/dashboard/stats?_=${timestamp}`);
  }
};

export const ventasService = {
  async getVentas(skip = 0, limit = 100): Promise<Venta[]> {
    return apiClient.get<Venta[]>(`/ventas?skip=${skip}&limit=${limit}`);
  },

  async getVenta(id: number): Promise<Venta> {
    return apiClient.get<Venta>(`/ventas/${id}`);
  },

  async createVenta(data: VentaCreate): Promise<Venta> {
    return apiClient.post<Venta>('/ventas', data);
  },

  async updateVenta(id: number, data: VentaUpdate): Promise<Venta> {
    return apiClient.put<Venta>(`/ventas/${id}`, data);
  },

  async deleteVenta(id: number): Promise<void> {
    return apiClient.delete<void>(`/ventas/${id}`);
  },

  async confirmarVenta(id: number): Promise<Venta> {
    return apiClient.post<Venta>(`/ventas/${id}/confirmar`, {});
  },

  async anularVenta(id: number): Promise<Venta> {
    return apiClient.post<Venta>(`/ventas/${id}/anular`, {});
  },

  async getVentasByCliente(clienteId: number, skip = 0, limit = 100): Promise<Venta[]> {
    return apiClient.get<Venta[]>(`/ventas/cliente/${clienteId}?skip=${skip}&limit=${limit}`);
  },

  async getVentasMesActual(): Promise<Venta[]> {
    return apiClient.get<Venta[]>('/ventas/stats/mes-actual');
  }
};

export const clientesService = {
  async getClientes(skip = 0, limit = 100): Promise<Cliente[]> {
    return apiClient.get<Cliente[]>(`/clientes?skip=${skip}&limit=${limit}`);
  },

  async getCliente(id: number): Promise<Cliente> {
    return apiClient.get<Cliente>(`/clientes/${id}`);
  },

  async getClienteWithVentas(id: number): Promise<ClienteWithVentas> {
    return apiClient.get<ClienteWithVentas>(`/clientes/${id}/perfil`);
  },

  async createCliente(data: ClienteCreate): Promise<Cliente> {
    return apiClient.post<Cliente>('/clientes', data);
  },

  async updateCliente(id: number, data: ClienteUpdate): Promise<Cliente> {
    return apiClient.put<Cliente>(`/clientes/${id}`, data);
  },

  async deleteCliente(id: number): Promise<void> {
    return apiClient.delete<void>(`/clientes/${id}`);
  },

  async buscarClienteByCedula(cedulaRif: string): Promise<Cliente[]> {
    return apiClient.get<Cliente[]>(`/clientes/search?cedula_rif=${encodeURIComponent(cedulaRif)}`);
  }
};

export const tiposEntidadService = {
  async getTiposEntidad(): Promise<TipoEntidad[]> {
    return apiClient.get<TipoEntidad[]>('/tipos-entidad');
  }
};

export const clienteNaturalService = {
  async createClienteNatural(data: ClienteNaturalCreate): Promise<ClienteNatural> {
    return apiClient.post<ClienteNatural>('/clientes-naturales', data);
  },

  async updateClienteNatural(id: number, data: Partial<ClienteNaturalCreate>): Promise<ClienteNatural> {
    return apiClient.put<ClienteNatural>(`/clientes-naturales/${id}`, data);
  },

  async getClienteNatural(idCliente: number): Promise<ClienteNatural | null> {
    return apiClient.get<ClienteNatural>(`/clientes-naturales/by-cliente/${idCliente}`);
  }
};

export const clienteTCPService = {
  async createClienteTCP(data: ClienteTCPCreate): Promise<ClienteTCP> {
    return apiClient.post<ClienteTCP>('/clientes-tcp', data);
  },

  async updateClienteTCP(id: number, data: Partial<ClienteTCPCreate>): Promise<ClienteTCP> {
    return apiClient.put<ClienteTCP>(`/clientes-tcp/${id}`, data);
  },

  async getClienteTCP(idCliente: number): Promise<ClienteTCP | null> {
    return apiClient.get<ClienteTCP>(`/clientes-tcp/by-cliente/${idCliente}`);
  }
};

export const cuentasService = {
  async getCuentasByCliente(idCliente: number): Promise<Cuenta[]> {
    return apiClient.get<Cuenta[]>(`/cuentas/by-cliente/${idCliente}`);
  },

  async createCuenta(data: Partial<Cuenta>): Promise<Cuenta> {
    return apiClient.post<Cuenta>('/cuentas', data);
  },

  async updateCuenta(id: number, data: Partial<Cuenta>): Promise<Cuenta> {
    return apiClient.put<Cuenta>(`/cuentas/${id}`, data);
  },

  async deleteCuenta(id: number): Promise<void> {
    return apiClient.delete<void>(`/cuentas/${id}`);
  }
};

export const subcategoriasService = {
  async getSubcategorias(skip = 0, limit = 100): Promise<Subcategorias[]> {
    return apiClient.get<Subcategorias[]>(`/subcategorias?skip=${skip}&limit=${limit}`);
  },

  async getSubcategoria(id: number): Promise<Subcategorias> {
    return apiClient.get<Subcategorias>(`/subcategorias/${id}`);
  },

  async createSubcategoria(data: SubcategoriasCreate): Promise<Subcategorias> {
    return apiClient.post<Subcategorias>('/subcategorias', data);
  },

  async updateSubcategoria(id: number, data: SubcategoriasUpdate): Promise<Subcategorias> {
    return apiClient.put<Subcategorias>(`/subcategorias/${id}`, data);
  },

  async deleteSubcategoria(id: number): Promise<void> {
    return apiClient.delete<void>(`/subcategorias/${id}`);
  }
};

export const monedaService = {
  async getMonedas(skip = 0, limit = 100): Promise<Moneda[]> {
    return apiClient.get<Moneda[]>(`/monedas?skip=${skip}&limit=${limit}`);
  },

  async getMoneda(id: number): Promise<Moneda> {
    return apiClient.get<Moneda>(`/monedas/${id}`);
  },

  async createMoneda(data: MonedaCreate): Promise<Moneda> {
    return apiClient.post<Moneda>('/monedas', data);
  },

  async updateMoneda(id: number, data: MonedaUpdate): Promise<Moneda> {
    return apiClient.put<Moneda>(`/monedas/${id}`, data);
  },

  async deleteMoneda(id: number): Promise<void> {
    return apiClient.delete<void>(`/monedas/${id}`);
  }
};

export const movimientosService = {
  async getTiposMovimiento(): Promise<TipoMovimiento[]> {
    return apiClient.get<TipoMovimiento[]>('/movimientos/tipos');
  },

  async getMovimientos(tipo?: string): Promise<Movimiento[]> {
    const params = new URLSearchParams();
    if (tipo) {
      params.append('tipo', tipo);
    }
    const queryString = params.toString();
    return apiClient.get<Movimiento[]>(`/movimientos${queryString ? '?' + queryString : ''}`);
  },

  async getMovimientosPendientes(): Promise<Movimiento[]> {
    return apiClient.get<Movimiento[]>('/movimientos/pendientes');
  },

  async createMovimiento(data: MovimientoCreate): Promise<Movimiento> {
    return apiClient.post<Movimiento>('/movimientos', data);
  },

  async confirmarMovimiento(id: number): Promise<Movimiento> {
    return apiClient.put<Movimiento>(`/movimientos/${id}/confirmar`, {});
  },

  async cancelarMovimiento(id: number): Promise<Movimiento> {
    return apiClient.put<Movimiento>(`/movimientos/${id}/cancelar`, {});
  },

  async deleteMovimiento(id: number): Promise<void> {
    return apiClient.delete<void>(`/movimientos/${id}`);
  },

  async getOrigenRecepcion(movimientoId: number): Promise<OrigenRecepcion> {
    return apiClient.get<OrigenRecepcion>(`/movimientos/${movimientoId}/origen`);
  },

  async getRecepcionesStock(): Promise<any[]> {
    return apiClient.get<any[]>('/movimientos/recepciones-stock');
  },

  async crearAjuste(data: {
    id_movimiento_origen: number;
    destinos: { id_dependencia: number; cantidad: number }[];
    fecha?: string;
    observacion?: string;
  }): Promise<any[]> {
    return apiClient.post<any[]>('/movimientos/ajuste', data);
  }
};

export const provedoresService = {
  async getProvedores(search?: string, skip = 0, limit = 100): Promise<Provedor[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());
    return apiClient.get<Provedor[]>(`/provedores?${params.toString()}`);
  },

  async getProvedor(id: number): Promise<Provedor> {
    return apiClient.get<Provedor>(`/provedores/${id}`);
  },

  async getConveniosByProvedor(provedorId: number): Promise<Convenio[]> {
    return apiClient.get<Convenio[]>(`/provedores/${provedorId}/convenios`);
  }
};

export const conveniosService = {
  async getConvenios(clienteId?: number, search?: string, skip = 0, limit = 100): Promise<Convenio[]> {
    const params = new URLSearchParams();
    if (clienteId) params.append('cliente_id', clienteId.toString());
    if (search) params.append('search', search);
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());
    return apiClient.get<Convenio[]>(`/convenios?${params.toString()}`);
  },

  async getConvenio(id: number): Promise<Convenio> {
    return apiClient.get<Convenio>(`/convenios/${id}`);
  },

  async createConvenio(data: Partial<Convenio>): Promise<Convenio> {
    return apiClient.post<Convenio>('/convenios', data);
  },

  async updateConvenio(id: number, data: Partial<Convenio>): Promise<Convenio> {
    return apiClient.patch<Convenio>(`/convenios/${id}`, data);
  },

  async deleteConvenio(id: number): Promise<void> {
    return apiClient.delete(`/convenios/${id}`);
  },

  async getConveniosSimple(): Promise<{id_convenio: number; nombre: string}[]> {
    return apiClient.get<{id_convenio: number; nombre: string}[]>('/convenios/simple');
  },

  async getAnexosByConvenio(convenioId: number): Promise<Anexo[]> {
    return apiClient.get<Anexo[]>(`/convenios/${convenioId}/anexos`);
  }
};

export const anexosService = {
  async getAnexos(convenioId?: number, search?: string, skip = 0, limit = 100): Promise<Anexo[]> {
    const params = new URLSearchParams();
    if (convenioId) params.append('convenio_id',convenioId.toString());
    if (search) params.append('search', search);
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());
    return apiClient.get<Anexo[]>(`/anexos?${params.toString()}`);
  },

  async getAnexo(id: number): Promise<Anexo> {
    return apiClient.get<Anexo>(`/anexos/${id}`);
  },

  async createAnexo(data: Partial<Anexo>): Promise<Anexo> {
    return apiClient.post<Anexo>('/anexos', data);
  },

  async updateAnexo(id: number, data: Partial<Anexo>): Promise<Anexo> {
    return apiClient.patch<Anexo>(`/anexos/${id}`, data);
  },

  async deleteAnexo(id: number): Promise<void> {
    return apiClient.delete(`/anexos/${id}`);
  }
};

export const dependenciasService = {
  async getDependencias(search?: string, skip = 0, limit = 100): Promise<Dependencia[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());
    return apiClient.get<Dependencia[]>(`/dependencias?${params.toString()}`);
  },

  async getDependencia(id: number): Promise<Dependencia> {
    return apiClient.get<Dependencia>(`/dependencias/${id}`);
  }
};

export const configuracionService = configService;