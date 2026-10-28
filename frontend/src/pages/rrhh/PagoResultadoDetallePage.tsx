import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { rrhhService } from '../../services/rrhh';
import {
  AlertCircle,
  ArrowLeft,
  Calculator,
  ClipboardCheck,
  FileDown,
  Loader2,
  Target,
  Trash2,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  ConfirmModal,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui';

const fmtMoneda = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === ''
    ? '—'
    : new Intl.NumberFormat('es-CU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(v));

const fmtNumero = (v: number | string | null | undefined, max = 4) =>
  v === null || v === undefined || v === ''
    ? '—'
    : new Intl.NumberFormat('es-CU', {
        maximumFractionDigits: max,
      }).format(Number(v));

const fmtFecha = (v: string | null | undefined) => {
  if (!v) return '—';
  const [anio, mes, dia] = v.split('-');
  if (!anio || !mes || !dia) return v;
  return `${dia}/${mes}/${anio}`;
};

/** Detalle de un lote de pago por resultado, con una fila por empleado. */
export function PagoResultadoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const pagoId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [descargando, setDescargando] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['rrhh', 'pagos-resultado', pagoId],
    queryFn: () => rrhhService.getPagoResultado(pagoId),
    enabled: Number.isFinite(pagoId) && pagoId > 0,
  });

  const deleteMutation = useMutation({
    mutationFn: () => rrhhService.eliminarPagoResultado(pagoId),
    onSuccess: () => {
      toast.success('Pago por resultado eliminado');
      queryClient.invalidateQueries({ queryKey: ['rrhh', 'pagos-resultado'] });
      queryClient.invalidateQueries({
        queryKey: ['rrhh', 'catalogos', 'periodos-evaluacion'],
      });
      navigate('/rrhh/pagos-resultado');
    },
    onError: (err: any) =>
      toast.error(err?.message || 'No se pudo eliminar el pago'),
  });

  const descargarDocumento = async () => {
    if (descargando) return;
    setDescargando(true);
    try {
      const { blob, nombre } =
        await rrhhService.descargarDocumentoPagoResultado(pagoId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo descargar el documento'
      );
    } finally {
      setDescargando(false);
    }
  };

  const totales = (data?.empleados ?? []).reduce(
    (acc, fila) => ({
      devengado: acc.devengado + Number(fila.devengado),
      impuesto: acc.impuesto + Number(fila.impuesto),
      neto: acc.neto + Number(fila.neto_a_cobrar),
    }),
    { devengado: 0, impuesto: 0, neto: 0 }
  );

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/rrhh/pagos-resultado')}
            className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            title="Volver al historial"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="rounded bg-gradient-to-br from-sky-500 to-sky-600 p-2 shadow-lg">
            <Target className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Pago por resultado
              {data ? ` #${data.id_pago_x_resultado}` : ''}
            </h1>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
              <span>
                {data?.periodo_nombre || 'Detalle del reparto por empleado'}
              </span>
              {data?.nomina_id && (
                <>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => navigate(`/rrhh/nomina/${data.nomina_id}`)}
                    className="font-medium text-sky-700 hover:underline"
                    title="Ver nómina"
                  >
                    Nómina{' '}
                    {data.nomina_descripcion || `#${data.nomina_id}`}
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
        {data && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={descargarDocumento}
              disabled={descargando}
              className="gap-2"
            >
              {descargando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              Descargar documento
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(true)}
              className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-12 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando pago...
          </CardContent>
        </Card>
      ) : isError || !data ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-slate-600">
              {error instanceof Error
                ? error.message
                : 'No se pudo cargar el pago por resultado.'}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Monto total
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {fmtMoneda(data.monto)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Impuesto
                </p>
                <p className="mt-1 text-2xl font-bold text-red-600">
                  {fmtMoneda(totales.impuesto)}
                </p>
                <p className="text-xs text-slate-500">
                  {fmtNumero(data.porcentaje_impuesto, 2)} %
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Neto a cobrar
                </p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">
                  {fmtMoneda(totales.neto)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Promedio general
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {fmtNumero(data.promedio_general)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Suma de coeficientes
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {fmtNumero(data.suma_coeficientes_empleados)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Empleados pagados
                </p>
                <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900">
                  <Users className="h-5 w-5 text-sky-500" />
                  {data.empleados.length}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Datos del pago
                  </h2>
                  <p className="text-sm text-slate-500">
                    {data.descripcion || 'Sin descripción'}
                  </p>
                </div>
                <div className="rounded-md bg-slate-50 px-3 py-2 text-right text-xs text-slate-500">
                  <p>
                    Periodo: {fmtFecha(data.inicio_periodo)} –{' '}
                    {fmtFecha(data.fin_periodo)}
                  </p>
                  <p className="mt-0.5">
                    Impuesto: {fmtNumero(data.porcentaje_impuesto, 2)} %
                  </p>
                  <p className="mt-0.5">
                    Registrado:{' '}
                    {data.created_at
                      ? new Date(data.created_at).toLocaleString('es-CU')
                      : '—'}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead className="text-right">Puntuación</TableHead>
                      <TableHead className="text-right">Coeficiente</TableHead>
                      <TableHead className="text-right">Devengado</TableHead>
                      <TableHead className="text-right">Impuesto</TableHead>
                      <TableHead className="text-right">
                        Neto a cobrar
                      </TableHead>
                      <TableHead className="text-right">Evaluación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.empleados.map((fila) => (
                      <TableRow key={fila.id_pago_x_resultado_empleado}>
                        <TableCell>
                          <div className="font-medium text-slate-900">
                            {fila.empleado_nombre || 'Empleado'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {fila.empleado_codigo || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {fila.departamento_nombre || '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-slate-700">
                          {fmtNumero(fila.puntuacion)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-slate-700">
                          {fmtNumero(fila.coeficiente)}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-slate-900">
                          {fmtMoneda(fila.devengado)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-red-600">
                          {fmtMoneda(fila.impuesto)}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-emerald-700">
                          {fmtMoneda(fila.neto_a_cobrar)}
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            type="button"
                            title="Ver evaluación"
                            onClick={() =>
                              navigate(`/rrhh/evaluaciones/${fila.evaluacion_id}`)
                            }
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-sky-600 transition-colors hover:bg-sky-50"
                          >
                            <ClipboardCheck className="h-3.5 w-3.5" />
                            Ver
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
                <p className="flex items-start gap-1.5 text-xs text-slate-500">
                  <Calculator className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  coeficiente = puntuación / promedio general · devengado =
                  (coeficiente × monto) / suma de coeficientes · impuesto =
                  devengado × porcentaje / 100 · neto = devengado − impuesto.
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-right font-semibold">
                  <span className="text-slate-700">
                    Devengado: {fmtMoneda(totales.devengado)}
                  </span>
                  <span className="text-red-600">
                    Impuesto: {fmtMoneda(totales.impuesto)}
                  </span>
                  <span className="text-emerald-700">
                    Neto: {fmtMoneda(totales.neto)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <ConfirmModal
        isOpen={confirmDelete}
        title="Eliminar pago por resultado"
        message="¿Seguro que quieres eliminar este pago? Se borrarán sus filas por empleado y esta acción no se puede deshacer."
        type="danger"
        onConfirm={() => deleteMutation.mutate()}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
