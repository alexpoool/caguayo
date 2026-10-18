import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { rrhhService } from "../../services/rrhh";
import {
  COLOR_ESTADO_EVALUACION,
  type RrhhEvaluacionCreate,
  type RrhhEvaluacionListado,
} from "../../types/rrhh";
import {
  AlertCircle,
  Calendar,
  CalendarRange,
  ClipboardCheck,
  Hash,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Star,
  Tag,
  Trash2,
  User,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
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
} from "../../components/ui";

/** Rango del periodo (inicio – fin) en formato legible. */
const fmtRango = (inicio: string, fin: string) => {
  const f = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString("es-CU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return `${f(inicio)} – ${f(fin)}`;
};

/** Fecha ISO local (sin desfase de UTC) para los inputs tipo date. */
const hoyISO = () => {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
};

/**
 * Formulario vacío: rango del periodo = hoy.
 *
 * Sin comentarios ni recomendaciones: se escriben ya en el detalle
 * (`/rrhh/evaluaciones/:id`), donde tienen su tarjeta propia.
 */
const formVacio = (): RrhhEvaluacionCreate => ({
  empleado_id: 0,
  periodo: "",
  tipo_evaluacion_id: 0,
  inicio_periodo: hoyISO(),
  fin_periodo: hoyISO(),
});

/** Promedio ponderado 0–5 con dos decimales; «—» sin puntuar. */
const fmtPromedio5 = (v: string | null | undefined) =>
  v === null || v === undefined || v === "" ? "—" : Number(v).toFixed(2);

// Degradado de la página (celeste), referenciado de la página de Monedas
const GRADIENTE =
  "bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300";

export function EvaluacionesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] =
    useState<RrhhEvaluacionListado | null>(null);

  const [formData, setFormData] = useState<RrhhEvaluacionCreate>(formVacio);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: empleados = [] } = useQuery({
    queryKey: ["rrhh", "empleados", "para-evaluaciones"],
    queryFn: () => rrhhService.listarEmpleados({ limit: 500, activo: true }),
  });

  // El selector de tipo tira del catálogo `tipos_evaluaciones` (solo activos).
  const { data: tiposEvaluacion = [] } = useQuery({
    queryKey: ["rrhh", "catalogos", "tipos-evaluacion", "activos"],
    queryFn: () =>
      rrhhService.listarTiposEvaluacion({ limit: 500, activo: true }),
  });

  const {
    data: evaluaciones = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["rrhh", "evaluaciones", searchTerm],
    queryFn: () =>
      rrhhService.listarEvaluaciones({
        limit: 500,
        buscar: searchTerm || undefined,
      }),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["rrhh", "evaluaciones"] });

  const cerrarForm = () => {
    setFormOpen(false);
    setFormErrors({});
  };

  const abrirForm = () => {
    setFormData(formVacio());
    setFormErrors({});
    setFormOpen(true);
  };

  const validar = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.empleado_id)
      errs.empleado_id = "Selecciona el empleado a evaluar";
    if (!formData.periodo.trim())
      errs.periodo = "El periodo es obligatorio (ej. 2026-1)";
    if (!formData.tipo_evaluacion_id) {
      errs.tipo_evaluacion_id = "Selecciona el tipo de evaluación";
    }
    if (formData.fin_periodo < formData.inicio_periodo) {
      errs.fin_periodo = "El fin debe ser posterior o igual al inicio";
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: (data: RrhhEvaluacionCreate) =>
      rrhhService.crearEvaluacion(data),
    onSuccess: (creada) => {
      toast.success("Evaluación creada en borrador");
      invalidate();
      cerrarForm();
      navigate(`/rrhh/evaluaciones/${creada.id}`);
    },
    onError: (err: any) =>
      toast.error(err?.message || "No se pudo crear la evaluación"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rrhhService.eliminarEvaluacion(id),
    onSuccess: () => {
      toast.success("Evaluación eliminada");
      invalidate();
      setConfirmDelete(null);
    },
    onError: (err: any) => toast.error(err?.message || "No se pudo eliminar"),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar()) return;
    createMutation.mutate(formData);
  };

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header con icono animado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-sky-500 to-sky-600 rounded shadow-lg animate-bounce-subtle">
            <ClipboardCheck className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">Evaluaciones</h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              {evaluaciones.length} evaluación
              {evaluaciones.length === 1 ? "" : "es"} · ciclo borrador →
              finalizada, con objetivos seleccionados y ponderados
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <Button onClick={abrirForm} className={`gap-2 ${GRADIENTE}`}>
            <Plus className="h-4 w-4" />
            Nueva evaluación
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, apellido o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
              <div className="p-4 bg-gradient-to-br from-sky-100 to-sky-200 rounded-full animate-pulse">
                <ClipboardCheck className="h-12 w-12 text-sky-600 animate-spin" />
              </div>
              <div className="text-gray-600 font-medium">
                Cargando evaluaciones...
              </div>
            </div>
          ) : isError ? (
            <ErrorState
              mensaje={(error as any)?.message}
              onReintentar={refetch}
            />
          ) : evaluaciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-gray-400">
              <div className="p-4 bg-slate-50 rounded-full mb-2">
                <ClipboardCheck className="h-12 w-12 text-gray-300" />
              </div>
              <p className="text-lg font-medium mb-1">
                No se encontraron evaluaciones
              </p>
              <p className="text-sm mb-4">
                Crea la primera con «Nueva evaluación», selecciona sus
                objetivos y puntúalos con estrellas
              </p>
              <Button onClick={abrirForm} className={`gap-2 ${GRADIENTE}`}>
                <Plus className="h-4 w-4" />
                Nueva evaluación
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gradient-to-r from-sky-50 to-sky-100">
                  <TableRow>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-sky-500" />
                        Nombre
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-purple-500" />
                        Periodo
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <CalendarRange className="h-4 w-4 text-emerald-500" />
                        Rango
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-amber-500" />
                        Tipo
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4 text-sky-500" />
                        Estado
                      </div>
                    </TableHead>
                    <TableHead className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Star className="h-4 w-4 text-amber-500" />
                        Promedio
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Objetivos</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluaciones.map((ev) => (
                    <TableRow
                      key={ev.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <TableCell className="font-medium text-slate-900">
                        {ev.empleado_nombre || "—"}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {ev.periodo}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <CalendarRange className="h-3.5 w-3.5 text-slate-400" />
                          {ev.inicio_periodo && ev.fin_periodo
                            ? fmtRango(ev.inicio_periodo, ev.fin_periodo)
                            : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {ev.tipo_evaluacion ?? "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${COLOR_ESTADO_EVALUACION[ev.estado]}`}
                        >
                          {ev.estado === "borrador" ? "Borrador" : "Finalizada"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-slate-900">
                        {ev.promedio_objetivos === null ? (
                          <span className="font-normal text-slate-400">
                            {ev.estado === "borrador" ? "Sin puntuar" : "—"}
                          </span>
                        ) : (
                          <span className="inline-flex items-baseline gap-1">
                            {fmtPromedio5(ev.promedio_objetivos)}
                            <span className="text-xs font-semibold text-slate-400">
                              / 5
                            </span>
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-slate-600">
                        {ev.cantidad_seleccionados}/{ev.cantidad_objetivos}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Editar evaluación"
                            onClick={() =>
                              navigate(`/rrhh/evaluaciones/${ev.id}`)
                            }
                            className="text-blue-600 hover:bg-blue-50 hover:scale-110 transition-all"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Eliminar evaluación"
                            onClick={() => setConfirmDelete(ev)}
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

      {/* Modal de nueva evaluación */}
      {/* Estilo cuadrilátero sin borde solo para este modal (sombra y fondo se mantienen) */}
      <Modal
        isOpen={formOpen}
        onClose={cerrarForm}
        className="overflow-hidden !rounded-none"
      >
        {/* Cabecera con el degradado de la página */}
        <div className="sticky top-0 flex items-center gap-3 border-b bg-gradient-to-r from-sky-50 to-sky-100 px-6 py-4">
          <div className="p-2 bg-gradient-to-br from-sky-500 to-sky-600 rounded-lg">
            <ClipboardCheck className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Nueva evaluación</h2>
        </div>
        <form onSubmit={onSubmit} className="px-6 pt-5 space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="empleado_id"
              className="flex items-center gap-2 text-gray-700"
            >
              <User className="h-4 w-4 text-sky-500" />
              Empleado
            </Label>
            <select
              id="empleado_id"
              value={formData.empleado_id || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  empleado_id:
                    e.target.value === "" ? 0 : Number(e.target.value),
                })
              }
              className={`w-full rounded-md border px-3 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${
                formErrors.empleado_id ? "border-red-500" : "border-slate-300"
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
              <Label
                htmlFor="periodo"
                className="flex items-center gap-2 text-gray-700"
              >
                <Hash className="h-4 w-4 text-purple-500" />
                Periodo
              </Label>
              <Input
                id="periodo"
                value={formData.periodo}
                onChange={(e) =>
                  setFormData({ ...formData, periodo: e.target.value })
                }
                placeholder="Ej. 2026-1"
                className={`transition-all duration-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${
                  formErrors.periodo ? "border-red-500" : ""
                }`}
              />
              {formErrors.periodo && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.periodo}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="tipo_evaluacion"
                className="flex items-center gap-2 text-gray-700"
              >
                <Tag className="h-4 w-4 text-amber-500" />
                Tipo
              </Label>
              <select
                id="tipo_evaluacion"
                value={formData.tipo_evaluacion_id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tipo_evaluacion_id: Number(e.target.value),
                  })
                }
                className={`w-full rounded-md border px-3 py-2 text-sm transition-all duration-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${
                  formErrors.tipo_evaluacion_id
                    ? "border-red-500"
                    : "border-slate-300"
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
              <Label
                htmlFor="inicio_periodo"
                className="flex items-center gap-2 text-gray-700"
              >
                <Calendar className="h-4 w-4 text-sky-500" />
                Inicio del periodo
              </Label>
              <Input
                id="inicio_periodo"
                type="date"
                value={formData.inicio_periodo}
                onChange={(e) =>
                  setFormData({ ...formData, inicio_periodo: e.target.value })
                }
                className="transition-all duration-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="fin_periodo"
                className="flex items-center gap-2 text-gray-700"
              >
                <Calendar className="h-4 w-4 text-rose-500" />
                Fin del periodo
              </Label>
              <Input
                id="fin_periodo"
                type="date"
                value={formData.fin_periodo}
                onChange={(e) =>
                  setFormData({ ...formData, fin_periodo: e.target.value })
                }
                className={`transition-all duration-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${
                  formErrors.fin_periodo ? "border-red-500" : ""
                }`}
              />
              {formErrors.fin_periodo && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.fin_periodo}
                </p>
              )}
            </div>
          </div>

          {/* Pie fijo: siempre visible aunque el formulario haga scroll */}
          <div className="sticky bottom-0 -mx-6 flex items-center gap-2 border-t bg-white px-6 pb-5 pt-4">
            <Button
              type="submit"
              className={`gap-2 ${GRADIENTE}`}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Crear evaluación
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={cerrarForm}
              className="gap-2 hover:bg-gray-200 transition-colors"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmDelete !== null}
        title="Eliminar evaluación"
        message={
          confirmDelete
            ? `¿Seguro que quieres eliminar la evaluación de «${confirmDelete.empleado_nombre}» (${confirmDelete.periodo})?`
            : ""
        }
        type="danger"
        onConfirm={() =>
          confirmDelete && deleteMutation.mutate(confirmDelete.id)
        }
        onClose={() => setConfirmDelete(null)}
      />
    </div>
  );
}

// ── Subcomponentes ─────────────────────────────────────────────────────────

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
        {mensaje || "No se pudieron cargar las evaluaciones"}
      </p>
      <Button variant="outline" size="sm" onClick={onReintentar}>
        Reintentar
      </Button>
    </div>
  );
}
