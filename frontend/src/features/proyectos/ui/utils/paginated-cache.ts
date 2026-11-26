import type { QueryClient } from '@tanstack/react-query';

const PAGE_SIZE = 100;
const CACHE_TIME = 5 * 60 * 1000;

/**
 * Descarga catálogos por páginas de 100 y conserva cada página y el resultado
 * agregado en React Query. La clave debe identificar el catálogo y sus filtros.
 */
export async function fetchCatalogInBatches<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  fetchPage: (skip: number, limit: number) => Promise<T[]>,
): Promise<T[]> {
  return queryClient.fetchQuery({
    queryKey: [...queryKey, 'all-pages', PAGE_SIZE],
    staleTime: CACHE_TIME,
    queryFn: async () => {
      const result: T[] = [];
      for (let skip = 0; ; skip += PAGE_SIZE) {
        const page = await queryClient.fetchQuery({
          queryKey: [...queryKey, 'page', skip, PAGE_SIZE],
          queryFn: () => fetchPage(skip, PAGE_SIZE),
          staleTime: CACHE_TIME,
        });
        result.push(...page);
        if (page.length < PAGE_SIZE) break;
      }
      return result;
    },
  });
}
