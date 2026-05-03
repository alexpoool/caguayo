import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ReactDOM from 'react-dom';
import { 
  Search, 
  RefreshCw, 
  AlertCircle, 
  Info, 
  AlertTriangle, 
  Bug,
  Clock,
  User,
  Globe,
  Monitor,
  FileText,
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { 
  Button, 
  Input, 
  Card, 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '../components/ui';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [nivelFilter, setNivelFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // SSE for real-time logs
  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const baseReconnectDelay = 1000;

    const connectSSE = () => {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
      const eventSource = new EventSource(`${apiUrl}/logs/stream`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const newLog = JSON.parse(event.data);
          queryClient.setQueryData(['logs', nivelFilter, tipoFilter, searchTerm], (old: LogEntry[] | undefined) => {
            if (old) {
              return [newLog, ...old].slice(0, 100);
            }
            return [newLog];
          });
          queryClient.invalidateQueries({ queryKey: ['log-stats'] });
        } catch (e) {
          console.error('Error parsing SSE log:', e);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts);
          reconnectAttempts++;
          reconnectTimeout = setTimeout(connectSSE, delay);
        }
      };
    };

    connectSSE();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, [queryClient, nivelFilter, tipoFilter, searchTerm]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedLog(null);
    };
    if (selectedLog) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEsc);
        document.body.style.overflow = 'auto';
      };
    }
  }, [selectedLog]);

  const { data: stats } = useQuery<LogStats>({
    queryKey: ['log-stats'],
    queryFn: () => apiClient.get('/logs/stats'),
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const { data: logs = [], isLoading, refetch } = useQuery<LogEntry[]>({
    queryKey: ['logs', nivelFilter, tipoFilter, searchTerm],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (nivelFilter) params.nivel = nivelFilter;
      if (tipoFilter) params.tipo = tipoFilter;
      if (searchTerm) params.busqueda = searchTerm;
      params.limit = '100';
      return apiClient.get('/logs', params);
    },
    refetchInterval: autoRefresh ? 10000 : false,
  });

  const getNivelIcon = (nivel: string) => {
    switch (nivel) {
      case 'ERROR': return <AlertCircle className="h-4 w-4" />;
      case 'WARNING': return <AlertTriangle className="h-4 w-4" />;
      case 'INFO': return <Info className="h-4 w-4" />;
      default: return <Bug className="h-4 w-4" />;
    }
  };

  const getNivelColor = (nivel: string) => {
    switch (nivel) {
      case 'ERROR': return 'bg-red-100 text-red-800 border-red-200';
      case 'WARNING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'INFO': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getNivelBgColor = (nivel: string) => {
    switch (nivel) {
      case 'ERROR': return 'text-red-600';
      case 'WARNING': return 'text-yellow-600';
      case 'INFO': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getNivelDot = (nivel: string) => {
    const colorClass = {
      'ERROR': 'bg-red-500',
      'WARNING': 'bg-yellow-500',
      'INFO': 'bg-blue-500',
    }[nivel] || 'bg-gray-400';
    
    return <span className={`inline-block w-3 h-3 rounded-full ${colorClass} shadow-sm`} />;
  };

  const getStatusColor = (status: number | null) => {
    if (!status) return 'bg-gray-100 text-gray-600';
    if (status >= 500) return 'bg-red-100 text-red-700 border-red-200';
    if (status >= 400) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (status >= 300) return 'bg-purple-100 text-purple-700 border-purple-200';
    return 'bg-green-100 text-green-700 border-green-200';
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="text-gray-500">Cargando logs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header without icon */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Logs del Sistema</h1>
            <p className="text-gray-500 text-sm">
              {logs.length === (stats?.total || 0) 
                ? `Visor de logs y errores (${stats?.total || 0} total)`
                : `Mostrando ${logs.length} de ${stats?.total || 0} logs`
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            Auto-refresh
          </label>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''} mr-1`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Stats - simple inline format */}
      {stats && (
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span className="text-gray-600">Total:</span>
            <span className="font-semibold text-gray-900">{stats.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="text-gray-600">Errores:</span>
            <span className="font-semibold text-red-600">{stats.por_nivel?.ERROR || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            <span className="text-gray-600">Warnings:</span>
            <span className="font-semibold text-yellow-600">{stats.por_nivel?.WARNING || 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            <span className="text-gray-600">Requests:</span>
            <span className="font-semibold text-purple-600">{stats.por_nivel?.INFO || 0}</span>
          </div>
        </div>
      )}

      {/* Filters - Solo search bar */}
      <Card className="p-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por mensaje, nivel, tipo o usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden border-gray-200">
        <div className="overflow-x-auto">
          <Table className="border-collapse">
            <TableHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
              <TableRow>
                <TableHead className="w-[120px] border-r border-gray-200">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-600" />
                    Tiempo
                  </div>
                </TableHead>
                <TableHead className="w-[100px] border-r border-gray-200">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-purple-600" />
                    IP
                  </div>
                </TableHead>
                <TableHead className="w-[80px] border-r border-gray-200">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-purple-600" />
                    Estado
                  </div>
                </TableHead>
                <TableHead className="w-[100px] border-r border-gray-200">
                  <div className="flex items-center gap-2">
                    <Bug className="h-4 w-4 text-purple-600" />
                    Tipo
                  </div>
                </TableHead>
                <TableHead className="w-[250px] border-r border-gray-200">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-600" />
                    Mensaje
                  </div>
                </TableHead>
                <TableHead className="w-[150px] border-r border-gray-200">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-purple-600" />
                    Usuario
                  </div>
                </TableHead>
                <TableHead className="w-[180px]">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-purple-600" />
                    Endpoint
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                    {searchTerm || nivelFilter || tipoFilter 
                      ? 'No se encontraron logs que coincidan con los filtros' 
                      : 'No hay logs disponibles'
                    }
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow 
                    key={log.id} 
                    className="hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <TableCell className="border-r border-gray-200">
                      <div className="flex items-center gap-2 text-gray-600">
                        {getNivelDot(log.nivel)}
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-sm">{formatTimestamp(log.timestamp)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="border-r border-gray-200">
                      {log.tipo === 'FRONTEND' ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Monitor className="h-3 w-3 text-purple-500" />
                            <span className="text-xs text-gray-700 truncate max-w-[90px]" title={log.navegador || undefined}>
                              {log.navegador?.split(' ')[0] || '-'}
                            </span>
                          </div>
                          {log.ip && <div className="text-xs text-gray-400">{log.ip}</div>}
                        </div>
                      ) : log.ip ? (
                        <div className="space-y-1">
                          <span className="text-xs text-gray-600">{log.ip}</span>
                          {log.navegador && (
                            <div className="flex items-center gap-1">
                              <Monitor className="h-3 w-3 text-purple-400" />
                              <span className="text-xs text-gray-500 truncate max-w-[90px]" title={log.navegador || undefined}>
                                {log.navegador?.split(' ')[0]}...
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="border-r border-gray-200">
                      {log.status_code ? (
                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(log.status_code)}`}>
                          {log.status_code}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="border-r border-gray-200">
                      <span className={`text-sm font-medium ${getNivelBgColor(log.tipo)}`}>
                        {log.tipo}
                      </span>
                    </TableCell>
                    <TableCell className="border-r border-gray-200">
                      <div className="max-w-md truncate" title={log.mensaje}>
                        <span className="text-gray-900">{log.mensaje}</span>
                      </div>
                    </TableCell>
                    <TableCell className="border-r border-gray-200">
                      {log.usuario_nombre ? (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-purple-500" />
                          <span className="text-sm text-gray-700">{log.usuario_nombre}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.endpoint ? (
                        <div className="flex items-center gap-1">
                          <Globe className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-600">
                            {log.method} {log.endpoint}
                          </span>
                        </div>
                      ) : log.tipo === 'FRONTEND' && log.navegador ? (
                        <div className="flex items-center gap-1">
                          <Monitor className="h-3 w-3 text-purple-500" />
                          <span className="text-xs text-gray-500 truncate max-w-[160px]" title={log.navegador || undefined}>
                            {log.navegador}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Last errors */}
      {stats?.ultimos_errores && stats.ultimos_errores.length > 0 && (
        <Card className="p-4 border-l-4 border-l-red-500">
          <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Últimos errores (24h)
          </h3>
          <div className="space-y-2">
            {stats.ultimos_errores.map((error) => (
              <div key={error.id} className="bg-red-50 rounded p-3 text-sm border border-red-100">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-red-800">{error.mensaje}</span>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(error.timestamp)}
                  </span>
                </div>
                {error.detalle && (
                  <div className="text-xs text-red-600 mt-1 break-all">
                    {error.detalle}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal with React Portal */}
      {selectedLog && ReactDOM.createPortal(
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-bold text-gray-800">Detalles del Log #{selectedLog.id}</h2>
              <button 
                onClick={() => setSelectedLog(null)}
                className="text-2xl text-gray-500 hover:text-gray-700 leading-none"
              >
                &times;
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 uppercase">Timestamp</div>
                  <div className="text-sm font-medium">{formatTimestamp(selectedLog.timestamp)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 uppercase">Nivel</div>
                  <div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getNivelColor(selectedLog.nivel)}`}>
                      {getNivelDot(selectedLog.nivel)} {selectedLog.nivel}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 uppercase">Tipo</div>
                  <div className={`text-sm font-medium ${getNivelBgColor(selectedLog.tipo)}`}>{selectedLog.tipo}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 uppercase">Status Code</div>
                  <div>
                    {selectedLog.status_code ? (
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedLog.status_code)}`}>
                        {selectedLog.status_code}
                      </span>
                    ) : '-'}
                  </div>
                </div>
                <div className="col-span-2 space-y-1">
                  <div className="text-xs text-gray-500 uppercase">Mensaje</div>
                  <div className="text-sm bg-gray-50 p-2 rounded border">{selectedLog.mensaje}</div>
                </div>
                <div className="col-span-2 space-y-1">
                  <div className="text-xs text-gray-500 uppercase">Detalle</div>
                  <pre className="text-xs bg-gray-50 p-2 rounded border whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {selectedLog.detalle || '-'}
                  </pre>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 uppercase">IP</div>
                  <div className="text-sm">{selectedLog.ip || '-'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500 uppercase">Usuario</div>
                  <div className="text-sm">{selectedLog.usuario_nombre || '-'}</div>
                </div>
                <div className="col-span-2 space-y-1">
                  <div className="text-xs text-gray-500 uppercase">Endpoint</div>
                  <div className="text-sm">
                    {selectedLog.endpoint ? (
                      <span className="bg-blue-50 px-2 py-1 rounded border text-blue-700">
                        {selectedLog.method} {selectedLog.endpoint}
                      </span>
                    ) : '-'}
                  </div>
                </div>
                <div className="col-span-2 space-y-1">
                  <div className="text-xs text-gray-500 uppercase">Navegador</div>
                  <div className="text-xs bg-gray-50 p-2 rounded border break-all">{selectedLog.navegador || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}