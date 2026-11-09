import { useEffect, useState, type ReactNode } from 'react';
import type { CasosUsoSesion } from '@/shared/application/auth';
import type {
  DatosRegistro,
  FuncionalidadSesion,
  PerfilActualizacion,
  Sesion,
  UsuarioSesion,
} from '@/shared/domain/sesion';
import { AuthContext } from './AuthContext';

export function AuthProvider({
  casosUso,
  children,
}: {
  casosUso: CasosUsoSesion;
  children: ReactNode;
}) {
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
    const sesion = await casosUso.restaurarSesion();
    aplicarSesion(sesion);
  };

  const login = async (
    alias: string,
    contrasenia: string,
    baseDatosSeleccionada: string,
  ) => {
    const sesion = await casosUso.iniciarSesion({
      alias,
      contrasenia,
      baseDatos: baseDatosSeleccionada,
    });
    aplicarSesion(sesion);
  };

  const logout = async () => {
    await casosUso.cerrarSesion();
    aplicarSesion(null);
  };

  const registrar = async (datos: DatosRegistro) => {
    const sesion = await casosUso.registrar(datos);
    aplicarSesion(sesion);
  };

  const actualizarPerfil = (datos: PerfilActualizacion) =>
    casosUso.actualizarPerfil(datos);

  const hasFuncionalidad = (nombre: string): boolean =>
    funcionalidades.some((f) => f.nombre === nombre);

  useEffect(() => {
    let activo = true;
    casosUso
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
  }, [casosUso]);

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
        listarConexiones: casosUso.listarConexiones,
        probarConexion: casosUso.probarConexion,
        listarDependencias: casosUso.listarDependencias,
        listarGrupos: casosUso.listarGrupos,
        registrar,
        actualizarPerfil,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
