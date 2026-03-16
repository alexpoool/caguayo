import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, Input } from '../components/ui';
import { Box, Loader2, Database, User, Lock, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api';

interface ConexionInfo {
  id_conexion: number;
  nombre_database: string;
  host: string;
  puerto: number;
}

type ConexionStatus = 'idle' | 'testing' | 'connected' | 'error';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  
  const [alias, setAlias] = useState('');
  const [contrasenia, setContrasenia] = useState('');
  const [baseDatos, setBaseDatos] = useState('');
  const [conexiones, setConexiones] = useState<ConexionInfo[]>([]);
  const [loadingConexiones, setLoadingConexiones] = useState(true);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [conexionStatus, setConexionStatus] = useState<ConexionStatus>('idle');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const fetchConexiones = async () => {
      try {
        const response = await apiClient.get<ConexionInfo[]>('/conexiones');
        setConexiones(response);
      } catch (error) {
        console.error('Error fetching conexiones:', error);
      } finally {
        setLoadingConexiones(false);
      }
    };
    fetchConexiones();
  }, []);

  const probarConexion = async (dbName: string) => {
    if (!dbName) {
      setConexionStatus('idle');
      return;
    }

    setConexionStatus('testing');
    try {
      const conn = conexiones.find(c => c.nombre_database === dbName);
      const response = await apiClient.post<{ success: boolean }>('/conexiones/test', {
        nombre_database: dbName,
        host: conn?.host || 'localhost',
        puerto: conn?.puerto || 5432,
      });
      if (response.success) {
        setConexionStatus('connected');
      } else {
        setConexionStatus('error');
        toast.error('No se pudo conectar a la base de datos');
      }
    } catch (error) {
      setConexionStatus('error');
      console.error('Error probando conexión:', error);
    }
  };

  const handleBaseDatosChange = (value: string) => {
    setBaseDatos(value);
    if (value) {
      probarConexion(value);
    } else {
      setConexionStatus('idle');
    }
  };

  const handleLogin = async () => {
    if (!baseDatos) {
      toast.error('Seleccione una base de datos');
      return;
    }

    if (conexionStatus === 'error') {
      toast.error('No puede iniciar sesión, la base de datos no está disponible');
      return;
    }

    if (!alias.trim()) {
      toast.error('Ingrese su alias');
      return;
    }

    if (!contrasenia.trim()) {
      toast.error('Ingrese su contraseña');
      return;
    }

    setLoadingLogin(true);
    try {
      await login(alias, contrasenia, baseDatos);
      toast.success('Bienvenido');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Credenciales inválidas');
    } finally {
      setLoadingLogin(false);
    }
  };

  const getSelectBorderClass = () => {
    if (conexionStatus === 'connected') return 'border-green-500 focus:ring-green-500';
    if (conexionStatus === 'error') return 'border-red-500 focus:ring-red-500';
    if (conexionStatus === 'testing') return 'border-amber-500 focus:ring-amber-500';
    return 'border-gray-300 focus:ring-amber-500';
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg mb-4">
            <Box className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Caguayo</h1>
          <p className="text-gray-500 mt-2">Sistema de Inventario</p>
        </div>

        {/* Login Card */}
        <div className="border border-gray-200 rounded-2xl shadow-lg">
          <div className="p-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
              Iniciar Sesión
            </h2>

            <div className="space-y-5">
              {/* Base de Datos - PRIMERO */}
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
                    className={`w-full pl-10 pr-10 py-3 border-2 rounded-xl focus:ring-2 focus:border-transparent bg-white transition-colors ${getSelectBorderClass()}`}
                  >
                    <option value="">
                      {loadingConexiones ? 'Cargando...' : 'Seleccione una base de datos'}
                    </option>
                    {conexiones.map((conn) => (
                      <option key={conn.id_conexion} value={conn.nombre_database}>
                        {conn.nombre_database}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {conexionStatus === 'testing' && (
                      <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
                    )}
                    {conexionStatus === 'connected' && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {conexionStatus === 'error' && (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
                {conexionStatus === 'connected' && (
                  <p className="text-xs text-green-600 mt-1">✓ Conectado</p>
                )}
                {conexionStatus === 'error' && (
                  <p className="text-xs text-red-600 mt-1">✗ Error de conexión</p>
                )}
              </div>

              {/* Alias */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alias de Usuario
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Ingrese su alias"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    className="pl-10"
                    disabled={!baseDatos}
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="password"
                    placeholder="Ingrese su contraseña"
                    value={contrasenia}
                    onChange={(e) => setContrasenia(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    className="pl-10"
                    disabled={!baseDatos}
                  />
                </div>
              </div>

              {/* Botón */}
              <Button
                onClick={handleLogin}
                disabled={loadingLogin || loadingConexiones || !baseDatos}
                className="w-full"
              >
                {loadingLogin ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
