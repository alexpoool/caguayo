import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productosService } from '../services/api';
import type { Productos, ProductosCreate } from '../types/index';
import toast from 'react-hot-toast';
import { useInfiniteList } from './useInfiniteList';

const DEFAULT_LIMIT = 100;

export function useProductos() {
  const queryClient = useQueryClient();

  // ── Lista infinita genérica ──────────────────────────────────────────────

  const {
    items: productos,
    isLoading,
    isFetchingMore,
    isError,
    error,
    hasMore,
    loadMore,
    searchTerm,
    setSearch,
    refresh,
  } = useInfiniteList<Productos>({
    queryKeyBase: 'productos',
    queryFn: (skip, limit, search) =>
      productosService.getProductos(skip, limit, search),
    limit: DEFAULT_LIMIT,
  });

  // ── Mutación para crear producto ─────────────────────────────────────────

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

  // ── Mutación para actualizar producto ────────────────────────────────────

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

  // ── Mutación para eliminar producto ──────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: productosService.deleteProducto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      toast.success('Producto eliminado correctamente');
    },
    onError: (error) => {
      const message = (error as any)?.response?.data?.detail || error.message || 'Error al eliminar producto';
      toast.error(message);
    }
  });

  // ── Retorno (compatible con ProductosPage) ───────────────────────────────

  return {
    productos,
    isLoading,
    isFetchingMore,
    isError,
    error,
    hasMore,
    loadMore,
    searchTerm,
    setSearch,
    createProduct: createMutation.mutate,
    updateProduct: updateMutation.mutate,
    deleteProduct: deleteMutation.mutate,
    refresh,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
