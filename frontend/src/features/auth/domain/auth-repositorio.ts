import type {
  ConexionBaseDatos,
  CredencialesSesion,
  DatosRegistro,
  DependenciaOpcion,
  GrupoOpcion,
  PerfilActualizacion,
  Sesion,
} from '@/shared/domain/sesion';

/** Puerto de autenticación. La UI solo ve sesiones del dominio. */
export interface AuthRepositorio {
  iniciarSesion(credenciales: CredencialesSesion): Promise<Sesion>;
  obtenerSesion(): Promise<Sesion>;
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
  actualizarAlmacen(sesion: Sesion): void;
  tokenActual(): string | null;
  tokenVigente(token: string): boolean;
  limpiarSesion(): void;
}
