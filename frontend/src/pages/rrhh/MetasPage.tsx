import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { rrhhService } from '../../services/rrhh';
import { type RrhhMeta } from '../../types/rrhh';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CalendarRange,
  FileText,
  Hash,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Star,
  TrendingUp,
  Trash2,
  Type,
  X,
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

// Degradado de la página (violeta), referenciado de la página de Monedas
const GRADIENTE =
  'bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300';

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
      <div className="flex flex-col items-center gap-3 py-16 text-center animate-fade-in-up">
        <div className="p-4 bg-slate-50 rounded-full">
          <ListChecks className="h-10 w-10 text-violet-300" />
        </div>
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
      <div className="flex flex-col items-center justify-center h-96 gap-4 animate-fade-in-up">
        <div className="p-4 bg-gradient-to-br from-violet-100 to-violet-200 rounded-full animate-pulse">
          <ListChecks className="h-12 w-12 text-violet-600 animate-spin" />
        </div>
        <div className="text-gray-600 font-medium">Cargando metas...</div>
      </div>
    );
  }

  if (isError || !objetivo) {
    return (
      <div className="flex items-center justify-center h-64 animate-fade-in-up">
        <div className="text-center bg-red-50 border border-red-200 rounded-md p-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="font-bold text-lg mb-2 text-red-700">
            Error al cargar metas
          </p>
          <p className="text-red-600 mb-4">
            {(error as any)?.message || 'No se pudieron cargar las metas'}
          </p>
          <div className="flex justify-center gap-2">
            <Button
              onClick={() => refetch()}
              className="gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/rrhh/empleados')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header con icono animado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-violet-500 to-violet-600 rounded shadow-lg animate-bounce-subtle">
            <ListChecks className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">
              Metas de «{objetivo.nombre}»
            </h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
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
          <Button
            variant="secondary"
            onClick={volverAObjetivos}
            className="gap-2 hover:scale-105 transition-transform"
          >
            <ArrowLeft className="h-4 w-4" />
            Ver objetivos
          </Button>
          <Button onClick={() => abrir()} className={`gap-2 ${GRADIENTE}`}>
            <Plus className="h-4 w-4" />
            Nueva meta
          </Button>
        </div>
      </div>

      <div className="rounded-md bg-violet-50 border border-violet-100 px-4 py-2 text-xs text-violet-700">
        Las metas se definen aquí y siempre son editables. Su valoración (1–5)
        se pone al calificar la evaluación del empleado (mientras esté en
        borrador) y promedia al resultado del objetivo.
      </div>

      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <CardContent>
          {objetivo.metas.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-gray-400">
              <div className="p-4 bg-slate-50 rounded-full mb-2">
                <ListChecks className="h-12 w-12 text-gray-300" />
              </div>
              <p className="text-lg font-medium mb-1">No se encontraron metas</p>
              <p className="text-sm mb-4">
                Este objetivo aún no tiene metas. Las metas se puntúan del 1 al 5
                desde la evaluación y alimentan el resultado del objetivo
              </p>
              <Button onClick={() => abrir()} className={`gap-2 ${GRADIENTE}`}>
                <Plus className="h-4 w-4" />
                Nueva meta
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gradient-to-r from-violet-50 to-violet-100">
                  <TableRow>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4 text-violet-500" />
                        Meta
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <CalendarRange className="h-4 w-4 text-sky-500" />
                        Rango
                      </div>
                    </TableHead>
                    <TableHead className="w-40">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                        Resultado
                      </div>
                    </TableHead>
                    <TableHead className="w-44">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500" />
                        Valoración
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {objetivo.metas.map((meta) => (
                    <TableRow
                      key={meta.id_metas}
                      className="hover:bg-gray-50 transition-colors"
                    >
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
                        {meta.resultado_meta != null ? (
                          meta.resultado_meta
                        ) : (
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
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Editar meta"
                            onClick={() => abrir(meta)}
                            className="text-blue-600 hover:bg-blue-50 hover:scale-110 transition-all"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Eliminar meta"
                            onClick={() => setConfirm(meta)}
                            className="text-red-600 hover:bg-red-50 hover:scale-110 transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de meta */}
      <Modal isOpen={formAbierto !== null} onClose={() => setFormAbierto(null)}>
        <div className="space-y-4 p-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg">
              <ListChecks className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {formAbierto?.editando ? 'Editar meta' : 'Nueva meta'}
            </h2>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="meta-nombre"
                className="flex items-center gap-2 text-gray-700"
              >
                <Type className="h-4 w-4 text-blue-500" />
                Nombre *
              </Label>
              <Input
                id="meta-nombre"
                value={metaForm.nombre}
                onChange={(e) => setMetaForm({ ...metaForm, nombre: e.target.value })}
                placeholder="Ej. Cerrar 10 contratos"
                className={`transition-all duration-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 ${formErrors.nombre ? 'border-red-500' : ''}`}
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
                <Label
                  htmlFor="meta-resultado"
                  className="flex items-center gap-2 text-gray-700"
                >
                  <Hash className="h-4 w-4 text-emerald-500" />
                  Resultado (número)
                </Label>
                <Input
                  id="meta-resultado"
                  type="number"
                  value={metaForm.resultado_meta}
                  onChange={(e) =>
                    setMetaForm({ ...metaForm, resultado_meta: e.target.value })
                  }
                  placeholder="Ej. 9"
                  className="transition-all duration-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="meta-inicio"
                  className="flex items-center gap-2 text-gray-700"
                >
                  <Calendar className="h-4 w-4 text-sky-500" />
                  Fecha de inicio
                </Label>
                <Input
                  id="meta-inicio"
                  type="date"
                  value={metaForm.fecha_inicio}
                  onChange={(e) =>
                    setMetaForm({ ...metaForm, fecha_inicio: e.target.value })
                  }
                  className="transition-all duration-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="meta-fin"
                className="flex items-center gap-2 text-gray-700"
              >
                <Calendar className="h-4 w-4 text-rose-500" />
                Fecha de fin
              </Label>
              <Input
                id="meta-fin"
                type="date"
                value={metaForm.fecha_fin}
                onChange={(e) => setMetaForm({ ...metaForm, fecha_fin: e.target.value })}
                className={`transition-all duration-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 ${formErrors.fecha_fin ? 'border-red-500' : ''}`}
              />
              {formErrors.fecha_fin && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.fecha_fin}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="meta-obs"
                className="flex items-center gap-2 text-gray-700"
              >
                <FileText className="h-4 w-4 text-amber-500" />
                Observaciones
              </Label>
              <textarea
                id="meta-obs"
                rows={3}
                value={metaForm.observaciones}
                onChange={(e) => setMetaForm({ ...metaForm, observaciones: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all duration-200"
              />
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button
                type="submit"
                className={`gap-2 ${GRADIENTE}`}
                disabled={metaMutation.isPending}
              >
                {metaMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {formAbierto?.editando ? 'Guardar cambios' : 'Añadir meta'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setFormAbierto(null)}
                className="gap-2 hover:bg-gray-200 transition-colors"
              >
                <X className="h-4 w-4" />
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
