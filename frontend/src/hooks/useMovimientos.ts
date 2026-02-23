import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { movimientosService } from '../services/api';
import toast from 'react-hot-toast';
import { useState } from 'react';

const TIPO_REGEX = /tipo:(\w+)/gi;

function extractTipoFilter(searchTerm: string): { cleanTerm: string; tipo: string | undefined } {
  const match = TIPO_REGEX.exec(searchTerm);
  if (match) {
    const tipo = match[1].toUpperCase();
    const cleanTerm = searchTerm.replace(TIPO_REGEX, '').trim().replace(/\s+/g, ' ');
    return { cleanTerm, tipo };
  }
  return { cleanTerm: searchTerm, tipo: undefined };
}

export function useMovimientos() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const query = useQuery({
    queryKey: ['movimientos', searchTerm],
    queryFn: async () => {
      const { cleanTerm, tipo } = extractTipoFilter(searchTerm);
      console.log('[useMovimientos] searchTerm:', searchTerm, '-> cleanTerm:', cleanTerm, 'tipo:', tipo);
      
      const movimientos = await movimientosService.getMovimientos(tipo);
      console.log('[useMovimientos] got movimientos, count:', movimientos.length);
      if (movimientos.length > 0) {
        const tiposUnicos = [...new Set(movimientos.map((m: any) => m.tipo_movimiento?.tipo).filter(Boolean))];
        console.log('[useMovimientos] tipos únicos en datos:', tiposUnicos);
      }
      
      let filteredMovimientos = movimientos;
      if (cleanTerm) {
        const term = cleanTerm.toLowerCase();
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
