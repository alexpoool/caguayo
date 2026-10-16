import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { RadarCriterios } from '../../components/rrhh/RadarCriterios';
import { rrhhService } from '../../services/rrhh';
import {
  COLOR_ESTADO_EVALUACION,
  type RrhhMeta,
} from '../../types/rrhh';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  Star,
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

/** Valor en escala con formato español sin ceros sobrantes: 3.5 → «3,5», 7 → «7». */
const fmtValor = (v: number) => String(Number(v.toFixed(2))).replace('.', ',');

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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['rrhh', 'evaluaciones'] });
    queryClient.invalidateQueries({ queryKey: ['rrhh', 'objetivos'] });
  };

  const esBorrador = evaluacion?.estado === 'borrador';

  const finalizarMutation = useMutation({
    mutationFn: () => rrhhService.finalizarEvaluacion(evaluacionId),
    onSuccess: () => {
      toast.success('Evaluación finalizada (ya no se puede editar)');
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || 'No se pudo finalizar'),
  });

  /** Califica una meta (1–5): recalcula `resultado_objetivo` y
   * `promedio_objetivos`. Solo disponible en `borrador`. */
  const [valorando, setValorando] = useState<number | null>(null);
  const valorarMutation = useMutation({
    mutationFn: ({ metaId, valoracion }: { metaId: number; valoracion: number }) =>
      rrhhService.valorarMeta(evaluacionId, metaId, valoracion),
    onMutate: ({ metaId }) => setValorando(metaId),
    onSuccess: () => {
      toast.success('Meta puntuada');
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || 'No se pudo puntuar la meta'),
    onSettled: () => setValorando(null),
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

  // Escala de criterios resuelta en la evaluación (5, 10 o 100); `null` si
  // aún no se ha elegido — el radar y las etiquetas se adaptan a ella.
  const escala = evaluacion.escala_valor;

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
            title="Ver los objetivos y metas definidos para este empleado"
            onClick={() => navigate(`/rrhh/objetivos?empleado_id=${evaluacion.empleado_id}`)}
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
          Evaluación finalizada: los criterios y la puntuación de las metas
          quedan congelados (la definición de objetivos y metas sigue siendo
          editable desde Empleados).
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Radar de criterios */}
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-sm font-semibold text-slate-700">
              Criterios de desempeño{escala !== null ? ` (escala 1–${escala})` : ''}
            </h2>
            <p className="text-xs text-slate-500">
              Promedio de criterios: {fmtPromedio(evaluacion.promedio_criterios)}
              {evaluacion.promedio_criterios !== null && escala !== null
                ? ` / ${escala}`
                : ''}
            </p>
          </CardHeader>
          <CardContent>
            <RadarCriterios data={radarData} max={escala ?? 10} />
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
                <p className="text-xs text-slate-500">
                  Promedio criterios{escala !== null ? ` (1–${escala})` : ''}
                </p>
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
              <p className="text-xs font-semibold text-slate-500">
                Criterios puntuados
                {evaluacion.escala_nombre && (
                  <span className="ml-1 font-normal">
                    · escala {evaluacion.escala_nombre}
                    {escala !== null ? ` (1–${escala})` : ''}
                  </span>
                )}
              </p>
              <ul className="space-y-1">
                {evaluacion.criterios.map((c) => (
                  <li
                    key={c.criterio}
                    className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-1.5 text-sm"
                  >
                    <span className="text-slate-600">{c.etiqueta}</span>
                    <span className="flex items-center gap-2">
                      {/* Estrellas (0–10) + valor ya convertido a la escala. */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          c.estrellas !== null
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        <Star className="h-3 w-3" />
                        {c.estrellas !== null ? `${c.estrellas}/10` : 'Sin puntuar'}
                      </span>
                      <span
                        className={`font-semibold tabular-nums ${
                          c.valor > 0 ? 'text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        {c.estrellas !== null
                          ? `${fmtValor(c.valor)}${escala !== null ? ` / ${escala}` : ''}`
                          : '—'}
                      </span>
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

      {/* Objetivos y metas en alcance: aquí se califican */}
      <Card>
        <CardHeader className="pb-2">
          <h2 className="text-sm font-semibold text-slate-700">
            Objetivos y metas del periodo (escala 1–5)
          </h2>
          <p className="text-xs text-slate-500">
            Se puntúan aquí las metas mientras la evaluación esté en borrador;
            su media es el resultado de cada objetivo y el promedio de esos
            resultados es «Promedio objetivos (0–100)».
          </p>
        </CardHeader>
        <CardContent>
          {evaluacion.objetivos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Target className="h-8 w-8 text-slate-300" />
              <p className="max-w-md text-sm text-slate-500">
                Este empleado no tiene objetivos en alcance del periodo{' '}
                {evaluacion.inicio_periodo} → {evaluacion.fin_periodo}.
                Defínelos desde su ficha (su rango de fechas debe solapar el
                periodo, o quedarse sin fechas).
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(`/rrhh/objetivos?empleado_id=${evaluacion.empleado_id}`)
                }
              >
                <Target className="h-4 w-4" />
                Ver objetivos del empleado
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {evaluacion.objetivos.map((obj) => (
                <div
                  key={obj.id_objetivos}
                  className="overflow-hidden rounded-lg border border-slate-200"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {obj.nombre}
                      </p>
                      <p className="text-xs text-slate-500">
                        {obj.fecha_inicio || obj.fecha_fin
                          ? `${obj.fecha_inicio ?? '…'} → ${obj.fecha_fin ?? '…'}`
                          : 'Sin fechas · cuenta siempre'}
                      </p>
                    </div>
                    <p className="text-sm tabular-nums text-slate-700">
                      Resultado{' '}
                      <strong>
                        {obj.resultado_objetivo === null
                          ? '—'
                          : `${Number(obj.resultado_objetivo).toFixed(1)}/5`}
                      </strong>
                      {obj.aporte !== null &&
                        ` · aporte ${Number(obj.aporte).toFixed(0)}%`}
                    </p>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {obj.metas.map((meta) => (
                      <li
                        key={meta.id_metas}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm text-slate-700">{meta.nombre}</p>
                          <p className="text-xs text-slate-400">
                            Resultado: {meta.resultado_meta ?? '—'}
                          </p>
                        </div>
                        <SelectorValoracion
                          meta={meta}
                          esBorrador={esBorrador}
                          valorando={valorando === meta.id_metas}
                          onValorar={(v) =>
                            valorarMutation.mutate({ metaId: meta.id_metas, valoracion: v })
                          }
                        />
                      </li>
                    ))}
                    {obj.metas.length === 0 && (
                      <li className="px-3 py-2 text-xs text-slate-400">
                        Sin metas definidas.
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

// ── Subcomponentes ─────────────────────────────────────────────────────────

function SelectorValoracion({
  meta,
  esBorrador,
  valorando,
  onValorar,
}: {
  meta: RrhhMeta;
  esBorrador: boolean;
  valorando: boolean;
  onValorar: (valoracion: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400">Valoración</span>
      <select
        value={meta.valoracion ?? ''}
        disabled={!esBorrador || valorando}
        onChange={(e) => e.target.value && onValorar(Number(e.target.value))}
        title={
          esBorrador
            ? 'Puntuar esta meta (1–5)'
            : 'Solo se puntúa mientras la evaluación está en borrador'
        }
        className="rounded-md border border-slate-300 px-2 py-1 text-sm tabular-nums disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      >
        <option value="">—</option>
        {[1, 2, 3, 4, 5].map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
      {valorando && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
    </div>
  );
}
