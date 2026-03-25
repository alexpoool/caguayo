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
  ClienteJuridica,
  ClienteJuridicaCreate,
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
import type {
  ContratoWithDetails,
  ContratoCreate,
  ContratoUpdate,
  SuplementoWithDetails,
  SuplementoCreate,
  SuplementoUpdate,
  FacturaWithDetails,
  FacturaCreate,
  FacturaUpdate,
  VentaEfectivoWithDetails,
  VentaEfectivoCreate,
  VentaEfectivoUpdate,
} from '../types/contrato';

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

  async getProductosByFactura(facturaId: number): Promise<ProductoConCantidad[]> {
    return apiClient.get<ProductoConCantidad[]>(`/productos/factura/${facturaId}`);
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
    const [cliente, ventas] = await Promise.all([
      apiClient.get<Cliente>(`/clientes/${id}`),
      apiClient.get<Venta[]>(`/ventas/cliente/${id}`)
    ]);
    return { ...cliente, ventas };
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
    return apiClient.post<ClienteNatural>(`/clientes/natural/${data.id_cliente}`, data);
  },

  async updateClienteNatural(id: number, data: Partial<ClienteNaturalCreate>): Promise<ClienteNatural> {
    return apiClient.put<ClienteNatural>(`/clientes/natural/${id}`, data);
  },

  async getClienteNatural(idCliente: number): Promise<ClienteNatural | null> {
    return apiClient.get<ClienteNatural>(`/clientes/natural/${idCliente}`);
  },

  async deleteClienteNatural(idCliente: number): Promise<void> {
    return apiClient.delete<void>(`/clientes/natural/${idCliente}`);
  }
};

export const clienteJuridicaService = {
  async createClienteJuridica(data: ClienteJuridicaCreate): Promise<ClienteJuridica> {
    return apiClient.post<ClienteJuridica>(`/clientes/juridica/${data.id_cliente}`, data);
  },

  async updateClienteJuridica(id: number, data: Partial<ClienteJuridicaCreate>): Promise<ClienteJuridica> {
    return apiClient.put<ClienteJuridica>(`/clientes/juridica/${id}`, data);
  },

  async getClienteJuridica(idCliente: number): Promise<ClienteJuridica | null> {
    return apiClient.get<ClienteJuridica>(`/clientes/juridica/${idCliente}`);
  },

  async deleteClienteJuridica(idCliente: number): Promise<void> {
    return apiClient.delete<void>(`/clientes/juridica/${idCliente}`);
  }
};

