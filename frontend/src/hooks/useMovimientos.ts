import { useMutation, useQueryClient } from '@tanstack/react-query';
import { movimientosService } from '../services/api';
import type { Movimiento } from '../types/index';
import toast from 'react-hot-toast';
import { useMemo } from 'react';
import { useInfiniteList } from './useInfiniteList';

export function useMovimientos(tipoFiltro?: 'todos') {
  const queryClient = useQueryClient();

  const tipo = tipoFiltro && tipoFiltro !== 'todos' ? tipoFiltro : undefined;

  const {
    items,
    isLoading,
    isFetchingMore,
    isError,
    error,
    hasMore,
    loadMore,
    searchTerm,
    setSearch,
    refresh,
  } = useInfiniteList<Movimiento>({
    queryKeyBase: 'movimientos',
    queryFn: (skip, limit) => movimientosService.getMovimientos(skip, limit, tipo),
    extraQueryKeyParams: [tipoFiltro],
    limit: 100,
  });

  // Client-side filtering and sorting (fallback while backend doesn't support search)
  const movimientos = useMemo(() => {
    let filtered = items;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = items.filter((m: any) =>
        m.producto?.nombre?.toLowerCase().includes(term) ||
        m.tipo_movimiento?.tipo?.toLowerCase().includes(term) ||
        m.dependencia?.nombre?.toLowerCase().includes(term)
      );
    }
    return [...filtered].sort((a, b) =>
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
  }, [items, searchTerm]);

  const deleteMutation = useMutation({
    mutationFn: movimientosService.deleteMovimiento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      toast.success('Movimiento eliminado correctamente');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Error al eliminar movimiento');
    }
  });

  return {
    movimientos,
    isLoading,
    isFetchingMore,
    isError,
    error,
    hasMore,
    loadMore,
    searchTerm,
    setSearch,
    deleteMovimiento: deleteMutation.mutate,
    refresh,
    isDeleting: deleteMutation.isPending
  };
}
