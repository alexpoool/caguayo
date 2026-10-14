import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { rrhhService } from '../../services/rrhh';
import { type RrhhObjetivo } from '../../types/rrhh';
import {
  AlertCircle,
  ArrowLeft,
  CalendarRange,
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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  ConfirmModal,
  Modal,
} from '../../components/ui';

/** Rango de fechas legible; «Sin fechas» cuenta siempre en todas las
 * evaluaciones. */
function rangoFechas(inicio: string | null, fin: string | null): string {
  if (!inicio && !fin) return 'Sin fechas · cuenta siempre';
  const fmt = (f: string) =>
    new Date(`${f}T00:00:00`).toLocaleDateString('es-CU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  if (inicio && fin) return `${fmt(inicio)} – ${fmt(fin)}`;
  if (inicio) return `Desde ${fmt(inicio)}`;
  if (fin) return `Hasta ${fmt(fin)}`;
  return 'Sin fechas · cuenta siempre';
}

/**
 * Objetivos de un empleado, con su CRUD (siempre editable).
 *
 * Llega `?empleado_id=N` desde la tabla de empleados, desde la de
 * evaluaciones o desde el detalle de una evaluación. Se **definen** aquí
 * (nombre y fechas) y se **califican** en la evaluación: la valoración (1–5)
 * de las metas promedia a `resultado_objetivo`.
 */
export function ObjetivosPage() {
  const [searchParams] = useSearchParams();
  const empleadoId = Number(searchParams.get('empleado_id')) || 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formAbierto, setFormAbierto] = useState<{
    editando: RrhhObjetivo | null;
  } | null>(null);
  const [confirm, setConfirm] = useState<RrhhObjetivo | null>(null);
  const [objForm, setObjForm] = useState({
    nombre: '',
    fecha_inicio: '',
    fecha_fin: '',
    observaciones: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const {
    data: objetivos,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['rrhh', 'objetivos', 'empleado', empleadoId],
    queryFn: () => rrhhService.listarObjetivos({ empleado_id: empleadoId }),
    enabled: empleadoId > 0,
  });

  const { data: empleado } = useQuery({
    queryKey: ['rrhh', 'empleados', empleadoId],
    queryFn: () => rrhhService.getEmpleado(empleadoId),
    enabled: empleadoId > 0,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['rrhh', 'objetivos'] });
    // Las fechas/bajas de objetivos mueven el alcance de las evaluaciones.
    queryClient.invalidateQueries({ queryKey: ['rrhh', 'evaluaciones'] });
    queryClient.invalidateQueries({ queryKey: ['rrhh', 'reporte'] });
  };

  const objetivoMutation = useMutation({
    mutationFn: (id: number | undefined) => {
      const payload = {
        nombre: objForm.nombre.trim(),
        fecha_inicio: objForm.fecha_inicio || null,
        fecha_fin: objForm.fecha_fin || null,
        observaciones: objForm.observaciones.trim() ? objForm.observaciones : null,
      };
      return id
        ? rrhhService.editarObjetivo(id, payload)
        : rrhhService.crearObjetivo({ ...payload, empleado_id: empleadoId });
    },
    onSuccess: () => {
      toast.success(formAbierto?.editando ? 'Objetivo actualizado' : 'Objetivo añadido');
      invalidate();
      setFormAbierto(null);
      setFormErrors({});
    },
    onError: (err: any) => toast.error(err?.message || 'No se pudo guardar el objetivo'),
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: number) => rrhhService.eliminarObjetivo(id),
    onSuccess: () => {
      toast.success('Objetivo eliminado');
      invalidate();
      setConfirm(null);
    },
    onError: (err: any) => toast.error(err?.message || 'No se pudo eliminar'),
  });

  const abrir = (o?: RrhhObjetivo) => {
    setFormAbierto({ editando: o ?? null });
    setObjForm({
      nombre: o?.nombre ?? '',
      fecha_inicio: o?.fecha_inicio ?? '',
      fecha_fin: o?.fecha_fin ?? '',
      observaciones: o?.observaciones ?? '',
    });
    setFormErrors({});
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!objForm.nombre.trim()) errs.nombre = 'El nombre es obligatorio';
    if (
      objForm.fecha_inicio &&
      objForm.fecha_fin &&
      objForm.fecha_fin < objForm.fecha_inicio
    ) {
      errs.fecha_fin = 'El fin no puede ser anterior al inicio';
    }
    if (Object.keys(errs).length) {
      setFormErrors(errs);
      return;
    }
    objetivoMutation.mutate(formAbierto?.editando?.id_objetivos);
  };

  if (!empleadoId) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Target className="h-10 w-10 text-slate-300" />
        <p className="max-w-sm text-sm text-slate-500">
          Esta página muestra los objetivos de un empleado concreto. Elige un
          empleado desde su listado para verlos.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/rrhh/empleados')}>
          <ArrowLeft className="h-4 w-4" />
          Ir a empleados
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-md bg-slate-100" />
        <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (isError || !objetivos) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-sm text-slate-600">
          {(error as any)?.message || 'No se pudieron cargar los objetivos'}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/rrhh/empleados')}>
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  const nombreEmpleado =
    empleado ? `${empleado.nombre} ${empleado.apellido}`.trim() : 'empleado';
  const resultados = objetivos
    .map((o) => (o.resultado_objetivo !== null ? Number(o.resultado_objetivo) : null))
    .filter((r): r is number => r !== null);
  const medio =
    resultados.length > 0
      ? resultados.reduce((a, b) => a + b, 0) / resultados.length
      : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            title="Volver al listado de empleados"
            onClick={() => navigate('/rrhh/empleados')}
            className="mt-1 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Target className="h-6 w-6 text-brand-600" />
              Objetivos de {nombreEmpleado}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {empleado?.codigo_empleado ? `${empleado.codigo_empleado} · ` : ''}
              {objetivos.length} objetivo{objetivos.length === 1 ? '' : 's'} ·
              Resultado medio{' '}
              {medio === null ? '—' : `${medio.toFixed(1)}/5`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/rrhh/evaluaciones')}
            title="La valoración de las metas se hace al calificar una evaluación"
          >
            <ClipboardCheck className="h-4 w-4" />
            Ir a evaluaciones
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => abrir()}>
            <Plus className="h-4 w-4" />
            Nuevo objetivo
          </Button>
        </div>
      </div>

      <div className="rounded-md bg-slate-100 px-4 py-2 text-xs text-slate-600">
        Los objetivos se definen aquí y siempre son editables. La valoración
        (1–5) de sus metas se pone al calificar la evaluación del empleado.
      </div>

      <Card>
        <CardContent className="pt-6">
          {objetivos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Target className="h-10 w-10 text-slate-300" />
              <p className="max-w-sm text-sm text-slate-500">
                Aún no hay objetivos. Define aquí las metas del periodo y
                puntúalas desde la evaluación del empleado.
              </p>
              <Button size="sm" onClick={() => abrir()}>
                <Plus className="h-4 w-4" />
                Nuevo objetivo
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Objetivo</TableHead>
                  <TableHead>Rango</TableHead>
                  <TableHead className="w-36">Resultado</TableHead>
                  <TableHead className="text-center">Metas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {objetivos.map((obj) => (
                  <TableRow key={obj.id_objetivos}>
                    <TableCell>
                      <p className="font-medium text-slate-900">{obj.nombre}</p>
                      {obj.observaciones && (
                        <p className="mt-0.5 max-w-xl truncate text-xs text-slate-400">
                          {obj.observaciones}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <CalendarRange className="h-3.5 w-3.5 text-slate-400" />
                        {rangoFechas(obj.fecha_inicio, obj.fecha_fin)}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums text-slate-700">
                      {obj.resultado_objetivo !== null ? (
                        <>
                          {Number(obj.resultado_objetivo).toFixed(1)}/5 ·{' '}
                          <strong className="text-slate-900">
                            {Number(obj.aporte ?? 0).toFixed(0)}%
                          </strong>
                        </>
                      ) : (
                        <span className="text-slate-400">Sin puntuar</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        title={`Ver las metas de «${obj.nombre}»`}
                        onClick={() => navigate(`/rrhh/metas?objetivo_id=${obj.id_objetivos}`)}
                      >
                        Ver metas
                        {obj.metas.length > 0 ? ` (${obj.metas.length})` : ''}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ActionButton titulo="Editar objetivo" onClick={() => abrir(obj)}>
                          <Pencil className="h-4 w-4" />
                        </ActionButton>
                        <ActionButton
                          titulo="Eliminar objetivo"
                          danger
                          onClick={() => setConfirm(obj)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </ActionButton>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de objetivo */}
      <Modal isOpen={formAbierto !== null} onClose={() => setFormAbierto(null)}>
        <div className="space-y-4 p-1">
          <h2 className="text-lg font-bold text-slate-900">
            {formAbierto?.editando ? 'Editar objetivo' : 'Nuevo objetivo'}
          </h2>
          <form onSubmit={submit} className="space-y-4">
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
                <Label htmlFor="obj-inicio">Fecha de inicio</Label>
                <Input
                  id="obj-inicio"
                  type="date"
                  value={objForm.fecha_inicio}
                  onChange={(e) =>
                    setObjForm({ ...objForm, fecha_inicio: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="obj-fin">Fecha de fin</Label>
                <Input
                  id="obj-fin"
                  type="date"
                  value={objForm.fecha_fin}
                  onChange={(e) => setObjForm({ ...objForm, fecha_fin: e.target.value })}
                  className={formErrors.fecha_fin ? 'border-red-500' : ''}
                />
                {formErrors.fecha_fin && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.fecha_fin}
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Sin fechas, el objetivo cuenta en todas las evaluaciones; con
              fechas, solo en los periodos que solapen su rango.
            </p>
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
                {formAbierto?.editando ? 'Guardar cambios' : 'Añadir objetivo'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setFormAbierto(null)}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={confirm !== null}
        title="Eliminar objetivo"
        message={
          confirm
            ? `¿Seguro que quieres eliminar «${confirm.nombre}»? Sus metas también se eliminarán y los promedios se recalcularán.`
            : ''
        }
        type="danger"
        onConfirm={() => confirm && eliminarMutation.mutate(confirm.id_objetivos)}
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
