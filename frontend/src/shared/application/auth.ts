import type {
  ConexionBaseDatos,
  CredencialesSesion,
  DatosRegistro,
  DependenciaOpcion,
  GrupoOpcion,
  PerfilActualizacion,
  Sesion,
} from '../domain/sesion';

/**
 * Contrato de autenticación que consume la UI compartida.
 * La feature `auth` lo implementa; `shared` no importa la feature.
 */
export interface CasosUsoSesion {
  iniciarSesion(credenciales: CredencialesSesion): Promise<Sesion>;
  /** Sesión instantánea desde el almacén local; sin red. */
  restaurarSesion(): Promise<Sesion | null>;
  /** Refresco en background contra el backend; null si falla, sin cerrar sesión. */
  sincronizarSesion(): Promise<Sesion | null>;
  cerrarSesion(): Promise<void>;
  listarConexiones(): Promise<ConexionBaseDatos[]>;
  probarConexion(
    baseDatos: string,
    host?: string,
    puerto?: number,
  ): Promise<boolean>;
  listarDependencias(baseDatos: string): Promise<DependenciaOpcion[]>;
  listarGrupos(baseDatos: string): Promise<GrupoOpcion[]>;
  registrar(datos: DatosRegistro): Promise<Sesion>;
  actualizarPerfil(datos: PerfilActualizacion): Promise<void>;
}