export const clienteTCPService = {
  async createClienteTCP(data: ClienteTCPCreate): Promise<ClienteTCP> {
    return apiClient.post<ClienteTCP>(`/clientes/tcp/${data.id_cliente}`, data);
  },

  async updateClienteTCP(id: number, data: Partial<ClienteTCPCreate>): Promise<ClienteTCP> {
    return apiClient.put<ClienteTCP>(`/clientes/tcp/${id}`, data);
  },

  async getClienteTCP(idCliente: number): Promise<ClienteTCP | null> {
    return apiClient.get<ClienteTCP>(`/clientes/tcp/${idCliente}`);
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
    id_movimiento_origen?: number;
    id_producto?: number;
    id_dependencia_origen?: number;
    destinos: { id_dependencia: number; cantidad: number }[];
    fecha?: string;
    observacion?: string;
    codigo?: string;
  }): Promise<any[]> {
    return apiClient.post<any[]>('/movimientos/ajuste', data);
  },

  async getStockProductoDependencia(productoId: number, dependenciaId: number): Promise<{ producto_id: number; dependencia_id: number; stock: number }> {
    return apiClient.get<{ producto_id: number; dependencia_id: number; stock: number }>(
      `/movimientos/stock?producto_id=${productoId}&dependencia_id=${dependenciaId}`
    );
  },

  async getProductosPorDependencia(dependenciaId: number): Promise<ProductoConCantidad[]> {
    return apiClient.get<ProductoConCantidad[]>(
      `/movimientos/productos-por-dependencia?dependencia_id=${dependenciaId}`
    );
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

export const contratosService = {
  async getContratos(skip = 0, limit = 100): Promise<ContratoWithDetails[]> {
    return apiClient.get<ContratoWithDetails[]>(`/contratos?skip=${skip}&limit=${limit}`);
  },

  async getContrato(id: number): Promise<ContratoWithDetails> {
    return apiClient.get<ContratoWithDetails>(`/contratos/${id}`);
  },

  async createContrato(data: ContratoCreate): Promise<ContratoWithDetails> {
    return apiClient.post<ContratoWithDetails>('/contratos', data);
  },

  async updateContrato(id: number, data: ContratoUpdate): Promise<ContratoWithDetails> {
    return apiClient.put<ContratoWithDetails>(`/contratos/${id}`, data);
  },

  async deleteContrato(id: number): Promise<void> {
    return apiClient.delete<void>(`/contratos/${id}`);
  }
};

export const suplementosService = {
  async getSuplementosByContrato(contratoId: number): Promise<SuplementoWithDetails[]> {
    return apiClient.get<SuplementoWithDetails[]>(`/suplementos/contrato/${contratoId}`);
  },

  async getSuplemento(id: number): Promise<SuplementoWithDetails> {
    return apiClient.get<SuplementoWithDetails>(`/suplementos/${id}`);
  },

  async createSuplemento(data: SuplementoCreate): Promise<SuplementoWithDetails> {
    return apiClient.post<SuplementoWithDetails>('/suplementos', data);
  },

  async updateSuplemento(id: number, data: SuplementoUpdate): Promise<SuplementoWithDetails> {
    return apiClient.put<SuplementoWithDetails>(`/suplementos/${id}`, data);
  },

  async deleteSuplemento(id: number): Promise<void> {
    return apiClient.delete<void>(`/suplementos/${id}`);
  }
};

export const facturasService = {
  async getFacturas(skip = 0, limit = 100): Promise<FacturaWithDetails[]> {
    return apiClient.get<FacturaWithDetails[]>(`/facturas?skip=${skip}&limit=${limit}`);
  },

  async getFacturasByContrato(contratoId: number): Promise<FacturaWithDetails[]> {
    return apiClient.get<FacturaWithDetails[]>(`/facturas/contrato/${contratoId}`);
  },

  async getProductosByFactura(facturaId: number): Promise<ProductoConCantidad[]> {
    return apiClient.get<ProductoConCantidad[]>(`/productos/factura/${facturaId}`);
  },

  async getFactura(id: number): Promise<FacturaWithDetails> {
    return apiClient.get<FacturaWithDetails>(`/facturas/${id}`);
  },

  async createFactura(data: FacturaCreate): Promise<FacturaWithDetails> {
    return apiClient.post<FacturaWithDetails>('/facturas', data);
  },

  async updateFactura(id: number, data: FacturaUpdate): Promise<FacturaWithDetails> {
    return apiClient.put<FacturaWithDetails>(`/facturas/${id}`, data);
  },

  async deleteFactura(id: number): Promise<void> {
    return apiClient.delete<void>(`/facturas/${id}`);
  }
};

export const ventasEfectivoService = {
  async getVentasEfectivo(skip = 0, limit = 100): Promise<VentaEfectivoWithDetails[]> {
    return apiClient.get<VentaEfectivoWithDetails[]>(`/ventas-efectivo?skip=${skip}&limit=${limit}`);
  },

  async getVentaEfectivo(id: number): Promise<VentaEfectivoWithDetails> {
    return apiClient.get<VentaEfectivoWithDetails>(`/ventas-efectivo/${id}`);
  },

  async createVentaEfectivo(data: VentaEfectivoCreate): Promise<VentaEfectivoWithDetails> {
    return apiClient.post<VentaEfectivoWithDetails>('/ventas-efectivo', data);
  },

  async updateVentaEfectivo(id: number, data: VentaEfectivoUpdate): Promise<VentaEfectivoWithDetails> {
    return apiClient.put<VentaEfectivoWithDetails>(`/ventas-efectivo/${id}`, data);
  },

  async deleteVentaEfectivo(id: number): Promise<void> {
    return apiClient.delete<void>(`/ventas-efectivo/${id}`);
  }
};

export const configuracionService = configService;

export const provinciaService = {
  async getProvincias(): Promise<any[]> {
    return apiClient.get<any[]>('/dependencias/ubicaciones/provincias');
  }
};

export const municipioService = {
  async getMunicipios(provinciaId: number): Promise<any[]> {
    return apiClient.get<any[]>(`/dependencias/ubicaciones/municipios?provincia_id=${provinciaId}`);
  }
};

export const tipoConvenioService = {
  async getTiposConvenio(): Promise<any[]> {
    return apiClient.get<any[]>('/configuracion/tipos-convenios');
  }
};

export const tipoEntidadService = {
  async getTiposEntidad(): Promise<any[]> {
    return apiClient.get<any[]>('/tipos-entidad');
  }
};

export interface ProductosEnLiquidacion {
  id_producto_en_liquidacion: number;
  codigo: string;
  id_producto: number;
  cantidad: number;
  precio: number;
  id_moneda: number;
  tipo_compra: 'FACTURA' | 'VENTA_EFECTIVO' | 'ANEXO';
  id_factura?: number;
  id_venta_efectivo?: number;
  id_anexo?: number;
  liquidada: boolean;
  fecha: string;
  fecha_liquidacion?: string;
  producto?: any;
  moneda?: any;
}

export interface ProductosEnLiquidacionCreate {
  id_producto: number;
  cantidad: number;
  precio: number;
  id_moneda: number;
  tipo_compra: 'FACTURA' | 'VENTA_EFECTIVO' | 'ANEXO';
  id_factura?: number;
  id_venta_efectivo?: number;
  id_anexo?: number;
}

export const productosEnLiquidacionService = {
  async getProductosEnLiquidacion(skip = 0, limit = 100): Promise<ProductosEnLiquidacion[]> {
    return apiClient.get<ProductosEnLiquidacion[]>(`/productos-en-liquidacion?skip=${skip}&limit=${limit}`);
  },

  async getProductosEnLiquidacionPendientes(skip = 0, limit = 100): Promise<ProductosEnLiquidacion[]> {
    return apiClient.get<ProductosEnLiquidacion[]>(`/productos-en-liquidacion/pendientes?skip=${skip}&limit=${limit}`);
  },

  async getProductosEnLiquidacionLiquidadas(skip = 0, limit = 100): Promise<ProductosEnLiquidacion[]> {
    return apiClient.get<ProductosEnLiquidacion[]>(`/productos-en-liquidacion/liquidadas?skip=${skip}&limit=${limit}`);
  },

  async getProductoEnLiquidacion(id: number): Promise<ProductosEnLiquidacion> {
    return apiClient.get<ProductosEnLiquidacion>(`/productos-en-liquidacion/${id}`);
  },

  async createProductoEnLiquidacion(data: ProductosEnLiquidacionCreate): Promise<ProductosEnLiquidacion> {
    return apiClient.post<ProductosEnLiquidacion>('/productos-en-liquidacion', data);
  },

  async updateProductoEnLiquidacion(id: number, data: Partial<ProductosEnLiquidacionCreate>): Promise<ProductosEnLiquidacion> {
    return apiClient.put<ProductosEnLiquidacion>(`/productos-en-liquidacion/${id}`, data);
  },

  async deleteProducto(id: number): Promise<void> {
    return apiClient.delete<void>(`/productos-en-liquidacion/${id}`);
  },

  async liquidarProducto(id: number): Promise<ProductosEnLiquidacion> {
    return apiClient.post<ProductosEnLiquidacion>(`/productos-en-liquidacion/${id}/liquidar`, {});
  },
};

export interface Liquidacion {
  id_liquidacion: number;
  codigo: string;
  id_cliente: number;
  id_convenio?: number;
  id_anexo?: number;
  id_moneda: number;
  liquidada: boolean;
  fecha_emision: string;
  fecha_liquidacion?: string;
  observaciones?: string;
  devengado: number;
  tributario: number;
  comision_bancaria: number;
  gasto_empresa: number;
  importe: number;
  neto_pagar: number;
  tipo_pago: string;
  cliente?: any;
  moneda?: any;
  productos_en_liquidacion?: ProductosEnLiquidacion[];
}

export interface LiquidacionCreate {
  id_cliente: number;
  id_convenio?: number;
  id_anexo?: number;
  id_moneda: number;
  devengado?: number;
  tributario?: number;
  comision_bancaria?: number;
  gasto_empresa?: number;
  tipo_pago?: string;
  observaciones?: string;
  producto_ids: number[];
}

export interface LiquidacionConfirmar {
  tipo_pago: string;
  devengado?: number;
  tributario?: number;
  comision_bancaria?: number;
  gasto_empresa?: number;
  observaciones?: string;
}

export const liquidacionService = {
  async getLiquidaciones(skip = 0, limit = 100): Promise<Liquidacion[]> {
    return apiClient.get<Liquidacion[]>(`/liquidaciones?skip=${skip}&limit=${limit}`);
  },

  async getLiquidacionesPendientes(skip = 0, limit = 100): Promise<Liquidacion[]> {
    return apiClient.get<Liquidacion[]>(`/liquidaciones/pendientes?skip=${skip}&limit=${limit}`);
  },

  async getLiquidacionesLiquidadas(skip = 0, limit = 100): Promise<Liquidacion[]> {
    return apiClient.get<Liquidacion[]>(`/liquidaciones/liquidadas?skip=${skip}&limit=${limit}`);
  },

  async getLiquidacion(id: number): Promise<Liquidacion> {
    return apiClient.get<Liquidacion>(`/liquidaciones/${id}`);
  },

  async getLiquidacionesByCliente(clienteId: number): Promise<Liquidacion[]> {
    return apiClient.get<Liquidacion[]>(`/liquidaciones/cliente/${clienteId}`);
  },

  async getProductosPendientesByCliente(clienteId: number, anexoId?: number): Promise<ProductosEnLiquidacion[]> {
    let url = `/liquidaciones/productos-pendientes/cliente/${clienteId}`;
    if (anexoId) {
      url += `?anexo_id=${anexoId}`;
    }
    return apiClient.get<ProductosEnLiquidacion[]>(url);
  },

  async getItemsAnexoConEstado(clienteId: number, anexoId?: number): Promise<any[]> {
    let url = `/liquidaciones/productos-anexo/cliente/${clienteId}`;
    if (anexoId) {
      url += `?anexo_id=${anexoId}`;
    }
    return apiClient.get<any[]>(url);
  },

  async createLiquidacion(data: LiquidacionCreate): Promise<Liquidacion> {
    return apiClient.post<Liquidacion>('/liquidaciones', data);
  },

  async updateLiquidacion(id: number, data: Partial<LiquidacionCreate>): Promise<Liquidacion> {
    return apiClient.put<Liquidacion>(`/liquidaciones/${id}`, data);
  },

  async confirmarLiquidacion(id: number, data: LiquidacionConfirmar): Promise<Liquidacion> {
    return apiClient.post<Liquidacion>(`/liquidaciones/${id}/confirmar`, data);
  },

  async deleteLiquidacion(id: number): Promise<void> {
    return apiClient.delete<void>(`/liquidaciones/${id}`);
  },
};

export type {
  Cliente,
  ClienteCreate,
  ClienteUpdate,
  ClienteWithVentas,
  ClienteNatural,
  ClienteNaturalCreate,
  ClienteJuridica,
  ClienteJuridicaCreate,
  ClienteTCP,
  ClienteTCPCreate,
  Anexo,
  Moneda,
  MonedaCreate,
  MonedaUpdate,
  Convenio,
  Dependencia,
  Cuenta,
  TipoEntidad,
  TipoMovimiento,
};