import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productosService } from '../services/api';
import type { ProductosCreate } from '../types/index';
import toast from 'react-hot-toast';

export function useProductos() {
  const queryClient = useQueryClient();

  // Query para obtener todos los productos
  const query = useQuery({
    queryKey: ['productos'],
    queryFn: () => {
      console.log('FETCH: Obteniendo productos del servidor...');
      return productosService.getProductos();
    },
  });

  // Mutación para crear producto
  const createMutation = useMutation({
    mutationFn: productosService.createProducto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast.success('Producto creado correctamente');
    },
    onError: (error) => {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Error al crear producto');
    }
  });

  // Mutación para actualizar producto
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductosCreate }) => 
      productosService.updateProducto(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast.success('Producto actualizado correctamente');
    },
    onError: (error) => {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar producto');
    }
  });

  // Mutación para eliminar producto
  const deleteMutation = useMutation({
    mutationFn: productosService.deleteProducto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast.success('Producto eliminado correctamente');
    },
    onError: (error) => {
      // El mensaje de error ya viene formateado desde la API (productos.py)
      const message = (error as any)?.response?.data?.detail || error.message || 'Error al eliminar producto';
      toast.error(message);
    }
  });

  return {
    productos: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    createProduct: createMutation.mutate,
    updateProduct: updateMutation.mutate,
    deleteProduct: deleteMutation.mutate,
    refresh: () => queryClient.invalidateQueries({ queryKey: ['productos'] }),
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}
