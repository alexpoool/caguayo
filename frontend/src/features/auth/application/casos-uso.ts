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
     * Sesión instantánea desde el almacén local, sin red. Si no hay caché
     * válida, limpia el almacén y devuelve `null`; no lanza al arrancar la app.
     */
    async restaurarSesion(): Promise<Sesion | null> {
      const sesion = repositorio.leerSesionCacheada();
      if (!sesion) {
        repositorio.limpiarSesion();
        return null;
      }
      return sesion;
    },

    /**
     * Refresco en background contra el backend. En fallo (incluida red caída)
     * devuelve `null` sin limpiar la sesión: el cierre por 401 lo maneja api.ts.
     */
    async sincronizarSesion(): Promise<Sesion | null> {
      try {
        return await repositorio.sincronizarSesion();
      } catch {
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
