import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useInfiniteList } from './useInfiniteList';

const page = (start: number, count: number) =>
  Array.from({ length: count }, (_, index) => start + index);

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useInfiniteList', () => {
  it('carga la primera página y expone el total del backend', async () => {
    const queryFn = vi.fn(async (_skip, _limit, _search, onTotal) => {
      onTotal?.(3);
      return page(1, 2);
    });

    const { result } = renderHook(
      () => useInfiniteList<number>({ queryKeyBase: 'test', queryFn, limit: 2 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.items).toEqual([1, 2]));
    expect(result.current.total).toBe(3);
    expect(result.current.hasMore).toBe(true);
    expect(queryFn).toHaveBeenCalledWith(0, 2, undefined, expect.any(Function));
  });

  it('carga la siguiente página y deja de pedir al llegar al final', async () => {
    const queryFn = vi.fn(async (skip, _limit, _search, onTotal) => {
      onTotal?.(3);
      return skip === 0 ? [1, 2] : [3];
    });

    const { result } = renderHook(
      () => useInfiniteList<number>({ queryKeyBase: 'test', queryFn, limit: 2 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.items).toEqual([1, 2]));
    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.items).toEqual([1, 2, 3]));
    expect(result.current.hasMore).toBe(false);
    expect(queryFn).toHaveBeenLastCalledWith(2, 2, undefined, expect.any(Function));
  });

  it('envía la búsqueda al backend y reinicia la paginación', async () => {
    const queryFn = vi.fn(async (_skip, _limit, search) =>
      search ? [10] : [1, 2],
    );

    const { result } = renderHook(
      () => useInfiniteList<number>({ queryKeyBase: 'test', queryFn, limit: 2 }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.items).toEqual([1, 2]));
    act(() => result.current.setSearch('abc'));

    await waitFor(() => expect(result.current.items).toEqual([10]), { timeout: 1500 });
    expect(queryFn).toHaveBeenLastCalledWith(0, 2, 'abc', expect.any(Function));
  });

  it('reinicia la página cuando cambian los filtros externos', async () => {
    const queryFn = vi.fn(async (skip, _limit, _search, onTotal) => {
      onTotal?.(2);
      return skip === 0 ? [1, 2] : [3, 4];
    });

    const { result, rerender } = renderHook(
      ({ filtro }: { filtro: number }) =>
        useInfiniteList<number>({
          queryKeyBase: 'test',
          queryFn,
          limit: 2,
          extraQueryKeyParams: [filtro],
        }),
      { wrapper: createWrapper(), initialProps: { filtro: 1 } },
    );

    await waitFor(() => expect(result.current.items).toEqual([1, 2]));
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toEqual([1, 2, 3, 4]));

    rerender({ filtro: 2 });
    await waitFor(() => expect(queryFn).toHaveBeenLastCalledWith(0, 2, undefined, expect.any(Function)));
  });

  it('expone el error de la consulta', async () => {
    const queryFn = vi.fn(async () => {
      throw new Error('sin conexión');
    });

    const { result } = renderHook(
      () => useInfiniteList<number>({ queryKeyBase: 'test', queryFn }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('sin conexión');
  });
});
