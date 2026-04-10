import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  authService,
  LoginResponse,
  FuncionalidadInfo,
  UsuarioInfo,
} from "../services/auth";
import { authHelpers } from "../lib/api";

interface AuthContextType {
  user: UsuarioInfo | null;
  funcionalidades: FuncionalidadInfo[];
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export { AuthContext };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UsuarioInfo | null>(null);
  const [funcionalidades, setFuncionalidades] = useState<FuncionalidadInfo[]>(
    [],
  );
  const [baseDatos, setBaseDatos] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshUser = async () => {
    try {
      const response = await authService.getCurrentUser();
      setUser(response.usuario);
      setFuncionalidades(response.funcionalidades);
      setBaseDatos(response.base_datos);
      authHelpers.setUser(response.usuario);
      authHelpers.setBaseDatos(response.base_datos);
    } catch (error) {
      console.error("Error refreshing user:", error);
      authHelpers.clearAuth();
      setUser(null);
      setFuncionalidades([]);
      setBaseDatos(null);
    }
  };

  const login = async (
    alias: string,
    contrasenia: string,
    baseDatos: string,
  ) => {
    const response = await authService.login({
      alias,
      contrasenia,
      base_datos: baseDatos,
    });
    setUser(response.usuario);
    setFuncionalidades(response.funcionalidades);
    setBaseDatos(response.base_datos);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setFuncionalidades([]);
    setBaseDatos(null);
  };

  const hasFuncionalidad = (nombre: string): boolean => {
    return funcionalidades.some((f) => f.nombre === nombre);
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = authHelpers.getToken();
      if (token) {
        try {
          await refreshUser();
        } catch {
          authHelpers.clearAuth();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        funcionalidades,
        baseDatos,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
        hasFuncionalidad,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
