import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { rrhhService } from '../../services/rrhh';
import { useInfiniteList } from '../../hooks/useInfiniteList';
import {
  RRHH_ESTADOS_EMPLEADO,
  type RrhhEmpleado,
  type RrhhEmpleadoCreate,
  type RrhhEmpleadoListado,
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
  Hash,
  Type,
  CreditCard,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Briefcase,
  Building2,
  FileText,
  UserCheck,
  CircleDollarSign,
  BadgeCheck,
  Clock,
  Timer,
  Target,
  ClipboardCheck,
  MoreVertical,
  PlusCircle,
  MinusCircle,
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
  Modal,
  SearchSelect,
} from '../../components/ui';

const fmtHora = (v: string | null | undefined) =>
  v ? v.slice(0, 5) : null;

const fmtMoneda = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === ''
    ? '—'
    : new Intl.NumberFormat('es-CU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(v));

const fmtFecha = (v: string | null | undefined) =>
  v
    ? new Intl.DateTimeFormat('es-CU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(new Date(`${v}T00:00:00`))
    : '—';

/** Iniciales para el avatar del detalle (nombre + apellido). */
const inicialesEmpleado = (emp: { nombre: string; apellido: string }) =>
  `${emp.nombre.charAt(0)}${emp.apellido.charAt(0)}`.toUpperCase();

/** Colores del badge de estado del empleado. */
const COLOR_ESTADO_EMPLEADO: Record<RrhhEstadoEmpleado, string> = {
  activo: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  suspendido: 'bg-red-100 text-red-700 ring-red-200',
  vacaciones: 'bg-sky-100 text-sky-700 ring-sky-200',
  terminado: 'bg-slate-100 text-slate-600 ring-slate-200',
};

// Degradado del módulo RRHH (color propio, referenciado de la página de Monedas)
const GRADIENTE =
  'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300';

export function EmpleadosPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [detalle, setDetalle] = useState<RrhhEmpleadoListado | null>(null);
  const [editing, setEditing] = useState<RrhhEmpleado | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    empleado: RrhhEmpleado | null;
  }>({ isOpen: false, empleado: null });

  // Menú flotante de tres rayitas (Objetivos, Evaluaciones y movimientos).
  const [menu, setMenu] = useState<{
    id: number;
    x: number;
    y: number;
    anchor: { top: number; left: number; right: number; bottom: number };
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const MARGIN = 8;

  useLayoutEffect(() => {
    if (!menu || !menuRef.current) return;
    const m = menuRef.current.getBoundingClientRect();
    let x = menu.x;
    let y = menu.y;
    if (x + m.width > window.innerWidth - MARGIN) {
      x = Math.max(MARGIN, menu.anchor.right - m.width);
    }
    if (y + m.height > window.innerHeight - MARGIN) {
      y = Math.max(MARGIN, menu.anchor.top - m.height - 4);
    }
    if (x !== menu.x || y !== menu.y) {
      setMenu((prev) => (prev ? { ...prev, x, y } : null));
    }
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null);
    };
    const onScrollOrResize = () => setMenu(null);
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onEsc);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onEsc);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [menu]);

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
    horas_a_trabajar: 8,
    dias_a_trabajar: 30,
    estado: 'activo',
    tipo_asistencia: 'NO_LIBRE',
    horario_inicio: '',
    horario_final: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Lista con scroll infinito (tipo feed): 100 por página, más recientes
  // primero. El buscador vive en el propio hook.
  const {
    items: empleados,
    isLoading,
    isFetchingMore,
    isError,
    error,
    hasMore,
    loadMore,
    searchTerm,
    setSearch,
    refresh,
  } = useInfiniteList<RrhhEmpleadoListado>({
    queryKeyBase: 'rrhh_empleados',
    queryFn: (skip, limit, search) =>
      rrhhService.listarEmpleados({
        skip,
        limit,
        buscar: search,
        orden: 'recientes',
      }),
  });

  // Observador del sentinel: pide la siguiente página al llegar al final
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasMore || isFetchingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, loadMore]);

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

  // Selector de supervisor: lista inicial al abrir, busca bajo demanda
  const [busquedaSupervisor, setBusquedaSupervisor] = useState('');
  const { data: candidatosSupervisor = [], isFetching: buscandoSupervisor } = useQuery({
    queryKey: ['rrhh', 'empleados', 'candidatos', busquedaSupervisor],
    queryFn: () => rrhhService.candidatosEmpleados(busquedaSupervisor),
    enabled: formOpen,
  });

  const invalidate = () => {
    refresh(); // reinicia y refresca la lista infinita
    queryClient.invalidateQueries({ queryKey: ['rrhh', 'empleados'] });
  };

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
      horas_a_trabajar: 8,
      dias_a_trabajar: 30,
      estado: 'activo',
      tipo_asistencia: 'NO_LIBRE',
      horario_inicio: '',
      horario_final: '',
    });
    setFormErrors({});
    setFormOpen(true);
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
      horas_a_trabajar: emp.horas_a_trabajar ?? undefined,
      dias_a_trabajar: emp.dias_a_trabajar ?? undefined,
      estado: emp.estado,
      tipo_asistencia: emp.tipo_asistencia,
      horario_inicio: fmtHora(emp.horario_inicio) ?? '',
      horario_final: fmtHora(emp.horario_final) ?? '',
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
    if (!formData.nombre.trim()) errs.nombre = 'El nombre es obligatorio';
    if (!formData.apellido.trim()) errs.apellido = 'El apellido es obligatorio';
    if (formData.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) {
      errs.correo = 'El correo no tiene un formato válido';
    }
    if (formData.tipo_asistencia !== 'LIBRE') {
      const ini = formData.horario_inicio;
      const fin = formData.horario_final;
      if (ini && fin && fin <= ini) {
        errs.horario_final = 'El horario final debe ser posterior al inicio';
      }
    }
    if (
      formData.horas_a_trabajar !== undefined &&
      formData.horas_a_trabajar !== null &&
      (!Number.isInteger(formData.horas_a_trabajar) ||
        formData.horas_a_trabajar < 1 ||
        formData.horas_a_trabajar > 24)
    ) {
      errs.horas_a_trabajar = 'Debe ser un entero entre 1 y 24';
    }
    if (
      formData.dias_a_trabajar !== undefined &&
      formData.dias_a_trabajar !== null &&
      (!Number.isInteger(formData.dias_a_trabajar) ||
        formData.dias_a_trabajar < 1 ||
        formData.dias_a_trabajar > 31)
    ) {
      errs.dias_a_trabajar = 'Debe ser un entero entre 1 y 31';
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
        horario_inicio:
          formData.tipo_asistencia === 'LIBRE'
            ? null
            : formData.horario_inicio || null,
        horario_final:
          formData.tipo_asistencia === 'LIBRE'
            ? null
            : formData.horario_final || null,
        salario: formData.salario === undefined ? null : formData.salario,
        horas_a_trabajar:
          formData.horas_a_trabajar === undefined
            ? null
            : formData.horas_a_trabajar,
        dias_a_trabajar:
          formData.dias_a_trabajar === undefined
            ? null
            : formData.dias_a_trabajar,
      };
      if (editing) {
        return await rrhhService.updateEmpleado(editing.id, payload);
      }
      return await rrhhService.createEmpleado(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Empleado actualizado' : 'Empleado creado');
      invalidate();
      setFormOpen(false);
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
    <div className="space-y-4 animate-fade-in-up">
      {/* Header con icono animado */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded shadow-lg animate-bounce-subtle">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">Empleados</h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              Ficha del personal, sus asignaciones y su estado
            </p>
          </div>
        </div>
        <Button onClick={handleNuevo} className={`gap-2 ${GRADIENTE}`}>
          <Plus className="h-4 w-4" />
          Nuevo empleado
        </Button>
      </div>

      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="pb-3">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, código, carnet o correo..."
                value={searchTerm}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-96 gap-4">
                <div className="p-4 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full animate-pulse">
                  <Users className="h-12 w-12 text-indigo-600 animate-spin" />
                </div>
                <div className="text-gray-600 font-medium">Cargando empleados...</div>
              </div>
            ) : isError ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center bg-red-50 border border-red-200 rounded-md p-4">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <p className="font-bold text-lg mb-2 text-red-700">
                    Error al cargar empleados
                  </p>
                  <p className="text-red-600 mb-4">{error?.message || 'Error desconocido'}</p>
                  <Button
                    onClick={refresh}
                    className="gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reintentar
                  </Button>
                </div>
              </div>
            ) : empleados.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-gray-400">
                <div className="p-4 bg-slate-50 rounded-full mb-2">
                  <Users className="h-12 w-12 text-gray-300" />
                </div>
                <p className="text-lg font-medium mb-1">
                  {searchTerm
                    ? 'No se encontraron empleados con esa búsqueda'
                    : 'No se encontraron empleados'}
                </p>
                <p className="text-sm mb-4">
                  {searchTerm ? 'Prueba con otro término' : 'Comience creando un empleado nuevo'}
                </p>
                <Button onClick={handleNuevo} className={`gap-2 ${GRADIENTE}`}>
                  <Plus className="h-4 w-4" />
                  Nuevo empleado
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100">
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-indigo-500" />
                          Código
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <Type className="h-4 w-4 text-blue-500" />
                          Empleado
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-amber-500" />
                          Puesto
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-emerald-500" />
                          Departamento
                        </div>
                      </TableHead>
                      <TableHead className="text-center">Opciones</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {empleados.map((emp) => (
                      <TableRow
                        key={emp.id}
                        onClick={() => setDetalle(emp)}
                        className="cursor-pointer hover:bg-indigo-50/70 transition-colors"
                      >
                        <TableCell>
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-sm font-medium font-mono">
                            <Hash className="h-3 w-3" />
                            {emp.codigo_empleado ?? '—'}
                          </span>
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
                        <TableCell
                          className="text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="relative inline-block">
                            <Button
                              variant="outline"
                              size="sm"
                              title="Más opciones del empleado"
                              onClick={(e) => {
                                e.stopPropagation();
                                const r = (
                                  e.currentTarget as HTMLButtonElement
                                ).getBoundingClientRect();
                                setMenu(
                                  menu && menu.id === emp.id
                                    ? null
                                    : {
                                        id: emp.id,
                                        x: r.left,
                                        y: r.bottom + 4,
                                        anchor: {
                                          top: r.top,
                                          left: r.left,
                                          right: r.right,
                                          bottom: r.bottom,
                                        },
                                      }
                                );
                              }}
                              className="h-8 w-8 p-0 text-indigo-600 hover:bg-indigo-50"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditar(emp);
                              }}
                              className="text-blue-600 hover:bg-blue-50 hover:scale-110 transition-all"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmModal({ isOpen: true, empleado: emp });
                              }}
                              className="text-red-600 hover:bg-red-50 hover:scale-110 transition-all"
                              title="Eliminar"
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
            {/* Sentinel del scroll infinito */}
            <div ref={loadMoreRef} className="flex justify-center py-2">
              {isFetchingMore && !isLoading && (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Cargando más...</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      {/* Formulario de empleado (crear y editar) en modal cuadrado */}
      <Modal
        isOpen={formOpen}
        onClose={cerrarForm}
        className="!max-w-5xl overflow-hidden !rounded-none [&>button.absolute]:hidden"
      >
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-gradient-to-r from-indigo-50 to-indigo-100 px-6 py-4 pr-12">
          <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 p-2">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-gray-900">
              {editing
                ? `Editar: ${editing.apellido}, ${editing.nombre}`
                : 'Nuevo empleado'}
            </h2>
            {editing?.codigo_empleado && (
              <p className="font-mono text-xs text-slate-500">
                Código: {editing.codigo_empleado}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={cerrarForm}
            title="Cerrar"
            aria-label="Cerrar"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-indigo-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-6 px-6 py-5">
              {/* Datos personales */}
              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-500" />
                  Datos personales
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <CampoTexto
                    id="nombre"
                    label="Nombre *"
                    valor={formData.nombre}
                    onChange={(v) => set('nombre', v)}
                    error={formErrors.nombre}
                    icono={Type}
                    color="text-blue-500"
                  />
                  <CampoTexto
                    id="apellido"
                    label="Apellido *"
                    valor={formData.apellido}
                    onChange={(v) => set('apellido', v)}
                    error={formErrors.apellido}
                    icono={Type}
                    color="text-emerald-500"
                  />
                  <CampoTexto
                    id="carnet"
                    label="Carnet de identidad"
                    valor={formData.carnet_identidad ?? ''}
                    onChange={(v) => set('carnet_identidad', v)}
                    icono={CreditCard}
                    color="text-amber-500"
                  />
                  <CampoTexto
                    id="correo"
                    label="Correo"
                    tipo="email"
                    valor={formData.correo ?? ''}
                    onChange={(v) => set('correo', v)}
                    error={formErrors.correo}
                    icono={Mail}
                    color="text-rose-500"
                  />
                  <CampoTexto
                    id="telefono"
                    label="Teléfono"
                    valor={formData.telefono ?? ''}
                    onChange={(v) => set('telefono', v)}
                    icono={Phone}
                    color="text-purple-500"
                  />
                  <CampoTexto
                    id="fecha_nacimiento"
                    label="Fecha de nacimiento"
                    tipo="date"
                    valor={formData.fecha_nacimiento ?? ''}
                    onChange={(v) => set('fecha_nacimiento', v)}
                    icono={Calendar}
                    color="text-sky-500"
                  />
                </div>
                <div className="mt-4">
                  <CampoTexto
                    id="direccion"
                    label="Dirección"
                    valor={formData.direccion ?? ''}
                    onChange={(v) => set('direccion', v)}
                    icono={MapPin}
                    color="text-indigo-500"
                  />
                </div>
              </section>

              {/* Asignación laboral */}
              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-amber-500" />
                  Asignación laboral
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-gray-700">
                      <Briefcase className="h-4 w-4 text-amber-500" />
                      Puesto
                    </Label>
                    <select
                      value={formData.puesto_id ?? ''}
                      onChange={(e) =>
                        set('puesto_id', e.target.value === '' ? null : Number(e.target.value))
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
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
                    <Label className="flex items-center gap-2 text-gray-700">
                      <Building2 className="h-4 w-4 text-emerald-500" />
                      Departamento
                    </Label>
                    <select
                      value={formData.departamento_id ?? ''}
                      onChange={(e) =>
                        set(
                          'departamento_id',
                          e.target.value === '' ? null : Number(e.target.value)
                        )
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
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
                    <Label className="flex items-center gap-2 text-gray-700">
                      <FileText className="h-4 w-4 text-sky-500" />
                      Tipo de contrato
                    </Label>
                    <select
                      value={formData.tipo_contrato_id ?? ''}
                      onChange={(e) =>
                        set(
                          'tipo_contrato_id',
                          e.target.value === '' ? null : Number(e.target.value)
                        )
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
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
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="flex items-center gap-2 text-gray-700">
                      <UserCheck className="h-4 w-4 text-indigo-500" />
                      Supervisor
                    </Label>
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
                <h3 className="mb-3 text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-500" />
                  Contrato y jornada
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <CampoTexto
                    id="fecha_contratacion"
                    label="Fecha de contratación"
                    tipo="date"
                    valor={formData.fecha_contratacion ?? ''}
                    onChange={(v) => set('fecha_contratacion', v)}
                    icono={Calendar}
                    color="text-indigo-500"
                  />
                  <CampoTexto
                    id="salario"
                    label="Salario"
                    tipo="number"
                    valor={formData.salario === undefined ? '' : String(formData.salario)}
                    onChange={(v) =>
                      set('salario', v === '' ? undefined : Number(v))
                    }
                    icono={CircleDollarSign}
                    color="text-emerald-500"
                  />
                  <CampoTexto
                    id="horas_a_trabajar"
                    label="Horas por día"
                    tipo="number"
                    valor={
                      formData.horas_a_trabajar === undefined
                        ? ''
                        : String(formData.horas_a_trabajar)
                    }
                    onChange={(v) =>
                      set('horas_a_trabajar', v === '' ? undefined : Number(v))
                    }
                    error={formErrors.horas_a_trabajar}
                    icono={Clock}
                    color="text-purple-500"
                  />
                  <CampoTexto
                    id="dias_a_trabajar"
                    label="Días por mes"
                    tipo="number"
                    valor={
                      formData.dias_a_trabajar === undefined
                        ? ''
                        : String(formData.dias_a_trabajar)
                    }
                    onChange={(v) =>
                      set('dias_a_trabajar', v === '' ? undefined : Number(v))
                    }
                    error={formErrors.dias_a_trabajar}
                    icono={Calendar}
                    color="text-purple-500"
                  />
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-gray-700">
                      <BadgeCheck className="h-4 w-4 text-rose-500" />
                      Estado
                    </Label>
                    <select
                      value={formData.estado}
                      onChange={(e) => set('estado', e.target.value as RrhhEstadoEmpleado)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    >
                      {RRHH_ESTADOS_EMPLEADO.map((e) => (
                        <option key={e.valor} value={e.valor}>
                          {e.etiqueta}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-gray-700">
                      <Timer className="h-4 w-4 text-amber-500" />
                      Tipo de asistencia
                    </Label>
                    <select
                      value={formData.tipo_asistencia}
                      onChange={(e) => {
                        const tipo = e.target.value as 'LIBRE' | 'NO_LIBRE';
                        setFormData((prev) => ({
                          ...prev,
                          tipo_asistencia: tipo,
                          // LIBRE = sin horario fijo: se limpian (se guardan null).
                          horario_inicio:
                            tipo === 'LIBRE' ? '' : prev.horario_inicio,
                          horario_final:
                            tipo === 'LIBRE' ? '' : prev.horario_final,
                        }));
                        if (tipo === 'LIBRE') {
                          setFormErrors((prev) => {
                            const next = { ...prev };
                            delete next.horario_final;
                            return next;
                          });
                        }
                      }}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    >
                      <option value="NO_LIBRE">NO_LIBRE (asistir en horario)</option>
                      <option value="LIBRE">LIBRE (sin horario fijo)</option>
                    </select>
                  </div>
                  {/* LIBRE = sin horario fijo: no se piden horas. */}
                  {formData.tipo_asistencia !== 'LIBRE' ? (
                    <>
                      <CampoTexto
                        id="horario_inicio"
                        label="Horario inicio"
                        tipo="time"
                        valor={formData.horario_inicio ?? ''}
                        onChange={(v) => set('horario_inicio', v)}
                        icono={Clock}
                        color="text-slate-500"
                      />
                      <CampoTexto
                        id="horario_final"
                        label="Horario final"
                        tipo="time"
                        valor={formData.horario_final ?? ''}
                        onChange={(v) => set('horario_final', v)}
                        error={formErrors.horario_final}
                        icono={Clock}
                        color="text-slate-500"
                      />
                    </>
                  ) : (
                    <div className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500 sm:col-span-2">
                      <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                      Sin horario fijo: este empleado no tiene hora de entrada ni
                      de salida.
                    </div>
                  )}
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Las horas por día y los días por mes se usan para derivar la
                  tarifa horaria con la que se paga la nómina. Si faltan, el
                  empleado aparecerá con 0 en la nómina.
                </p>
              </section>

              <div className="sticky bottom-0 -mx-6 flex gap-4 border-t bg-white px-6 pb-1 pt-4">
                <Button
                  type="submit"
                  className={`gap-2 ${GRADIENTE}`}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {editing ? 'Guardar cambios' : 'Crear empleado'}
                </Button>
              </div>
        </form>
      </Modal>

      {/* Detalle del empleado (solo lectura) */}
      <Modal
        isOpen={detalle !== null}
        onClose={() => setDetalle(null)}
        className="!max-w-3xl overflow-hidden !rounded-none [&>button.absolute]:hidden"
      >
        {detalle && (
          <>
            <div className="sticky top-0 z-10 flex items-center gap-4 border-b bg-gradient-to-r from-indigo-50 to-indigo-100 px-6 py-4 pr-12">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-lg font-bold text-white shadow">
                {inicialesEmpleado(detalle)}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-gray-900">
                  {detalle.apellido}, {detalle.nombre}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-white/70 px-2 py-0.5 font-mono text-xs text-indigo-700 ring-1 ring-indigo-200">
                    {detalle.codigo_empleado ?? 'Sin código'}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${COLOR_ESTADO_EMPLEADO[detalle.estado]}`}
                  >
                    <BadgeCheck className="h-3 w-3" />
                    {RRHH_ESTADOS_EMPLEADO.find((e) => e.valor === detalle.estado)
                      ?.etiqueta ?? detalle.estado}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetalle(null)}
                title="Cerrar"
                aria-label="Cerrar"
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-indigo-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 px-6 py-5">
              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-500" />
                  Datos personales
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <DatoDetalle
                    icono={CreditCard}
                    color="text-indigo-500"
                    etiqueta="Carnet de identidad"
                    valor={detalle.carnet_identidad || '—'}
                  />
                  <DatoDetalle
                    icono={Calendar}
                    color="text-emerald-500"
                    etiqueta="Fecha de nacimiento"
                    valor={fmtFecha(detalle.fecha_nacimiento)}
                  />
                  <DatoDetalle
                    icono={Mail}
                    color="text-sky-500"
                    etiqueta="Correo"
                    valor={detalle.correo || '—'}
                  />
                  <DatoDetalle
                    icono={Phone}
                    color="text-amber-500"
                    etiqueta="Teléfono"
                    valor={detalle.telefono || '—'}
                  />
                  <div className="sm:col-span-2">
                    <DatoDetalle
                      icono={MapPin}
                      color="text-rose-500"
                      etiqueta="Dirección"
                      valor={detalle.direccion || '—'}
                    />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-amber-500" />
                  Asignación laboral
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DatoDetalle
                    icono={Briefcase}
                    color="text-amber-500"
                    etiqueta="Puesto"
                    valor={detalle.puesto_nombre || '—'}
                  />
                  <DatoDetalle
                    icono={Building2}
                    color="text-indigo-500"
                    etiqueta="Departamento"
                    valor={detalle.departamento_nombre || '—'}
                  />
                  <DatoDetalle
                    icono={FileText}
                    color="text-sky-500"
                    etiqueta="Tipo de contrato"
                    valor={detalle.tipo_contrato_nombre || '—'}
                  />
                  <DatoDetalle
                    icono={UserCheck}
                    color="text-emerald-500"
                    etiqueta="Supervisor"
                    valor={detalle.supervisor_nombre || '—'}
                  />
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-500" />
                  Contrato y jornada
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <DatoDetalle
                    icono={Calendar}
                    color="text-indigo-500"
                    etiqueta="Fecha de contratación"
                    valor={fmtFecha(detalle.fecha_contratacion)}
                  />
                  <DatoDetalle
                    icono={CircleDollarSign}
                    color="text-emerald-500"
                    etiqueta="Salario"
                    valor={fmtMoneda(detalle.salario)}
                  />
                  <DatoDetalle
                    icono={Timer}
                    color="text-amber-500"
                    etiqueta="Tipo de asistencia"
                    valor={
                      detalle.tipo_asistencia === 'LIBRE'
                        ? 'LIBRE (sin horario fijo)'
                        : 'NO_LIBRE'
                    }
                  />
                  <DatoDetalle
                    icono={Clock}
                    color="text-slate-500"
                    etiqueta="Horario"
                    valor={
                      detalle.tipo_asistencia === 'LIBRE' ||
                      (!detalle.horario_inicio && !detalle.horario_final)
                        ? 'Sin horario fijo'
                        : `${fmtHora(detalle.horario_inicio) ?? '—'} – ${fmtHora(detalle.horario_final) ?? '—'}`
                    }
                  />
                  <DatoDetalle
                    icono={Timer}
                    color="text-sky-500"
                    etiqueta="Horas a trabajar"
                    valor={
                      detalle.horas_a_trabajar != null
                        ? `${detalle.horas_a_trabajar} h`
                        : '—'
                    }
                  />
                  <DatoDetalle
                    icono={Calendar}
                    color="text-rose-500"
                    etiqueta="Días a trabajar"
                    valor={
                      detalle.dias_a_trabajar != null
                        ? `${detalle.dias_a_trabajar} días`
                        : '—'
                    }
                  />
                </div>
              </section>
            </div>
          </>
        )}
      </Modal>

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

      {menu &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-50 w-56 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl animate-fade-in"
            style={{ top: menu.y, left: menu.x }}
          >
            <button
              type="button"
              onClick={() => {
                setMenu(null);
                navigate(`/rrhh/objetivos?empleado_id=${menu.id}`);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-rose-50 hover:text-rose-700"
            >
              <Target className="h-4 w-4 text-rose-600" />
              Objetivos
            </button>
            <button
              type="button"
              onClick={() => {
                setMenu(null);
                navigate(`/rrhh/evaluaciones?empleado_id=${menu.id}`);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
            >
              <ClipboardCheck className="h-4 w-4 text-emerald-600" />
              Evaluaciones
            </button>
            <button
              type="button"
              onClick={() => {
                setMenu(null);
                navigate(
                  `/rrhh/movimientos?empleado_id=${menu.id}&tipo=bonificaciones`
                );
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-green-50 hover:text-green-700"
            >
              <PlusCircle className="h-4 w-4 text-green-600" />
              Bonificaciones
            </button>
            <button
              type="button"
              onClick={() => {
                setMenu(null);
                navigate(
                  `/rrhh/movimientos?empleado_id=${menu.id}&tipo=deducciones`
                );
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-red-50 hover:text-red-700"
            >
              <MinusCircle className="h-4 w-4 text-red-600" />
              Deducciones
            </button>
          </div>,
          document.body
        )}
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
  icono: Icono,
  color = 'text-indigo-500',
}: {
  id: string;
  label: string;
  valor: string;
  onChange: (v: string) => void;
  tipo?: string;
  error?: string;
  icono?: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2 text-gray-700">
        {Icono && <Icono className={`h-4 w-4 ${color}`} />}
        {label}
      </Label>
      <Input
        id={id}
        type={tipo}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className={`transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${error ? 'border-red-500' : ''}`}
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

/** Dato de solo lectura del modal de detalle. */
function DatoDetalle({
  icono: Icono,
  color,
  etiqueta,
  valor,
}: {
  icono: React.ComponentType<{ className?: string }>;
  color: string;
  etiqueta: string;
  valor: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icono className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {etiqueta}
        </p>
        <p className="break-words text-sm font-medium text-slate-900">{valor}</p>
      </div>
    </div>
  );
}
