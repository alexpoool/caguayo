import { describe, expect, it } from 'vitest';
import { authApiRepositorio } from './auth-api-repositorio';

function tokenConExpiracion(segundos: number): string {
  const payload = btoa(JSON.stringify({ exp: segundos })).replace(/=/g, '');
  return `x.${payload}.x`;
}

describe('authApiRepositorio', () => {
  it('acepta un token vigente', () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    expect(authApiRepositorio.tokenVigente(tokenConExpiracion(exp))).toBe(true);
  });

  it('rechaza un token expirado o malformado', () => {
    const exp = Math.floor(Date.now() / 1000) - 60;
    expect(authApiRepositorio.tokenVigente(tokenConExpiracion(exp))).toBe(false);
    expect(authApiRepositorio.tokenVigente('sin-puntos')).toBe(false);
  });
});
