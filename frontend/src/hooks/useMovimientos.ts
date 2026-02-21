import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { movimientosService } from '../services/api';
import toast from 'react-hot-toast';
import { useState, useCallback, useEffect } from 'react';

const DEFAULT_LIMIT = 50;

export function useMovimientos() {
  const queryClient = useQueryClient();
  const [allMovimientos, setAllMovimientos] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const resetPagination = useCallback(() => {
    setSkip(0);
    setAllMovimientos([]);
    setHasMore(true);
  }, []);

  const setSearch = useCallback((term: string) => {
    setSearchTerm(term);
    resetPagination();
  }, [resetPagination]);

  const query = useQuery({
    queryKey: ['movimientos', skip, searchTerm],
    queryFn: async () => {
      const newMovimientos = await movimientosService.getMovimientos(skip, DEFAULT_LIMIT);
      
      let filteredMovimientos = newMovimientos;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredMovimientos = newMovimientos.filter((m: any) => 
          m.producto?.nombre?.toLowerCase().includes(term) ||
          m.tipo_movimiento?.tipo?.toLowerCase().includes(term) ||
          m.dependencia?.nombre?.toLowerCase().includes(term)
        );
      }
      
      if (filteredMovimientos.length < DEFAULT_LIMIT) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      
      if (skip === 0) {
        setAllMovimientos(filteredMovimientos);
      } else {
        setAllMovimientos(prev => [...prev, ...filteredMovimientos]);
      }
      
      return filteredMovimientos;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (searchTerm !== '' && skip === 0 && query.data) {
      setAllMovimientos(query.data);
    }
  }, [searchTerm, skip, query.data]);

  const loadMore = useCallback(() => {
    if (!query.isFetching && hasMore) {
      setSkip(prev => prev + DEFAULT_LIMIT);
    }
  }, [query.isFetching, hasMore]);

  const deleteMutation = useMutation({
    mutationFn: movimientosService.deleteMovimiento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      resetPagination();
      toast.success('Movimiento eliminado correctamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al eliminar movimiento');
    }
  });

  return {
    movimientos: allMovimientos,
    totalMovimientos: query.data?.length || 0,
    isLoading: query.isLoading && skip === 0,
    isFetchingMore: query.isFetching,
    isError: query.isError,
    error: query.error,
    hasMore,
    loadMore,
    searchTerm,
    setSearch,
    deleteMovimiento: deleteMutation.mutate,
    refresh: () => {
      resetPagination();
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
    },
    isDeleting: deleteMutation.isPending
  };
}
