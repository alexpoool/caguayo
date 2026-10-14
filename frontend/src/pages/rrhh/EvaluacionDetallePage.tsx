import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { rrhhService } from '../../services/rrhh';
import {
  COLOR_ESTADO_EVALUACION,
} from '../../types/rrhh';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  Target,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
} from '../../components/ui';

const fmtPromedio = (v: string | null) =>
  v === null || v === undefined ? '—' : Number(v).toFixed(2);

export function EvaluacionDetallePage() {
  const { id } = useParams<{ id: string }>();
  const evaluacionId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: evaluacion,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['rrhh', 'evaluaciones', 'detalle', evaluacionId],
    queryFn: () => rrhhService.obtenerEvaluacion(evaluacionId),
    enabled: !Number.isNaN(evaluacionId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['rrhh', 'evaluaciones'] });

  const esBorrador = evaluacion?.estado === 'borrador';

  const finalizarMutation = useMutation({
    mutationFn: () => rrhhService.finalizarEvaluacion(evaluacionId),
    onSuccess: () => {
      toast.success('Evaluación finalizada (ya no se puede editar)');
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || 'No se pudo finalizar'),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-md bg-slate-100" />
        <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (isError || !evaluacion) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-sm text-slate-600">
          {(error as any)?.message || 'No se pudo cargar la evaluación'}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/rrhh/evaluaciones')}>
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  const radarData = evaluacion.criterios.map((c) => ({
    criterio: c.etiqueta,
    valor: c.valor,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            title="Volver al listado"
            onClick={() => navigate('/rrhh/evaluaciones')}
            className="mt-1 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <ClipboardCheck className="h-6 w-6 text-brand-600" />
              {evaluacion.empleado_nombre || 'Evaluación'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {evaluacion.empleado_codigo} · {evaluacion.tipo_evaluacion ?? '—'} ·
              Periodo {evaluacion.periodo} · {evaluacion.inicio_periodo} → {evaluacion.fin_periodo}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${COLOR_ESTADO_EVALUACION[evaluacion.estado]}`}
          >
            {evaluacion.estado === 'borrador' ? 'Borrador' : 'Finalizada'}
          </span>
          <Button
            variant="outline"
            size="sm"
            title="Ver los objetivos y metas de esta evaluación"
            onClick={() => navigate(`/rrhh/objetivos?evaluacion_id=${evaluacionId}`)}
          >
            <Target className="h-4 w-4" />
            Ver objetivos
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {esBorrador && (
            <Button
              size="sm"
              onClick={() => finalizarMutation.mutate()}
              disabled={finalizarMutation.isPending}
            >
              {finalizarMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Finalizar
            </Button>
          )}
        </div>
      </div>

      {!esBorrador && (
        <div className="rounded-md bg-slate-100 px-4 py-2 text-xs text-slate-600">
          Evaluación finalizada: los criterios, objetivos y metas quedan congelados.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Radar de criterios */}
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-sm font-semibold text-slate-700">
              Criterios de desempeño (escala 1–5)
            </h2>
            <p className="text-xs text-slate-500">
              Promedio de criterios: {fmtPromedio(evaluacion.promedio_criterios)}
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="criterio" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 5]}
                    tick={{ fontSize: 10 }}
                    tickCount={6}
                  />
                  <Radar
                    name="Puntuación"
                    dataKey="valor"
                    stroke="#0d9488"
                    fill="#0d9488"
                    fillOpacity={0.35}
                  />
                  <Tooltip />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Promedios + meta información */}
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-sm font-semibold text-slate-700">Resumen</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Promedio criterios (1–5)</p>
                <p className="text-2xl font-bold tabular-nums text-slate-900">
                  {fmtPromedio(evaluacion.promedio_criterios)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Promedio objetivos (0–100)</p>
                <p className="text-2xl font-bold tabular-nums text-slate-900">
                  {evaluacion.promedio_objetivos === null
                    ? '—'
                    : `${Number(evaluacion.promedio_objetivos).toFixed(1)}%`}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Objetivos / Metas</p>
                <p className="text-2xl font-bold tabular-nums text-slate-900">
                  {evaluacion.cantidad_objetivos} / {evaluacion.cantidad_metas}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Valoración media (1–5)</p>
                <p className="text-2xl font-bold tabular-nums text-slate-900">
                  {fmtPromedio(evaluacion.promedio_valoracion_1a5)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500">Criterios puntuados</p>
              <ul className="space-y-1">
                {evaluacion.criterios.map((c) => (
                  <li
                    key={c.criterio}
                    className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-1.5 text-sm"
                  >
                    <span className="text-slate-600">
                      {c.etiqueta}
                      {c.calificacion_nombre && (
                        <span className="text-xs text-slate-400"> · {c.calificacion_nombre}</span>
                      )}
                    </span>
                    <span
                      className={`font-semibold tabular-nums ${c.valor > 0 ? 'text-slate-900' : 'text-slate-400'}`}
                    >
                      {c.valor > 0 ? c.valor : 'Sin puntuar'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {evaluacion.comentarios && (
              <div className="rounded-md border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-500">Comentarios</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                  {evaluacion.comentarios}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
