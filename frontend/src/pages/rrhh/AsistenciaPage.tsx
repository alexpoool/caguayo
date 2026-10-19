import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rrhhService } from '../../services/rrhh';
import {
  RRHH_ESTADOS_ASISTENCIA,
  RRHH_ESTADO_ASISTENCIA_BADGE,
  RRHH_ESTADOS_CON_HORAS,
  formatearMinutos,
  type RrhhAsistenciaListado,
  type RrhhEstadoAsistencia,
} from '../../types/rrhh';
import {
  CalendarCheck,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  RefreshCw,
  AlertCircle,
  Loader2,
  Search,
  Clock,
  LogIn,
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
  Modal,
  SearchSelect,
} from '../../components/ui';

const hoyISO = () => new Date().toISOString().slice(0, 10);

const fmtHora = (v: string | null | undefined) => (v ? v.slice(0, 5) : null);

const fmtFecha = (v: string) => {
  const [anio, mes, dia] = v.split('-');
  return `${dia}/${mes}/${anio}`;
};

export function AsistenciaPage() {
  const queryClient = useQueryClient();

  const [filtroDepto, setFiltroDepto] = useState<number | ''>('');
  const [filtroEstado, setFiltroEstado] = useState<RrhhEstadoAsistencia | ''>('');
  const [filtroEmpleado, setFiltroEmpleado] = useState<number | ''>('');
  const [busqueda, setBusqueda] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [modalMarcar, setModalMarcar] = useState(false);
  const [modalCorregir, setModalCorregir] = useState<RrhhAsistenciaListado | null>(null);
  const [aEliminar, setAEliminar] = useState<RrhhAsistenciaListado | null>(null);

  const [formMarcar, setFormMarcar] = useState<{
    empleado_id: number | null;
    fecha: string;
    hora: string;
    observaciones: string;
  }>({ empleado_id: null, fecha: hoyISO(), hora: '', observaciones: '' });

  const [formCorreccion, setFormCorreccion] = useState<{
    hora_entrada: string;
    hora_salida: string;
    estado: RrhhEstadoAsistencia;
    observaciones: string;
  }>({ hora_entrada: '', hora_salida: '', estado: 'presente', observaciones: '' });

  const [busquedaEmpleado, setBusquedaEmpleado] = useState('');

  const { data: departamentos = [] } = useQuery({
    queryKey: ['rrhh', 'departamentos', 'para-filtro'],
    queryFn: () => rrhhService.listarDepartamentos({ limit: 500, activo: true }),
  });

  // Candidatos del selector: lista inicial al abrir el modal, busca bajo demanda
  const { data: candidatosEmpleado = [], isFetching: buscandoEmpleado } = useQuery({
    queryKey: ['rrhh', 'empleados', 'candidatos', busquedaEmpleado],
    queryFn: () => rrhhService.candidatosEmpleados(busquedaEmpleado),
    enabled: modalMarcar,
  });

  const {
    data: asistencias = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'rrhh',
      'asistencia',
      filtroDepto,
      filtroEstado,
      filtroEmpleado,
      busqueda,
      desde,
      hasta,
    ],
    queryFn: () =>
      rrhhService.listarAsistencias({
        limit: 500,
        departamento_id: filtroDepto === '' ? undefined : filtroDepto,
        estado: filtroEstado || undefined,
        empleado_id: filtroEmpleado === '' ? undefined : filtroEmpleado,
        buscar: busqueda || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
      }),
  });

  const { data: resumen } = useQuery({
    queryKey: ['rrhh', 'asistencia', 'resumen', desde || hoyISO(), filtroDepto],
    queryFn: () =>
      rrhhService.resumenAsistenciaDia({
        fecha: desde || hoyISO(),
        departamento_id: filtroDepto === '' ? undefined : filtroDepto,
      }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['rrhh', 'asistencia'] });
    queryClient.invalidateQueries({ queryKey: ['rrhh', 'empleados'] });
  };

  const opcionesEmpleado = useMemo(
    () => [
      { value: 0, label: 'Sin empleado', disabled: true },
      ...candidatosEmpleado.map((c) => ({
        value: c.id,
        label: `${c.apellido}, ${c.nombre}`,
        description: c.codigo_empleado ?? undefined,
        disabled: !c.activo,
      })),
    ],
    [candidatosEmpleado]
  );

  const marcarMutation = useMutation({
    mutationFn: () =>
      rrhhService.marcarAsistencia({
        empleado_id: formMarcar.empleado_id!,
        fecha: formMarcar.fecha || hoyISO(),
        hora: formMarcar.hora || undefined,
        observaciones: formMarcar.observaciones || undefined,
      }),
    onSuccess: () => {
      toast.success('Asistencia registrada');
      invalidate();
      setModalMarcar(false);
      setFormMarcar({ empleado_id: null, fecha: hoyISO(), hora: '', observaciones: '' });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo registrar');
    },
  });

  const corregirMutation = useMutation({
    mutationFn: () => {
      const id = modalCorregir!.id;
      const payload: Record<string, string | null> = {
        hora_entrada: formCorreccion.hora_entrada || null,
        hora_salida: formCorreccion.hora_salida || null,
        estado: formCorreccion.estado,
        observaciones: formCorreccion.observaciones || null,
      };
      return rrhhService.updateAsistencia(id, payload);
    },
    onSuccess: () => {
      toast.success('Marcación corregida');
      invalidate();
      setModalCorregir(null);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo corregir');
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: number) => rrhhService.deleteAsistencia(id),
    onSuccess: () => {
      toast.success('Marcación eliminada');
      invalidate();
      setAEliminar(null);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar');
    },
  });

  const abrirCorreccion = (fila: RrhhAsistenciaListado) => {
    setModalCorregir(fila);
    setFormCorreccion({
      hora_entrada: fmtHora(fila.hora_entrada) ?? '',
      hora_salida: fmtHora(fila.hora_salida) ?? '',
      estado: fila.estado,
      observaciones: fila.observaciones ?? '',
    });
  };

  const requiereEntrada =
    RRHH_ESTADOS_CON_HORAS.includes(formCorreccion.estado);

  const resumenCampos = resumen
    ? [
        { etiqueta: 'Presentes', valor: resumen.presentes, color: 'text-green-600' },
        { etiqueta: 'Tardanzas', valor: resumen.tardanzas, color: 'text-amber-600' },
        { etiqueta: 'Ausentes', valor: resumen.ausentes, color: 'text-red-600' },
        {
          etiqueta: 'Permisos',
          valor: resumen.permisos,
          color: 'text-purple-600',
        },
        {
          etiqueta: 'Vacaciones',
          valor: resumen.vacaciones,
          color: 'text-blue-600',
        },
      ]
    : [];

  const hayFiltroActivo =
    busqueda !== '' || filtroEstado !== '' || filtroDepto !== '' || desde !== '' || hasta !== '';

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroEstado('');
    setFiltroDepto('');
    setFiltroEmpleado('');
    setDesde('');
    setHasta('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <CalendarCheck className="h-6 w-6 text-brand-600" />
            Asistencia
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Marcación de entrada y salida, tardanzas y horas extras
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setFormMarcar({ empleado_id: null, fecha: hoyISO(), hora: '', observaciones: '' });
              setBusquedaEmpleado('');
              setModalMarcar(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Marcar asistencia
          </Button>
        </div>
      </div>

      {/* Resumen del día */}
      {resumen && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">
              Resumen del {fmtFecha(resumen.fecha)}
              <span className="ml-2 font-normal text-slate-400">
                · {resumen.total_empleados} marcación
                {resumen.total_empleados === 1 ? '' : 'es'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {resumenCampos.map((r) => (
                <div key={r.etiqueta} className="rounded-lg bg-slate-50 p-3">
                  <div className={`text-2xl font-bold tabular-nums ${r.color}`}>
                    {r.valor}
                  </div>
                  <div className="text-xs text-slate-500">{r.etiqueta}</div>
                </div>
              ))}
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-2xl font-bold tabular-nums text-slate-700">
                  {formatearMinutos(resumen.total_tardanza_minutos)}
                </div>
                <div className="text-xs text-slate-500">Total tardanza (H:MM)</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-2xl font-bold tabular-nums text-slate-700">
                  {formatearMinutos(resumen.total_horas_extras_minutos)}
                </div>
                <div className="text-xs text-slate-500">Total extras (H:MM)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por nombre o código del empleado..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
            <Input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              title="Desde"
              className="w-auto"
            />
            <Input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              title="Hasta"
              className="w-auto"
            />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as RrhhEstadoAsistencia | '')}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Todos los estados</option>
              {RRHH_ESTADOS_ASISTENCIA.map((e) => (
                <option key={e.valor} value={e.valor}>
                  {e.etiqueta}
                </option>
              ))}
            </select>
            <select
              value={filtroDepto}
              onChange={(e) => setFiltroDepto(e.target.value === '' ? '' : Number(e.target.value))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Todos los departamentos</option>
              {departamentos.map((d) => (
                <option key={d.id_departamento} value={d.id_departamento}>
                  {d.nombre}
                </option>
              ))}
            </select>
            {hayFiltroActivo && (
              <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
                <X className="h-4 w-4" />
                Limpiar
              </Button>
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
          ) : asistencias.length === 0 ? (
            <EmptyState
              mensaje={
                hayFiltroActivo
                  ? 'No hay marcaciones que coincidan con los filtros.'
                  : 'Aún no hay marcaciones registradas.'
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Salida</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Tardanza</TableHead>
                  <TableHead className="text-right">Trabajadas</TableHead>
                  <TableHead className="text-right">Extras</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {asistencias.map((fila) => (
                  <TableRow key={fila.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900">
                        {fila.empleado_nombre ?? '—'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {fila.empleado_codigo ?? '—'}
                        {fila.departamento_nombre ? ` · ${fila.departamento_nombre}` : ''}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-slate-600">
                      {fmtFecha(fila.fecha)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {fmtHora(fila.hora_entrada) ?? '—'}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {fmtHora(fila.hora_salida) ?? '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          RRHH_ESTADO_ASISTENCIA_BADGE[fila.estado] ?? 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {RRHH_ESTADOS_ASISTENCIA.find((e) => e.valor === fila.estado)?.etiqueta ??
                          fila.estado}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fila.tardanza_minutos > 0 ? (
                        <span className="font-semibold text-amber-600">
                          {formatearMinutos(fila.tardanza_minutos)}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-600">
                      {fila.horas_trabajadas_minutos > 0
                        ? formatearMinutos(fila.horas_trabajadas_minutos)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fila.horas_extras_minutos > 0 ? (
                        <span className="font-semibold text-brand-600">
                          {formatearMinutos(fila.horas_extras_minutos)}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <ActionButton titulo="Corregir" onClick={() => abrirCorreccion(fila)}>
                          <Edit className="h-4 w-4" />
                        </ActionButton>
                        <ActionButton
                          titulo="Eliminar"
                          danger
                          onClick={() => setAEliminar(fila)}
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

      {/* Modal de marcación rápida */}
      <Modal
        isOpen={modalMarcar}
        onClose={() => setModalMarcar(false)}
        className="!max-w-md overflow-hidden !rounded-none [&>button.absolute]:hidden"
      >
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-gradient-to-r from-brand-50 to-brand-100 px-6 py-4 pr-12">
          <div className="rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 p-2">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-gray-900">
              Marcar asistencia
            </h2>
            <p className="text-xs text-slate-500">
              Registra la entrada o la salida de un empleado.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalMarcar(false)}
            title="Cerrar"
            aria-label="Cerrar"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-brand-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!formMarcar.empleado_id) {
              toast.error('Elige un empleado');
              return;
            }
            marcarMutation.mutate();
          }}
          className="space-y-4 px-6 py-5"
        >
          <div className="space-y-2">
            <Label>Empleado</Label>
            <SearchSelect
              options={opcionesEmpleado}
              value={formMarcar.empleado_id}
              onChange={(v) => setFormMarcar({ ...formMarcar, empleado_id: v })}
              onSearch={setBusquedaEmpleado}
              placeholder="Buscar empleado..."
              loading={buscandoEmpleado}
              emptyMessage="Sin resultados"
            />
            <p className="text-xs text-slate-400">
              La primera marca del día es la <strong>entrada</strong>; la segunda, la{' '}
              <strong>salida</strong>.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha-marcar">Fecha</Label>
              <Input
                id="fecha-marcar"
                type="date"
                value={formMarcar.fecha}
                onChange={(e) => setFormMarcar({ ...formMarcar, fecha: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora-marcar">Hora (opcional)</Label>
              <Input
                id="hora-marcar"
                type="time"
                value={formMarcar.hora}
                onChange={(e) => setFormMarcar({ ...formMarcar, hora: e.target.value })}
              />
              <p className="text-xs text-slate-400">Si la dejas vacía, se usa la hora actual.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="obs-marcar">Observaciones</Label>
            <Input
              id="obs-marcar"
              value={formMarcar.observaciones}
              onChange={(e) => setFormMarcar({ ...formMarcar, observaciones: e.target.value })}
              placeholder="Opcional"
            />
          </div>
          <div className="sticky bottom-0 -mx-6 flex items-center gap-2 border-t bg-white px-6 pb-5 pt-4">
            <Button type="submit" disabled={marcarMutation.isPending}>
              {marcarMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
              Registrar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de corrección */}
      <Modal
        isOpen={modalCorregir !== null}
        onClose={() => setModalCorregir(null)}
        className="!max-w-md overflow-hidden !rounded-none [&>button.absolute]:hidden"
      >
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-gradient-to-r from-brand-50 to-brand-100 px-6 py-4 pr-12">
          <div className="rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 p-2">
            <CalendarCheck className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-gray-900">
              Corregir marcación
            </h2>
            {modalCorregir && (
              <p className="truncate text-xs text-slate-500">
                {modalCorregir.empleado_nombre ?? ''} ·{' '}
                {fmtFecha(modalCorregir.fecha)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setModalCorregir(null)}
            title="Cerrar"
            aria-label="Cerrar"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-brand-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            corregirMutation.mutate();
          }}
          className="space-y-4 px-6 py-5"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entrada">Hora de entrada</Label>
              <Input
                id="entrada"
                type="time"
                value={formCorreccion.hora_entrada}
                onChange={(e) =>
                  setFormCorreccion({ ...formCorreccion, hora_entrada: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salida">Hora de salida</Label>
              <Input
                id="salida"
                type="time"
                value={formCorreccion.hora_salida}
                onChange={(e) => setFormCorreccion({ ...formCorreccion, hora_salida: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="estado-correccion">Estado</Label>
            <select
              id="estado-correccion"
              value={formCorreccion.estado}
              onChange={(e) =>
                setFormCorreccion({
                  ...formCorreccion,
                  estado: e.target.value as RrhhEstadoAsistencia,
                })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {RRHH_ESTADOS_ASISTENCIA.map((e) => (
                <option key={e.valor} value={e.valor}>
                  {e.etiqueta}
                </option>
              ))}
            </select>
            {requiereEntrada && (
              <p className="flex items-center gap-1 text-xs text-slate-400">
                <AlertCircle className="h-3 w-3" />
                Este estado exige hora de entrada.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="obs-correccion">Observaciones</Label>
            <Input
              id="obs-correccion"
              value={formCorreccion.observaciones}
              onChange={(e) =>
                setFormCorreccion({ ...formCorreccion, observaciones: e.target.value })
              }
              placeholder="Motivo de la corrección"
            />
          </div>
          <div className="sticky bottom-0 -mx-6 flex items-center gap-2 border-t bg-white px-6 pb-5 pt-4">
            <Button type="submit" disabled={corregirMutation.isPending}>
              {corregirMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar corrección
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={aEliminar !== null}
        title="Eliminar marcación"
        message={
          aEliminar
            ? `¿Seguro que quieres eliminar la marcación de ${aEliminar.empleado_nombre ?? 'este empleado'} del ${fmtFecha(aEliminar.fecha)}?`
            : ''
        }
        type="danger"
        onConfirm={() => aEliminar && eliminarMutation.mutate(aEliminar.id)}
        onClose={() => setAEliminar(null)}
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
      <LogIn className="h-10 w-10 text-slate-300" />
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
        {mensaje || 'No se pudieron cargar las marcaciones'}
      </p>
      <Button variant="outline" size="sm" onClick={onReintentar}>
        Reintentar
      </Button>
    </div>
  );
}
