import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { rrhhService } from '../../services/rrhh';
import {
  COLOR_ESTADO_NOMINA,
  ETIQUETA_ESTADO_NOMINA,
} from '../../types/rrhh';
import { AlertCircle, RefreshCw, Wallet, X } from 'lucide-react';
import {
  Button,
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

const fmtMoneda = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === ''
    ? '—'
    : new Intl.NumberFormat('es-CU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(v));

const fmtFecha = (v: string) => {
  const [anio, mes, dia] = v.split('-');
  return `${dia}/${mes}/${anio}`;
};

/**
 * Listado global de pagos. Si llega `?nomina_id=` (desde la tabla de
 * nómina) queda filtrado por esa nómina, con un chip para quitar el filtro.
 */
export function PagosPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const nominaId = Number(searchParams.get('nomina_id')) || null;

  const {
    data: pagos = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['rrhh', 'nomina', 'pagos', nominaId],
    queryFn: () =>
      rrhhService.listarPagos({ limit: 500, nomina_id: nominaId ?? undefined }),
  });

  const total = pagos.reduce((suma, p) => suma + Number(p.monto), 0);

  const quitarFiltroNomina = () => {
    const siguiente = new URLSearchParams(searchParams);
    siguiente.delete('nomina_id');
    setSearchParams(siguiente, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Wallet className="h-6 w-6 text-brand-600" />
            Pagos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Pagos registrados por nómina, con su estado y método resueltos
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {nominaId !== null && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600 ring-1 ring-brand-100">
            Filtrado por la nómina #{nominaId}
            <button
              type="button"
              title="Quitar el filtro de nómina"
              onClick={quitarFiltroNomina}
              className="rounded-full p-0.5 transition-colors hover:bg-brand-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
          <span className="text-xs text-slate-400">Pulsa la «×» para quitar el filtro.</span>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="rounded-lg bg-slate-50 px-4 py-2">
            <p className="text-lg font-bold tabular-nums text-slate-900">
              {fmtMoneda(total)}
            </p>
            <p className="text-xs text-slate-500">
              Total pagado · {pagos.length} pago{pagos.length === 1 ? '' : 's'}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingRows />
          ) : isError ? (
            <ErrorState
              mensaje={error instanceof Error ? error.message : undefined}
              onReintentar={refetch}
            />
          ) : pagos.length === 0 ? (
            <EmptyState
              mensaje={
                nominaId !== null
                  ? 'Esta nómina todavía no tiene pagos registrados.'
                  : 'Aún no hay pagos registrados.'
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Nómina</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagos.map((pago) => (
                  <TableRow key={pago.id}>
                    <TableCell className="whitespace-nowrap text-slate-600">
                      {fmtFecha(pago.fecha_pago)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">
                        {pago.nomina_descripcion ?? `Nómina #${pago.nomina_id}`}
                      </div>
                      <div className="text-xs text-slate-500">
                        Periodo {fmtFecha(pago.periodo)} ·{' '}
                        {fmtFecha(pago.inicio_periodo)} –{' '}
                        {fmtFecha(pago.fin_periodo)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${COLOR_ESTADO_NOMINA[pago.estado_nomina]}`}
                      >
                        {ETIQUETA_ESTADO_NOMINA[pago.estado_nomina]}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {pago.metodo_nombre ?? '—'}
                    </TableCell>
                    <TableCell className="text-slate-600">{pago.referencia ?? '—'}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {fmtMoneda(pago.monto)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Subcomponentes ──────────────────────────────────────────────────────────

function LoadingRows() {
  return (
    <div className="space-y-2 py-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-md bg-slate-100" />
      ))}
    </div>
  );
}

function EmptyState({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Wallet className="h-10 w-10 text-slate-300" />
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
      <p className="text-sm text-slate-600">{mensaje || 'No se pudieron cargar los pagos'}</p>
      <Button variant="outline" size="sm" onClick={onReintentar}>
        Reintentar
      </Button>
    </div>
  );
}
