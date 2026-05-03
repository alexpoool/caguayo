import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  RefreshCw, 
  AlertCircle, 
  Info, 
  AlertTriangle, 
  Bug,
  Filter,
  Clock,
  User,
  Globe,
  Terminal
} from 'lucide-react';
import { apiClient } from '../lib/api';

interface LogEntry {
  id: number;
  timestamp: string;
  nivel: string;
  tipo: string;
  mensaje: string;
  detalle: string | null;
  ip: string | null;
  usuario_id: number | null;
  endpoint: string | null;
  method: string | null;
  status_code: number | null;
  usuario_nombre: string | null;
  navegador: string | null;
}

interface LogStats {
  total: number;
  por_nivel: Record<string, number>;
  por_tipo: Record<string, number>;
  ultimos_errores: LogEntry[];
}

export function LoggerPage() {
  const queryClient = useQueryClient();
  const [filtros, setFiltros] = useState({
    nivel: '',
    tipo: '',
    busqueda: '',
    limit: 50,
  });
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: stats } = useQuery<LogStats>({
    queryKey: ['log-stats'],
    queryFn: () => apiClient.get('/logs/stats'),
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const { data: logs = [], isLoading, refetch } = useQuery<LogEntry[]>({
    queryKey: ['logs', filtros],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (filtros.nivel) params.nivel = filtros.nivel;
      if (filtros.tipo) params.tipo = filtros.tipo;
      if (filtros.busqueda) params.busqueda = filtros.busqueda;
      params.limit = String(filtros.limit);
      return apiClient.get('/logs', params);
    },
    refetchInterval: autoRefresh ? 10000 : false,
  });

  const getNivelIcon = (nivel: string) => {
    switch (nivel) {
      case 'ERROR': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'WARNING': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'INFO': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Bug className="h-4 w-4 text-gray-400" />;
    }
  };

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'ERROR': return 'bg-red-100 text-red-800';
      case 'WARNING': return 'bg-yellow-100 text-yellow-800';
      case 'INFO': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleString('es-CU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg">
            <Terminal className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Logs del Sistema</h1>
            <p className="text-sm text-gray-500">Visor de logs y errores</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh
          </label>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total (7 días)</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Errores</p>
            <p className="text-2xl font-bold text-red-600">{stats.por_nivel?.ERROR || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Warnings</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.por_nivel?.WARNING || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Requests</p>
            <p className="text-2xl font-bold text-blue-600">{stats.por_nivel?.INFO || 0}</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium">Filtros:</span>
          </div>
          <select
            value={filtros.nivel}
            onChange={(e) => setFiltros({ ...filtros, nivel: e.target.value })}
            className="border rounded-md px-3 py-1.5 text-sm"
          >
            <option value="">Todos los niveles</option>
            <option value="ERROR">Error</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>
          <select
            value={filtros.tipo}
            onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
            className="border rounded-md px-3 py-1.5 text-sm"
          >
            <option value="">Todos los tipos</option>
            <option value="REQUEST">Request</option>
            <option value="ERROR">Error</option>
            <option value="BUSINESS">Business</option>
            <option value="ACTION">Action</option>
            <option value="FRONTEND">Frontend</option>
          </select>
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Buscar en mensajes..."
              value={filtros.busqueda}
              onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
              className="w-full border rounded-md px-3 py-1.5 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Tabla de Logs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Tiempo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Nivel</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Mensaje</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Usuario</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Endpoint</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Cargando...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No hay logs disponibles
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${getNivelColor(log.nivel)}`}>
                        {getNivelIcon(log.nivel)}
                        {log.nivel}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {log.tipo}
                    </td>
                    <td className="px-4 py-2">
                      <div className="max-w-xs truncate" title={log.mensaje}>
                        {log.mensaje}
                      </div>
                      {log.detalle && log.detalle.length > 100 && (
                        <div className="text-xs text-gray-400 mt-0.5 truncate">
                          {log.detalle.substring(0, 100)}...
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {log.usuario_nombre ? (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-gray-400" />
                          {log.usuario_nombre}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {log.endpoint ? (
                        <div className="flex items-center gap-1">
                          <Globe className="h-3 w-3 text-gray-400" />
                          <span className="text-xs">{log.method} {log.endpoint}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Últimos errores */}
      {stats?.ultimos_errores && stats.ultimos_errores.length > 0 && (
        <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
          <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Últimos errores (24h)
          </h3>
          <div className="space-y-2">
            {stats.ultimos_errores.map((error) => (
              <div key={error.id} className="bg-white rounded p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-red-700">{error.mensaje}</span>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(error.timestamp)}
                  </span>
                </div>
                {error.detalle && (
                  <div className="text-xs text-gray-500 mt-1 break-all">
                    {error.detalle}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}