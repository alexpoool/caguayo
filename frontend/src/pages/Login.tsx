import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PRODUCTO, useEmpresa } from "../config/branding";
import { Button, Input } from "../components/ui";
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
  const { login } = useAuth();
  const empresa = useEmpresa();

  const [alias, setAlias] = useState("");
  const [contrasenia, setContrasenia] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [baseDatos, setBaseDatos] = useState("");
  const [conexiones, setConexiones] = useState<ConexionInfo[]>([]);
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
        const response = await apiClient.get<ConexionInfo[]>("/conexiones");
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
    return "border-slate-200 focus:ring-blue-500 focus:border-blue-500";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-panel-900 to-panel-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Marca del cliente */}
        <p className="text-center text-xs text-slate-400 uppercase tracking-widest mb-6">
          {empresa.nombre}
        </p>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8">
            {/* Logo del producto */}
            <div className="text-center mb-6">
              <img
                src={PRODUCTO.logo}
                alt={PRODUCTO.nombre}
                className="mx-auto w-28 h-28 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <h2 className="mt-2 text-xl font-semibold text-slate-800">
                Iniciar sesión
              </h2>
            </div>

            <div className="space-y-4">
              {/* Base de Datos */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Base de Datos
                </label>
                <div className="relative">
                  <Database className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 z-10" />
                  <select
                    value={baseDatos}
                    onChange={(e) => handleBaseDatosChange(e.target.value)}
                    disabled={loadingConexiones}
                    className={`w-full pl-10 pr-12 py-2.5 text-sm border rounded-xl bg-white focus:ring-2 focus:border-transparent transition-colors ${getSelectBorderClass()}`}
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
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {conexionStatus === "testing" && (
                      <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
                    )}
                    {conexionStatus === "connected" && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {conexionStatus === "error" && (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
                {conexionStatus === "connected" && (
                  <p className="text-xs text-green-600 mt-1">
                    Conectado
                  </p>
                )}
                {conexionStatus === "error" && (
                  <p className="text-xs text-red-600 mt-1">
                    Error de conexión
                  </p>
                )}
              </div>

              {/* Alias */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Alias de usuario
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Su alias"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    className="pl-10 rounded-xl text-sm"
                    disabled={!baseDatos}
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Su contraseña"
                    value={contrasenia}
                    onChange={(e) => setContrasenia(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    className="pl-10 pr-10 rounded-xl text-sm"
                    disabled={!baseDatos}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
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
                className="w-full rounded-xl h-11 text-sm font-semibold bg-brand-600 hover:bg-brand-700 shadow-none"
              >
                {loadingLogin ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Iniciar sesión"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          © {new Date().getFullYear()} {PRODUCTO.nombre} · Software
        </p>
      </div>
    </div>
  );
}
