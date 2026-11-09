import type { CredencialesSesion, Sesion } from "./sesion";

/** Puerto de autenticación. La UI solo ve sesiones del dominio. */
export interface AuthRepositorio {
  iniciarSesion(credenciales: CredencialesSesion): Promise<Sesion>;
  obtenerSesion(): Promise<Sesion>;
  cerrarSesion(): Promise<void>;
  actualizarAlmacen(sesion: Sesion): void;
  tokenActual(): string | null;
  tokenVigente(token: string): boolean;
  limpiarSesion(): void;
}
