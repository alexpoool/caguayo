import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { rrhhService } from '../../services/rrhh';
import { type RrhhMeta } from '../../types/rrhh';
import {
  AlertCircle,
  ArrowLeft,
  CalendarRange,
  ListChecks,
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

/** Rango de fechas de la meta; sin fechas sigue a su objetivo. */
function rangoFechas(inicio: string | null, fin: string | null): string {
  if (!inicio && !fin) return 'Sin fechas';
  const fmt = (f: string) =>
    new Date(`${f}T00:00:00`).toLocaleDateString('es-CU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  if (inicio && fin) return `${fmt(inicio)} – ${fmt(fin)}`;
  if (inicio) return `Desde ${fmt(inicio)}`;
  if (fin) return `Hasta ${fmt(fin)}`;
  return 'Sin fechas';
}

/**
 * Metas de un objetivo, con su CRUD (siempre editable).
 *
 * Llega `?objetivo_id=N` desde la columna «Metas» de la página de objetivos y
 * devuelve a ella mediante el enlace de cabecera. La **valoración** (1–5) no
 * se edita aquí: se pone al calificar la evaluación del empleado.
 */
export function MetasPage() {
  const [searchParams] = useSearchParams();
  const objetivoId = Number(searchParams.get('objetivo_id')) || 0;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formAbierto, setFormAbierto] = useState<{ editando: RrhhMeta | null } | null>(
    null
  );
  const [confirm, setConfirm] = useState<RrhhMeta | null>(null);
  const [metaForm, setMetaForm] = useState({
    nombre: '',
    resultado_meta: '' as string,
    fecha_inicio: '',
    fecha_fin: '',
    observaciones: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const {
    data: objetivo,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['rrhh', 'objetivos', 'detalle', objetivoId],
    queryFn: () => rrhhService.obtenerObjetivo(objetivoId),
    enabled: objetivoId > 0,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['rrhh', 'objetivos'] });
    queryClient.invalidateQueries({ queryKey: ['rrhh', 'evaluaciones'] });
  };

  const metaMutation = useMutation({
    mutationFn: (id: number | undefined) => {
      const payload = {
        nombre: metaForm.nombre.trim(),
        resultado_meta:
          metaForm.resultado_meta === '' ? null : Number(metaForm.resultado_meta),
        fecha_inicio: metaForm.fecha_inicio || null,
        fecha_fin: metaForm.fecha_fin || null,
        observaciones: metaForm.observaciones.trim() ? metaForm.observaciones : null,
      };
      return id
        ? rrhhService.editarMeta(id, payload)
        : rrhhService.crearMeta(objetivoId, payload);
    },
    onSuccess: () => {
      toast.success(formAbierto?.editando ? 'Meta actualizada' : 'Meta añadida');
      invalidate();
      setFormAbierto(null);
      setFormErrors({});
    },
    onError: (err: any) => toast.error(err?.message || 'No se pudo guardar la meta'),
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: number) => rrhhService.eliminarMeta(id),
    onSuccess: () => {
      toast.success('Meta eliminada');
      invalidate();
      setConfirm(null);
    },
    onError: (err: any) => toast.error(err?.message || 'No se pudo eliminar'),
  });

  const abrir = (m?: RrhhMeta) => {
    setFormAbierto({ editando: m ?? null });
    setMetaForm({
      nombre: m?.nombre ?? '',
      resultado_meta: m?.resultado_meta != null ? String(m.resultado_meta) : '',
      fecha_inicio: m?.fecha_inicio ?? '',
      fecha_fin: m?.fecha_fin ?? '',
      observaciones: m?.observaciones ?? '',
    });
    setFormErrors({});
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!metaForm.nombre.trim()) errs.nombre = 'El nombre es obligatorio';
    if (
      metaForm.fecha_inicio &&
      metaForm.fecha_fin &&
      metaForm.fecha_fin < metaForm.fecha_inicio
    ) {
      errs.fecha_fin = 'El fin no puede ser anterior al inicio';
    }
    if (Object.keys(errs).length) {
      setFormErrors(errs);
      return;
    }
    metaMutation.mutate(formAbierto?.editando?.id_metas);
  };

  const volverAObjetivos = () =>
    navigate(`/rrhh/objetivos?empleado_id=${objetivo?.empleado_id ?? ''}`);

  if (!objetivoId) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <ListChecks className="h-10 w-10 text-slate-300" />
        <p className="max-w-sm text-sm text-slate-500">
          Esta página muestra las metas de un objetivo concreto. Elige un
          objetivo desde su listado de empleados.
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

  if (isError || !objetivo) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-sm text-slate-600">
          {(error as any)?.message || 'No se pudieron cargar las metas'}
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            title="Volver a los objetivos"
            onClick={volverAObjetivos}
            className="mt-1 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <ListChecks className="h-6 w-6 text-brand-600" />
              Metas de «{objetivo.nombre}»
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {objetivo.empleado_nombre ?? '—'}
              {objetivo.empleado_codigo ? ` · ${objetivo.empleado_codigo}` : ''} ·
              Resultado del objetivo{' '}
              {objetivo.resultado_objetivo === null
                ? '—'
                : `${Number(objetivo.resultado_objetivo).toFixed(1)}/5`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={volverAObjetivos}>
            <Target className="h-4 w-4" />
            Ver objetivos
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => abrir()}>
            <Plus className="h-4 w-4" />
            Nueva meta
          </Button>
        </div>
      </div>

      <div className="rounded-md bg-slate-100 px-4 py-2 text-xs text-slate-600">
        Las metas se definen aquí y siempre son editables. Su valoración (1–5)
        se pone al calificar la evaluación del empleado (mientras esté en
        borrador) y promedia al resultado del objetivo.
      </div>

      <Card>
        <CardContent className="pt-6">
          {objetivo.metas.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <ListChecks className="h-10 w-10 text-slate-300" />
              <p className="max-w-sm text-sm text-slate-500">
                Este objetivo aún no tiene metas. Las metas se puntúan del 1 al 5
                desde la evaluación y alimentan el resultado del objetivo.
              </p>
              <Button size="sm" onClick={() => abrir()}>
                <Plus className="h-4 w-4" />
                Nueva meta
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meta</TableHead>
                  <TableHead>Rango</TableHead>
                  <TableHead className="w-40">Resultado</TableHead>
                  <TableHead className="w-44">Valoración</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {objetivo.metas.map((meta) => (
                  <TableRow key={meta.id_metas}>
                    <TableCell>
                      <p className="font-medium text-slate-900">{meta.nombre}</p>
                      {meta.observaciones && (
                        <p className="max-w-xl truncate text-xs text-slate-400">
                          {meta.observaciones}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <CalendarRange className="h-3.5 w-3.5 text-slate-400" />
                        {rangoFechas(meta.fecha_inicio, meta.fecha_fin)}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums text-slate-700">
                      {meta.resultado_meta != null ? meta.resultado_meta : (
                        <span className="text-slate-400">Sin resultado</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums text-slate-700">
                      {meta.valoracion != null ? (
                        <>
                          <strong className="text-slate-900">
                            {meta.valoracion}/5
                          </strong>
                          <span className="ml-1 text-xs text-slate-400">
                            en evaluación
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400">Sin puntuar</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ActionButton titulo="Editar meta" onClick={() => abrir(meta)}>
                          <Pencil className="h-4 w-4" />
                        </ActionButton>
                        <ActionButton
                          titulo="Eliminar meta"
                          danger
                          onClick={() => setConfirm(meta)}
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

      {/* Modal de meta */}
      <Modal isOpen={formAbierto !== null} onClose={() => setFormAbierto(null)}>
        <div className="space-y-4 p-1">
          <h2 className="text-lg font-bold text-slate-900">
            {formAbierto?.editando ? 'Editar meta' : 'Nueva meta'}
          </h2>
          <form onSubmit={submit} className="space-y-4">
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
                <Label htmlFor="meta-inicio">Fecha de inicio</Label>
                <Input
                  id="meta-inicio"
                  type="date"
                  value={metaForm.fecha_inicio}
                  onChange={(e) =>
                    setMetaForm({ ...metaForm, fecha_inicio: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta-fin">Fecha de fin</Label>
              <Input
                id="meta-fin"
                type="date"
                value={metaForm.fecha_fin}
                onChange={(e) => setMetaForm({ ...metaForm, fecha_fin: e.target.value })}
                className={formErrors.fecha_fin ? 'border-red-500' : ''}
              />
              {formErrors.fecha_fin && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.fecha_fin}
                </p>
              )}
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
                {formAbierto?.editando ? 'Guardar cambios' : 'Añadir meta'}
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
        title="Eliminar meta"
        message={
          confirm ? `¿Seguro que quieres eliminar «${confirm.nombre}»? Los promedios se recalcularán.` : ''
        }
        type="danger"
        onConfirm={() => confirm && eliminarMutation.mutate(confirm.id_metas)}
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
