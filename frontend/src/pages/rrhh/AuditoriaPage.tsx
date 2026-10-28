import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { rrhhService } from '../../services/rrhh';
import { type RrhhAuditoriaFila } from '../../types/rrhh';
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  Button,
  DateInput,
  Input,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui';

/** Timestamp ISO → fecha y hora legibles en local («16/10/2026, 09:15:33»). */
const fmtMomento = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-CU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

/** Insignia de color por nivel del log. */
const BADGE_NIVEL: Record<string, string> = {
  INFO: 'bg-green-100 text-green-700',
  WARNING: 'bg-amber-100 text-amber-700',
  ERROR: 'bg-red-100 text-red-700',
};

/** Insignia de color por tipo de evento. */
const BADGE_TIPO: Record<string, string> = {
  REQUEST: 'bg-sky-100 text-sky-700',
  SOLICITUD: 'bg-purple-100 text-purple-700',
  ACTION: 'bg-orange-100 text-orange-700',
  NOMINA: 'bg-emerald-100 text-emerald-700',
  FRONTEND: 'bg-slate-200 text-slate-600',
};

/** JSON legible del detalle; si no parsea, el texto crudo. */
const detalleLegible = (detalle: string | null): string | null => {
  if (!detalle) return null;
  try {
    return JSON.stringify(JSON.parse(detalle), null, 2);
  } catch {
    return detalle;
  }
};

