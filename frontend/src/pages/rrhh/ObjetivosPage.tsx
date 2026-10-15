import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { rrhhService } from '../../services/rrhh';
import { type RrhhObjetivo } from '../../types/rrhh';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CalendarRange,
  ClipboardCheck,
  FileText,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Target,
  Trash2,
  TrendingUp,
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

// Degradado de la página (esmeralda), referenciado de la página de Monedas
const GRADIENTE =
  'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300';

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
      <div className="flex flex-col items-center gap-3 py-16 text-center animate-fade-in-up">
        <div className="p-4 bg-slate-50 rounded-full">
          <Target className="h-10 w-10 text-emerald-300" />
        </div>
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
      <div className="flex flex-col items-center justify-center h-96 gap-4 animate-fade-in-up">
        <div className="p-4 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full animate-pulse">
          <Target className="h-12 w-12 text-emerald-600 animate-spin" />
        </div>
        <div className="text-gray-600 font-medium">Cargando objetivos...</div>
      </div>
    );
  }

  if (isError || !objetivos) {
    return (
      <div className="flex items-center justify-center h-64 animate-fade-in-up">
        <div className="text-center bg-red-50 border border-red-200 rounded-md p-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="font-bold text-lg mb-2 text-red-700">
            Error al cargar objetivos
          </p>
          <p className="text-red-600 mb-4">
            {(error as any)?.message || 'No se pudieron cargar los objetivos'}
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
    <div className="space-y-4 animate-fade-in-up">
      {/* Header con icono animado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded shadow-lg animate-bounce-subtle">
            <Target className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">
              Objetivos de {nombreEmpleado}
            </h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              {empleado?.codigo_empleado ? `${empleado.codigo_empleado} · ` : ''}
              {objetivos.length} objetivo{objetivos.length === 1 ? '' : 's'} ·
              Resultado medio {medio === null ? '—' : `${medio.toFixed(1)}/5`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <Button
            variant="secondary"
            onClick={() => navigate('/rrhh/empleados')}
            className="gap-2 hover:scale-105 transition-transform"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/rrhh/evaluaciones')}
            title="La valoración de las metas se hace al calificar una evaluación"
            className="gap-2"
          >
            <ClipboardCheck className="h-4 w-4" />
            Ir a evaluaciones
          </Button>
          <Button onClick={() => abrir()} className={`gap-2 ${GRADIENTE}`}>
            <Plus className="h-4 w-4" />
            Nuevo objetivo
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <CardContent>
          {objetivos.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-gray-400">
              <div className="p-4 bg-slate-50 rounded-full mb-2">
                <Target className="h-12 w-12 text-gray-300" />
              </div>
              <p className="text-lg font-medium mb-1">No se encontraron objetivos</p>
              <p className="text-sm mb-4">
                Define aquí las metas del periodo y puntúalas desde la evaluación
                del empleado
              </p>
              <Button onClick={() => abrir()} className={`gap-2 ${GRADIENTE}`}>
                <Plus className="h-4 w-4" />
                Nuevo objetivo
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gradient-to-r from-emerald-50 to-emerald-100">
                  <TableRow>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-emerald-500" />
                        Objetivo
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <CalendarRange className="h-4 w-4 text-sky-500" />
                        Rango
                      </div>
                    </TableHead>
                    <TableHead className="w-36">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-purple-500" />
                        Resultado
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <ListChecks className="h-4 w-4 text-amber-500" />
                        Metas
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {objetivos.map((obj) => (
                    <TableRow
                      key={obj.id_objetivos}
                      className="hover:bg-gray-50 transition-colors"
                    >
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
                          onClick={() =>
                            navigate(`/rrhh/metas?objetivo_id=${obj.id_objetivos}`)
                          }
                        >
                          Metas
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Editar objetivo"
                            onClick={() => abrir(obj)}
                            className="text-blue-600 hover:bg-blue-50 hover:scale-110 transition-all"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Eliminar objetivo"
                            onClick={() => setConfirm(obj)}
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

      {/* Modal de objetivo */}
      <Modal isOpen={formAbierto !== null} onClose={() => setFormAbierto(null)}>
        <div className="space-y-4 p-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg">
              <Target className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {formAbierto?.editando ? 'Editar objetivo' : 'Nuevo objetivo'}
            </h2>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="obj-nombre"
                className="flex items-center gap-2 text-gray-700"
              >
                <Type className="h-4 w-4 text-blue-500" />
                Nombre *
              </Label>
              <Input
                id="obj-nombre"
                value={objForm.nombre}
                onChange={(e) => setObjForm({ ...objForm, nombre: e.target.value })}
                placeholder="Ej. Aumentar ventas del trimestre"
                className={`transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${formErrors.nombre ? 'border-red-500' : ''}`}
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
                  htmlFor="obj-inicio"
                  className="flex items-center gap-2 text-gray-700"
                >
                  <Calendar className="h-4 w-4 text-sky-500" />
                  Fecha de inicio
                </Label>
                <Input
                  id="obj-inicio"
                  type="date"
                  value={objForm.fecha_inicio}
                  onChange={(e) =>
                    setObjForm({ ...objForm, fecha_inicio: e.target.value })
                  }
                  className="transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="obj-fin"
                  className="flex items-center gap-2 text-gray-700"
                >
                  <Calendar className="h-4 w-4 text-rose-500" />
                  Fecha de fin
                </Label>
                <Input
                  id="obj-fin"
                  type="date"
                  value={objForm.fecha_fin}
                  onChange={(e) => setObjForm({ ...objForm, fecha_fin: e.target.value })}
                  className={`transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${formErrors.fecha_fin ? 'border-red-500' : ''}`}
                />
                {formErrors.fecha_fin && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.fecha_fin}
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
              Sin fechas, el objetivo cuenta en todas las evaluaciones; con
              fechas, solo en los periodos que solapen su rango.
            </p>
            <div className="space-y-2">
              <Label
                htmlFor="obj-obs"
                className="flex items-center gap-2 text-gray-700"
              >
                <FileText className="h-4 w-4 text-amber-500" />
                Observaciones
              </Label>
              <textarea
                id="obj-obs"
                rows={3}
                value={objForm.observaciones}
                onChange={(e) => setObjForm({ ...objForm, observaciones: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all duration-200"
              />
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button
                type="submit"
                className={`gap-2 ${GRADIENTE}`}
                disabled={objetivoMutation.isPending}
              >
                {objetivoMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {formAbierto?.editando ? 'Guardar cambios' : 'Añadir objetivo'}
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
