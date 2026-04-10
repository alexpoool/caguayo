import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Input } from "../components/ui";
import { Modal } from "../components/ui/Modal";
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
import { apiClient } from "../lib/api";

interface ConexionInfo {
  id_conexion: number;
  nombre_database: string;
  host: string;
  puerto: number;
}

type ConexionStatus = "idle" | "testing" | "connected" | "error";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [alias, setAlias] = useState("");
  const [contrasenia, setContrasenia] = useState("");
  const [baseDatos, setBaseDatos] = useState("");
  const [conexiones, setConexiones] = useState<ConexionInfo[]>([]);
  const [loadingConexiones, setLoadingConexiones] = useState(true);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [conexionStatus, setConexionStatus] = useState<ConexionStatus>("idle");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Comentado temporalmente para permitir ir al login manually aunque estemos "logeados"
  // useEffect(() => {
  //   if (isAuthenticated) {
  //     navigate('/');
  //   }
  // }, [isAuthenticated, navigate]);

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

  const handleBaseDatosChange = (value: string) => {
    setBaseDatos(value);
    if (value) {
      probarConexion(value);
    } else {
      setConexionStatus("idle");
    }
  };

  const handleLogin = async () => {
    if (!baseDatos) {
      setErrorMessage("Seleccione una base de datos");
      setShowErrorModal(true);
      return;
    }

    if (conexionStatus === "error") {
      setErrorMessage(
        "No puede iniciar sesión, la base de datos no está disponible",
      );
      setShowErrorModal(true);
      return;
    }

    if (!alias.trim()) {
      setErrorMessage("Ingrese su alias");
      setShowErrorModal(true);
      return;
    }

    if (!contrasenia.trim()) {
      setErrorMessage("Ingrese su contraseña");
      setShowErrorModal(true);
      return;
    }

    setLoadingLogin(true);
    try {
      await login(alias, contrasenia, baseDatos);
      toast.success("Bienvenido");
      navigate("/");
    } catch (error: any) {
      setErrorMessage(error.message || "Credenciales inválidas");
      setShowErrorModal(true);
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
    return "border-slate-200 focus:ring-blue-500 focus:border-blue-500";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-50 rounded-full opacity-50 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-100/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            Caguayo
          </h1>
          <div className="mx-auto mt-4 w-12 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full" />
        </div>

        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-sm border-0 rounded-2xl shadow-2xl shadow-blue-900/10 ring-1 ring-blue-100 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700" />
          <div className="p-8">
            <h2 className="text-xl font-semibold text-blue-900 mb-6 text-center">
              Iniciar Sesión
            </h2>

            <div className="space-y-5">
              {/* Base de Datos - PRIMERO */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Base de Datos
                </label>
                <div className="relative">
                  <Database className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-400 z-10" />
                  <select
                    value={baseDatos}
                    onChange={(e) => handleBaseDatosChange(e.target.value)}
                    disabled={loadingConexiones}
                    className={`w-full pl-10 pr-10 py-3 border-2 rounded-xl focus:ring-2 focus:border-transparent bg-white transition-all duration-200 ${getSelectBorderClass()}`}
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
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Alias de Usuario
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-400" />
                  <Input
                    type="text"
                    placeholder="Ingrese su alias"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    className="pl-10 border-slate-200 focus:ring-blue-500 focus:border-blue-500 rounded-xl transition-all duration-200"
                    disabled={!baseDatos}
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Ingrese su contraseña"
                    value={contrasenia}
                    onChange={(e) => setContrasenia(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    className="pl-10 pr-10 border-slate-200 focus:ring-blue-500 focus:border-blue-500 rounded-xl transition-all duration-200"
                    disabled={!baseDatos}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    disabled={!baseDatos}
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
                className="w-full rounded-xl h-12 text-base font-semibold shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30"
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
        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} Caguayo. Todos los derechos reservados.
        </p>
      </div>

      <Modal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        className="max-w-sm"
      >
        <div className="p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error de Autenticación
          </h3>
          <p className="text-sm text-gray-500 mb-6">{errorMessage}</p>
          <Button onClick={() => setShowErrorModal(false)} className="w-full">
            Aceptar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
