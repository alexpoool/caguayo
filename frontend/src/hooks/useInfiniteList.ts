import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface UseInfiniteListOptions<T> {
  /** Base única para la query key. Ej: 'productos' */
  queryKeyBase: string;
  /** Función que llama al endpoint paginado */
  queryFn: (skip: number, limit: number, search?: string, onTotal?: (total: number | null) => void) => Promise<T[]>;
  /** Tamaño de página (default: 100) */
  limit?: number;
  /** Parámetros extra incluidos en la query key (ej: [categoriaId]) */
  extraQueryKeyParams?: unknown[];
  /** Tiempo de staleness en ms (default: 5 min) */
  staleTime?: number;
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

// ─── Constantes ──────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 100;
const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutos
const SEARCH_DEBOUNCE_MS = 400;

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
  const [total, setTotal] = useState<number | null>(null);

  // La búsqueda se envía al servidor con retardo: mientras el usuario escribe
  // se mantiene la lista anterior y sólo se consulta cuando el término se
  // estabiliza. `searchTerm` sigue siendo el valor crudo del input.
  const debouncedSearch = useDebounce(searchTerm, SEARCH_DEBOUNCE_MS);
  const [appliedSearch, setAppliedSearch] = useState(debouncedSearch);

  // Reiniciar la paginación en el mismo render en que cambia el término
  // diferido, para que la query siempre arranque desde `skip = 0`.
  if (appliedSearch !== debouncedSearch) {
    setAppliedSearch(debouncedSearch);
    setSkip(0);
    setAllItems([]);
    setHasMore(true);
    setTotal(null);
  }

  // ── Reset ────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setSkip(0);
    setAllItems([]);
    setHasMore(true);
    setTotal(null);
  }, []);

  const setSearch = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  // ── Query paginada ───────────────────────────────────────────────────────

  const query = useQuery({
    queryKey: [queryKeyBase, skip, debouncedSearch, ...extraQueryKeyParams],
    queryFn: async () => {
      let fetchedTotal: number | null = null;
      const onTotal = (t: number | null) => {
        fetchedTotal = t;
      };
      const newItems = await queryFn(skip, limit, debouncedSearch || undefined, onTotal);

      if (fetchedTotal !== null) {
        setTotal(fetchedTotal);
      }

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
        setAllItems(prev => {
          if (prev.length === 0) {
            const baseData = queryClient.getQueryData([queryKeyBase, 0, debouncedSearch, ...extraQueryKeyParams]);
            if (baseData) return [...(baseData as T[]), ...newItems];
          }
          return [...prev, ...newItems];
        });
      }

      return newItems;
    },
    staleTime,
    gcTime: Infinity,
  });

  // ── Items visibles ───────────────────────────────────────────────────────
  // Usar query.data directamente para la primera página (incluye caché de React Query)
  // y allItems para páginas acumuladas por infinite scroll

  const items = useMemo(() => {
    if (skip === 0) {
      return query.data || allItems;
    }
    return allItems;
  }, [skip, query.data, allItems]);

  // Sincronizar allItems desde query.data para que loadMore funcione
  // cuando los datos vienen de caché (sin ejecutar queryFn)

  useEffect(() => {
    if (!query.data) return;
    if (skip === 0) {
      setAllItems(query.data);
      setHasMore(query.data.length >= limit);
    } else {
      setAllItems(prev => {
        if (prev.length > 0) return prev;
        const baseKey = [queryKeyBase, 0, debouncedSearch, ...extraQueryKeyParams];
        const baseData = queryClient.getQueryData(baseKey);
        if (baseData) return [...(baseData as T[]), ...(query.data ?? [])];
        return query.data ?? [];
      });
      setHasMore((query.data?.length ?? 0) >= limit);
    }
  }, [skip, query.data, limit, queryClient, queryKeyBase, debouncedSearch, extraQueryKeyParams]);

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
    setTotal(null);
    queryClient.invalidateQueries({ queryKey: [queryKeyBase] });
  }, [queryClient, queryKeyBase]);

  // ── Retorno ──────────────────────────────────────────────────────────────

  return {
    items,
    total,
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
