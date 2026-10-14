import { useState } from 'react';
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
  ETIQUETA_TIPO_EVALUACION,
  type RrhhMeta,
  type RrhhObjetivo,
} from '../../types/rrhh';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ClipboardCheck,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Target,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  ConfirmModal,
  Modal,
} from '../../components/ui';

const fmtPromedio = (v: string | null) =>
  v === null || v === undefined ? '—' : Number(v).toFixed(2);

/** Valoración 1–5 → aporte en 0–100 (misma conversión que el backend). */
const aporte = (valoracion: number | null) =>
  valoracion === null ? null : (valoracion / 5) * 100;

export function EvaluacionDetallePage() {
  const { id } = useParams<{ id: string }>();
  const evaluacionId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formObjetivo, setFormObjetivo] = useState<{
    abierto: boolean;
    editando: RrhhObjetivo | null;
  }>({ abierto: false, editando: null });
  const [formMeta, setFormMeta] = useState<{
    abierto: boolean;
    objetivoId: number | null;
    editando: RrhhMeta | null;
  }>({ abierto: false, objetivoId: null, editando: null });
  const [confirm, setConfirm] = useState<{
    tipo: 'objetivo' | 'meta';
    id: number;
    nombre: string;
  } | null>(null);

  const [objForm, setObjForm] = useState({
    nombre: '',
    resultado_objetivo: '',
    valoracion: '' as string,
    observaciones: '',
  });
  const [metaForm, setMetaForm] = useState({
    nombre: '',
    resultado_meta: '' as string,
    valoracion: '' as string,
    observaciones: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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

  const objetivoMutation = useMutation({
    mutationFn: (data: { id?: number; nombre: string }) => {
      const payload = {
        nombre: data.nombre,
        resultado_objetivo: objForm.resultado_objetivo.trim()
          ? objForm.resultado_objetivo
          : null,
        valoracion: objForm.valoracion === '' ? null : Number(objForm.valoracion),
        observaciones: objForm.observaciones.trim() ? objForm.observaciones : null,
      };
      return data.id
        ? rrhhService.editarObjetivo(data.id, payload)
        : rrhhService.crearObjetivo(evaluacionId, payload);
    },
    onSuccess: () => {
      toast.success(formObjetivo.editando ? 'Objetivo actualizado' : 'Objetivo añadido');
      invalidate();
      setFormObjetivo({ abierto: false, editando: null });
      setFormErrors({});
    },
    onError: (err: any) => toast.error(err?.message || 'No se pudo guardar el objetivo'),
  });

  const metaMutation = useMutation({
    mutationFn: (data: { id?: number; objetivoId?: number; nombre: string }) => {
      const payload = {
        nombre: data.nombre,
        resultado_meta: metaForm.resultado_meta === '' ? null : Number(metaForm.resultado_meta),
        valoracion: metaForm.valoracion === '' ? null : Number(metaForm.valoracion),
        observaciones: metaForm.observaciones.trim() ? metaForm.observaciones : null,
      };
      if (data.id) return rrhhService.editarMeta(data.id, payload);
      return rrhhService.crearMeta(data.objetivoId as number, payload);
    },
    onSuccess: () => {
      toast.success(formMeta.editando ? 'Meta actualizada' : 'Meta añadida');
      invalidate();
      setFormMeta({ abierto: false, objetivoId: null, editando: null });
      setFormErrors({});
    },
    onError: (err: any) => toast.error(err?.message || 'No se pudo guardar la meta'),
  });

  const eliminarMutation = useMutation({
    mutationFn: (c: { tipo: 'objetivo' | 'meta'; id: number }) =>
      c.tipo === 'objetivo'
        ? rrhhService.eliminarObjetivo(c.id)
        : rrhhService.eliminarMeta(c.id),
    onSuccess: (_res, c) => {
      toast.success(c.tipo === 'objetivo' ? 'Objetivo eliminado' : 'Meta eliminada');
      invalidate();
      setConfirm(null);
    },
    onError: (err: any) => toast.error(err?.message || 'No se pudo eliminar'),
  });

  const abrirObjetivo = (o?: RrhhObjetivo) => {
    setFormObjetivo({ abierto: true, editando: o ?? null });
    setObjForm({
      nombre: o?.nombre ?? '',
      resultado_objetivo: o?.resultado_objetivo ?? '',
      valoracion: o?.valoracion != null ? String(o.valoracion) : '',
      observaciones: o?.observaciones ?? '',
    });
    setFormErrors({});
  };

  const abrirMeta = (objetivoId: number, m?: RrhhMeta) => {
    setFormMeta({ abierto: true, objetivoId, editando: m ?? null });
    setMetaForm({
      nombre: m?.nombre ?? '',
      resultado_meta: m?.resultado_meta != null ? String(m.resultado_meta) : '',
      valoracion: m?.valoracion != null ? String(m.valoracion) : '',
      observaciones: m?.observaciones ?? '',
    });
    setFormErrors({});
  };

  const submitObjetivo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!objForm.nombre.trim()) {
      setFormErrors({ nombre: 'El nombre es obligatorio' });
      return;
    }
    objetivoMutation.mutate({
      id: formObjetivo.editando?.id_objetivos,
      nombre: objForm.nombre.trim(),
    });
  };

  const submitMeta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!metaForm.nombre.trim()) {
      setFormErrors({ nombre: 'El nombre es obligatorio' });
      return;
    }
    metaMutation.mutate({
      id: formMeta.editando?.id_metas,
      objetivoId: formMeta.objetivoId ?? undefined,
      nombre: metaForm.nombre.trim(),
    });
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
              {evaluacion.empleado_codigo} · {ETIQUETA_TIPO_EVALUACION[evaluacion.tipo_evaluacion]} ·
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

      {/* Objetivos y metas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Target className="h-4 w-4 text-brand-600" />
              Objetivos y metas
            </h2>
            <p className="text-xs text-slate-500">
              Su valoración (1–5) alimenta el promedio de objetivos en escala 0–100
            </p>
          </div>
          {esBorrador && (
            <Button size="sm" onClick={() => abrirObjetivo()}>
              <Plus className="h-4 w-4" />
              Nuevo objetivo
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {evaluacion.objetivos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Target className="h-10 w-10 text-slate-300" />
              <p className="max-w-sm text-sm text-slate-500">
                Aún no hay objetivos. Los objetivos y sus metas se puntúan del 1 al 5 y
                conforman el promedio de objetivos.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {evaluacion.objetivos.map((obj) => (
                <div key={obj.id_objetivos} className="rounded-lg border border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{obj.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {obj.resultado_objetivo || 'Sin resultado registrado'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm tabular-nums text-slate-600">
                        {obj.valoracion != null ? (
                          <>
                            {obj.valoracion}/5 ·{' '}
                            <strong className="text-slate-900">
                              {aporte(obj.valoracion)?.toFixed(0)}%
                            </strong>
                          </>
                        ) : (
                          <span className="text-slate-400">Sin puntuar</span>
                        )}
                      </span>
                      {esBorrador && (
                        <div className="flex items-center gap-1">
                          <ActionButton titulo="Editar objetivo" onClick={() => abrirObjetivo(obj)}>
                            <Pencil className="h-4 w-4" />
                          </ActionButton>
                          <ActionButton
                            titulo="Eliminar objetivo"
                            danger
                            onClick={() =>
                              setConfirm({
                                tipo: 'objetivo',
                                id: obj.id_objetivos,
                                nombre: obj.nombre,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </ActionButton>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => abrirMeta(obj.id_objetivos)}
                          >
                            <Plus className="h-4 w-4" />
                            Meta
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-4 py-2">
                    {obj.metas.length === 0 ? (
                      <p className="py-1 text-xs text-slate-400">Sin metas asociadas</p>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {obj.metas.map((meta) => (
                          <li
                            key={meta.id_metas}
                            className="flex flex-wrap items-center justify-between gap-2 py-2 pl-4"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm text-slate-700">{meta.nombre}</p>
                              <p className="text-xs text-slate-400">
                                {meta.resultado_meta != null
                                  ? `Resultado: ${meta.resultado_meta}`
                                  : 'Sin resultado'}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm tabular-nums text-slate-600">
                                {meta.valoracion != null ? `${meta.valoracion}/5` : 'Sin puntuar'}
                              </span>
                              {esBorrador && (
                                <div className="flex items-center gap-1">
                                  <ActionButton titulo="Editar meta" onClick={() => abrirMeta(obj.id_objetivos, meta)}>
                                    <Pencil className="h-4 w-4" />
                                  </ActionButton>
                                  <ActionButton
                                    titulo="Eliminar meta"
                                    danger
                                    onClick={() =>
                                      setConfirm({
                                        tipo: 'meta',
                                        id: meta.id_metas,
                                        nombre: meta.nombre,
                                      })
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </ActionButton>
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de objetivo */}
      <Modal
        isOpen={formObjetivo.abierto}
        onClose={() => setFormObjetivo({ abierto: false, editando: null })}
      >
        <div className="space-y-4 p-1">
          <h2 className="text-lg font-bold text-slate-900">
            {formObjetivo.editando ? 'Editar objetivo' : 'Nuevo objetivo'}
          </h2>
          <form onSubmit={submitObjetivo} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="obj-nombre">Nombre *</Label>
              <Input
                id="obj-nombre"
                value={objForm.nombre}
                onChange={(e) => setObjForm({ ...objForm, nombre: e.target.value })}
                placeholder="Ej. Aumentar ventas del trimestre"
                className={formErrors.nombre ? 'border-red-500' : ''}
              />
              {formErrors.nombre && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.nombre}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="obj-resultado">Resultado</Label>
                <Input
                  id="obj-resultado"
                  value={objForm.resultado_objetivo}
                  onChange={(e) =>
                    setObjForm({ ...objForm, resultado_objetivo: e.target.value })
                  }
                  placeholder="Ej. Logrado al 90%"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="obj-valoracion">Valoración (1–5)</Label>
                <select
                  id="obj-valoracion"
                  value={objForm.valoracion}
                  onChange={(e) => setObjForm({ ...objForm, valoracion: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Sin puntuar</option>
                  {[1, 2, 3, 4, 5].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="obj-obs">Observaciones</Label>
              <textarea
                id="obj-obs"
                rows={3}
                value={objForm.observaciones}
                onChange={(e) => setObjForm({ ...objForm, observaciones: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={objetivoMutation.isPending}>
                {objetivoMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {formObjetivo.editando ? 'Guardar cambios' : 'Añadir objetivo'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormObjetivo({ abierto: false, editando: null })}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Modal de meta */}
      <Modal
        isOpen={formMeta.abierto}
        onClose={() => setFormMeta({ abierto: false, objetivoId: null, editando: null })}
      >
        <div className="space-y-4 p-1">
          <h2 className="text-lg font-bold text-slate-900">
            {formMeta.editando ? 'Editar meta' : 'Nueva meta'}
          </h2>
          <form onSubmit={submitMeta} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meta-nombre">Nombre *</Label>
              <Input
                id="meta-nombre"
                value={metaForm.nombre}
                onChange={(e) => setMetaForm({ ...metaForm, nombre: e.target.value })}
                placeholder="Ej. Cerrar 10 contratos"
                className={formErrors.nombre ? 'border-red-500' : ''}
              />
              {formErrors.nombre && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.nombre}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="meta-resultado">Resultado (número)</Label>
                <Input
                  id="meta-resultado"
                  type="number"
                  value={metaForm.resultado_meta}
                  onChange={(e) =>
                    setMetaForm({ ...metaForm, resultado_meta: e.target.value })
                  }
                  placeholder="Ej. 9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta-valoracion">Valoración (1–5)</Label>
                <select
                  id="meta-valoracion"
                  value={metaForm.valoracion}
                  onChange={(e) => setMetaForm({ ...metaForm, valoracion: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Sin puntuar</option>
                  {[1, 2, 3, 4, 5].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta-obs">Observaciones</Label>
              <textarea
                id="meta-obs"
                rows={3}
                value={metaForm.observaciones}
                onChange={(e) => setMetaForm({ ...metaForm, observaciones: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={metaMutation.isPending}>
                {metaMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {formMeta.editando ? 'Guardar cambios' : 'Añadir meta'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormMeta({ abierto: false, objetivoId: null, editando: null })}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={confirm !== null}
        title={confirm?.tipo === 'objetivo' ? 'Eliminar objetivo' : 'Eliminar meta'}
        message={
          confirm
            ? `¿Seguro que quieres eliminar «${confirm.nombre}»? ${
                confirm.tipo === 'objetivo'
                  ? 'Sus metas también se eliminarán y el promedio se recalculará.'
                  : 'El promedio se recalculará.'
              }`
            : ''
        }
        type="danger"
        onConfirm={() => confirm && eliminarMutation.mutate(confirm)}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

// ── Subcomponentes ─────────────────────────────────────────────────────────

function ActionButton({
  children,
  onClick,
  titulo,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  titulo: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={titulo}
      onClick={onClick}
      className={`rounded-md p-1.5 transition-colors ${
        danger
          ? 'text-slate-400 hover:bg-red-50 hover:text-red-600'
          : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}
