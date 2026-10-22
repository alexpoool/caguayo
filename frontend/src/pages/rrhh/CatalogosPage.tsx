import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rrhhService } from '../../services/rrhh';
import { DepartamentosPage } from './DepartamentosPage';
import { PuestosPage } from './PuestosPage';
import {
  RRHH_CATALOGOS,
  type RrhhCatalogo,
  type RrhhCatalogoConfig,
} from '../../types/rrhh';
import {
  Plus,
  Edit,
  Trash2,
  Settings,
  Save,
  X,
  RefreshCw,
  AlertCircle,
  Loader2,
  Search,
  Percent,
  Star,
  CalendarRange,
  CheckCircle2,
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
  DateInput,
  Modal,
} from '../../components/ui';

/** Filas del formulario según el catálogo seleccionado. */
interface FormState {
  nombre: string;
  descripcion: string | null;
  es_porcentaje: boolean;
  valor: number;
  fecha_inicio: string;
  fecha_fin: string;
}

const FORM_INICIAL: FormState = {
  nombre: '',
  descripcion: '',
  es_porcentaje: false,
  valor: 5,
  fecha_inicio: '',
  fecha_fin: '',
};

/** Fecha ISO (YYYY-MM-DD) a formato legible es-CU. */
const fmtFecha = (v: unknown) => {
  if (typeof v !== 'string' || !v) return '—';
  const [anio, mes, dia] = v.split('-');
  if (!anio || !mes || !dia) return v;
  return `${dia}/${mes}/${anio}`;
};

/** Escalas admitidas en el catálogo «Calificaciones» (el backend solo
 * acepta 5, 10 o 100 → escala 1–5, 1–10 o 1–100). */
const ESCALAS = [5, 10, 100];

/** Aplana cualquier catálogo a un registro para leer campos opcionales. */
const comoRegistro = (item: RrhhCatalogo): Record<string, unknown> =>
  item as unknown as Record<string, unknown>;

