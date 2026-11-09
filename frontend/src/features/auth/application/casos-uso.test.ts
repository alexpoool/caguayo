import { describe, expect, it, vi } from 'vitest';
import { crearCasosUsoAuth } from './casos-uso';
import type { AuthRepositorio } from '../domain/auth-repositorio';
import type { CredencialesSesion, Sesion } from '@/shared/domain/sesion';

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
    listarConexiones: vi.fn().mockResolvedValue([]),
    probarConexion: vi.fn().mockResolvedValue(true),
    listarDependencias: vi.fn().mockResolvedValue([]),
    listarGrupos: vi.fn().mockResolvedValue([]),
    registrar: vi.fn().mockResolvedValue(sesion),
    actualizarPerfil: vi.fn().mockResolvedValue(undefined),
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

  it('delega las operaciones de registro, perfil y conexiones', async () => {
    const repo = repoFalso();
    const casos = crearCasosUsoAuth(repo);
    const datos = {
      ci: '1',
      nombre: 'Ana',
      primer_apellido: 'Pérez',
      cargo: 'Analista',
      alias: 'ana',
      contrasenia: 'secreta',
      base_datos: 'demo',
      id_dependencia: 2,
      id_grupo: 3,
    };

    await expect(casos.listarConexiones()).resolves.toEqual([]);
    await expect(casos.probarConexion('demo', 'db', 5432)).resolves.toBe(true);
    await expect(casos.listarDependencias('demo')).resolves.toEqual([]);
    await expect(casos.listarGrupos('demo')).resolves.toEqual([]);
    await expect(casos.registrar(datos)).resolves.toBe(sesion);
    await casos.actualizarPerfil({ alias: 'ana2' });

    expect(repo.probarConexion).toHaveBeenCalledWith('demo', 'db', 5432);
    expect(repo.listarDependencias).toHaveBeenCalledWith('demo');
    expect(repo.listarGrupos).toHaveBeenCalledWith('demo');
    expect(repo.registrar).toHaveBeenCalledWith(datos);
    expect(repo.actualizarPerfil).toHaveBeenCalledWith({ alias: 'ana2' });
  });
});
