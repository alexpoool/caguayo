import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './AuthContext';
import type { CasosUsoSesion } from '@/shared/application/auth';
import type { Sesion, UsuarioSesion } from '@/shared/domain/sesion';

const usuarioA: UsuarioSesion = {
  id_usuario: 1,
  ci: '1',
  nombre: 'Ana',
  primer_apellido: 'Pérez',
  alias: 'ana',
};
const usuarioB: UsuarioSesion = {
  id_usuario: 2,
  ci: '2',
  nombre: 'Beto',
  primer_apellido: 'Gómez',
  alias: 'beto',
};
const sesionA: Sesion = {
  token: 'a',
  usuario: usuarioA,
  funcionalidades: [{ id_funcionalidad: 1, nombre: 'x' }],
  baseDatos: 'demo',
};
const sesionB: Sesion = { ...sesionA, token: 'b', usuario: usuarioB };

function crearCasos(
  overrides: Partial<CasosUsoSesion> = {},
): CasosUsoSesion {
  return {
    iniciarSesion: vi.fn().mockResolvedValue(sesionA),
    restaurarSesion: vi.fn().mockResolvedValue(null),
    sincronizarSesion: vi.fn().mockResolvedValue(null),
    cerrarSesion: vi.fn().mockResolvedValue(undefined),
    listarConexiones: vi.fn().mockResolvedValue([]),
    probarConexion: vi.fn().mockResolvedValue(true),
    listarDependencias: vi.fn().mockResolvedValue([]),
    listarGrupos: vi.fn().mockResolvedValue([]),
    registrar: vi.fn().mockResolvedValue(sesionA),
    actualizarPerfil: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function wrapper(
  casos: CasosUsoSesion,
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  }),
) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider casosUso={casos}>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };
}

function diferido<T>() {
  let resolver!: (valor: T) => void;
  const promesa = new Promise<T>((r) => {
    resolver = r;
  });
  return { promesa, resolver };
}

describe('AuthProvider', () => {
  it('arranca sin bloquear y restaura desde la caché', async () => {
    const casos = crearCasos({
      restaurarSesion: vi.fn().mockResolvedValue(sesionA),
    });
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(casos) });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() =>
      expect(result.current.isAuthenticated).toBe(true),
    );
    expect(result.current.user).toEqual(usuarioA);
    expect(casos.sincronizarSesion).toHaveBeenCalled();
  });

  it('limpia la caché privada al restaurar una sesión distinta', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['datos-privados'], [{ id: 1 }]);
    const casos = crearCasos({
      restaurarSesion: vi.fn().mockResolvedValue(sesionA),
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: wrapper(casos, queryClient),
    });

    await waitFor(() => expect(result.current.user).toEqual(usuarioA));
    expect(queryClient.getQueryData(['datos-privados'])).toBeUndefined();
  });

  it('un sincronizarSesion tardío no revive la sesión tras logout', async () => {
    const { promesa, resolver } = diferido<Sesion | null>();
    const casos = crearCasos({
      sincronizarSesion: vi.fn().mockReturnValue(promesa),
    });
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(casos) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.logout();
    });
    resolver(sesionA);
    await act(async () => {
      await promesa;
    });

    expect(result.current.user).toBeNull();
  });

  it('un sincronizarSesion tardío no revierte un login de otro usuario', async () => {
    const { promesa, resolver } = diferido<Sesion | null>();
    const casos = crearCasos({
      iniciarSesion: vi.fn().mockResolvedValue(sesionB),
      sincronizarSesion: vi.fn().mockReturnValue(promesa),
    });
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(casos) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.logout();
      await result.current.login('beto', 'x', 'demo');
    });
    resolver(sesionA);
    await act(async () => {
      await promesa;
    });

    expect(result.current.user).toEqual(usuarioB);
  });

  it('refreshUser trae la sesión fresca del backend', async () => {
    // 1ª llamada: el sync del mount; 2ª: el refreshUser explícito.
    const casos = crearCasos({
      restaurarSesion: vi.fn().mockResolvedValue(sesionA),
      sincronizarSesion: vi
        .fn()
        .mockResolvedValueOnce(sesionA)
        .mockResolvedValueOnce(sesionB),
    });
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(casos) });
    await waitFor(() => expect(result.current.user).toEqual(usuarioA));

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(result.current.user).toEqual(usuarioB);
  });

  it('refreshUser no cierra la sesión si el refresco falla', async () => {
    const casos = crearCasos({
      restaurarSesion: vi.fn().mockResolvedValue(sesionA),
      sincronizarSesion: vi
        .fn()
        .mockResolvedValueOnce(sesionA) // sync del mount
        .mockRejectedValueOnce(new Error('red caída')), // refreshUser
    });
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(casos) });
    await waitFor(() => expect(result.current.user).toEqual(usuarioA));

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(result.current.user).toEqual(usuarioA);
  });
});