export function CatalogosPage() {
  const queryClient = useQueryClient();
  // La pestaña vive en la URL (`?tab=`): así las tarjetas de la portada y los
  // enlaces externos abren directamente la sección pedida.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tabId = RRHH_CATALOGOS.some((c) => c.id === tabParam)
    ? (tabParam as string)
    : RRHH_CATALOGOS[0].id;
  const config = RRHH_CATALOGOS.find((c) => c.id === tabId) as RrhhCatalogoConfig;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RrhhCatalogo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activo' | 'inactivo'>('todos');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    item: RrhhCatalogo | null;
  }>({ isOpen: false, item: null });

  const [form, setForm] = useState<FormState>(FORM_INICIAL);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const queryKey = ['rrhh', 'catalogos', tabId, searchTerm, filtroEstado];

  const {
    data: items = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () =>
      rrhhService.listarCatalogo(config, {
        limit: 500,
        buscar: searchTerm || undefined,
        activo:
          !config.tieneActivo || filtroEstado === 'todos'
            ? undefined
            : filtroEstado === 'activo',
      }),
    // Las pestañas con UI propia (Departamentos/Puestos) gestionan sus datos
    // con sus propias páginas: aquí no se pide nada.
    enabled: !config.custom,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['rrhh', 'catalogos', tabId] });

  const cambiarTab = (id: string) => {
    setSearchParams({ tab: id });
    setFormOpen(false);
    setEditing(null);
    setSearchTerm('');
    setFiltroEstado('todos');
    setFormErrors({});
  };

  const handleNuevo = () => {
    setEditing(null);
    setForm(FORM_INICIAL);
    setFormErrors({});
    setFormOpen(true);
  };

  const handleEditar = (item: RrhhCatalogo) => {
    setEditing(item);
    const registro = comoRegistro(item);
    setForm({
      nombre: (registro.nombre as string) ?? '',
      descripcion: (registro.descripcion as string | null) ?? '',
      es_porcentaje: (registro.es_porcentaje as boolean) ?? false,
      valor: (registro.valor as number) ?? 5,
      fecha_inicio: (registro.fecha_inicio as string) ?? '',
      fecha_fin: (registro.fecha_fin as string) ?? '',
    });
    setFormErrors({});
    setFormOpen(true);
  };

  /** Cierra el modal del formulario (crear o editar). */
  const cerrarForm = () => {
    setFormOpen(false);
    setFormErrors({});
  };

  const validar = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.nombre.trim()) errs.nombre = 'El nombre es obligatorio';
    else if (form.nombre.trim().length > config.maxNombre) {
      errs.nombre = `Máximo ${config.maxNombre} caracteres`;
    }
    if (config.tieneValor && !ESCALAS.includes(form.valor)) {
      errs.valor = 'La escala debe ser 1–5, 1–10 o 1–100';
    }
    if (config.tieneFechas) {
      if (!form.fecha_inicio) errs.fecha_inicio = 'La fecha de inicio es obligatoria';
      if (!form.fecha_fin) errs.fecha_fin = 'La fecha de fin es obligatoria';
      else if (form.fecha_inicio && form.fecha_fin < form.fecha_inicio) {
        errs.fecha_fin = 'El fin debe ser posterior o igual al inicio';
      }
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion || null,
      };
      if (config.tienePorcentaje) payload.es_porcentaje = form.es_porcentaje;
      if (config.tieneValor) payload.valor = form.valor;
      if (config.tieneFechas) {
        payload.fecha_inicio = form.fecha_inicio;
        payload.fecha_fin = form.fecha_fin;
      }

      if (editing) {
        return await rrhhService.updateCatalogo(
          config,
          idDe(editing),
          payload
        );
      }
      return await rrhhService.createCatalogo(config, payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Actualizado correctamente' : 'Creado correctamente');
      invalidate();
      setFormOpen(false);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'No se pudo guardar';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rrhhService.deleteCatalogo(config, id),
    onSuccess: (res) => {
      toast.success(
        res.accion === 'eliminado'
          ? 'Eliminado correctamente'
          : 'Desactivado (estaba en uso)'
      );
      invalidate();
      setConfirmModal({ isOpen: false, item: null });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'No se pudo eliminar';
      toast.error(msg);
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar()) return;
    saveMutation.mutate();
  };

  const idDe = (item: RrhhCatalogo) =>
    comoRegistro(item)[config.pk] as number;

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Settings className="h-6 w-6 text-brand-600" />
            Catálogos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Todo el catálogo del módulo: contratos, bonificaciones,
            deducciones, pagos, departamentos, puestos, tipos de evaluación,
            periodos de evaluación y calificaciones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!config.custom && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
            </Button>
          )}
          {!config.custom && (
            <Button size="sm" onClick={handleNuevo}>
              <Plus className="h-4 w-4" />
              Nuevo
            </Button>
          )}
        </div>
      </div>

      {/* Pestañas por catálogo */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {RRHH_CATALOGOS.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => cambiarTab(cat.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              cat.id === tabId
                ? 'bg-brand-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {cat.nombre}
          </button>
        ))}
      </div>

      {/* Contenido: pestañas con UI propia o CRUD genérico */}
      {config.custom === 'departamentos' ? (
        <DepartamentosPage />
      ) : config.custom === 'puestos' ? (
        <PuestosPage />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <p className="text-sm text-slate-500">{config.descripcion}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder={`Buscar en ${config.nombre.toLowerCase()}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              {config.tieneActivo && (
                <select
                  value={filtroEstado}
                  onChange={(e) =>
                    setFiltroEstado(e.target.value as typeof filtroEstado)
                  }
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="todos">Todos</option>
                  <option value="activo">Activos</option>
                  <option value="inactivo">Inactivos</option>
                </select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingRows />
            ) : isError ? (
              <ErrorState
                mensaje={error instanceof Error ? error.message : undefined}
                onReintentar={refetch}
              />
            ) : items.length === 0 ? (
              <EmptyState
                mensaje={
                  searchTerm
                    ? 'No se encontraron resultados con esa búsqueda.'
                    : `Aún no hay registros. Crea el primero con el botón «Nuevo».`
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    {config.tieneFechas && (
                      <>
                        <TableHead className="text-center">Inicio</TableHead>
                        <TableHead className="text-center">Fin</TableHead>
                      </>
                    )}
                    {config.tieneValor && (
                      <TableHead className="text-center">Valor</TableHead>
                    )}
                    {config.tienePorcentaje && (
                      <TableHead className="text-center">Tipo</TableHead>
                    )}
                    {config.tienePagado && (
                      <TableHead className="text-center">Pago por resultado</TableHead>
                    )}
                    {config.tieneActivo && (
                      <TableHead className="text-center">Estado</TableHead>
                    )}
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const registro = comoRegistro(item);
                    return (
                      <TableRow key={idDe(item)}>
                        <TableCell className="font-medium text-slate-900">
                          {registro.nombre as string}
                        </TableCell>
                        <TableCell className="max-w-[280px] truncate text-slate-500">
                          {(registro.descripcion as string | null) || '—'}
                        </TableCell>
                        {config.tieneFechas && (
                          <>
                            <TableCell className="text-center tabular-nums text-slate-600">
                              {fmtFecha(registro.fecha_inicio)}
                            </TableCell>
                            <TableCell className="text-center tabular-nums text-slate-600">
                              {fmtFecha(registro.fecha_fin)}
                            </TableCell>
                          </>
                        )}
                        {config.tieneValor && (
                          <TableCell className="text-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                              <Star className="h-3 w-3" />
                              {registro.valor as number}
                            </span>
                          </TableCell>
                        )}
                        {config.tienePorcentaje && (
                          <TableCell className="text-center">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                registro.es_porcentaje
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {registro.es_porcentaje ? (
                                <>
                                  <Percent className="h-3 w-3" /> Porcentaje
                                </>
                              ) : (
                                'Fijo'
                              )}
                            </span>
                          </TableCell>
                        )}
                        {config.tienePagado && (
                          <TableCell className="text-center">
                            {registro.pagado_x_resultado ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" />
                                Pagado
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                                Pendiente
                              </span>
                            )}
                          </TableCell>
                        )}
                        {config.tieneActivo && (
                          <TableCell className="text-center">
                            <EstadoBadge activo={registro.activo as boolean} />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <ActionButton titulo="Editar" onClick={() => handleEditar(item)}>
                              <Edit className="h-4 w-4" />
                            </ActionButton>
                            <ActionButton
                              titulo="Eliminar"
                              danger
                              onClick={() => setConfirmModal({ isOpen: true, item })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </ActionButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Formulario de catálogo (crear y editar) en modal cuadrado */}
      <Modal
        isOpen={formOpen}
        onClose={cerrarForm}
        className="!max-w-2xl overflow-hidden !rounded-none [&>button.absolute]:hidden"
      >
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-gradient-to-r from-brand-50 to-brand-100 px-6 py-4 pr-12">
          <div className="rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 p-2">
            <Settings className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-gray-900">
              {editing
                ? `Editar: ${editing.nombre}`
                : `Nuevo registro en ${config.nombre}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={cerrarForm}
            title="Cerrar"
            aria-label="Cerrar"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-brand-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-6 px-6 py-5">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Nombre del registro"
                  maxLength={config.maxNombre}
                  className={formErrors.nombre ? 'border-red-500' : ''}
                />
                {formErrors.nombre ? (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.nombre}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">
                    {form.nombre.length}/{config.maxNombre} caracteres
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <textarea
                  id="descripcion"
                  value={form.descripcion || ''}
                  onChange={(e) =>
                    setForm({ ...form, descripcion: e.target.value })
                  }
                  placeholder="Qué representa este registro (opcional)"
                  rows={3}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {config.tieneFechas && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label
                        htmlFor="fecha_inicio"
                        className="flex items-center gap-2"
                      >
                        <CalendarRange className="h-4 w-4 text-emerald-500" />
                        Fecha de inicio *
                      </Label>
                      <DateInput
                        id="fecha_inicio"
                        value={form.fecha_inicio}
                        onChange={(value) =>
                          setForm({ ...form, fecha_inicio: value })
                        }
                      />
                      {formErrors.fecha_inicio && (
                        <p className="flex items-center gap-1 text-xs text-red-600">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.fecha_inicio}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="fecha_fin"
                        className="flex items-center gap-2"
                      >
                        <CalendarRange className="h-4 w-4 text-rose-500" />
                        Fecha de fin *
                      </Label>
                      <DateInput
                        id="fecha_fin"
                        value={form.fecha_fin}
                        onChange={(value) =>
                          setForm({ ...form, fecha_fin: value })
                        }
                      />
                      {formErrors.fecha_fin && (
                        <p className="flex items-center gap-1 text-xs text-red-600">
                          <AlertCircle className="h-3 w-3" />
                          {formErrors.fecha_fin}
                        </p>
                      )}
                    </div>
                  </div>
                  {editing && Boolean(comoRegistro(editing).pagado_x_resultado) && (
                    <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                      Este periodo ya tiene un pago por resultado. Se puede
                      editar, pero no se podrá crear otro pago para él.
                    </p>
                  )}
                </>
              )}

              {config.tienePorcentaje && (
                <div className="flex items-center gap-2">
                  <input
                    id="es_porcentaje"
                    type="checkbox"
                    checked={form.es_porcentaje}
                    onChange={(e) =>
                      setForm({ ...form, es_porcentaje: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <Label htmlFor="es_porcentaje">
                    Se aplica como porcentaje del salario
                  </Label>
                </div>
              )}

              {config.tieneValor && (
                <div className="space-y-2">
                  <Label htmlFor="valor">Escala de puntuación *</Label>
                  <select
                    id="valor"
                    value={form.valor}
                    onChange={(e) =>
                      setForm({ ...form, valor: Number(e.target.value) })
                    }
                    className={`flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${
                      formErrors.valor ? 'border-red-500' : ''
                    }`}
                  >
                    {ESCALAS.map((v) => (
                      <option key={v} value={v}>
                        Escala 1–{v}
                      </option>
                    ))}
                  </select>
                  {formErrors.valor && (
                    <p className="flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.valor}
                    </p>
                  )}
                </div>
              )}

              <div className="sticky bottom-0 -mx-6 flex items-center gap-2 border-t bg-white px-6 pb-1 pt-4">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {editing ? 'Guardar cambios' : 'Crear registro'}
                </Button>
              </div>
            </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={`Eliminar ${config.nombre.toLowerCase().replace(/s$/, '')}`}
        message={
          confirmModal.item
            ? `¿Seguro que quieres eliminar «${
                comoRegistro(confirmModal.item).nombre as string
              }»? Si está en uso se desactivará en su lugar.`
            : ''
        }
        type="danger"
        onConfirm={() =>
          confirmModal.item && deleteMutation.mutate(idDe(confirmModal.item))
        }
        onClose={() => setConfirmModal({ isOpen: false, item: null })}
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

function EstadoBadge({ activo }: { activo: boolean }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
        activo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {activo ? 'Activo' : 'Inactivo'}
    </span>
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
      <Settings className="h-10 w-10 text-slate-300" />
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
        {mensaje || 'No se pudieron cargar los registros'}
      </p>
      <Button variant="outline" size="sm" onClick={onReintentar}>
        Reintentar
      </Button>
    </div>
  );
}
