import { useEffect, useState, type ReactNode } from "react";
import { AuthContext } from "../../context/AuthContext";
import { casosUsoAuth } from "../container/auth";
import type {
  FuncionalidadSesion,
  Sesion,
  UsuarioSesion,
} from "../../features/auth/domain/sesion";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UsuarioSesion | null>(null);
  const [funcionalidades, setFuncionalidades] = useState<FuncionalidadSesion[]>(
    [],
  );
  const [baseDatos, setBaseDatos] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const aplicarSesion = (sesion: Sesion | null) => {
    setUser(sesion?.usuario ?? null);
    setFuncionalidades(sesion?.funcionalidades ?? []);
    setBaseDatos(sesion?.baseDatos ?? null);
  };

  const refreshUser = async () => {
    const sesion = await casosUsoAuth.restaurarSesion();
    aplicarSesion(sesion);
  };

  const login = async (
    alias: string,
    contrasenia: string,
    baseDatos: string,
  ) => {
    const sesion = await casosUsoAuth.iniciarSesion({
      alias,
      contrasenia,
      baseDatos,
    });
    aplicarSesion(sesion);
  };

  const logout = async () => {
    await casosUsoAuth.cerrarSesion();
    aplicarSesion(null);
  };

  const hasFuncionalidad = (nombre: string): boolean =>
    funcionalidades.some((f) => f.nombre === nombre);

  useEffect(() => {
    let activo = true;
    casosUsoAuth
      .restaurarSesion()
      .then((sesion) => {
        if (activo) aplicarSesion(sesion);
      })
      .finally(() => {
        if (activo) setIsLoading(false);
      });
    return () => {
      activo = false;
    };
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
