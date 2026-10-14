import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { rrhhService } from '../../services/rrhh';
import {
  COLOR_ESTADO_EVALUACION,
  type RrhhObjetivo,
} from '../../types/rrhh';
import {
  AlertCircle,
  ArrowLeft,
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

/** Valoración 1–5 → aporte en 0–100 (misma conversión que el backend). */
const aporte = (valoracion: number | null) =>
  valoracion === null ? null : (valoracion / 5) * 100;

/**
 * Objetivos de una evaluación, con su CRUD (solo en `borrador`).
 *
 * Llega `?evaluacion_id=N` desde la tabla de evaluaciones o desde el detalle.
 * La columna «Metas» es un botón que abre `/rrhh/metas?objetivo_id=`.
 */
export function ObjetivosPage() {
  const [searchParams] = useSearchParams();
  const evaluacionId = Number(searchParams.get('evaluacion_id')) || 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formAbierto, setFormAbierto] = useState<{
    editando: RrhhObjetivo | null;
  } | null>(null);
  const [confirm, setConfirm] = useState<RrhhObjetivo | null>(null);
  const [objForm, setObjForm] = useState({
    nombre: '',
    resultado_objetivo: '',
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
    queryKey: ['rrhh', 'evaluaciones', 'objetivos', evaluacionId],
    queryFn: () => rrhhService.obtenerEvaluacion(evaluacionId),
    enabled: evaluacionId > 0,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['rrhh', 'evaluaciones'] });

  const esBorrador = evaluacion?.estado === 'borrador';

  const objetivoMutation = useMutation({
    mutationFn: (id: number | undefined) => {
      const payload = {
        nombre: objForm.nombre.trim(),
        resultado_objetivo: objForm.resultado_objetivo.trim()
          ? objForm.resultado_objetivo
          : null,
        valoracion: objForm.valoracion === '' ? null : Number(objForm.valoracion),
        observaciones: objForm.observaciones.trim() ? objForm.observaciones : null,
      };
      return id
        ? rrhhService.editarObjetivo(id, payload)
        : rrhhService.crearObjetivo(evaluacionId, payload);
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
      resultado_objetivo: o?.resultado_objetivo ?? '',
      valoracion: o?.valoracion != null ? String(o.valoracion) : '',
      observaciones: o?.observaciones ?? '',
    });
    setFormErrors({});
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!objForm.nombre.trim()) {
      setFormErrors({ nombre: 'El nombre es obligatorio' });
      return;
    }
    objetivoMutation.mutate(formAbierto?.editando?.id_objetivos);
  };

  if (!evaluacionId) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Target className="h-10 w-10 text-slate-300" />
        <p className="max-w-sm text-sm text-slate-500">
          Esta página muestra los objetivos de una evaluación concreta. Elige una
          evaluación desde su listado para verlos.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/rrhh/evaluaciones')}>
          <ArrowLeft className="h-4 w-4" />
          Ir a evaluaciones
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

  if (isError || !evaluacion) {
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
            title="Volver al listado de evaluaciones"
            onClick={() => navigate('/rrhh/evaluaciones')}
            className="mt-1 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Target className="h-6 w-6 text-brand-600" />
              Objetivos de {evaluacion.empleado_nombre || 'la evaluación'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {evaluacion.empleado_codigo} ·{' '}
              {evaluacion.tipo_evaluacion ?? '—'} · Periodo{' '}
              {evaluacion.periodo} · Promedio objetivos{' '}
              {evaluacion.promedio_objetivos === null
                ? '—'
                : `${Number(evaluacion.promedio_objetivos).toFixed(1)}%`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${COLOR_ESTADO_EVALUACION[evaluacion.estado]}`}
          >
            {evaluacion.estado === 'borrador' ? 'Borrador' : 'Finalizada'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/rrhh/evaluaciones/${evaluacion.id}`)}
          >
            <ClipboardCheck className="h-4 w-4" />
            Ver evaluación
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {esBorrador && (
            <Button size="sm" onClick={() => abrir()}>
              <Plus className="h-4 w-4" />
              Nuevo objetivo
            </Button>
          )}
        </div>
      </div>

      {!esBorrador && (
        <div className="rounded-md bg-slate-100 px-4 py-2 text-xs text-slate-600">
          Evaluación finalizada: los objetivos y sus metas quedan congelados.
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {evaluacion.objetivos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Target className="h-10 w-10 text-slate-300" />
              <p className="max-w-sm text-sm text-slate-500">
                Aún no hay objetivos. Su valoración (1–5) alimenta el promedio de
                objetivos en escala 0–100.
              </p>
              {esBorrador && (
                <Button size="sm" onClick={() => abrir()}>
                  <Plus className="h-4 w-4" />
                  Nuevo objetivo
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Objetivo</TableHead>
                  <TableHead className="w-32">Valoración</TableHead>
                  <TableHead className="text-center">Metas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluacion.objetivos.map((obj) => (
                  <TableRow key={obj.id_objetivos}>
                    <TableCell>
                      <p className="font-medium text-slate-900">{obj.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {obj.resultado_objetivo || 'Sin resultado registrado'}
                      </p>
                      {obj.observaciones && (
                        <p className="mt-0.5 max-w-xl truncate text-xs text-slate-400">
                          {obj.observaciones}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums text-slate-700">
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
                      {esBorrador ? (
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
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
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
            ? `¿Seguro que quieres eliminar «${confirm.nombre}»? Sus metas también se eliminarán y el promedio se recalculará.`
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
