import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ExistenciaHibridaResponse } from '@/types';

interface UseStockOptions {
  idDependencia: number | null;
  idAnexo?: number | null;
}

export function useStock({ idDependencia, idAnexo }: UseStockOptions) {
  return useQuery<
    ExistenciaHibridaResponse[],
    Error
  >({
    queryKey: ['stock', idDependencia, idAnexo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (idDependencia) params.append('id_dependencia', idDependencia.toString());
      if (idAnexo) params.append('id_anexo', idAnexo.toString());
      
      const data = await apiClient.get<ExistenciaHibridaResponse[]>(
        `/existencias/hibridas?${params.toString()}`
      );
      
      return data;
    },
    staleTime: 30000,
  });
}