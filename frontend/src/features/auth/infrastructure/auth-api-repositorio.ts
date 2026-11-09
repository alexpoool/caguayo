import {
  apiClient,
  authHelpers,
} from '@/shared/infrastructure/http/api';
import type {
  ConexionBaseDatos,
  CredencialesSesion,
  DatosRegistro,
  DependenciaOpcion,
  FuncionalidadSesion,
  GrupoOpcion,
  PerfilActualizacion,
  Sesion,
  UsuarioSesion,
} from '@/shared/domain/sesion';
import type { AuthRepositorio } from '../domain/auth-repositorio';

interface RespuestaSesionApi {
  token: string;
  usuario: UsuarioSesion;
  funcionalidades: FuncionalidadSesion[];
  base_datos: string;
}

function aSesion(response: RespuestaSesionApi): Sesion {
  return {
    token: response.token || authHelpers.getToken() || '',
    usuario: response.usuario,
    funcionalidades: response.funcionalidades,
    baseDatos: response.base_datos,
  };
}

function guardarSesion(sesion: Sesion): void {
  authHelpers.setToken(sesion.token);
  authHelpers.setUser(sesion.usuario);
  authHelpers.setBaseDatos(sesion.baseDatos);
}

/** Adaptador HTTP + almacenamiento local del puerto de autenticación. */
export const authApiRepositorio: AuthRepositorio = {
  async iniciarSesion(credenciales: CredencialesSesion) {
    const response = await apiClient.post<RespuestaSesionApi>('/auth/login', {
      alias: credenciales.alias,
      contrasenia: credenciales.contrasenia,
      base_datos: credenciales.baseDatos,
    });
    const sesion = aSesion(response);
    guardarSesion(sesion);
    return sesion;
  },

  async obtenerSesion() {
    return aSesion(await apiClient.get<RespuestaSesionApi>('/auth/me'));
  },

  async cerrarSesion() {
    try {
      await apiClient.post('/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      authHelpers.clearAuth();
    }
  },

  listarConexiones: () =>
    apiClient.get<ConexionBaseDatos[]>('/conexiones'),

  async probarConexion(baseDatos, host = 'localhost', puerto = 5432) {
    const response = await apiClient.post<{ success: boolean }>(
      '/conexiones/test',
      {
        nombre_database: baseDatos,
        host,
        puerto,
      },
    );
    return response.success;
  },

  listarDependencias: (baseDatos) =>
    apiClient.get<DependenciaOpcion[]>(
      `/conexiones/${baseDatos}/dependencias`,
    ),

  listarGrupos: (baseDatos) =>
    apiClient.get<GrupoOpcion[]>(`/conexiones/${baseDatos}/grupos`),

  async registrar(datos: DatosRegistro) {
    const response = await apiClient.post<RespuestaSesionApi>(
      '/auth/register',
      datos,
    );
    const sesion = aSesion(response);
    guardarSesion(sesion);
    return sesion;
  },

  async actualizarPerfil(datos: PerfilActualizacion) {
    await apiClient.put('/auth/perfil', datos);
  },

  actualizarAlmacen(sesion) {
    authHelpers.setUser(sesion.usuario);
    authHelpers.setBaseDatos(sesion.baseDatos);
  },

  tokenActual: () => authHelpers.getToken(),

  tokenVigente(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
      return !payload.exp || payload.exp * 1000 >= Date.now();
    } catch {
      return false;
    }
  },

  limpiarSesion: () => authHelpers.clearAuth(),
};
