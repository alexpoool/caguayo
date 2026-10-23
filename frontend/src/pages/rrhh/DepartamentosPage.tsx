import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rrhhService } from '../../services/rrhh';
import type {
  RrhhDepartamento,
  RrhhDepartamentoCreate,
  RrhhDepartamentoListado,
} from '../../types/rrhh';
import {
  Plus,
  Edit,
  Trash2,
  Building2,
  Save,
  X,
  AlertCircle,
  Loader2,
  Search,
  Eye,
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
  SearchSelect,
} from '../../components/ui';

interface Props {
  /** Cuando se navega a /rrhh/departamentos/:id, muestra el detalle. */
  detalleId?: number;
  onIrADetalle?: (id: number) => void;
}

export function DepartamentosPage({ onIrADetalle }: Props) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RrhhDepartamento | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activo' | 'inactivo'>('todos');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    departamento: RrhhDepartamento | null;
  }>({ isOpen: false, departamento: null });

  const [formData, setFormData] = useState<RrhhDepartamentoCreate>({
    nombre: '',
    descripcion: '',
    responsable: null,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [busquedaResponsable, setBusquedaResponsable] = useState('');

  const { data: departamentos = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['rrhh', 'departamentos', searchTerm, filtroEstado],
    queryFn: () =>
      rrhhService.listarDepartamentos({
        limit: 500,
        buscar: searchTerm || undefined,
        activo:
          filtroEstado === 'todos' ? undefined : filtroEstado === 'activo',
      }),
  });

  // Candidatos del responsable: lista inicial al abrir el formulario, busca bajo demanda
  const { data: candidatosResponsable = [], isFetching: buscandoResponsable } = useQuery({
    queryKey: ['rrhh', 'empleados', 'candidatos', busquedaResponsable],
    queryFn: () => rrhhService.candidatosEmpleados(busquedaResponsable),
    enabled: formOpen,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['rrhh', 'departamentos'] });

  const handleNuevo = () => {
    setEditing(null);
    setFormData({ nombre: '', descripcion: '', responsable: null });
    setFormErrors({});
    setFormOpen(true);
  };

  const handleEditar = (dep: RrhhDepartamento) => {
    setEditing(dep);
    setFormData({
      nombre: dep.nombre,
      descripcion: dep.descripcion,
      responsable: dep.responsable,
      activo: dep.activo,
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
    if (!formData.nombre?.trim()) errs.nombre = 'El nombre es obligatorio';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        return await rrhhService.updateDepartamento(editing.id_departamento, formData);
      }
      return await rrhhService.createDepartamento(formData);
    },
    onSuccess: () => {
      toast.success(editing ? 'Departamento actualizado' : 'Departamento creado');
      invalidate();
      setFormOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'No se pudo guardar');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rrhhService.deleteDepartamento(id),
    onSuccess: (res) => {
      toast.success(
        res.accion === 'eliminado'
          ? 'Departamento eliminado'
          : 'Departamento desactivado (tiene dependencias)'
      );
      invalidate();
      setConfirmModal({ isOpen: false, departamento: null });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'No se pudo eliminar');
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar()) return;
    saveMutation.mutate();
  };

  const opcionesResponsable = [
    { value: 0, label: 'Sin responsable' },
    ...candidatosResponsable.map((c) => ({
      value: c.id,
      label: `${c.apellido}, ${c.nombre}`,
      description: c.codigo_empleado ?? undefined,
      disabled: !c.activo,
    })),
  ];

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Building2 className="h-6 w-6 text-brand-600" />
            Departamentos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Estructura de departamentos y sus responsables
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar departamento por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as any)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="todos">Todos</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
        <Button size="sm" onClick={handleNuevo} className="ml-auto">
          <Plus className="h-4 w-4" />
          Nuevo departamento
        </Button>
      </div>

      {/* Contenido */}
      <Card>
          <CardContent>
            {isLoading ? (
              <LoadingRows />
            ) : isError ? (
              <ErrorState mensaje={(error as any)?.message} onReintentar={refetch} />
            ) : departamentos.length === 0 ? (
              <EmptyState
                mensaje={
                  searchTerm
                    ? 'No se encontraron departamentos con ese nombre'
                    : 'Aún no hay departamentos. Crea el primero con el botón «Nuevo departamento».'
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead className="text-center">Puestos</TableHead>
                    <TableHead className="text-center">Empleados</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departamentos.map((dep: RrhhDepartamentoListado) => (
                    <TableRow key={dep.id_departamento}>
                      <TableCell className="font-medium text-slate-900">
                        {dep.nombre}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-slate-500">
                        {dep.descripcion || '—'}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {dep.responsable_nombre || 'Sin asignar'}
                      </TableCell>
                      <TableCell className="text-center text-slate-600">
                        {dep.total_puestos}
                      </TableCell>
                      <TableCell className="text-center text-slate-600">
                        {dep.total_empleados}
                      </TableCell>
                      <TableCell className="text-center">
                        <EstadoBadge activo={dep.activo} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <ActionButton
                            titulo="Ver detalle"
                            onClick={() => onIrADetalle?.(dep.id_departamento)}
                          >
                            <Eye className="h-4 w-4" />
                          </ActionButton>
                          <ActionButton titulo="Editar" onClick={() => handleEditar(dep)}>
                            <Edit className="h-4 w-4" />
                          </ActionButton>
                          <ActionButton
                            titulo="Eliminar"
                            danger
                            onClick={() =>
                              setConfirmModal({ isOpen: true, departamento: dep })
                            }
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

      {/* Formulario de departamento (crear y editar) en modal cuadrado */}
      <Modal
        isOpen={formOpen}
        onClose={cerrarForm}
        className="!max-w-2xl overflow-hidden !rounded-none [&>button.absolute]:hidden"
      >
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-gradient-to-r from-brand-50 to-brand-100 px-6 py-4 pr-12">
          <div className="rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 p-2">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-gray-900">
              {editing ? `Editar: ${editing.nombre}` : 'Nuevo departamento'}
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
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  placeholder="Ej. Administración, Ventas, Producción"
                  className={formErrors.nombre ? 'border-red-500' : ''}
                />
                {formErrors.nombre && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.nombre}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <textarea
                  id="descripcion"
                  value={formData.descripcion || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, descripcion: e.target.value })
                  }
                  placeholder="Qué hace este departamento (opcional)"
                  rows={3}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsable">Responsable</Label>
                <SearchSelect
                  options={opcionesResponsable}
                  value={formData.responsable}
                  onChange={(v) =>
                    setFormData({
                      ...formData,
                      responsable: v === 0 ? null : v,
                    })
                  }
                  onSearch={setBusquedaResponsable}
                  placeholder="Buscar empleado responsable..."
                  loading={buscandoResponsable}
                  emptyMessage="Sin resultados"
                />
                <p className="text-xs text-slate-400">
                  Se busca por nombre o código. Debe ser un empleado activo.
                </p>
              </div>

              <div className="sticky bottom-0 -mx-6 flex items-center gap-2 border-t bg-white px-6 pb-1 pt-4">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {editing ? 'Guardar cambios' : 'Crear departamento'}
                </Button>
              </div>
            </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Eliminar departamento"
        message={
          confirmModal.departamento
            ? `¿Seguro que quieres eliminar «${confirmModal.departamento.nombre}»? Si tiene puestos o empleados se desactivará en su lugar.`
            : ''
        }
        type="danger"
        onConfirm={() =>
          confirmModal.departamento &&
          deleteMutation.mutate(confirmModal.departamento.id_departamento)
        }
        onClose={() => setConfirmModal({ isOpen: false, departamento: null })}
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
      <Building2 className="h-10 w-10 text-slate-300" />
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
        {mensaje || 'No se pudieron cargar los departamentos'}
      </p>
      <Button variant="outline" size="sm" onClick={onReintentar}>
        Reintentar
      </Button>
    </div>
  );
}
