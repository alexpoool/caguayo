import { createContext, useContext } from "react";
import type {
  FuncionalidadSesion,
  UsuarioSesion,
} from "../features/auth/domain/sesion";

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
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
