import { apiClient } from '../lib/api';
import type { 
  Productos, 
  ProductosCreate, 
  ProductosUpdate,
  Categorias,
  CategoriasCreate,
  CategoriasUpdate,
  DashboardStats
} from '../types';
import type {
  Venta,
  VentaCreate,
  VentaUpdate,
  Cliente,
  ClienteCreate,
  ClienteUpdate,
  ClienteWithVentas
} from '../types/ventas';

export const productosService = {
  async getProductos(skip = 0, limit = 100): Promise<Productos[]> {
    return apiClient.get<Productos[]>(`/productos?skip=${skip}&limit=${limit}`);
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