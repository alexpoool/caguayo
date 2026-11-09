import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/shared/ui/auth";
import { PRODUCTO } from "@/config/branding";
import { Button, Input } from "@/shared/ui/components";
import {
  Loader2,
  Database,
  User,
  Lock,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";
import type { ConexionBaseDatos } from "@/shared/domain/sesion";

type ConexionStatus = "idle" | "testing" | "connected" | "error";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, listarConexiones, probarConexion } = useAuth();

  const [alias, setAlias] = useState("");
  const [contrasenia, setContrasenia] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [baseDatos, setBaseDatos] = useState("");
  const [conexiones, setConexiones] = useState<ConexionBaseDatos[]>([]);
  const [loadingConexiones, setLoadingConexiones] = useState(true);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [conexionStatus, setConexionStatus] = useState<ConexionStatus>("idle");

  // Comentado temporalmente para permitir ir al login manually aunque estemos "logeados"
  // useEffect(() => {
  //   if (isAuthenticated) {
  //     navigate('/');
  //   }
  // }, [isAuthenticated, navigate]);

  useEffect(() => {
    const fetchConexiones = async () => {
      try {
        const response = await listarConexiones();
        setConexiones(response);
        if (response.length === 0) {
          toast.error(
            "No se encontraron bases de datos. Verifique que el servidor backend esté funcionando.",
            { duration: 6000 }
          );
        }
      } catch (error) {
        console.error("Error fetching conexiones:", error);
        toast.error(
          "Error al conectar con el servidor. Verifique su conexión de red y que el backend esté activo.",
          { duration: 6000 }
        );
      } finally {
        setLoadingConexiones(false);
      }
    };
    fetchConexiones();
  }, [listarConexiones]);

  const handleProbarConexion = async (dbName: string) => {
    if (!dbName) {
      setConexionStatus("idle");
      return;
    }

    setConexionStatus("testing");
    try {
      const conn = conexiones.find((c) => c.nombre_database === dbName);
      const response = await probarConexion(
        dbName,
        conn?.host || "localhost",
        conn?.puerto || 5432,
      );
      if (response) {
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

  const handleBaseDatosChange = (value: string) => {
    setBaseDatos(value);
    if (value) {
      handleProbarConexion(value);
    } else {
      setConexionStatus("idle");
    }
  };

  const handleLogin = async () => {
    if (!baseDatos) {
      toast.error("Seleccione una base de datos");
      return;
    }

    if (conexionStatus === "error") {
      toast.error(
        "No puede iniciar sesión, la base de datos no está disponible",
      );
      return;
    }

    if (!alias.trim()) {
      toast.error("Ingrese su alias");
      return;
    }

    if (!contrasenia.trim()) {
      toast.error("Ingrese su contraseña");
      return;
    }

    setLoadingLogin(true);
    try {
      await login(alias, contrasenia, baseDatos);
      toast.success("Bienvenido");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Credenciales inválidas");
    } finally {
      setLoadingLogin(false);
    }
  };

  const getSelectBorderClass = () => {
    if (conexionStatus === "connected")
      return "border-green-500 focus:ring-green-500";
    if (conexionStatus === "error") return "border-red-500 focus:ring-red-500";
    if (conexionStatus === "testing")
      return "border-amber-500 focus:ring-amber-500";
    return "border-gray-200 focus:ring-brand-500 focus:border-brand-500";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-50 rounded-full opacity-50 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-100/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-sm border-0 rounded-2xl shadow-2xl shadow-brand-900/10 ring-1 ring-brand-100 overflow-hidden animate-login-card">
          <div className="h-1 bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700" />
          <div className="p-8">
            <h2 className="text-xl font-semibold text-brand-900 mb-6 text-center">
              Iniciar Sesión
            </h2>

            <div className="space-y-5">
              {/* Base de Datos - PRIMERO */}
              <div>
                <label
                  htmlFor="base-datos"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Base de Datos
                </label>
                <div className="relative">
                  <Database className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-brand-400 z-10" />
                  <select
                    id="base-datos"
                    value={baseDatos}
                    onChange={(e) => handleBaseDatosChange(e.target.value)}
                    disabled={loadingConexiones}
                    className={`w-full pl-10 pr-12 py-3 border-2 rounded-xl focus:ring-2 focus:border-transparent bg-white transition-all duration-200 ${getSelectBorderClass()}`}
                  >
                    <option key="empty-option" value="">
                      {loadingConexiones
                        ? "Cargando..."
                        : "Seleccione una base de datos"}
                    </option>
                    {conexiones.map((conn) => (
                      <option
                        key={`conn-${conn.id_conexion}`}
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
                  <p className="text-xs text-green-600 mt-1 font-medium">
                    ✓ Conectado
                  </p>
                )}
                {conexionStatus === "error" && (
                  <p className="text-xs text-red-600 mt-1 font-medium">
                    ✗ Error de conexión
                  </p>
                )}
              </div>

              {/* Alias */}
              <div>
                <label
                  htmlFor="alias"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Alias de Usuario
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-brand-400" />
                  <Input
                    id="alias"
                    type="text"
                    placeholder="Ingrese su alias"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    className="pl-10 border-gray-200 focus:ring-brand-500 focus:border-brand-500 rounded-xl transition-all duration-200"
                    disabled={!baseDatos}
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <label
                  htmlFor="contrasenia"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-brand-400" />
                  <Input
                    id="contrasenia"
                    type={showPassword ? "text" : "password"}
                    placeholder="Ingrese su contraseña"
                    value={contrasenia}
                    onChange={(e) => setContrasenia(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    className="pl-10 pr-10 border-gray-200 focus:ring-brand-500 focus:border-brand-500 rounded-xl transition-all duration-200"
                    disabled={!baseDatos}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-brand-600 focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Botón */}
              <Button
                onClick={handleLogin}
                disabled={loadingLogin || loadingConexiones || !baseDatos}
                className="w-full rounded-xl h-12 text-base font-semibold shadow-lg shadow-brand-600/25 hover:shadow-xl hover:shadow-brand-600/30"
              >
                {loadingLogin ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Iniciar Sesión"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          © {new Date().getFullYear()} {PRODUCTO.nombre}. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
