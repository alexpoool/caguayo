import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input } from "../components/ui";
import {
  Box,
  Loader2,
  Database,
  CheckCircle,
  XCircle,
  Building2,
  User,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";
import { apiClient, authHelpers } from "../lib/api";

interface ConexionInfo {
  id_conexion: number;
  nombre_database: string;
  host: string;
  puerto: number;
}

interface DependenciaInfo {
  id_dependencia: number;
  nombre: string;
}

type ConexionStatus = "idle" | "testing" | "connected" | "error";

export function RegisterPage() {
  const navigate = useNavigate();

  const [baseDatos, setBaseDatos] = useState("");
  const [idDependencia, setIdDependencia] = useState("");
  const [ci, setCi] = useState("");
  const [nombre, setNombre] = useState("");
  const [primerApellido, setPrimerApellido] = useState("");
  const [segundoApellido, setSegundoApellido] = useState("");
  const [cargo, setCargo] = useState("");
  const [alias, setAlias] = useState("");
  const [contrasenia, setContrasenia] = useState("");
  const [confirmarContrasenia, setConfirmarContrasenia] = useState("");

  const [conexiones, setConexiones] = useState<ConexionInfo[]>([]);
  const [dependencias, setDependencias] = useState<DependenciaInfo[]>([]);
  const [loadingConexiones, setLoadingConexiones] = useState(true);
  const [loadingDependencias, setLoadingDependencias] = useState(false);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [conexionStatus, setConexionStatus] = useState<ConexionStatus>("idle");

  useEffect(() => {
    const fetchConexiones = async () => {
      try {
        const response = await apiClient.get<ConexionInfo[]>("/conexiones");
        setConexiones(response);
      } catch (error) {
        console.error("Error fetching conexiones:", error);
      } finally {
        setLoadingConexiones(false);
      }
    };
    fetchConexiones();
  }, []);

  const probarConexion = async (dbName: string) => {
    if (!dbName) {
      setConexionStatus("idle");
      return;
    }

    setConexionStatus("testing");
    try {
      const conn = conexiones.find((c) => c.nombre_database === dbName);
      const response = await apiClient.post<{ success: boolean }>(
        "/conexiones/test",
        {
          nombre_database: dbName,
          host: conn?.host || "localhost",
          puerto: conn?.puerto || 5432,
        },
      );
      if (response.success) {
        setConexionStatus("connected");
      } else {
        setConexionStatus("error");
        toast.error("No se pudo conectar a la base de datos");
      }
    } catch (error) {
      setConexionStatus("error");
      console.error("Error probando conexión:", error);
    }
  };

  const fetchDependencias = async (dbName: string) => {
    setLoadingDependencias(true);
    setIdDependencia("");
    try {
      const response = await apiClient.get<DependenciaInfo[]>(
        `/conexiones/${dbName}/dependencias`,
      );
      setDependencias(response);
    } catch (error) {
      console.error("Error fetching dependencias:", error);
      setDependencias([]);
    } finally {
      setLoadingDependencias(false);
    }
  };

  const handleBaseDatosChange = (value: string) => {
    setBaseDatos(value);
    setDependencias([]);
    setIdDependencia("");
    if (value) {
      probarConexion(value);
      fetchDependencias(value);
    } else {
      setConexionStatus("idle");
    }
  };

  const handleRegister = async () => {
    if (!baseDatos) {
      toast.error("Seleccione una base de datos");
      return;
    }

    if (conexionStatus === "error") {
      toast.error("La base de datos no está disponible");
      return;
    }

    if (!idDependencia) {
      toast.error("Seleccione una dependencia");
      return;
    }

    if (!ci.trim() || !nombre.trim() || !primerApellido.trim() || !cargo.trim()) {
      toast.error("Complete los datos personales");
      return;
    }

    if (!alias.trim()) {
      toast.error("Ingrese un alias de usuario");
      return;
    }

    if (!contrasenia.trim()) {
      toast.error("Ingrese una contraseña");
      return;
    }

    if (contrasenia !== confirmarContrasenia) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (contrasenia.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoadingRegister(true);
    try {
      const response = await apiClient.post<{
        token: string;
        usuario: any;
        funcionalidades: any[];
        base_datos: string;
      }>("/auth/register", {
        ci: ci.trim(),
        nombre: nombre.trim(),
        primer_apellido: primerApellido.trim(),
        segundo_apellido: segundoApellido.trim() || null,
        cargo: cargo.trim(),
        alias: alias.trim(),
        contrasenia,
        base_datos: baseDatos,
        id_dependencia: parseInt(idDependencia),
      });

      authHelpers.setToken(response.token);
      authHelpers.setUser(response.usuario);
      authHelpers.setBaseDatos(response.base_datos);

      toast.success("Registro exitoso");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Error al registrar usuario");
    } finally {
      setLoadingRegister(false);
    }
  };

  const getSelectBorderClass = () => {
    if (conexionStatus === "connected")
      return "border-green-500 focus:ring-green-500";
    if (conexionStatus === "error") return "border-red-500 focus:ring-red-500";
    if (conexionStatus === "testing")
      return "border-amber-500 focus:ring-amber-500";
    return "border-gray-300 focus:ring-amber-500";
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg mb-4">
            <Box className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Caguayo</h1>
          <p className="text-gray-500 mt-2">Sistema de Inventario</p>
        </div>

        {/* Register Card */}
        <div className="border border-gray-200 rounded-2xl shadow-lg">
          <div className="p-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
              Crear Cuenta
            </h2>

            <div className="space-y-5">
              {/* Fila 1: Base de Datos + Dependencia */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base de Datos
                  </label>
                  <div className="relative">
                    <Database className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                    <select
                      value={baseDatos}
                      onChange={(e) => handleBaseDatosChange(e.target.value)}
                      disabled={loadingConexiones}
                      className={`w-full pl-10 pr-10 py-3 border-2 rounded-md focus:ring-2 focus:border-transparent bg-white transition-colors ${getSelectBorderClass()}`}
                    >
                      <option value="">
                        {loadingConexiones
                          ? "Cargando..."
                          : "Seleccione una base de datos"}
                      </option>
                      {conexiones.map((conn) => (
                        <option
                          key={conn.id_conexion}
                          value={conn.nombre_database}
                        >
                          {conn.nombre_database}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {conexionStatus === "testing" && (
                        <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
                      )}
                      {conexionStatus === "connected" && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {conexionStatus === "error" && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </div>
                  {conexionStatus === "connected" && (
                    <p className="text-xs text-green-600 mt-1">✓ Conectado</p>
                  )}
                  {conexionStatus === "error" && (
                    <p className="text-xs text-red-600 mt-1">
                      ✗ Error de conexión
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dependencia
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                    <select
                      value={idDependencia}
                      onChange={(e) => setIdDependencia(e.target.value)}
                      disabled={
                        !baseDatos ||
                        conexionStatus !== "connected" ||
                        loadingDependencias
                      }
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white transition-colors disabled:bg-slate-50"
                    >
                      <option value="">
                        {loadingDependencias
                          ? "Cargando..."
                          : !baseDatos
                            ? "Primero una base de datos "
                            : "Seleccione dependencia"}
                      </option>
                      {dependencias.map((dep) => (
                        <option
                          key={dep.id_dependencia}
                          value={dep.id_dependencia}
                        >
                          {dep.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Fila 2: CI + Nombre + Apellido 1 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Carnet de Identidad
                  </label>
                  <Input
                    type="text"
                    placeholder="00000000000"
                    value={ci}
                    onChange={(e) => setCi(e.target.value)}
                    disabled={!idDependencia}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre
                  </label>
                  <Input
                    type="text"
                    placeholder="Nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    disabled={!idDependencia}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primer Apellido
                  </label>
                  <Input
                    type="text"
                    placeholder="Primer apellido"
                    value={primerApellido}
                    onChange={(e) => setPrimerApellido(e.target.value)}
                    disabled={!idDependencia}
                  />
                </div>
              </div>

              {/* Fila 2b: Segundo Apellido + Cargo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Segundo Apellido
                  </label>
                  <Input
                    type="text"
                    placeholder="Segundo apellido"
                    value={segundoApellido}
                    onChange={(e) => setSegundoApellido(e.target.value)}
                    disabled={!idDependencia}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cargo
                  </label>
                  <Input
                    type="text"
                    placeholder="Cargo del usuario"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    disabled={!idDependencia}
                  />
                </div>
              </div>

              {/* Fila 3: Alias + Contraseña + Confirmar */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alias
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Nombre de usuario"
                      value={alias}
                      onChange={(e) => setAlias(e.target.value)}
                      className="pl-10"
                      disabled={!idDependencia}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="password"
                      placeholder="Contraseña"
                      value={contrasenia}
                      onChange={(e) => setContrasenia(e.target.value)}
                      className="pl-10"
                      disabled={!idDependencia}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type="password"
                      placeholder="Confirmar contraseña"
                      value={confirmarContrasenia}
                      onChange={(e) => setConfirmarContrasenia(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                      className="pl-10"
                      disabled={!idDependencia}
                    />
                  </div>
                </div>
              </div>

              {/* Botón */}
              <Button
                onClick={handleRegister}
                disabled={
                  loadingRegister ||
                  loadingConexiones ||
                  !baseDatos ||
                  !idDependencia
                }
                className="w-full"
              >
                {loadingRegister ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Registrarse"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
