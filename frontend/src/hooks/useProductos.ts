import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productosService } from '../services/api';
import type { Productos, ProductosCreate } from '../types/index';
import toast from 'react-hot-toast';
import { useState, useCallback, useEffect } from 'react';

const DEFAULT_LIMIT = 50;

export function useProductos() {
  const queryClient = useQueryClient();
  const [allProducts, setAllProducts] = useState<Productos[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const resetPagination = useCallback(() => {
    setSkip(0);
    setAllProducts([]);
    setHasMore(true);
  }, []);

  const setSearch = useCallback((term: string) => {
    setSearchTerm(term);
    resetPagination();
  }, [resetPagination]);

  // Query para obtener productos con paginación y búsqueda
  const query = useQuery({
    queryKey: ['productos', skip, searchTerm],
    queryFn: async () => {
      console.log('FETCH: Obteniendo productos del servidor...', { skip, limit: DEFAULT_LIMIT, search: searchTerm });
      const newProducts = await productosService.getProductos(skip, DEFAULT_LIMIT, searchTerm || undefined);
      
      if (newProducts.length < DEFAULT_LIMIT) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      
      if (skip === 0) {
        setAllProducts(newProducts);
      } else {
        setAllProducts(prev => [...prev, ...newProducts]);
      }
      
      return newProducts;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Efecto para limpiar productos cuando cambia el searchTerm
  useEffect(() => {
    if (searchTerm !== '' && skip === 0 && query.data) {
      setAllProducts(query.data);
    }
  }, [searchTerm, skip, query.data]);

  // Función para cargar más productos
  const loadMore = useCallback(() => {
    if (!query.isFetching && hasMore) {
      setSkip(prev => prev + DEFAULT_LIMIT);
    }
  }, [query.isFetching, hasMore]);

  // Mutación para crear producto
  const createMutation = useMutation({
    mutationFn: productosService.createProducto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] });
      resetPagination();
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
      resetPagination();
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
      resetPagination();
      toast.success('Producto eliminado correctamente');
    },
    onError: (error) => {
      const message = (error as any)?.response?.data?.detail || error.message || 'Error al eliminar producto';
      toast.error(message);
    }
  });

  return {
    productos: allProducts,
    isLoading: query.isLoading && skip === 0,
    isFetchingMore: query.isFetching,
    isError: query.isError,
    error: query.error,
    hasMore,
    loadMore,
    searchTerm,
    setSearch,
    createProduct: createMutation.mutate,
    updateProduct: updateMutation.mutate,
    deleteProduct: deleteMutation.mutate,
    refresh: () => {
      resetPagination();
      queryClient.invalidateQueries({ queryKey: ['productos'] });
    },
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}
