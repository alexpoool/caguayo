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
  Hash,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Target,
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

/** Rango del periodo (inicio – fin) en formato legible. */
function rangoFechas(inicio: string, fin: string): string {
  const fmt = (f: string) =>
    new Date(`${f}T00:00:00`).toLocaleDateString('es-CU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  return `${fmt(inicio)} – ${fmt(fin)}`;
}

/** Peso en español sin ceros sobrantes: 2.00 → «2», 2.50 → «2,5». */
const fmtPeso = (v: string | number) =>
  String(Number(Number(v).toFixed(2))).replace('.', ',');

// Degradado de la página (esmeralda), referenciado de la página de Monedas
const GRADIENTE =
  'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300';

/**
 * Objetivos de un empleado, con su CRUD (siempre editable).
 *
 * Llega `?empleado_id=N` desde la tabla de empleados, desde la de
 * evaluaciones o desde el detalle de una evaluación. Se **definen** aquí
 * (nombre, periodo obligatorio y peso entero 1–100) y se **seleccionan y puntúan**
 * en la evaluación: el peso decide cuánto aporta cada objetivo al promedio
 * ponderado (0–5) de la evaluación que lo incluya.
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
    periodo_inicio: '',
    periodo_fin: '',
    peso: '1',
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
        periodo_inicio: objForm.periodo_inicio,
        periodo_fin: objForm.periodo_fin,
        peso: Number(String(objForm.peso).replace(',', '.')),
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
      periodo_inicio: o?.periodo_inicio ?? '',
      periodo_fin: o?.periodo_fin ?? '',
      peso: o ? String(Number(o.peso)) : '1',
      observaciones: o?.observaciones ?? '',
    });
    setFormErrors({});
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!objForm.nombre.trim()) errs.nombre = 'El nombre es obligatorio';
    if (!objForm.periodo_inicio) {
      errs.periodo_inicio = 'El periodo de inicio es obligatorio';
    }
    if (!objForm.periodo_fin) {
      errs.periodo_fin = 'El periodo de fin es obligatorio';
    }
    if (
      objForm.periodo_inicio &&
      objForm.periodo_fin &&
      objForm.periodo_fin < objForm.periodo_inicio
    ) {
      errs.periodo_fin = 'El fin no puede ser anterior al inicio';
    }
    const peso = Number(String(objForm.peso).replace(',', '.'));
    if (!Number.isInteger(peso) || peso < 1 || peso > 100) {
      errs.peso = 'El peso debe ser un número entero entre 1 y 100';
      toast.error('El peso debe ser un número entero entre 1 y 100');
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
              periodo y peso definen en qué evaluaciones cuentan
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
            title="Los objetivos se seleccionan y puntúan al calificar una evaluación"
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
                Define aquí los objetivos del periodo con su peso; después
                selecciónalos y puntúalos en la evaluación del empleado
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
                        Nombre
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4 text-sky-500" />
                        Empleado
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <CalendarRange className="h-4 w-4 text-sky-500" />
                        Periodo
                      </div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Hash className="h-4 w-4 text-purple-500" />
                        Peso
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
                      <TableCell className="text-slate-600">
                        {nombreEmpleado}
                        {empleado?.codigo_empleado
                          ? ` · ${empleado.codigo_empleado}`
                          : ''}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <CalendarRange className="h-3.5 w-3.5 text-slate-400" />
                          {rangoFechas(obj.periodo_inicio, obj.periodo_fin)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-slate-700">
                        {fmtPeso(obj.peso)}
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
      <Modal
        isOpen={formAbierto !== null}
        onClose={() => setFormAbierto(null)}
        className="overflow-hidden"
      >
        {/* Cabecera con el degradado de la página */}
        <div className="sticky top-0 flex items-center gap-3 border-b bg-gradient-to-r from-emerald-50 to-emerald-100 px-6 py-4">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg">
            <Target className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            {formAbierto?.editando ? 'Editar objetivo' : 'Nuevo objetivo'}
          </h2>
        </div>
        <form onSubmit={submit} className="px-6 pt-5 space-y-4">
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
                  Periodo inicio *
                </Label>
                <Input
                  id="obj-inicio"
                  type="date"
                  value={objForm.periodo_inicio}
                  onChange={(e) =>
                    setObjForm({ ...objForm, periodo_inicio: e.target.value })
                  }
                  className={`transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${formErrors.periodo_inicio ? 'border-red-500' : ''}`}
                />
                {formErrors.periodo_inicio && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.periodo_inicio}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="obj-fin"
                  className="flex items-center gap-2 text-gray-700"
                >
                  <Calendar className="h-4 w-4 text-rose-500" />
                  Periodo fin *
                </Label>
                <Input
                  id="obj-fin"
                  type="date"
                  value={objForm.periodo_fin}
                  onChange={(e) => setObjForm({ ...objForm, periodo_fin: e.target.value })}
                  className={`transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${formErrors.periodo_fin ? 'border-red-500' : ''}`}
                />
                {formErrors.periodo_fin && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.periodo_fin}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="obj-peso"
                className="flex items-center gap-2 text-gray-700"
              >
                <Hash className="h-4 w-4 text-purple-500" />
                Peso *
              </Label>
              <Input
                id="obj-peso"
                type="number"
                min={1}
                max={100}
                step={1}
                value={objForm.peso}
                onChange={(e) => setObjForm({ ...objForm, peso: e.target.value })}
                className={`transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${formErrors.peso ? 'border-red-500' : ''}`}
              />
              {formErrors.peso ? (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.peso}
                </p>
              ) : (
                <p className="text-xs text-gray-500">
                  Entero entre 1 y 100 (defecto 1): cuánto pesa el objetivo en
                  el promedio ponderado de cada evaluación que lo seleccione.
                </p>
              )}
            </div>
            <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
              El periodo es obligatorio: decide en qué evaluaciones puede
              seleccionarse el objetivo (su rango debe solapar el de la
              evaluación).
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
            {/* Pie fijo: siempre visible aunque el formulario haga scroll */}
            <div className="sticky bottom-0 -mx-6 flex items-center gap-2 border-t bg-white px-6 pb-5 pt-4">
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
      </Modal>

      <ConfirmModal
        isOpen={confirm !== null}
        title="Eliminar objetivo"
        message={
          confirm
            ? `¿Seguro que quieres eliminar «${confirm.nombre}»? Sus filas en las evaluaciones se eliminarán y los promedios se recalcularán.`
            : ''
        }
        type="danger"
        onConfirm={() => confirm && eliminarMutation.mutate(confirm.id_objetivos)}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
