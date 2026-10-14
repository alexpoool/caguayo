import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { rrhhService } from '../../services/rrhh';
import {
  COLOR_ESTADO_EVALUACION,
  CRITERIOS_EVALUACION,
  ESTADOS_EVALUACION,
  type RrhhEvaluacionCreate,
  type RrhhEvaluacionListado,
  type RrhhEstadoEvaluacion,
} from '../../types/rrhh';
import {
  AlertCircle,
  ClipboardCheck,
  Eye,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  ConfirmModal,
  Modal,
} from '../../components/ui';

const fmtPromedio = (v: string | null, escala: '1-5' | '0-100') => {
  if (v === null || v === undefined) return '—';
  const n = Number(v);
  return escala === '1-5' ? n.toFixed(2) : `${n.toFixed(1)}%`;
};

/** Fecha ISO local (sin desfase de UTC) para los inputs tipo date. */
const hoyISO = () => {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
};

const ETIQUETA_CRITERIO: Record<string, string> = {
  puntualidad: 'Puntualidad',
  productividad: 'Productividad',
  trabajo_equipo: 'Trabajo en equipo',
  calidad: 'Calidad',
};

export function EvaluacionesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<RrhhEstadoEvaluacion | ''>('');
  const [filtroTipo, setFiltroTipo] = useState<number | ''>('');
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<RrhhEvaluacionListado | null>(null);

  const [formData, setFormData] = useState<RrhhEvaluacionCreate>({
    empleado_id: 0,
    periodo: '',
    tipo_evaluacion_id: 0,
    inicio_periodo: hoyISO(),
    fin_periodo: hoyISO(),
    puntualidad: null,
    productividad: null,
    trabajo_equipo: null,
    calidad: null,
    comentarios: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: empleados = [] } = useQuery({
    queryKey: ['rrhh', 'empleados', 'para-evaluaciones'],
    queryFn: () => rrhhService.listarEmpleados({ limit: 500, activo: true }),
  });

  const { data: calificaciones = [] } = useQuery({
    queryKey: ['rrhh', 'calificaciones', 'para-criterios'],
    queryFn: () => rrhhService.listarCalificaciones({ limit: 100 }),
  });

  // El selector de tipo tira del catálogo `tipos_evaluaciones` (solo activos).
  const { data: tiposEvaluacion = [] } = useQuery({
    queryKey: ['rrhh', 'catalogos', 'tipos-evaluacion', 'activos'],
    queryFn: () => rrhhService.listarTiposEvaluacion({ limit: 500, activo: true }),
  });

  const {
    data: evaluaciones = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['rrhh', 'evaluaciones', searchTerm, filtroEstado, filtroTipo],
    queryFn: () =>
      rrhhService.listarEvaluaciones({
        limit: 500,
        buscar: searchTerm || undefined,
        estado: filtroEstado || undefined,
        tipo_evaluacion_id: filtroTipo || undefined,
      }),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['rrhh', 'evaluaciones'] });

  const cerrarForm = () => {
    setFormOpen(false);
    setFormErrors({});
  };

  const validar = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.empleado_id) errs.empleado_id = 'Selecciona el empleado a evaluar';
    if (!formData.periodo.trim()) errs.periodo = 'El periodo es obligatorio (ej. 2026-1)';
    if (!formData.tipo_evaluacion_id) {
      errs.tipo_evaluacion_id = 'Selecciona el tipo de evaluación';
    }
    if (formData.fin_periodo < formData.inicio_periodo) {
      errs.fin_periodo = 'El fin debe ser posterior o igual al inicio';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: (data: RrhhEvaluacionCreate) => rrhhService.crearEvaluacion(data),
    onSuccess: (creada) => {
      toast.success('Evaluación creada en borrador');
      invalidate();
      cerrarForm();
      navigate(`/rrhh/evaluaciones/${creada.id}`);
    },
    onError: (err: any) => toast.error(err?.message || 'No se pudo crear la evaluación'),
  });

  const finalizarMutation = useMutation({
    mutationFn: (id: number) => rrhhService.finalizarEvaluacion(id),
    onSuccess: () => {
      toast.success('Evaluación finalizada (ya no se puede editar)');
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message || 'No se pudo finalizar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rrhhService.eliminarEvaluacion(id),
    onSuccess: () => {
      toast.success('Evaluación eliminada');
      invalidate();
      setConfirmDelete(null);
    },
    onError: (err: any) => toast.error(err?.message || 'No se pudo eliminar'),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar()) return;
    createMutation.mutate({
      ...formData,
      comentarios: formData.comentarios?.trim() ? formData.comentarios : null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <ClipboardCheck className="h-6 w-6 text-brand-600" />
            Evaluaciones
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Ciclo de desempeño: borrador → finalizada, con objetivos y metas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setFormData({
                empleado_id: 0,
                periodo: '',
                tipo_evaluacion_id: 0,
                inicio_periodo: hoyISO(),
                fin_periodo: hoyISO(),
                puntualidad: null,
                productividad: null,
                trabajo_equipo: null,
                calidad: null,
                comentarios: '',
              });
              setFormErrors({});
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nueva evaluación
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, apellido o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as RrhhEstadoEvaluacion | '')}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Todos los estados</option>
              {ESTADOS_EVALUACION.map((e) => (
                <option key={e} value={e}>
                  {e === 'borrador' ? 'Borrador' : 'Finalizada'}
                </option>
              ))}
            </select>
            <select
              value={filtroTipo}
              onChange={(e) =>
                setFiltroTipo(e.target.value ? Number(e.target.value) : '')
              }
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Todos los tipos</option>
              {tiposEvaluacion.map((t) => (
                <option key={t.id_tipos_evaluaciones} value={t.id_tipos_evaluaciones}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingRows />
          ) : isError ? (
            <ErrorState mensaje={(error as any)?.message} onReintentar={refetch} />
          ) : evaluaciones.length === 0 ? (
            <EmptyState
              mensaje={
                searchTerm || filtroEstado || filtroTipo
                  ? 'No hay evaluaciones con esos filtros'
                  : 'Aún no hay evaluaciones. Crea la primera con «Nueva evaluación».'
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Criterios (1–5)</TableHead>
                  <TableHead className="text-right">Objetivos (0–100)</TableHead>
                  <TableHead className="text-center">Objetivos</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluaciones.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900">
                        {ev.empleado_nombre || '—'}
                      </div>
                      <div className="text-xs text-slate-500">{ev.empleado_codigo}</div>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {ev.departamento_nombre || 'Sin departamento'}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      <div>{ev.periodo}</div>
                      <div className="text-xs text-slate-400">
                        {ev.inicio_periodo} → {ev.fin_periodo}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {ev.tipo_evaluacion ?? '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${COLOR_ESTADO_EVALUACION[ev.estado]}`}
                      >
                        {ev.estado === 'borrador' ? 'Borrador' : 'Finalizada'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtPromedio(ev.promedio_criterios, '1-5')}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtPromedio(ev.promedio_objetivos, '0-100')}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        title={`${ev.cantidad_objetivos} objetivo(s) · ${ev.cantidad_metas} meta(s)`}
                        onClick={() =>
                          navigate(`/rrhh/objetivos?evaluacion_id=${ev.id}`)
                        }
                      >
                        <Target className="h-4 w-4" />
                        Ver objetivos
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <ActionButton
                          titulo="Ver detalle"
                          onClick={() => navigate(`/rrhh/evaluaciones/${ev.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </ActionButton>
                        {ev.estado === 'borrador' && (
                          <>
                            <ActionButton
                              titulo="Finalizar"
                              onClick={() => finalizarMutation.mutate(ev.id)}
                            >
                              <FileText className="h-4 w-4" />
                            </ActionButton>
                            <ActionButton
                              titulo="Eliminar"
                              danger
                              onClick={() => setConfirmDelete(ev)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </ActionButton>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={formOpen} onClose={cerrarForm}>
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Nueva evaluación</h2>
          <p className="text-sm text-slate-500">
            Nace en <strong>borrador</strong>: puedes puntuar criterios y añadir objetivos
            hasta finalizarla.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="empleado_id">Empleado *</Label>
              <select
                id="empleado_id"
                value={formData.empleado_id || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    empleado_id: e.target.value === '' ? 0 : Number(e.target.value),
                  })
                }
                className={`w-full rounded-md border px-3 py-2 text-sm ${
                  formErrors.empleado_id ? 'border-red-500' : 'border-slate-300'
                }`}
              >
                <option value="">Selecciona un empleado activo</option>
                {empleados.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombre} {emp.apellido} ({emp.codigo_empleado})
                  </option>
                ))}
              </select>
              {formErrors.empleado_id && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.empleado_id}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="periodo">Periodo *</Label>
                <Input
                  id="periodo"
                  value={formData.periodo}
                  onChange={(e) => setFormData({ ...formData, periodo: e.target.value })}
                  placeholder="Ej. 2026-1"
                  className={formErrors.periodo ? 'border-red-500' : ''}
                />
                {formErrors.periodo && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.periodo}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo_evaluacion">Tipo</Label>
                <select
                  id="tipo_evaluacion"
                  value={formData.tipo_evaluacion_id}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tipo_evaluacion_id: Number(e.target.value),
                    })
                  }
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    formErrors.tipo_evaluacion_id ? 'border-red-500' : 'border-slate-300'
                  }`}
                >
                  <option value={0} disabled>
                    Selecciona un tipo
                  </option>
                  {tiposEvaluacion.map((t) => (
                    <option key={t.id_tipos_evaluaciones} value={t.id_tipos_evaluaciones}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
                {formErrors.tipo_evaluacion_id && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.tipo_evaluacion_id}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="inicio_periodo">Inicio del periodo *</Label>
                <Input
                  id="inicio_periodo"
                  type="date"
                  value={formData.inicio_periodo}
                  onChange={(e) =>
                    setFormData({ ...formData, inicio_periodo: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fin_periodo">Fin del periodo *</Label>
                <Input
                  id="fin_periodo"
                  type="date"
                  value={formData.fin_periodo}
                  onChange={(e) => setFormData({ ...formData, fin_periodo: e.target.value })}
                  className={formErrors.fin_periodo ? 'border-red-500' : ''}
                />
                {formErrors.fin_periodo && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.fin_periodo}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Criterios (catálogo «Calificaciones», 1–5)</Label>
              {calificaciones.length === 0 ? (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  No hay calificaciones creadas. Crea la escala 1–5 primero en
                  «Catálogos → Calificaciones»; mientras tanto los criterios quedan vacíos.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {CRITERIOS_EVALUACION.map((criterio) => (
                    <div key={criterio} className="space-y-1">
                      <Label htmlFor={criterio} className="text-xs text-slate-500">
                        {ETIQUETA_CRITERIO[criterio]}
                      </Label>
                      <select
                        id={criterio}
                        value={(formData[criterio] as number | null) ?? ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            [criterio]: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="">Sin puntuar</option>
                        {calificaciones.map((c) => (
                          <option key={c.id_calificaciones} value={c.id_calificaciones}>
                            {c.nombre} ({c.valor})
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="comentarios">Comentarios</Label>
              <textarea
                id="comentarios"
                value={formData.comentarios || ''}
                onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                rows={3}
                placeholder="Observaciones generales (opcional)"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Crear evaluación
              </Button>
              <Button type="button" variant="outline" onClick={cerrarForm}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={confirmDelete !== null}
        title="Eliminar evaluación"
        message={
          confirmDelete
            ? `¿Seguro que quieres eliminar la evaluación de «${confirmDelete.empleado_nombre}» (${confirmDelete.periodo})? Solo se puede eliminar mientras esté en borrador.`
            : ''
        }
        type="danger"
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
        onClose={() => setConfirmDelete(null)}
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

function LoadingRows() {
  return (
    <div className="space-y-2 py-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-md bg-slate-100" />
      ))}
    </div>
  );
}

function EmptyState({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <ClipboardCheck className="h-10 w-10 text-slate-300" />
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
        {mensaje || 'No se pudieron cargar las evaluaciones'}
      </p>
      <Button variant="outline" size="sm" onClick={onReintentar}>
        Reintentar
      </Button>
    </div>
  );
}
