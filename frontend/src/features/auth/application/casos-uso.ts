import type { AuthRepositorio } from "../domain/auth-repositorio";
import type { CredencialesSesion, Sesion } from "../domain/sesion";

/** Casos de uso de autenticación, sin React ni HTTP. */
export function crearCasosUsoAuth(repositorio: AuthRepositorio) {
  return {
    iniciarSesion(credenciales: CredencialesSesion): Promise<Sesion> {
      return repositorio.iniciarSesion(credenciales);
    },

    /**
     * Restaura la sesión si el token existe y no ha expirado. Si falla,
     * limpia el almacén y devuelve `null`; no lanza al arrancar la app.
     */
    async restaurarSesion(): Promise<Sesion | null> {
      const token = repositorio.tokenActual();
      if (!token || !repositorio.tokenVigente(token)) {
        repositorio.limpiarSesion();
        return null;
      }
      try {
        const sesion = await repositorio.obtenerSesion();
        repositorio.actualizarAlmacen(sesion);
        return sesion;
      } catch {
        repositorio.limpiarSesion();
        return null;
      }
    },

    cerrarSesion(): Promise<void> {
      return repositorio.cerrarSesion();
    },
  };
}

export type CasosUsoAuth = ReturnType<typeof crearCasosUsoAuth>;
