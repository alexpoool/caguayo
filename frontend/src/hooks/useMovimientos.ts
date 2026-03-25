import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { movimientosService } from '../services/api';
import toast from 'react-hot-toast';
import { useState } from 'react';

export function useMovimientos(tipoFiltro?: 'todos') {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const query = useQuery({
    queryKey: ['movimientos', tipoFiltro, searchTerm],
    queryFn: async () => {
      const tipo = tipoFiltro && tipoFiltro !== 'todos' ? tipoFiltro : undefined;
      
      const movimientos = await movimientosService.getMovimientos(tipo);
      
      let filteredMovimientos = movimientos;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredMovimientos = movimientos.filter((m: any) => 
          m.producto?.nombre?.toLowerCase().includes(term) ||
          m.tipo_movimiento?.tipo?.toLowerCase().includes(term) ||
          m.dependencia?.nombre?.toLowerCase().includes(term)
        );
      }
      
      return [...filteredMovimientos].sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
    },
    staleTime: 0,
  });

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
    movimientos: query.data || [],
    totalMovimientos: query.data?.length || 0,
    isLoading: query.isLoading,
    isFetchingMore: query.isFetching,
    isError: query.isError,
    error: query.error,
    hasMore: false,
    loadMore: () => {},
    searchTerm,
    setSearch: setSearchTerm,
    deleteMovimiento: deleteMutation.mutate,
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
    },
    isDeleting: deleteMutation.isPending
  };
}
