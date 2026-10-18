import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { rrhhService } from '../../services/rrhh';
import {
  COLOR_ESTADO_EVALUACION,
  type RrhhEvaluacionObjetivo,
  type RrhhEvaluacionObjetivoUpdate,
  type RrhhEvaluacionUpdate,
} from '../../types/rrhh';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ClipboardCheck,
  Info,
  Loader2,
  MessageSquare,
  Pencil,
  Save,
  Star,
  Target,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Label,
  Modal,
} from '../../components/ui';

/** Promedio ponderado 0–5 con dos decimales; «—» si todavía no hay puntuación. */
const fmtPromedio5 = (v: string | null) =>
  v === null || v === undefined ? '—' : Number(v).toFixed(2);

/** Peso en español sin ceros sobrantes: 2.00 → «2», 2.50 → «2,5». */
const fmtPeso = (v: string | number) =>
  String(Number(Number(v).toFixed(2))).replace('.', ',');

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

  // Feedback sutil de «guardado» por fila: check breve junto a la fila.
  const [filaGuardada, setFilaGuardada] = useState<number | null>(null);
  const guardadoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (guardadoTimer.current) clearTimeout(guardadoTimer.current);
    },
    []
  );
  const marcarGuardada = (filaId: number) => {
    setFilaGuardada(filaId);
    if (guardadoTimer.current) clearTimeout(guardadoTimer.current);
    guardadoTimer.current = setTimeout(() => setFilaGuardada(null), 1800);
  };

  /** Catálogo de tipos para el modal de edición de la cabecera. */
  const { data: tiposEvaluacion = [] } = useQuery({
    queryKey: ['rrhh', 'catalogos', 'tipos-evaluacion', 'activos'],
    queryFn: () => rrhhService.listarTiposEvaluacion({ limit: 500, activo: true }),
  });

  // ── Edición de periodo, tipo y fechas (modal) ────────────────────────────
  const [editarOpen, setEditarOpen] = useState(false);
  const [cabecera, setCabecera] = useState({
    periodo: '',
    tipo_evaluacion_id: 0,
    inicio_periodo: '',
    fin_periodo: '',
  });
  const [cabeceraErrores, setCabeceraErrores] = useState<Record<string, string>>(
    {}
  );

  const abrirEditar = () => {
    if (!evaluacion) return;
    setCabecera({
      periodo: evaluacion.periodo,
      tipo_evaluacion_id: evaluacion.tipo_evaluacion_id,
      inicio_periodo: evaluacion.inicio_periodo,
      fin_periodo: evaluacion.fin_periodo,
    });
    setCabeceraErrores({});
    setEditarOpen(true);
  };

  const cabeceraDatosMutation = useMutation({
    mutationFn: (data: RrhhEvaluacionUpdate) =>
      rrhhService.editarEvaluacion(evaluacionId, data),
    onSuccess: () => {
      toast.success('Evaluación actualizada');
      invalidate();
      setEditarOpen(false);
    },
    onError: (err: any) => toast.error(err?.message || 'No se pudo guardar'),
  });

  const guardarCabecera = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!cabecera.periodo.trim()) errs.periodo = 'El periodo es obligatorio';
    if (!cabecera.tipo_evaluacion_id)
      errs.tipo_evaluacion_id = 'Selecciona un tipo';
    if (
      cabecera.inicio_periodo &&
      cabecera.fin_periodo &&
      cabecera.fin_periodo < cabecera.inicio_periodo
    )
      errs.fin_periodo = 'El fin no puede ser anterior al inicio';
    setCabeceraErrores(errs);
    if (Object.keys(errs).length) return;
    cabeceraDatosMutation.mutate({
      periodo: cabecera.periodo.trim(),
      tipo_evaluacion_id: cabecera.tipo_evaluacion_id,
      inicio_periodo: cabecera.inicio_periodo,
      fin_periodo: cabecera.fin_periodo,
    });
  };

  /** Añade objetivos a la selección (cualquier estado). */
  const seleccionarMutation = useMutation({
    mutationFn: (objetivoIds: number[]) =>
      rrhhService.seleccionarObjetivos(evaluacionId, objetivoIds),
    onSuccess: () => {
      toast.success('Objetivo añadido a la evaluación');
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || 'No se pudo seleccionar el objetivo'),
  });

  /** Quita un objetivo de la selección (cualquier estado). */
  const quitarMutation = useMutation({
    mutationFn: (filaId: number) =>
      rrhhService.quitarObjetivoEvaluacion(evaluacionId, filaId),
    onSuccess: () => {
      toast.success('Objetivo quitado de la evaluación');
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || 'No se pudo quitar el objetivo'),
  });

  /** Puntúa/edita una fila (estrellas, valoración, recomendaciones, peso). */
  const puntuarMutation = useMutation({
    mutationFn: ({
      filaId,
      data,
    }: {
      filaId: number;
      data: RrhhEvaluacionObjetivoUpdate;
    }) => rrhhService.puntuarObjetivo(evaluacionId, filaId, data),
    onSuccess: (fila) => {
      invalidate();
      if (fila.fila_id !== null) marcarGuardada(fila.fila_id);
    },
    onError: (err: any) => toast.error(err?.message || 'No se pudo guardar la fila'),
  });

  /** Edición de cabecera (comentarios y recomendaciones). */
  const cabeceraMutation = useMutation({
    mutationFn: (data: { comentarios: string | null; recomendaciones: string | null }) =>
      rrhhService.editarEvaluacion(evaluacionId, data),
    onSuccess: () => {
      toast.success('Guardado');
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || 'No se pudo guardar'),
  });

  /**
   * «Guardar»: el blur del campo activo dispara sus guardados pendientes
   * (los onBlur de cabecera y filas) y se vuelve al listado de evaluaciones.
   */
  const guardarYSalir = () => {
    (document.activeElement as HTMLElement | null)?.blur();
    toast.success('Guardado');
    navigate('/rrhh/evaluaciones');
  };

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
              <ClipboardCheck className="h-6 w-6 text-sky-600" />
              {evaluacion.empleado_nombre || 'Evaluación'}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-slate-500">
              <span>
                {evaluacion.empleado_codigo} · {evaluacion.tipo_evaluacion ?? '—'} ·
                Periodo {evaluacion.periodo} · {evaluacion.inicio_periodo} → {evaluacion.fin_periodo}
              </span>
              <button
                type="button"
                title="Editar periodo, tipo y fechas"
                aria-label="Editar periodo, tipo y fechas"
                onClick={abrirEditar}
                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-sky-600"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Nota de la evaluación: promedio ponderado 0–5 (badge prominente). */}
          <span
            className={`inline-flex items-baseline gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold tabular-nums shadow-sm ${
              evaluacion.promedio_objetivos === null
                ? 'bg-slate-100 text-slate-500'
                : 'bg-sky-100 text-sky-700 ring-1 ring-sky-200'
            }`}
            title="Promedio ponderado de los objetivos puntuados (0–5)"
          >
            {evaluacion.promedio_objetivos === null ? (
              'Sin puntuar'
            ) : (
              <>
                {fmtPromedio5(evaluacion.promedio_objetivos)}
                <span className="text-xs font-semibold text-sky-500">/ 5</span>
              </>
            )}
          </span>
          <span
            className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${COLOR_ESTADO_EVALUACION[evaluacion.estado]}`}
          >
            {evaluacion.estado === 'borrador' ? 'Borrador' : 'Finalizada'}
          </span>
          <Button
            variant="outline"
            size="sm"
            title="Ver los objetivos definidos para este empleado"
            onClick={() => navigate(`/rrhh/objetivos?empleado_id=${evaluacion.empleado_id}`)}
          >
            <Target className="h-4 w-4" />
            Ver objetivos
          </Button>
          <Button
            size="sm"
            title="Guardar cambios y volver al listado"
            onClick={guardarYSalir}
          >
            <Save className="h-4 w-4" />
            Guardar
          </Button>
        </div>
      </div>

      {!esBorrador && (
        <div className="flex items-start gap-2 rounded-md bg-sky-50 px-4 py-2 text-xs text-sky-700 ring-1 ring-sky-100">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" />
          <span>
            Evaluación finalizada: puedes seguir editándola (cabecera,
            objetivos y puntuación) como si estuviera en borrador; el estado
            es solo informativo.
          </span>
        </div>
      )}

      {/* Objetivos del periodo: selección y puntuación */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-700">
              Objetivos del periodo
            </h2>
            <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-100">
              Estrellas 0–5 · promedio ponderado
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Marca un objetivo para añadirlo a la evaluación y puntúalo con
            estrellas; el peso y los textos se guardan al salir del campo.
          </p>
        </CardHeader>
        <CardContent>
          {evaluacion.objetivos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Target className="h-8 w-8 text-slate-300" />
              <p className="max-w-md text-sm text-slate-500">
                Este empleado no tiene objetivos cuyo periodo solape el de la
                evaluación ({evaluacion.inicio_periodo} → {evaluacion.fin_periodo}).
                Defínelos desde su ficha con su periodo y peso.
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
            <div className="overflow-hidden rounded-lg border border-slate-200">
              {/* Cabecera de columnas (solo pantallas medianas+) */}
              <div className="hidden gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[auto_minmax(0,1.5fr)_auto_5rem_14rem_16rem_2.5rem] md:items-center">
                <span className="w-4" />
                <span>Objetivo</span>
                <span>Puntuación</span>
                <span>Peso</span>
                <span>Valoración</span>
                <span>Recomendaciones</span>
                <span className="text-right">Quitar</span>
              </div>

              <div className="divide-y divide-slate-100">
                {evaluacion.objetivos.map((obj) => (
                  <FilaObjetivo
                    key={obj.id_objetivo}
                    obj={obj}
                    guardado={obj.fila_id !== null && filaGuardada === obj.fila_id}
                    fueraDeAlcance={
                      obj.seleccionado &&
                      !(
                        obj.periodo_inicio <= evaluacion.fin_periodo &&
                        obj.periodo_fin >= evaluacion.inicio_periodo
                      )
                    }
                    seleccionando={
                      seleccionarMutation.isPending &&
                      seleccionarMutation.variables?.length === 1 &&
                      seleccionarMutation.variables[0] === obj.id_objetivo
                    }
                    quitando={quitarMutation.isPending && quitarMutation.variables === obj.fila_id}
                    onSeleccionar={() =>
                      seleccionarMutation.mutate([obj.id_objetivo])
                    }
                    onQuitar={() =>
                      obj.fila_id !== null && quitarMutation.mutate(obj.fila_id)
                    }
                    onPuntuar={(resultado) =>
                      obj.fila_id !== null &&
                      puntuarMutation.mutate({
                        filaId: obj.fila_id,
                        data: { resultado },
                      })
                    }
                    onGuardarFila={(data) =>
                      obj.fila_id !== null &&
                      puntuarMutation.mutate({ filaId: obj.fila_id, data })
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Resumen: promedio y conteos */}
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-sm font-semibold text-slate-700">Resumen</h2>
            <p className="text-xs text-slate-500">
              Promedio ponderado por el peso de cada objetivo puntuado (0–5)
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Promedio (0–5)</p>
                <p className="text-2xl font-bold tabular-nums text-slate-900">
                  {evaluacion.promedio_objetivos === null ? (
                    <span className="text-base font-medium text-slate-400">Sin puntuar</span>
                  ) : (
                    <>
                      {fmtPromedio5(evaluacion.promedio_objetivos)}
                      <span className="text-sm font-semibold text-slate-400"> / 5</span>
                    </>
                  )}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Objetivos (sel. / alcance)</p>
                <p className="text-2xl font-bold tabular-nums text-slate-900">
                  {evaluacion.cantidad_seleccionados} / {evaluacion.cantidad_objetivos}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comentarios y recomendaciones de la evaluación */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <MessageSquare className="h-4 w-4 text-sky-500" />
                Comentarios y recomendaciones
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Se guardan al salir del campo.
            </p>
          </CardHeader>
          <CardContent>
            <CabeceraTexto
              evaluacion={evaluacion}
              onGuardar={(data) => cabeceraMutation.mutate(data)}
              guardando={cabeceraMutation.isPending}
            />
          </CardContent>
        </Card>
      </div>

      {/* Modal de edición de periodo, tipo y fechas (cuadrado, sin borde) */}
      <Modal
        isOpen={editarOpen}
        onClose={() => setEditarOpen(false)}
        className="overflow-hidden !rounded-none"
      >
        <div className="sticky top-0 flex items-center gap-3 border-b bg-gradient-to-r from-sky-50 to-sky-100 px-6 py-4">
          <div className="rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 p-2">
            <Pencil className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Editar evaluación</h2>
        </div>
        <form onSubmit={guardarCabecera} className="space-y-4 px-6 pt-5">
          <div className="space-y-2">
            <Label htmlFor="ev-periodo" className="text-gray-700">
              Periodo
            </Label>
            <Input
              id="ev-periodo"
              value={cabecera.periodo}
              onChange={(e) =>
                setCabecera({ ...cabecera, periodo: e.target.value })
              }
              placeholder="Ej. 2026-06"
              className={cabeceraErrores.periodo ? 'border-red-500' : ''}
            />
            {cabeceraErrores.periodo && (
              <p className="flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="h-3 w-3" />
                {cabeceraErrores.periodo}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ev-tipo" className="text-gray-700">
              Tipo de evaluación
            </Label>
            <select
              id="ev-tipo"
              value={cabecera.tipo_evaluacion_id}
              onChange={(e) =>
                setCabecera({
                  ...cabecera,
                  tipo_evaluacion_id: Number(e.target.value),
                })
              }
              className={`w-full rounded-md border px-3 py-2 text-sm transition-all duration-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500 ${
                cabeceraErrores.tipo_evaluacion_id
                  ? 'border-red-500'
                  : 'border-slate-300'
              }`}
            >
              <option value={0} disabled>
                Selecciona un tipo
              </option>
              {tiposEvaluacion.map((t) => (
                <option
                  key={t.id_tipos_evaluaciones}
                  value={t.id_tipos_evaluaciones}
                >
                  {t.nombre}
                </option>
              ))}
            </select>
            {cabeceraErrores.tipo_evaluacion_id && (
              <p className="flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="h-3 w-3" />
                {cabeceraErrores.tipo_evaluacion_id}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ev-inicio" className="text-gray-700">
                Inicio del periodo
              </Label>
              <Input
                id="ev-inicio"
                type="date"
                value={cabecera.inicio_periodo}
                onChange={(e) =>
                  setCabecera({ ...cabecera, inicio_periodo: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-fin" className="text-gray-700">
                Fin del periodo
              </Label>
              <Input
                id="ev-fin"
                type="date"
                value={cabecera.fin_periodo}
                onChange={(e) =>
                  setCabecera({ ...cabecera, fin_periodo: e.target.value })
                }
                className={cabeceraErrores.fin_periodo ? 'border-red-500' : ''}
              />
              {cabeceraErrores.fin_periodo && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {cabeceraErrores.fin_periodo}
                </p>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 -mx-6 flex items-center justify-end gap-2 border-t bg-white px-6 pb-5 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditarOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={cabeceraDatosMutation.isPending}>
              {cabeceraDatosMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar cambios
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Subcomponentes ─────────────────────────────────────────────────────────

/** Comentarios y recomendaciones generales, con guardado al salir del campo. */
function CabeceraTexto({
  evaluacion,
  onGuardar,
  guardando,
}: {
  evaluacion: { comentarios: string | null; recomendaciones: string | null };
  onGuardar: (data: {
    comentarios: string | null;
    recomendaciones: string | null;
  }) => void;
  guardando: boolean;
}) {
  const [comentarios, setComentarios] = useState(evaluacion.comentarios ?? '');
  const [recomendaciones, setRecomendaciones] = useState(
    evaluacion.recomendaciones ?? ''
  );

  // Resincroniza cuando el servidor devuelve valores distintos.
  useEffect(() => setComentarios(evaluacion.comentarios ?? ''), [evaluacion.comentarios]);
  useEffect(
    () => setRecomendaciones(evaluacion.recomendaciones ?? ''),
    [evaluacion.recomendaciones]
  );

  const guardar = (campo: 'comentarios' | 'recomendaciones') => {
    const actual = campo === 'comentarios' ? evaluacion.comentarios ?? '' : evaluacion.recomendaciones ?? '';
    const nuevo = (campo === 'comentarios' ? comentarios : recomendaciones).trim();
    if (nuevo === actual.trim()) return;
    onGuardar({
      comentarios: campo === 'comentarios' ? nuevo || null : (evaluacion.comentarios ?? '') || null,
      recomendaciones:
        campo === 'recomendaciones' ? nuevo || null : (evaluacion.recomendaciones ?? '') || null,
    });
  };

  const comun =
    'w-full rounded-md border border-slate-300 px-3 py-2 text-sm transition-all duration-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-600';

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <label
          htmlFor="ev-comentarios"
          className="text-xs font-semibold text-slate-500"
        >
          Comentarios
        </label>
        <textarea
          id="ev-comentarios"
          rows={4}
          value={comentarios}
          disabled={guardando}
          onChange={(e) => setComentarios(e.target.value)}
          onBlur={() => guardar('comentarios')}
          placeholder="Observaciones generales (opcional)"
          className={comun}
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="ev-recomendaciones"
          className="text-xs font-semibold text-slate-500"
        >
          Recomendaciones
        </label>
        <textarea
          id="ev-recomendaciones"
          rows={4}
          value={recomendaciones}
          disabled={guardando}
          onChange={(e) => setRecomendaciones(e.target.value)}
          onBlur={() => guardar('recomendaciones')}
          placeholder="Recomendaciones generales de la evaluación (opcional)"
          className={comun}
        />
      </div>
    </div>
  );
}

/** Una fila de «Objetivos del periodo»: selección + puntuación por objetivo. */
function FilaObjetivo({
  obj,
  guardado,
  fueraDeAlcance,
  seleccionando,
  quitando,
  onSeleccionar,
  onQuitar,
  onPuntuar,
  onGuardarFila,
}: {
  obj: RrhhEvaluacionObjetivo;
  /** Muestra el check breve de «guardado» tras una mutación exitosa. */
  guardado: boolean;
  /**
   * `true` si está seleccionado pero su periodo ya no solapa el de la
   * evaluación (sigue contando en el promedio: se señala en la fila).
   */
  fueraDeAlcance: boolean;
  seleccionando: boolean;
  quitando: boolean;
  onSeleccionar: () => void;
  onQuitar: () => void;
  onPuntuar: (resultado: number) => void;
  onGuardarFila: (data: RrhhEvaluacionObjetivoUpdate) => void;
}) {
  const editables = obj.seleccionado && obj.fila_id !== null;

  const [valoracion, setValoracion] = useState(obj.valoracion ?? '');
  const [recomendaciones, setRecomendaciones] = useState(obj.recomendaciones ?? '');
  const [peso, setPeso] = useState(String(Number(obj.peso)));

  useEffect(() => setValoracion(obj.valoracion ?? ''), [obj.valoracion]);
  useEffect(() => setRecomendaciones(obj.recomendaciones ?? ''), [obj.recomendaciones]);
  useEffect(() => setPeso(String(Number(obj.peso))), [obj.peso]);

  const guardarValoracion = () => {
    if (!editables) return;
    const nuevo = valoracion.trim();
    if (nuevo === (obj.valoracion ?? '').trim()) return;
    onGuardarFila({ valoracion: nuevo || null });
  };

  const guardarRecomendaciones = () => {
    if (!editables) return;
    const nuevo = recomendaciones.trim();
    if (nuevo === (obj.recomendaciones ?? '').trim()) return;
    onGuardarFila({ recomendaciones: nuevo || null });
  };

  const guardarPeso = () => {
    if (!editables) return;
    const n = Number(String(peso).replace(',', '.'));
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      toast.error('El peso debe ser un número entero entre 1 y 100');
      setPeso(String(Number(obj.peso)));
      return;
    }
    if (n === Number(obj.peso)) return;
    onGuardarFila({ peso: n });
  };

  const pesoDifiere = Number(peso) !== Number(obj.peso_objetivo);

  const inputBase =
    'w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm transition-all duration-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-wrap items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50/70 md:grid md:grid-cols-[auto_minmax(0,1.5fr)_auto_5rem_14rem_16rem_2.5rem] md:items-center md:gap-3">
      {/* Selección (único control activo también en filas no seleccionadas) */}
      <input
        type="checkbox"
        checked={obj.seleccionado}
        disabled={seleccionando || quitando}
        onChange={(e) => (e.target.checked ? onSeleccionar() : onQuitar())}
        title={obj.seleccionado ? 'Quitar de la evaluación' : 'Añadir a la evaluación'}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-sky-600 accent-sky-600 focus:ring-sky-500 disabled:cursor-not-allowed"
      />

      {/* Nombre + periodo (se ve el filtro por fecha de la evaluación) */}
      <div className="min-w-0 flex-1 md:flex-none">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-slate-800">{obj.nombre}</p>
          {seleccionando || quitando ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-slate-400" />
          ) : null}
          {guardado && (
            <Check className="h-3.5 w-3.5 shrink-0 animate-fade-in-up text-emerald-500" aria-hidden />
          )}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-400">
          <span className="tabular-nums" title="Periodo del objetivo">
            {obj.periodo_inicio} → {obj.periodo_fin}
          </span>
          {fueraDeAlcance && (
            <span
              className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
              title="Su periodo ya no solapa el de la evaluación, pero sigue contando en el promedio"
            >
              fuera de alcance
            </span>
          )}
        </p>
        {!obj.seleccionado && (
          <p className="mt-1 text-xs italic text-slate-400">
            Selecciona el objetivo para evaluarlo
          </p>
        )}
      </div>

      {/* Zona puntuación/textos: cada control se atenúa si no está seleccionado */}
      <div
        className={`flex items-center gap-2 ${obj.seleccionado ? '' : 'opacity-40 pointer-events-none'}`}
      >
        <Estrellas0a5
          valor={obj.resultado}
          disabled={!editables}
          onCambiar={onPuntuar}
        />
        <span className="text-xs tabular-nums text-slate-500">
          {obj.resultado !== null ? `${obj.resultado}/5` : ''}
        </span>
      </div>

      {/* Peso de la fila (entero 1–100, se guarda al salir del campo) */}
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <input
          type="number"
          min={1}
          max={100}
          step={1}
          value={peso}
          disabled={!editables}
          onChange={(e) => setPeso(e.target.value)}
          onBlur={guardarPeso}
          aria-label="Peso de este objetivo en la evaluación"
          title="Peso de la fila (entero 1–100; se guarda al salir del campo)"
          className="w-16 rounded-md border border-slate-300 px-2 py-1.5 text-sm tabular-nums transition-all duration-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:cursor-not-allowed"
        />
        {pesoDifiere && (
          <span
            className="text-[11px] font-semibold text-amber-600"
            title="Peso del objetivo (la fila lo sobrescribe en esta evaluación)"
          >
            obj. {fmtPeso(obj.peso_objetivo)}
          </span>
        )}
      </div>

      <textarea
        rows={2}
        value={valoracion}
        disabled={!editables}
        onChange={(e) => setValoracion(e.target.value)}
        onBlur={guardarValoracion}
        placeholder="Valoración"
        aria-label={`Valoración de «${obj.nombre}»`}
        className={`${inputBase} resize-none overflow-hidden ${obj.seleccionado ? '' : 'opacity-40 pointer-events-none'}`}
      />

      <textarea
        rows={2}
        value={recomendaciones}
        disabled={!editables}
        onChange={(e) => setRecomendaciones(e.target.value)}
        onBlur={guardarRecomendaciones}
        placeholder="Recomendaciones"
        aria-label={`Recomendaciones de «${obj.nombre}»`}
        className={`${inputBase} resize-none overflow-hidden ${obj.seleccionado ? '' : 'opacity-40 pointer-events-none'}`}
      />

      {/* Quitar de la evaluación */}
      <div className="flex items-center justify-end md:justify-center">
        {obj.seleccionado && (
          <Button
            variant="ghost"
            size="icon"
            title="Quitar de la evaluación"
            onClick={onQuitar}
            disabled={quitando}
            className="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            {quitando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * 5 estrellas, escala 0–5. Clic sobre ★n marca `n`; clic sobre la estrella ya
 * activa la vacía (0), y el botón «×» limpia la puntuación. En filas no
 * seleccionadas es solo lectura.
 */
function Estrellas0a5({
  valor,
  disabled,
  onCambiar,
}: {
  /** Estrellas marcadas (0–5) o `null` = sin puntuar. */
  valor: number | null;
  disabled: boolean;
  onCambiar: (n: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const visibles = hover ?? valor ?? 0;
  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHover(null)}
      role="radiogroup"
      aria-label="Puntuación con estrellas (0–5)"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} de 5 estrellas`}
          title={`${n} de 5`}
          disabled={disabled}
          onMouseEnter={() => setHover(n)}
          onClick={() => onCambiar(n === valor ? 0 : n)}
          className="rounded p-0.5 transition-transform hover:scale-110 disabled:pointer-events-none disabled:opacity-70"
        >
          <Star
            className={`h-5 w-5 transition-colors ${
              n <= visibles
                ? 'fill-amber-400 text-amber-400'
                : 'fill-transparent text-slate-300'
            }`}
          />
        </button>
      ))}
      {!disabled && valor !== null && valor > 0 && (
        <button
          type="button"
          title="Quitar puntuación (0)"
          aria-label="Quitar puntuación"
          onClick={() => onCambiar(0)}
          className="ml-1 rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
