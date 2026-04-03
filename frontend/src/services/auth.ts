import { apiClient, authHelpers } from '../lib/api';

export interface DependenciaInfo {
  id_dependencia: number;
  nombre: string;
  base_datos: string;
  host?: string;
  puerto?: number;
  email?: string;
  telefono?: string;
  direccion?: string;
}

export interface GrupoInfo {
  id_grupo: number;
  nombre: string;
}

export interface UsuarioInfo {
  id_usuario: number;
  ci: string;
  nombre: string;
  primer_apellido: string;
  segundo_apellido?: string;
  alias: string;
  dependencia?: DependenciaInfo;
  grupo?: GrupoInfo;
}

export interface FuncionalidadInfo {
  id_funcionalidad: number;
  nombre: string;
}

export interface LoginResponse {
  token: string;
  usuario: UsuarioInfo;
  funcionalidades: FuncionalidadInfo[];
  base_datos: string;
}

export interface LoginRequest {
  alias: string;
  contrasenia: string;
  base_datos: string;
}

export interface PerfilUpdateRequest {
  alias?: string;
  contrasenia_actual?: string;
  contrasenia_nueva?: string;
}

export interface PerfilResponse {
  id_usuario: number;
  ci: string;
  nombre: string;
  primer_apellido: string;
  segundo_apellido?: string;
  alias: string;
  grupo: GrupoInfo;
  dependencia?: DependenciaInfo;
}

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', data);
    
    // Save auth data
    authHelpers.setToken(response.token);
    authHelpers.setUser(response.usuario);
    authHelpers.setBaseDatos(response.base_datos);
    
    return response;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout', {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      authHelpers.clearAuth();
    }
  },

  async getCurrentUser(): Promise<LoginResponse> {
    return apiClient.get<LoginResponse>('/auth/me');
  },

  async getFuncionalidades(): Promise<FuncionalidadInfo[]> {
    return apiClient.get<FuncionalidadInfo[]>('/auth/funcionalidades');
  },

  async buscarAlias(alias: string): Promise<DependenciaInfo[]> {
    return apiClient.get<DependenciaInfo[]>(`/auth/buscar-alias/${alias}`);
  },

  async updatePerfil(data: PerfilUpdateRequest): Promise<PerfilResponse> {
    return apiClient.put<PerfilResponse>('/auth/perfil', data);
  },

  isAuthenticated(): boolean {
    return authHelpers.isAuthenticated();
  },

  getUser(): UsuarioInfo | null {
    return authHelpers.getUser();
  },

  getToken(): string | null {
    return authHelpers.getToken();
  },

  getBaseDatos(): string | null {
    return authHelpers.getBaseDatos();
  },

  clearAuth(): void {
    authHelpers.clearAuth();
  }
};
