import type { CasosUsoSesion } from '@/shared/application/auth';
import type {
  ConexionBaseDatos,
  CredencialesSesion,
  DatosRegistro,
  DependenciaOpcion,
  GrupoOpcion,
  PerfilActualizacion,
  Sesion,
} from '@/shared/domain/sesion';
import type { AuthRepositorio } from '../domain/auth-repositorio';

/** Casos de uso de autenticación, sin React ni HTTP. */
export function crearCasosUsoAuth(
  repositorio: AuthRepositorio,
): CasosUsoSesion {
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

    listarConexiones(): Promise<ConexionBaseDatos[]> {
      return repositorio.listarConexiones();
    },

    probarConexion(
      baseDatos: string,
      host?: string,
      puerto?: number,
    ): Promise<boolean> {
      return repositorio.probarConexion(baseDatos, host, puerto);
    },

    listarDependencias(baseDatos: string): Promise<DependenciaOpcion[]> {
      return repositorio.listarDependencias(baseDatos);
    },

    listarGrupos(baseDatos: string): Promise<GrupoOpcion[]> {
      return repositorio.listarGrupos(baseDatos);
    },

    registrar(datos: DatosRegistro): Promise<Sesion> {
      return repositorio.registrar(datos);
    },

    actualizarPerfil(datos: PerfilActualizacion): Promise<void> {
      return repositorio.actualizarPerfil(datos);
    },
  };
}

export type CasosUsoAuth = ReturnType<typeof crearCasosUsoAuth>;
