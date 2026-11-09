import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Movimiento } from '../domain/inventario';
import type { CasosUsoInventario } from '../application/casos-uso';
import toast from 'react-hot-toast';
import { useInfiniteList } from '@/shared/ui/hooks/useInfiniteList';

export function useMovimientos(
  casosUso: CasosUsoInventario,
  tipoFiltro?: 'todos',
) {
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
      casosUso.listarMovimientos(skip, limit, tipo, search, onTotal),
    extraQueryKeyParams: [tipoFiltro],
    limit: 100,
  });

  // El backend ya entrega los movimientos por fecha descendente
  // (`order_by(Movimiento.fecha.desc())`); no se reordena en cliente.
  const movimientos = items;

  const deleteMutation = useMutation({
    mutationFn: casosUso.eliminarMovimiento,
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