/** Descarga un CSV simple (cabeceras + filas). */
const exportarCSV = (
  nombre: string,
  cabeceras: string[],
  filas: (string | number)[][],
) => {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [cabeceras, ...filas]
    .map((f) => f.map(esc).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombre;
  link.click();
  URL.revokeObjectURL(url);
};

// Degradado de la página (rojo), siguiendo el patrón de Monedas
const GRADIENTE =
  'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300';

export function AuditoriaPage() {
  const navigate = useNavigate();

  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [tipo, setTipo] = useState('');
  const [nivel, setNivel] = useState('');
  const [buscar, setBuscar] = useState('');
  /** Fila expandida para ver el detalle (null = ninguna). */
  const [expandida, setExpandida] = useState<number | null>(null);

  const { data: tipos = [] } = useQuery({
    queryKey: ['rrhh', 'auditoria', 'tipos'],
    queryFn: () => rrhhService.tiposAuditoria(),
  });

  const { data: niveles = [] } = useQuery({
    queryKey: ['rrhh', 'auditoria', 'niveles'],
    queryFn: () => rrhhService.nivelesAuditoria(),
  });

  const {
    data: filas = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['rrhh', 'auditoria', 'filas', desde, hasta, tipo, nivel, buscar],
    queryFn: () =>
      rrhhService.listarAuditoria({
        limit: 500,
        desde: desde || undefined,
        hasta: hasta || undefined,
        tipo: tipo || undefined,
        nivel: nivel || undefined,
        buscar: buscar || undefined,
      }),
    // El backend responde 400 si `desde > hasta`: no consultamos y avisamos.
    enabled: !(desde !== '' && hasta !== '' && desde > hasta),
  });

  // El backend responde 400 si `desde > hasta`: avisamos antes de consultar.
  const rangoInvertido = desde !== '' && hasta !== '' && desde > hasta;

  const hayFiltros =
    desde !== '' || hasta !== '' || tipo !== '' || nivel !== '' || buscar !== '';

  const limpiarFiltros = () => {
    setDesde('');
    setHasta('');
    setTipo('');
    setNivel('');
    setBuscar('');
  };

  const exportar = () => {
    exportarCSV(
      'auditoria_rrhh.csv',
      ['Fecha', 'Tipo', 'Nivel', 'Mensaje', 'Usuario', 'IP', 'Endpoint'],
      filas.map((f) => [
        f.timestamp,
        f.tipo,
        f.nivel,
        f.mensaje,
        f.usuario_nombre ?? '',
        f.ip ?? '',
        f.endpoint ?? '',
      ]),
    );
  };

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header con icono animado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-rose-500 to-rose-600 rounded shadow-lg animate-bounce-subtle">
            <ShieldAlert className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">Auditoría</h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              Registro de acciones del módulo · {filas.length} entrada
              {filas.length === 1 ? '' : 's'}
              {filas.length >= 500 ? ' (las 500 más recientes)' : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <Button
            onClick={() => refetch()}
            disabled={isLoading}
            title="Recargar"
            className={`gap-2 ${GRADIENTE}`}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            Actualizar
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/rrhh')}
            className="gap-2 hover:scale-105 transition-transform"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar en mensaje, endpoint o usuario..."
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                className="pl-9"
              />
            </div>
            <DateInput
              value={desde}
              onChange={(iso) => setDesde(iso)}
              title="Desde"
              wrapperClassName="w-44"
            />
            <DateInput
              value={hasta}
              onChange={(iso) => setHasta(iso)}
              title="Hasta"
              wrapperClassName="w-44"
            />
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Todos los tipos</option>
              {tipos.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={nivel}
              onChange={(e) => setNivel(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Todos los niveles</option>
              {niveles.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            {hayFiltros && (
              <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="gap-1">
                <X className="h-4 w-4" />
                Limpiar filtros
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={exportar}
              disabled={filas.length === 0}
              className="ml-auto"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rangoInvertido ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <AlertCircle className="h-10 w-10 text-amber-400" />
              <p className="text-sm text-slate-600">
                La fecha «desde» es posterior a la fecha «hasta». Corrige el
                rango para consultar el registro.
              </p>
            </div>
          ) : isLoading ? (
            <LoadingRows />
          ) : isError ? (
            <ErrorState
              mensaje={error instanceof Error ? error.message : undefined}
              onReintentar={refetch}
            />
          ) : filas.length === 0 ? (
            <EmptyState
              mensaje={
                hayFiltros
                  ? 'No hay registros que coincidan con los filtros.'
                  : 'Aún no hay registros de auditoría.'
              }
            />
          ) : (
            <Table>
              <TableHeader className="bg-gradient-to-r from-rose-50 to-rose-100">
                <TableRow>
                  <TableHead>Fecha y hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Mensaje</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f) => (
                  <FilaAuditoria
                    key={f.id}
                    fila={f}
                    expandida={expandida === f.id}
                    onAlternar={() =>
                      setExpandida(expandida === f.id ? null : f.id)
                    }
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Fila con detalle expandible ─────────────────────────────────────────────

function FilaAuditoria({
  fila,
  expandida,
  onAlternar,
}: {
  fila: RrhhAuditoriaFila;
  expandida: boolean;
  onAlternar: () => void;
}) {
  const detalle = detalleLegible(fila.detalle);

  return (
    <>
      <TableRow
        className={`hover:bg-gray-50 transition-colors ${
          expandida ? 'bg-rose-50/40' : ''
        }`}
      >
        <TableCell className="whitespace-nowrap text-xs text-slate-600 tabular-nums">
          {fmtMomento(fila.timestamp)}
        </TableCell>
        <TableCell>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
              BADGE_TIPO[fila.tipo] ?? 'bg-slate-100 text-slate-600'
            }`}
          >
            {fila.tipo}
          </span>
        </TableCell>
        <TableCell>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
              BADGE_NIVEL[fila.nivel] ?? 'bg-slate-100 text-slate-600'
            }`}
          >
            {fila.nivel}
          </span>
        </TableCell>
        <TableCell className="max-w-[360px]">
          <span
            className="block truncate text-slate-700"
            title={fila.mensaje}
          >
            {fila.mensaje}
          </span>
        </TableCell>
        <TableCell className="whitespace-nowrap text-slate-600">
          {fila.usuario_nombre ?? '—'}
        </TableCell>
        <TableCell className="whitespace-nowrap text-xs text-slate-500 tabular-nums">
          {fila.ip ?? '—'}
        </TableCell>
        <TableCell>
          <Button
            variant="ghost"
            size="icon"
            title={expandida ? 'Ocultar detalle' : 'Ver detalle'}
            onClick={onAlternar}
            className="text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform ${
                expandida ? 'rotate-90' : ''
              }`}
            />
          </Button>
        </TableCell>
      </TableRow>
      {expandida && (
        <TableRow className="bg-rose-50/40">
          <TableCell colSpan={7} className="align-top">
            <div className="space-y-3">
              {(fila.method || fila.endpoint || fila.status_code !== null) && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  {fila.method && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold">
                      {fila.method}
                    </span>
                  )}
                  {fila.endpoint && (
                    <code className="rounded bg-slate-100 px-1.5 py-0.5">
                      {fila.endpoint}
                    </code>
                  )}
                  {fila.status_code !== null && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold">
                      HTTP {fila.status_code}
                    </span>
                  )}
                </div>
              )}
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-500">
                  Navegador
                </p>
                <p className="text-xs text-slate-600 break-all">
                  {fila.navegador ?? '—'}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-500">
                  Detalle
                </p>
                {detalle ? (
                  <pre className="overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100 whitespace-pre-wrap break-all">
                    {detalle}
                  </pre>
                ) : (
                  <p className="text-xs text-slate-400">
                    Sin detalle adicional.
                  </p>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ── Subcomponentes compartidos ──────────────────────────────────────────────

function LoadingRows() {
  return (
    <div className="space-y-2 py-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-md bg-slate-100" />
      ))}
    </div>
  );
}

function EmptyState({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="p-4 bg-slate-50 rounded-full mb-2">
        <ShieldAlert className="h-10 w-10 text-slate-300" />
      </div>
      <p className="max-w-sm text-sm text-slate-500">{mensaje}</p>
    </div>
  );
}

function ErrorState({
  mensaje,
  onReintentar,
}: {
  mensaje?: string;
  onReintentar: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <AlertCircle className="h-10 w-10 text-red-400" />
      <p className="text-sm text-slate-600">
        {mensaje || 'No se pudo cargar el registro de auditoría'}
      </p>
      <Button variant="outline" size="sm" onClick={onReintentar}>
        <RefreshCw className="h-4 w-4" />
        Reintentar
      </Button>
    </div>
  );
}
