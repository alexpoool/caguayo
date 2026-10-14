import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rrhhService } from '../../services/rrhh';
import {
  RRHH_ESTADOS_EMPLEADO,
  type RrhhEmpleado,
  type RrhhEmpleadoCreate,
  type RrhhEstadoEmpleado,
} from '../../types/rrhh';
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Save,
  X,
  RefreshCw,
  AlertCircle,
  Loader2,
  Search,
  BadgeCheck,
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
  SearchSelect,
} from '../../components/ui';

const ESTADO_BADGE: Record<RrhhEstadoEmpleado, string> = {
  activo: 'bg-green-100 text-green-700',
  suspendido: 'bg-red-100 text-red-700',
  vacaciones: 'bg-blue-100 text-blue-700',
  terminado: 'bg-slate-100 text-slate-500',
};

const fmtMoneda = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === ''
    ? '—'
    : new Intl.NumberFormat('es-CU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(v));

const fmtHora = (v: string | null | undefined) =>
  v ? v.slice(0, 5) : null;

export function EmpleadosPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editing, setEditing] = useState<RrhhEmpleado | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<RrhhEstadoEmpleado | ''>('');
  const [filtroDepto, setFiltroDepto] = useState<number | ''>('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    empleado: RrhhEmpleado | null;
  }>({ isOpen: false, empleado: null });

  const [formData, setFormData] = useState<RrhhEmpleadoCreate>({
    nombre: '',
    apellido: '',
    carnet_identidad: '',
    correo: '',
    telefono: '',
    direccion: '',
    fecha_nacimiento: '',
    puesto_id: null,
    departamento_id: null,
    tipo_contrato_id: null,
    supervisor: null,
    fecha_contratacion: '',
    salario: undefined,
    estado: 'activo',
    tipo_asistencia: 'NO_LIBRE',
    horario_inicio: '',
    horario_final: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Listas para los selectores del formulario
  const { data: departamentos = [] } = useQuery({
    queryKey: ['rrhh', 'departamentos', 'para-filtro'],
    queryFn: () => rrhhService.listarDepartamentos({ limit: 500, activo: true }),
  });

  const { data: puestos = [] } = useQuery({
    queryKey: ['rrhh', 'puestos', 'para-filtro'],
    queryFn: () => rrhhService.listarPuestos({ limit: 500, activo: true }),
  });

  const { data: tiposContrato = [] } = useQuery({
    queryKey: ['rrhh', 'catalogos', 'tipos-contrato', 'para-filtro'],
    queryFn: () => rrhhService.listarTiposContrato({ limit: 500, activo: true }),
  });

  const {
    data: empleados = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['rrhh', 'empleados', searchTerm, filtroEstado, filtroDepto],
    queryFn: () =>
      rrhhService.listarEmpleados({
        limit: 500,
        buscar: searchTerm || undefined,
        estado: filtroEstado || undefined,
        departamento_id: filtroDepto === '' ? undefined : filtroDepto,
      }),
  });

  // Selector de supervisor: lista inicial al abrir, busca bajo demanda
  const [busquedaSupervisor, setBusquedaSupervisor] = useState('');
  const { data: candidatosSupervisor = [], isFetching: buscandoSupervisor } = useQuery({
    queryKey: ['rrhh', 'empleados', 'candidatos', busquedaSupervisor],
    queryFn: () => rrhhService.candidatosEmpleados(busquedaSupervisor),
    enabled: view === 'form',
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['rrhh', 'empleados'] });

  const handleNuevo = () => {
    setEditing(null);
    setFormData({
      nombre: '',
      apellido: '',
      carnet_identidad: '',
      correo: '',
      telefono: '',
      direccion: '',
      fecha_nacimiento: '',
      puesto_id: null,
      departamento_id: null,
      tipo_contrato_id: null,
      supervisor: null,
      fecha_contratacion: '',
      salario: undefined,
      estado: 'activo',
      tipo_asistencia: 'NO_LIBRE',
      horario_inicio: '',
      horario_final: '',
    });
    setFormErrors({});
    setView('form');
  };

  const handleEditar = (emp: RrhhEmpleado) => {
    setEditing(emp);
    setFormData({
      nombre: emp.nombre,
      apellido: emp.apellido,
      carnet_identidad: emp.carnet_identidad ?? '',
      correo: emp.correo ?? '',
      telefono: emp.telefono ?? '',
      direccion: emp.direccion ?? '',
      fecha_nacimiento: emp.fecha_nacimiento ?? '',
      puesto_id: emp.puesto_id,
      departamento_id: emp.departamento_id,
      tipo_contrato_id: emp.tipo_contrato_id,
      supervisor: emp.supervisor,
      fecha_contratacion: emp.fecha_contratacion ?? '',
      salario: emp.salario === null ? undefined : Number(emp.salario),
      estado: emp.estado,
      tipo_asistencia: emp.tipo_asistencia,
      horario_inicio: fmtHora(emp.horario_inicio) ?? '',
      horario_final: fmtHora(emp.horario_final) ?? '',
    });
    setFormErrors({});
    setView('form');
  };

  const validar = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.nombre.trim()) errs.nombre = 'El nombre es obligatorio';
    if (!formData.apellido.trim()) errs.apellido = 'El apellido es obligatorio';
    if (formData.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) {
      errs.correo = 'El correo no tiene un formato válido';
    }
    const ini = formData.horario_inicio;
    const fin = formData.horario_final;
    if (ini && fin && fin <= ini) {
      errs.horario_final = 'El horario final debe ser posterior al inicio';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...formData,
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        carnet_identidad: formData.carnet_identidad?.trim() || null,
        correo: formData.correo?.trim() || null,
        telefono: formData.telefono?.trim() || null,
        direccion: formData.direccion?.trim() || null,
        fecha_nacimiento: formData.fecha_nacimiento || null,
        fecha_contratacion: formData.fecha_contratacion || null,
        horario_inicio: formData.horario_inicio || null,
        horario_final: formData.horario_final || null,
        salario: formData.salario === undefined ? null : formData.salario,
      };
      if (editing) {
        return await rrhhService.updateEmpleado(editing.id, payload);
      }
      return await rrhhService.createEmpleado(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Empleado actualizado' : 'Empleado creado');
      invalidate();
      setView('list');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'No se pudo guardar';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rrhhService.deleteEmpleado(id),
    onSuccess: (res) => {
      toast.success(
        res.accion === 'eliminado'
          ? 'Empleado eliminado'
          : 'Empleado desactivado (tiene historial)'
      );
      invalidate();
      setConfirmModal({ isOpen: false, empleado: null });
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

  const set = <K extends keyof RrhhEmpleadoCreate>(key: K, value: RrhhEmpleadoCreate[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const opcionesSupervisor = [
    { value: 0, label: 'Sin supervisor' },
    ...candidatosSupervisor
      .filter((c) => c.id !== editing?.id)
      .map((c) => ({
        value: c.id,
        label: `${c.apellido}, ${c.nombre}`,
        description: c.codigo_empleado ?? undefined,
      })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Users className="h-6 w-6 text-brand-600" />
            Empleados
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Ficha del personal, sus asignaciones y su estado
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {view === 'list' ? (
            <Button size="sm" onClick={handleNuevo}>
              <Plus className="h-4 w-4" />
              Nuevo empleado
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
                  placeholder="Buscar por nombre, código, carnet o correo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as RrhhEstadoEmpleado | '')}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Todos los estados</option>
                {RRHH_ESTADOS_EMPLEADO.map((e) => (
                  <option key={e.valor} value={e.valor}>
                    {e.etiqueta}
                  </option>
                ))}
              </select>
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
              <ErrorState
                mensaje={error instanceof Error ? error.message : undefined}
                onReintentar={refetch}
              />
            ) : empleados.length === 0 ? (
              <EmptyState
                mensaje={
                  searchTerm
                    ? 'No se encontraron empleados con esa búsqueda.'
                    : 'Aún no hay empleados dados de alta.'
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Puesto</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead className="text-right">Salario</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empleados.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono text-xs text-slate-500">
                        {emp.codigo_empleado ?? '—'}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">
                          {emp.apellido}, {emp.nombre}
                        </div>
                        <div className="text-xs text-slate-500">
                          {emp.carnet_identidad ?? '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {emp.puesto_nombre ?? '—'}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {emp.departamento_nombre ?? '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtMoneda(emp.salario)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                            ESTADO_BADGE[emp.estado] ?? 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {RRHH_ESTADOS_EMPLEADO.find((e) => e.valor === emp.estado)
                            ?.etiqueta ?? emp.estado}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <ActionButton titulo="Editar" onClick={() => handleEditar(emp)}>
                            <Edit className="h-4 w-4" />
                          </ActionButton>
                          <ActionButton
                            titulo="Eliminar"
                            danger
                            onClick={() => setConfirmModal({ isOpen: true, empleado: emp })}
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
            <CardTitle>
              {editing
                ? `Editar: ${editing.apellido}, ${editing.nombre}`
                : 'Nuevo empleado'}
            </CardTitle>
            {editing?.codigo_empleado && (
              <p className="font-mono text-xs text-slate-500">
                Código: {editing.codigo_empleado}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-6">
              {/* Datos personales */}
              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                  Datos personales
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <CampoTexto
                    id="nombre"
                    label="Nombre *"
                    valor={formData.nombre}
                    onChange={(v) => set('nombre', v)}
                    error={formErrors.nombre}
                  />
                  <CampoTexto
                    id="apellido"
                    label="Apellido *"
                    valor={formData.apellido}
                    onChange={(v) => set('apellido', v)}
                    error={formErrors.apellido}
                  />
                  <CampoTexto
                    id="carnet"
                    label="Carnet de identidad"
                    valor={formData.carnet_identidad ?? ''}
                    onChange={(v) => set('carnet_identidad', v)}
                  />
                  <CampoTexto
                    id="correo"
                    label="Correo"
                    tipo="email"
                    valor={formData.correo ?? ''}
                    onChange={(v) => set('correo', v)}
                    error={formErrors.correo}
                  />
                  <CampoTexto
                    id="telefono"
                    label="Teléfono"
                    valor={formData.telefono ?? ''}
                    onChange={(v) => set('telefono', v)}
                  />
                  <CampoTexto
                    id="fecha_nacimiento"
                    label="Fecha de nacimiento"
                    tipo="date"
                    valor={formData.fecha_nacimiento ?? ''}
                    onChange={(v) => set('fecha_nacimiento', v)}
                  />
                </div>
                <div className="mt-4">
                  <CampoTexto
                    id="direccion"
                    label="Dirección"
                    valor={formData.direccion ?? ''}
                    onChange={(v) => set('direccion', v)}
                  />
                </div>
              </section>

              {/* Asignación laboral */}
              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                  Asignación laboral
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Puesto</Label>
                    <select
                      value={formData.puesto_id ?? ''}
                      onChange={(e) =>
                        set('puesto_id', e.target.value === '' ? null : Number(e.target.value))
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">Sin puesto</option>
                      {puestos.map((p) => (
                        <option key={p.id_puesto} value={p.id_puesto}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Departamento</Label>
                    <select
                      value={formData.departamento_id ?? ''}
                      onChange={(e) =>
                        set(
                          'departamento_id',
                          e.target.value === '' ? null : Number(e.target.value)
                        )
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
                  <div className="space-y-2">
                    <Label>Tipo de contrato</Label>
                    <select
                      value={formData.tipo_contrato_id ?? ''}
                      onChange={(e) =>
                        set(
                          'tipo_contrato_id',
                          e.target.value === '' ? null : Number(e.target.value)
                        )
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">Sin tipo de contrato</option>
                      {tiposContrato.map((t) => (
                        <option
                          key={t.id_tipo_contrato}
                          value={t.id_tipo_contrato}
                        >
                          {t.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Supervisor</Label>
                    <SearchSelect
                      options={opcionesSupervisor}
                      value={formData.supervisor}
                      onChange={(v) => set('supervisor', v === 0 ? null : v)}
                      onSearch={setBusquedaSupervisor}
                      placeholder="Buscar supervisor..."
                      loading={buscandoSupervisor}
                      emptyMessage="Sin resultados"
                    />
                    <p className="text-xs text-slate-400">
                      Se busca por nombre o código. El propio empleado no puede
                      ser su supervisor.
                    </p>
                  </div>
                </div>
              </section>

              {/* Contrato y jornada */}
              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                  Contrato y jornada
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <CampoTexto
                    id="fecha_contratacion"
                    label="Fecha de contratación"
                    tipo="date"
                    valor={formData.fecha_contratacion ?? ''}
                    onChange={(v) => set('fecha_contratacion', v)}
                  />
                  <CampoTexto
                    id="salario"
                    label="Salario"
                    tipo="number"
                    valor={formData.salario === undefined ? '' : String(formData.salario)}
                    onChange={(v) =>
                      set('salario', v === '' ? undefined : Number(v))
                    }
                  />
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <select
                      value={formData.estado}
                      onChange={(e) => set('estado', e.target.value as RrhhEstadoEmpleado)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      {RRHH_ESTADOS_EMPLEADO.map((e) => (
                        <option key={e.valor} value={e.valor}>
                          {e.etiqueta}
                        </option>
                      ))}
                    </select>
                  </div>
                  <CampoTexto
                    id="horario_inicio"
                    label="Horario inicio"
                    tipo="time"
                    valor={formData.horario_inicio ?? ''}
                    onChange={(v) => set('horario_inicio', v)}
                  />
                  <CampoTexto
                    id="horario_final"
                    label="Horario final"
                    tipo="time"
                    valor={formData.horario_final ?? ''}
                    onChange={(v) => set('horario_final', v)}
                    error={formErrors.horario_final}
                  />
                  <div className="space-y-2">
                    <Label>Tipo de asistencia</Label>
                    <select
                      value={formData.tipo_asistencia}
                      onChange={(e) =>
                        set('tipo_asistencia', e.target.value as 'LIBRE' | 'NO_LIBRE')
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="NO_LIBRE">NO_LIBRE (asistir en horario)</option>
                      <option value="LIBRE">LIBRE (sin horario fijo)</option>
                    </select>
                  </div>
                </div>
              </section>

              <div className="flex items-center gap-2 border-t border-slate-100 pt-4">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {editing ? 'Guardar cambios' : 'Crear empleado'}
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
        title="Eliminar empleado"
        message={
          confirmModal.empleado
            ? `¿Seguro que quieres eliminar a «${confirmModal.empleado.apellido}, ${confirmModal.empleado.nombre}»? Si tiene historial o subordinados se desactivará en su lugar.`
            : ''
        }
        type="danger"
        onConfirm={() =>
          confirmModal.empleado && deleteMutation.mutate(confirmModal.empleado.id)
        }
        onClose={() => setConfirmModal({ isOpen: false, empleado: null })}
      />
    </div>
  );
}

// ── Subcomponentes ─────────────────────────────────────────────────────────

function CampoTexto({
  id,
  label,
  valor,
  onChange,
  tipo = 'text',
  error,
}: {
  id: string;
  label: string;
  valor: string;
  onChange: (v: string) => void;
  tipo?: string;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={tipo}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className={error ? 'border-red-500' : ''}
      />
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

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

function LoadingRows() {
  return (
    <div className="space-y-2 py-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-md bg-slate-100" />
      ))}
    </div>
  );
}

function EmptyState({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <BadgeCheck className="h-10 w-10 text-slate-300" />
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
        {mensaje || 'No se pudieron cargar los empleados'}
      </p>
      <Button variant="outline" size="sm" onClick={onReintentar}>
        Reintentar
      </Button>
    </div>
  );
}
