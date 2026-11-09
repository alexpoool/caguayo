import { describe, expect, it, vi } from 'vitest';
import { crearCasosUsoAuth } from './casos-uso';
import type { AuthRepositorio } from '../domain/auth-repositorio';
import type { CredencialesSesion, Sesion } from '../domain/sesion';

const sesion: Sesion = {
  token: 'token',
  usuario: {
    id_usuario: 1,
    ci: '1',
    nombre: 'Ana',
    primer_apellido: 'Pérez',
    alias: 'ana',
  },
  funcionalidades: [{ id_funcionalidad: 1, nombre: 'dashboard' }],
  baseDatos: 'demo',
};

function repoFalso(overrides: Partial<AuthRepositorio> = {}): AuthRepositorio {
  return {
    iniciarSesion: vi.fn().mockResolvedValue(sesion),
    obtenerSesion: vi.fn().mockResolvedValue(sesion),
    cerrarSesion: vi.fn().mockResolvedValue(undefined),
    actualizarAlmacen: vi.fn(),
    tokenActual: vi.fn().mockReturnValue('token'),
    tokenVigente: vi.fn().mockReturnValue(true),
    limpiarSesion: vi.fn(),
    ...overrides,
  };
}

describe('crearCasosUsoAuth', () => {
  it('inicia sesión con las credenciales del dominio', async () => {
    const repo = repoFalso();
    const casos = crearCasosUsoAuth(repo);
    const credenciales: CredencialesSesion = {
      alias: 'ana',
      contrasenia: 'x',
      baseDatos: 'demo',
    };

    await expect(casos.iniciarSesion(credenciales)).resolves.toBe(sesion);
    expect(repo.iniciarSesion).toHaveBeenCalledWith(credenciales);
  });

  it('restaura la sesión y actualiza el almacén', async () => {
    const repo = repoFalso();
    const casos = crearCasosUsoAuth(repo);

    await expect(casos.restaurarSesion()).resolves.toBe(sesion);
    expect(repo.actualizarAlmacen).toHaveBeenCalledWith(sesion);
  });

  it('limpia la sesión si el token no existe o expiró', async () => {
    const repo = repoFalso({ tokenActual: vi.fn().mockReturnValue(null) });
    const casos = crearCasosUsoAuth(repo);

    await expect(casos.restaurarSesion()).resolves.toBeNull();
    expect(repo.limpiarSesion).toHaveBeenCalledOnce();
    expect(repo.obtenerSesion).not.toHaveBeenCalled();
  });

  it('limpia la sesión si el backend rechaza la restauración', async () => {
    const repo = repoFalso({
      obtenerSesion: vi.fn().mockRejectedValue(new Error('401')),
    });
    const casos = crearCasosUsoAuth(repo);

    await expect(casos.restaurarSesion()).resolves.toBeNull();
    expect(repo.limpiarSesion).toHaveBeenCalledOnce();
  });

  it('cierra la sesión en el puerto', async () => {
    const repo = repoFalso();
    const casos = crearCasosUsoAuth(repo);

    await casos.cerrarSesion();
    expect(repo.cerrarSesion).toHaveBeenCalledOnce();
  });
});
