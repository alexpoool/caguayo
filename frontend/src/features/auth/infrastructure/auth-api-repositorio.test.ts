import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { authApiRepositorio } from './auth-api-repositorio';
import { authHelpers } from '@/shared/infrastructure/http/api';
import { server } from '@/test/setup';
import type { Sesion, UsuarioSesion } from '@/shared/domain/sesion';

function tokenConExpiracion(segundos: number): string {
  const payload = btoa(JSON.stringify({ exp: segundos })).replace(/=/g, '');
  return `x.${payload}.x`;
}

const usuario: UsuarioSesion = {
  id_usuario: 1,
  ci: '1',
  nombre: 'Ana',
  primer_apellido: 'Pérez',
  alias: 'ana',
};

const funcionalidades = [{ id_funcionalidad: 1, nombre: 'dashboard' }];

const sesion: Sesion = {
  token: '',
  usuario,
  funcionalidades,
  baseDatos: 'demo',
};

describe('authApiRepositorio', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('acepta un token vigente', () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    expect(authApiRepositorio.tokenVigente(tokenConExpiracion(exp))).toBe(true);
  });

  it('rechaza un token expirado o malformado', () => {
    const exp = Math.floor(Date.now() / 1000) - 60;
    expect(authApiRepositorio.tokenVigente(tokenConExpiracion(exp))).toBe(false);
    expect(authApiRepositorio.tokenVigente('sin-puntos')).toBe(false);
  });

  it('lee la sesión cacheada con token vigente', () => {
    authHelpers.setToken(tokenConExpiracion(Math.floor(Date.now() / 1000) + 60));
    authHelpers.setUser(usuario);
    authHelpers.setFuncionalidades(funcionalidades);
    authHelpers.setBaseDatos('demo');

    const cacheada = authApiRepositorio.leerSesionCacheada();

    expect(cacheada).toMatchObject({
      usuario,
      funcionalidades,
      baseDatos: 'demo',
    });
    expect(cacheada?.token).toBeTruthy();
  });

  it('devuelve null y limpia el almacén si el token expiró', () => {
    authHelpers.setToken(tokenConExpiracion(Math.floor(Date.now() / 1000) - 60));
    authHelpers.setUser(usuario);
    authHelpers.setFuncionalidades(funcionalidades);
    authHelpers.setBaseDatos('demo');

    expect(authApiRepositorio.leerSesionCacheada()).toBeNull();
    expect(authHelpers.getUser()).toBeNull();
    expect(localStorage.getItem('auth_funcionalidades')).toBeNull();
  });

  it('devuelve null si faltan funcionalidades cacheadas', () => {
    authHelpers.setToken(tokenConExpiracion(Math.floor(Date.now() / 1000) + 60));
    authHelpers.setUser(usuario);

    expect(authApiRepositorio.leerSesionCacheada()).toBeNull();
  });

  it('clearAuth borra las funcionalidades cacheadas', () => {
    authHelpers.setToken('t');
    authHelpers.setUser(usuario);
    authHelpers.setFuncionalidades(funcionalidades);

    authHelpers.clearAuth();

    expect(localStorage.getItem('auth_funcionalidades')).toBeNull();
  });

  it('actualizarAlmacen persiste las funcionalidades', () => {
    authApiRepositorio.actualizarAlmacen({ ...sesion, token: 't' });

    expect(
      JSON.parse(localStorage.getItem('auth_funcionalidades') ?? 'null'),
    ).toEqual(funcionalidades);
  });

  it('el login persiste funcionalidades para restaurar la sesión tras recargar', async () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    server.use(
      http.post('*/auth/login', () =>
        HttpResponse.json({
          token: tokenConExpiracion(exp),
          usuario,
          funcionalidades,
          base_datos: 'demo',
        }),
      ),
    );

    await authApiRepositorio.iniciarSesion({
      alias: 'ana',
      contrasenia: 'x',
      baseDatos: 'demo',
    });

    expect(authApiRepositorio.leerSesionCacheada()).toMatchObject({
      usuario,
      funcionalidades,
      baseDatos: 'demo',
    });
  });
});
