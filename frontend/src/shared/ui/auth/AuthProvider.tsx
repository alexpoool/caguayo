import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UsuarioSesion | null>(null);
  const [funcionalidades, setFuncionalidades] = useState<FuncionalidadSesion[]>(
    [],
  );
  const [baseDatos, setBaseDatos] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Generación de sesión: se incrementa en login/logout/registrar para que
  // respuestas tardías del sync en background no revivan sesiones cerradas
  // ni mezclen usuarios (ver AuthProvider.test.tsx).
  const generacion = useRef(0);
  // Las query keys existentes no incluyen de forma uniforme usuario/base de
  // datos. Limpiar al cambiar de ámbito evita reutilizar datos de otra sesión.
  const ambitoSesion = useRef<string | null>(null);

  const aplicarSesion = (sesion: Sesion | null) => {
    const nuevoAmbito = sesion
      ? `${sesion.baseDatos}:${sesion.usuario.id_usuario}`
      : null;

    if (ambitoSesion.current !== nuevoAmbito) {
      // clear cancela consultas activas y elimina datos, errores y caché previa.
      queryClient.clear();
      ambitoSesion.current = nuevoAmbito;
    }

    setUser(sesion?.usuario ?? null);
    setFuncionalidades(sesion?.funcionalidades ?? []);
    setBaseDatos(sesion?.baseDatos ?? null);
  };

  const refreshUser = async () => {
    const miGeneracion = generacion.current;
    // Refresco real contra el backend (la caché no sirve aquí: el perfil
    // acaba de cambiar). Solo aplica si la sesión no cambió entretanto y
    // nunca cierra sesión por un fallo de refresco.
    try {
      const sesion = await casosUso.sincronizarSesion();
      if (sesion && generacion.current === miGeneracion) aplicarSesion(sesion);
    } catch {
      // El contrato de sincronizarSesion no lanza; por si acaso, ignorar.
    }
  };

  const login = async (
    alias: string,
    contrasenia: string,
    baseDatosSeleccionada: string,
  ) => {
    generacion.current += 1;
    const sesion = await casosUso.iniciarSesion({
      alias,
      contrasenia,
      baseDatos: baseDatosSeleccionada,
    });
    aplicarSesion(sesion);
  };

  const logout = async () => {
    generacion.current += 1;
    await casosUso.cerrarSesion();
    aplicarSesion(null);
  };

  const registrar = async (datos: DatosRegistro) => {
    generacion.current += 1;
    const sesion = await casosUso.registrar(datos);
    aplicarSesion(sesion);
  };

  const actualizarPerfil = (datos: PerfilActualizacion) =>
    casosUso.actualizarPerfil(datos);

  const hasFuncionalidad = (nombre: string): boolean =>
    funcionalidades.some((f) => f.nombre === nombre);

  useEffect(() => {
    let activo = true;
    const miGeneracion = generacion.current;
    // Arranque instantáneo desde el almacén local (sin red)…
    casosUso
      .restaurarSesion()
      .then((sesion) => {
        if (activo) aplicarSesion(sesion);
      })
      .finally(() => {
        if (activo) setIsLoading(false);
      });
    // …y refresco en background contra el backend, solo si la sesión no
    // cambió mientras tanto (logout o re-login invalidan la respuesta).
    casosUso.sincronizarSesion().then((sesion) => {
      if (activo && sesion && generacion.current === miGeneracion) {
        aplicarSesion(sesion);
      }
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
