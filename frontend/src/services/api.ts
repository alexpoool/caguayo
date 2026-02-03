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