import { authHelpers } from "../../../lib/api";
import {
  authService,
  type LoginResponse,
  type UsuarioInfo,
} from "../../../services/auth";
import type { AuthRepositorio } from "../domain/auth-repositorio";
import type { CredencialesSesion, Sesion } from "../domain/sesion";

function aSesion(response: LoginResponse): Sesion {
  return {
    token: response.token || authHelpers.getToken() || "",
    usuario: response.usuario,
    funcionalidades: response.funcionalidades,
    baseDatos: response.base_datos,
  };
}

/** Adaptador HTTP + almacenamiento local del puerto de autenticación. */
export const authApiRepositorio: AuthRepositorio = {
  async iniciarSesion(credenciales: CredencialesSesion) {
    const response = await authService.login({
      alias: credenciales.alias,
      contrasenia: credenciales.contrasenia,
      base_datos: credenciales.baseDatos,
    });
    return aSesion(response);
  },

  async obtenerSesion() {
    return aSesion(await authService.getCurrentUser());
  },

  cerrarSesion: () => authService.logout(),

  actualizarAlmacen(sesion) {
    authHelpers.setUser(sesion.usuario as UsuarioInfo);
    authHelpers.setBaseDatos(sesion.baseDatos);
  },

  tokenActual: () => authHelpers.getToken(),

  tokenVigente(token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1])) as { exp?: number };
      return !payload.exp || payload.exp * 1000 >= Date.now();
    } catch {
      return false;
    }
  },

  limpiarSesion: () => authHelpers.clearAuth(),
};
