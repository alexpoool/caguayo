import { useMutation, useQueryClient } from '@tanstack/react-query';
import { movimientosService } from '../services/api';
import type { Movimiento } from '../types/index';
import toast from 'react-hot-toast';
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
    queryFn: (skip, limit, search, onTotal) =>
      movimientosService.getMovimientos(skip, limit, tipo, search, onTotal),
    extraQueryKeyParams: [tipoFiltro],
    limit: 100,
  });

  // El backend ya entrega los movimientos por fecha descendente
  // (`order_by(Movimiento.fecha.desc())`); no se reordena en cliente.
  const movimientos = items;

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
