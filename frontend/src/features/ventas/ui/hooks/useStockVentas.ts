import { useQuery } from '@tanstack/react-query';
import type { CasosUsoVentas } from '../../application/casos-uso';
import type { ExistenciaHibrida } from '../../domain/ventas';

export function useStockVentas(
  casosUso: CasosUsoVentas,
  { idDependencia }: { idDependencia: number | null },
) {
  return useQuery({
    queryKey: ['stock', idDependencia],
    queryFn: async (): Promise<ExistenciaHibrida[]> => {
      if (!idDependencia) return [];
      return casosUso.listarExistenciasHibridas(idDependencia);
    },
    enabled: !!idDependencia,
  });
}
