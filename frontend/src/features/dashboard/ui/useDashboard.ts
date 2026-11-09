import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CasosUsoDashboard } from '../application/casos-uso';

/**
 * Estado de React Query del dashboard. La capa de presentación conserva
 * las claves de caché y el comportamiento de refresco existentes.
 */
export function useDashboard(casosUso: CasosUsoDashboard) {
  const queryClient = useQueryClient();

  const estadisticas = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => casosUso.obtenerEstadisticas(),
  });

  const tendenciasVentas = useQuery({
    queryKey: ['dashboard-trends'],
    queryFn: () => casosUso.obtenerTendenciasVentas(),
  });

  const tendenciasMovimientos = useQuery({
    queryKey: ['dashboard-movimientos-trends'],
    queryFn: () => casosUso.obtenerTendenciasMovimientos(),
  });

  const refrescar = () => {
    void estadisticas.refetch();
    void queryClient.invalidateQueries({ queryKey: ['dashboard-trends'] });
    void queryClient.invalidateQueries({
      queryKey: ['dashboard-movimientos-trends'],
    });
  };

  return {
    stats: estadisticas.data,
    tendenciasVentas: tendenciasVentas.data,
    tendenciasMovimientos: tendenciasMovimientos.data,
    cargando: estadisticas.isLoading,
    isError: estadisticas.isError,
    error: estadisticas.error,
    refrescar,
  };
}
