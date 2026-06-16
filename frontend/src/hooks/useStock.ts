import { useQuery } from '@tanstack/react-query';
import { existenciaService } from '../services/api';

export interface ExistenciaHibridaItem {
  id_producto: number;
  stock: number;
}

export function useStock({ idDependencia }: { idDependencia: number | null }) {
  return useQuery({
    queryKey: ['stock', idDependencia],
    queryFn: async () => {
      if (!idDependencia) return [];
      const data = await existenciaService.getExistenciasHibridas(idDependencia);
      return data as ExistenciaHibridaItem[];
    },
    enabled: !!idDependencia,
  });
}
