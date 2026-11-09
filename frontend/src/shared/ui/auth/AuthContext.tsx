import { createContext, useContext } from 'react';
import type {
  ConexionBaseDatos,
  DatosRegistro,
  DependenciaOpcion,
  FuncionalidadSesion,
  GrupoOpcion,
  PerfilActualizacion,
  UsuarioSesion,
} from '@/shared/domain/sesion';

export interface AuthContextType {
  user: UsuarioSesion | null;
  funcionalidades: FuncionalidadSesion[];
  baseDatos: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    alias: string,
    contrasenia: string,
    baseDatos: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasFuncionalidad: (nombre: string) => boolean;
  listarConexiones: () => Promise<ConexionBaseDatos[]>;
  probarConexion: (
    baseDatos: string,
    host?: string,
    puerto?: number,
  ) => Promise<boolean>;
  listarDependencias: (baseDatos: string) => Promise<DependenciaOpcion[]>;
  listarGrupos: (baseDatos: string) => Promise<GrupoOpcion[]>;
  registrar: (datos: DatosRegistro) => Promise<void>;
  actualizarPerfil: (datos: PerfilActualizacion) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
