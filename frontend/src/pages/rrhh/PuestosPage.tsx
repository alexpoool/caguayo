import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rrhhService } from '../../services/rrhh';
import type { RrhhPuesto, RrhhPuestoCreate, RrhhPuestoListado } from '../../types/rrhh';
import {
  Plus,
  Edit,
  Trash2,
  Briefcase,
  Save,
  X,
  RefreshCw,
  AlertCircle,
  Loader2,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  ConfirmModal,
} from '../../components/ui';

const fmtMoneda = (v: number | null | undefined) =>
  v === null || v === undefined
    ? '—'
    : new Intl.NumberFormat('es-CU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(v);

export function PuestosPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editing, setEditing] = useState<RrhhPuesto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroDepto, setFiltroDepto] = useState<number | ''>('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    puesto: RrhhPuesto | null;
  }>({ isOpen: false, puesto: null });

  const [formData, setFormData] = useState<RrhhPuestoCreate>({
    nombre: '',
    descripcion: '',
    departamento_id: null,
    salario_minimo: null,
    salario_maximo: null,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: departamentos = [] } = useQuery({
    queryKey: ['rrhh', 'departamentos', 'para-filtro'],
    queryFn: () => rrhhService.listarDepartamentos({ limit: 500, activo: true }),
  });

  const {
    data: puestos = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['rrhh', 'puestos', searchTerm, filtroDepto],
    queryFn: () =>
      rrhhService.listarPuestos({
        limit: 500,
        buscar: searchTerm || undefined,
        departamento_id: filtroDepto === '' ? undefined : filtroDepto,
      }),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['rrhh', 'puestos'] });

  const handleNuevo = () => {
    setEditing(null);
    setFormData({
      nombre: '',
      descripcion: '',
      departamento_id: null,
      salario_minimo: null,
      salario_maximo: null,
    });
    setFormErrors({});
    setView('form');
  };

  const handleEditar = (p: RrhhPuesto) => {
    setEditing(p);
    setFormData({
      nombre: p.nombre,
      descripcion: p.descripcion,
      departamento_id: p.departamento_id,
      salario_minimo: p.salario_minimo,
      salario_maximo: p.salario_maximo,
      activo: p.activo,
    });
    setFormErrors({});
    setView('form');
  };

  const validar = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.nombre?.trim()) errs.nombre = 'El nombre es obligatorio';
    const min = formData.salario_minimo;
    const max = formData.salario_maximo;
    if (min !== null && min !== undefined && max !== null && max !== undefined && max < min) {
      errs.salario_maximo = 'El salario máximo no puede ser menor que el mínimo';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        return await rrhhService.updatePuesto(editing.id_puesto, formData);
      }
      return await rrhhService.createPuesto(formData);
    },
    onSuccess: () => {
      toast.success(editing ? 'Puesto actualizado' : 'Puesto creado');
      invalidate();
      setView('list');
    },
    onError: (err: any) => toast.error(err?.message || 'No se pudo guardar'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rrhhService.deletePuesto(id),
    onSuccess: (res) => {
      toast.success(
        res.accion === 'eliminado'
          ? 'Puesto eliminado'
          : 'Puesto desactivado (tiene empleados asignados)'
      );
      invalidate();
      setConfirmModal({ isOpen: false, puesto: null });
    },
    onError: (err: any) => toast.error(err?.message || 'No se pudo eliminar'),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar()) return;
    saveMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Briefcase className="h-6 w-6 text-brand-600" />
            Puestos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Puestos de trabajo y sus rangos salariales
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {view === 'list' ? (
            <Button size="sm" onClick={handleNuevo}>
              <Plus className="h-4 w-4" />
              Nuevo puesto
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setView('list')}>
              <X className="h-4 w-4" />
              Volver
            </Button>
          )}
        </div>
      </div>

      {view === 'list' ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Buscar puesto por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={filtroDepto}
                onChange={(e) =>
                  setFiltroDepto(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Todos los departamentos</option>
                {departamentos.map((d) => (
                  <option key={d.id_departamento} value={d.id_departamento}>
                    {d.nombre}
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
            ) : puestos.length === 0 ? (
              <EmptyState
                mensaje={
                  searchTerm
                    ? 'No se encontraron puestos con ese nombre'
                    : 'Aún no hay puestos. Crea el primero con el botón «Nuevo puesto».'
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead className="text-right">Salario mínimo</TableHead>
                    <TableHead className="text-right">Salario máximo</TableHead>
                    <TableHead className="text-center">Empleados</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {puestos.map((p: RrhhPuestoListado) => (
                    <TableRow key={p.id_puesto}>
                      <TableCell className="font-medium text-slate-900">{p.nombre}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-slate-500">
                        {p.descripcion || '—'}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {p.departamento_nombre || 'Sin departamento'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtMoneda(p.salario_minimo)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtMoneda(p.salario_maximo)}
                      </TableCell>
                      <TableCell className="text-center text-slate-600">
                        {p.total_empleados}
                      </TableCell>
                      <TableCell className="text-center">
                        <EstadoBadge activo={p.activo} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <ActionButton titulo="Editar" onClick={() => handleEditar(p)}>
                            <Edit className="h-4 w-4" />
                          </ActionButton>
                          <ActionButton
                            titulo="Eliminar"
                            danger
                            onClick={() => setConfirmModal({ isOpen: true, puesto: p })}
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
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? `Editar: ${editing.nombre}` : 'Nuevo puesto'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="max-w-xl space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej. Contador, Vendedor, Operario"
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
                  placeholder="Responsabilidades del puesto (opcional)"
                  rows={3}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="departamento">Departamento</Label>
                <select
                  id="departamento"
                  value={formData.departamento_id ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      departamento_id: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Sin departamento</option>
                  {departamentos.map((d) => (
                    <option key={d.id_departamento} value={d.id_departamento}>
                      {d.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="salario_minimo">Salario mínimo</Label>
                  <Input
                    id="salario_minimo"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.salario_minimo ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salario_minimo: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salario_maximo">Salario máximo</Label>
                  <Input
                    id="salario_maximo"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.salario_maximo ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salario_maximo: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    placeholder="0.00"
                    className={formErrors.salario_maximo ? 'border-red-500' : ''}
                  />
                  {formErrors.salario_maximo && (
                    <p className="flex items-center gap-1 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.salario_maximo}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {editing ? 'Guardar cambios' : 'Crear puesto'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setView('list')}>
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Eliminar puesto"
        message={
          confirmModal.puesto
            ? `¿Seguro que quieres eliminar «${confirmModal.puesto.nombre}»? Si tiene empleados asignados se desactivará en su lugar.`
            : ''
        }
        type="danger"
        onConfirm={() =>
          confirmModal.puesto && deleteMutation.mutate(confirmModal.puesto.id_puesto)
        }
        onClose={() => setConfirmModal({ isOpen: false, puesto: null })}
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
      <Briefcase className="h-10 w-10 text-slate-300" />
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
        {mensaje || 'No se pudieron cargar los puestos'}
      </p>
      <Button variant="outline" size="sm" onClick={onReintentar}>
        Reintentar
      </Button>
    </div>
  );
}
