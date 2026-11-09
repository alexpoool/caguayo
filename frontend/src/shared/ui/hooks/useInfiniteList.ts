import { useCallback, useMemo, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface UseInfiniteListOptions<T> {
  /** Base única para la query key. Ej: 'productos' */
  queryKeyBase: string;
  /** Función que llama al endpoint paginado */
  queryFn: (
    skip: number,
    limit: number,
    search?: string,
    onTotal?: (total: number | null) => void,
  ) => Promise<T[]>;
  /** Tamaño de página (default: 100) */
  limit?: number;
  /** Parámetros extra incluidos en la query key (ej: [categoriaId]) */
  extraQueryKeyParams?: unknown[];
  /** Tiempo de staleness en ms (default: 5 min) */
  staleTime?: number;
  /** Tiempo de caché en ms (default: 10 min) */
  gcTime?: number;
}

export interface UseInfiniteListReturn<T> {
  items: T[];
  /** Total de la BD que manda el backend en el header X-Total-Count. null = aún no llegó. */
  total: number | null;
  isLoading: boolean;
  isFetchingMore: boolean;
  isError: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  searchTerm: string;
  setSearch: (term: string) => void;
  refresh: () => void;
  reset: () => void;
}

interface Page<T> {
  items: T[];
  total: number | null;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 100;
const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutos
const DEFAULT_GC_TIME = 10 * 60 * 1000; // 10 minutos
const SEARCH_DEBOUNCE_MS = 400;

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useInfiniteList<T>({
  queryKeyBase,
  queryFn,
  limit = DEFAULT_LIMIT,
  extraQueryKeyParams = [],
  staleTime = DEFAULT_STALE_TIME,
  gcTime = DEFAULT_GC_TIME,
}: UseInfiniteListOptions<T>): UseInfiniteListReturn<T> {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  // La búsqueda se envía al servidor con retardo. El cambio de queryKey
  // reinicia la paginación sin escribir estado durante el render.
  const debouncedSearch = useDebounce(searchTerm, SEARCH_DEBOUNCE_MS);

  const query = useInfiniteQuery({
    queryKey: [queryKeyBase, debouncedSearch, ...extraQueryKeyParams],
    queryFn: async ({ pageParam }) => {
      // `onTotal` solo captura el header de la respuesta; no toca estado React.
      let total: number | null = null;
      const items = await queryFn(pageParam, limit, debouncedSearch || undefined, (value) => {
        total = value;
      });
      return { items, total } satisfies Page<T>;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.items.length < limit) return undefined;
      return allPages.length * limit;
    },
    staleTime,
    gcTime,
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  const total = useMemo(() => {
    const pages = query.data?.pages ?? [];
    for (let index = pages.length - 1; index >= 0; index -= 1) {
      if (pages[index].total !== null) return pages[index].total;
    }
    return null;
  }, [query.data]);

  const loadMore = useCallback(() => {
    if (!query.isFetching && query.hasNextPage) {
      void query.fetchNextPage();
    }
  }, [query]);

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [queryKeyBase] });
  }, [queryClient, queryKeyBase]);

  const reset = useCallback(() => {
    void queryClient.resetQueries({ queryKey: [queryKeyBase] });
  }, [queryClient, queryKeyBase]);

  return {
    items,
    total,
    isLoading: query.isLoading,
    isFetchingMore: query.isFetchingNextPage,
    isError: query.isError,
    error: query.error as Error | null,
    hasMore: query.hasNextPage ?? false,
    loadMore,
    searchTerm,
    setSearch: setSearchTerm,
    refresh,
    reset,
  };
}
