import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface UseInfiniteListOptions<T> {
  /** Base única para la query key. Ej: 'productos' */
  queryKeyBase: string;
  /** Función que llama al endpoint paginado */
  queryFn: (skip: number, limit: number, search?: string) => Promise<T[]>;
  /** Tamaño de página (default: 100) */
  limit?: number;
  /** Parámetros extra incluidos en la query key (ej: [categoriaId]) */
  extraQueryKeyParams?: unknown[];
  /** Tiempo de staleness en ms (default: 5 min) */
  staleTime?: number;
}

export interface UseInfiniteListReturn<T> {
  items: T[];
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

// ─── Constantes ──────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 100;
const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutos

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useInfiniteList<T>({
  queryKeyBase,
  queryFn,
  limit = DEFAULT_LIMIT,
  extraQueryKeyParams = [],
  staleTime = DEFAULT_STALE_TIME,
}: UseInfiniteListOptions<T>): UseInfiniteListReturn<T> {

  const queryClient = useQueryClient();
  const [allItems, setAllItems] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // ── Reset ────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setSkip(0);
    setAllItems([]);
    setHasMore(true);
  }, []);

  const setSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setSkip(0);
    setAllItems([]);
    setHasMore(true);
  }, []);

  // ── Query paginada ───────────────────────────────────────────────────────

  const query = useQuery({
    queryKey: [queryKeyBase, skip, searchTerm, ...extraQueryKeyParams],
    queryFn: async () => {
      const newItems = await queryFn(skip, limit, searchTerm || undefined);

      // Determinar si hay más páginas
      if (newItems.length < limit) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      // Reemplazar (primera página) o anexar (scroll)
      if (skip === 0) {
        setAllItems(newItems);
      } else {
        setAllItems(prev => [...prev, ...newItems]);
      }

      return newItems;
    },
    staleTime,
  });

  // ── Cargar más ───────────────────────────────────────────────────────────

  const loadMore = useCallback(() => {
    if (!query.isFetching && hasMore) {
      setSkip(prev => prev + limit);
    }
  }, [query.isFetching, hasMore, limit]);

  // ── Refresh ──────────────────────────────────────────────────────────────

  const refresh = useCallback(() => {
    setSkip(0);
    setAllItems([]);
    setHasMore(true);
    queryClient.invalidateQueries({ queryKey: [queryKeyBase] });
  }, [queryClient, queryKeyBase]);

  // ── Retorno ──────────────────────────────────────────────────────────────

  return {
    items: allItems,
    isLoading: query.isLoading && skip === 0,
    isFetchingMore: query.isFetching,
    isError: query.isError,
    error: query.error as Error | null,
    hasMore,
    loadMore,
    searchTerm,
    setSearch,
    refresh,
    reset,
  };
}
