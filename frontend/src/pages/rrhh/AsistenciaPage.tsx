import { useEffect, useMemo, useState } from 'react';
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
  Loader2,
  Search,
  Clock,
  AlertCircle,
  BarChart3,
  LogIn,
  LogOut,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button,
  DateInput,
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

const hoyISO = () => new Date().toISOString().slice(0, 10);

/** Hora local actual en `HH:MM` (la que se propone al marcar). */
const horaActualHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Qué se está marcando en el formulario rápido. */
type TipoMarcacion = 'entrada' | 'salida';

interface FormMarcar {
  empleado_id: number | null;
  fecha: string;
  hora: string;
  tipo: TipoMarcacion;
  observaciones: string;
}

/** Formulario de marcación en blanco (hoy, ahora y entrada). */
const formMarcarVacio = (): FormMarcar => ({
  empleado_id: null,
  fecha: hoyISO(),
  hora: horaActualHHMM(),
  tipo: 'entrada',
  observaciones: '',
});

/** Colores del aviso de estado del día en el modal de marcación. */
const AVISO_TONO = {
  brand: 'border-brand-100 bg-brand-50 text-brand-600',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  red: 'border-red-200 bg-red-50 text-red-700',
} as const;

/** Botón de alta con el mismo patrón que «Nueva evaluación» (paleta brand). */
const GRADIENTE =
  'bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300';

const fmtHora = (v: string | null | undefined) => (v ? v.slice(0, 5) : null);

/** Estados que la marcación rápida puede reescribir; el resto son manuales. */
const ESTADOS_MARCA_RAPIDA: RrhhEstadoAsistencia[] = [
  'presente',
  'tardanza',
  'ausente',
];

const fmtFecha = (v: string) => {
  const [anio, mes, dia] = v.split('-');
  return `${dia}/${mes}/${anio}`;
};

/**
 * Estado que pinta la tabla: una `tardanza` es una presencia con retraso, así
 * que se muestra como «Presente» (los minutos van en la columna Tardanza).
 */
const etiquetaEstadoTabla = (fila: RrhhAsistenciaListado) =>
  fila.estado === 'tardanza'
    ? 'Presente'
    : RRHH_ESTADOS_ASISTENCIA.find((e) => e.valor === fila.estado)?.etiqueta ??
      fila.estado;

const badgeEstadoTabla = (fila: RrhhAsistenciaListado) =>
  RRHH_ESTADO_ASISTENCIA_BADGE[
    fila.estado === 'tardanza' ? 'presente' : fila.estado
  ] ?? 'bg-slate-100 text-slate-500';

export function AsistenciaPage() {
  const queryClient = useQueryClient();

  const [filtroDepto, setFiltroDepto] = useState<number | ''>('');
  const [filtroEstado, setFiltroEstado] = useState<RrhhEstadoAsistencia | ''>('');
  const [filtroEmpleado, setFiltroEmpleado] = useState<number | ''>('');
  const [busqueda, setBusqueda] = useState('');
  // Por defecto la tabla muestra el día de hoy; las fechas se pueden cambiar.
  const [desde, setDesde] = useState(hoyISO());
  const [hasta, setHasta] = useState(hoyISO());
  /** El resumen (del día o del rango filtrado) se abre en un modal. */
  const [modalResumen, setModalResumen] = useState(false);

  const [modalMarcar, setModalMarcar] = useState(false);
  const [modalCorregir, setModalCorregir] = useState<RrhhAsistenciaListado | null>(null);
  const [aEliminar, setAEliminar] = useState<RrhhAsistenciaListado | null>(null);

  const [formMarcar, setFormMarcar] = useState<FormMarcar>(formMarcarVacio);

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

  // Candidatos del selector: lista inicial al abrir el modal, busca bajo demanda.
  // Solo personal con horario pactado: el LIBRE no se marca en Asistencia.
  const { data: candidatosEmpleado = [], isFetching: buscandoEmpleado } = useQuery({
    queryKey: ['rrhh', 'empleados', 'candidatos', 'no-libre', busquedaEmpleado],
    queryFn: () => rrhhService.candidatosEmpleados(busquedaEmpleado, 'NO_LIBRE'),
    enabled: modalMarcar,
  });

  // Marcación del empleado en la fecha elegida: decide qué se puede marcar.
  const {
    data: marcacionDia,
    isLoading: consultandoDia,
  } = useQuery({
    queryKey: ['rrhh', 'asistencia', 'dia', formMarcar.empleado_id, formMarcar.fecha],
    queryFn: () =>
      rrhhService.listarAsistencias({
        empleado_id: formMarcar.empleado_id!,
        desde: formMarcar.fecha,
        hasta: formMarcar.fecha,
        limit: 1,
      }),
    select: (filas) => filas[0] ?? null,
    enabled: modalMarcar && formMarcar.empleado_id !== null && Boolean(formMarcar.fecha),
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

  // El resumen sigue a todos los filtros de la tabla (periodo, estado,
  // departamento y nombre), igual que el listado.
  const {
    data: resumen,
    isLoading: cargandoResumen,
  } = useQuery({
    queryKey: [
      'rrhh',
      'asistencia',
      'resumen',
      desde,
      hasta,
      filtroEstado,
      filtroDepto,
      busqueda,
    ],
    queryFn: () =>
      rrhhService.resumenAsistenciaDia({
        desde: desde || undefined,
        hasta: hasta || undefined,
        estado: filtroEstado || undefined,
        departamento_id: filtroDepto === '' ? undefined : filtroDepto,
        buscar: busqueda || undefined,
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
    mutationFn: () => {
      const hora = formMarcar.hora || horaActualHHMM();
      // Las observaciones solo se envían si se escribieron: así una re-marca no
      // borra la nota que ya tuviera el día.
      const observaciones = formMarcar.observaciones.trim() || undefined;

      if (formMarcar.tipo === 'salida') {
        return rrhhService.updateAsistencia(marcacionDia!.id, {
          hora_salida: hora,
          ...(observaciones ? { observaciones } : {}),
        });
      }

      // Ya hay marcación ese día: se actualiza. El estado solo se reescribe si
      // es presente/tardanza/ausente; un estado manual (permiso, vacaciones,
      // feriado, incapacidad) se conserva al re-marcar la entrada.
      if (marcacionDia) {
        const pisaEstado = ESTADOS_MARCA_RAPIDA.includes(marcacionDia.estado);
        return rrhhService.updateAsistencia(marcacionDia.id, {
          hora_entrada: hora,
          ...(pisaEstado ? { estado: 'presente' as const } : {}),
          ...(observaciones ? { observaciones } : {}),
        });
      }

      // Sin marcación todavía: alta del día (el estado se deriva de la hora).
      return rrhhService.createAsistencia({
        empleado_id: formMarcar.empleado_id!,
        fecha: formMarcar.fecha || hoyISO(),
        hora_entrada: hora,
        observaciones,
      });
    },
    onSuccess: () => {
      toast.success(
        formMarcar.tipo === 'entrada' ? 'Entrada registrada' : 'Salida registrada'
      );
      invalidate();
      setModalMarcar(false);
      setFormMarcar(formMarcarVacio());
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

  const resumenCampos: {
    etiqueta: string;
    valor: number;
    color: string;
    titulo?: string;
  }[] = resumen
    ? [
        {
          // Quienes vinieron: los presentes más los que llegaron tarde (la
          // tabla también los muestra como «Presente»).
          etiqueta: 'Presentes',
          valor: resumen.presentes + resumen.tardanzas,
          color: 'text-green-600',
          titulo: `Incluye ${resumen.tardanzas} que llegaron tarde`,
        },
        {
          etiqueta: 'Tardanzas',
          valor: resumen.tardanzas,
          color: 'text-amber-600',
          titulo: 'De los presentes, cuántos llegaron tarde',
        },
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
        { etiqueta: 'Feriados', valor: resumen.feriados, color: 'text-slate-600' },
        {
          etiqueta: 'Incapacidades',
          valor: resumen.incapacidades,
          color: 'text-slate-600',
        },
      ]
    : [];

  const hoy = hoyISO();
  const hayFiltroActivo =
    busqueda !== '' ||
    filtroEstado !== '' ||
    filtroDepto !== '' ||
    desde !== hoy ||
    hasta !== hoy;

  /** Rango que resume el modal, con el mismo criterio que la consulta. */
  const tituloRangoResumen =
    desde === hoy && hasta === hoy
      ? `Hoy, ${fmtFecha(hoy)}`
      : desde && hasta && desde !== hasta
        ? `Del ${fmtFecha(desde)} al ${fmtFecha(hasta)}`
        : desde
          ? `Del ${fmtFecha(desde)}`
          : hasta
            ? `Hasta el ${fmtFecha(hasta)}`
            : `Hoy, ${fmtFecha(hoy)}`;

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroEstado('');
    setFiltroDepto('');
    setFiltroEmpleado('');
    setDesde(hoy);
    setHasta(hoy);
  };

  // ── Estado del día elegido (empleado + fecha) ────────────────────────────
  const hayEntrada = Boolean(marcacionDia?.hora_entrada);
  const haySalida = Boolean(marcacionDia?.hora_salida);
  const diaCompleto = hayEntrada && haySalida;
  const entradaDia = fmtHora(marcacionDia?.hora_entrada);
  const salidaDia = fmtHora(marcacionDia?.hora_salida);

  const puedeMarcarEntrada = !diaCompleto;
  const puedeMarcarSalida = hayEntrada && !haySalida;

  /** Estado manual del día (permiso, vacaciones…): la marca no debe pisarlo. */
  const estadoManualDia =
    marcacionDia && !ESTADOS_MARCA_RAPIDA.includes(marcacionDia.estado)
      ? marcacionDia.estado
      : null;
  const etiquetaEstadoManual = estadoManualDia
    ? (RRHH_ESTADOS_ASISTENCIA.find((e) => e.valor === estadoManualDia)?.etiqueta ??
      estadoManualDia)
    : null;

  // Al cambiar de empleado o de día, «Salida» puede dejar de aplicar.
  useEffect(() => {
    if (!modalMarcar) return;
    if (formMarcar.tipo === 'salida' && !puedeMarcarSalida) {
      setFormMarcar((f) => ({ ...f, tipo: 'entrada' }));
    }
  }, [modalMarcar, formMarcar.tipo, puedeMarcarSalida]);

  const horaEfectiva = formMarcar.hora || horaActualHHMM();
  const errorSalida =
    formMarcar.tipo === 'salida' &&
    entradaDia !== null &&
    horaEfectiva <= entradaDia
      ? `La salida debe ser posterior a la entrada (${entradaDia})`
      : null;

  /** Aviso bajo fecha/hora: qué va a pasar exactamente con este día. */
  const avisoDia: { tono: keyof typeof AVISO_TONO; texto: string } | null =
    formMarcar.empleado_id === null || !formMarcar.fecha
      ? null
      : consultandoDia
        ? { tono: 'brand', texto: 'Comprobando el día…' }
        : errorSalida
          ? { tono: 'red', texto: errorSalida }
          : diaCompleto
            ? {
                tono: 'amber',
                texto: `El día ya tiene entrada (${entradaDia}) y salida (${salidaDia}). Edítalo con «Corregir» desde la tabla.`,
              }
            : estadoManualDia && formMarcar.tipo === 'entrada'
              ? {
                  tono: 'amber',
                  texto: `El día está marcado como ${etiquetaEstadoManual}. Se actualizará la entrada y se mantendrá ese estado.`,
                }
              : formMarcar.tipo === 'salida'
                ? {
                    tono: estadoManualDia ? 'amber' : 'brand',
                    texto: estadoManualDia
                      ? `Se registrará la salida y se mantendrá el estado ${etiquetaEstadoManual}.`
                      : `Se registrará la salida del día. Entrada: ${entradaDia}.`,
                  }
                : hayEntrada
                  ? {
                      tono: 'brand',
                      texto: `El día ya tiene entrada (${entradaDia}); se actualizará a la hora indicada.`,
                    }
                  : {
                      tono: 'brand',
                      texto: 'El día está sin marcar: se registrará la entrada.',
                    };

  const registrarDeshabilitado =
    marcarMutation.isPending || consultandoDia || diaCompleto || errorSalida !== null;

  const empleadoElegido = candidatosEmpleado.find(
    (c) => c.id === formMarcar.empleado_id
  );

  const tituloSalida = puedeMarcarSalida
    ? undefined
    : diaCompleto
      ? 'El día ya tiene entrada y salida; edítalo con «Corregir»'
      : formMarcar.empleado_id === null
        ? 'Elige primero el empleado y la fecha'
        : 'Primero registra la entrada';

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Cabecera con icono animado (patrón de EmpleadosPage) */}
        <div className="flex items-center gap-3">
          <div className="rounded bg-gradient-to-br from-brand-500 to-brand-600 p-2 shadow-lg animate-bounce-subtle">
            <CalendarCheck className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-wrap items-baseline">
            <h1 className="text-xl font-bold text-gray-900">Asistencia</h1>
            <p className="ml-3 hidden text-sm text-gray-500 sm:block">
              Marcación de entrada y salida, tardanzas y horas extras
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalResumen(true)}
            title="Ver el resumen del periodo filtrado"
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Resumen
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setFormMarcar(formMarcarVacio());
              setBusquedaEmpleado('');
              setModalMarcar(true);
            }}
            className={`gap-2 ${GRADIENTE}`}
          >
            <Plus className="h-4 w-4" />
            Marcar asistencia
          </Button>
        </div>
      </div>

      {/* Resumen (día o rango filtrado) en modal */}
      <Modal
        isOpen={modalResumen}
        onClose={() => setModalResumen(false)}
        className="!max-w-2xl !rounded-none overflow-hidden [&>button.absolute]:hidden"
      >
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-gradient-to-r from-brand-50 to-brand-100 px-6 py-4 pr-14">
          <div className="rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 p-2">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900">Resumen de asistencia</h2>
            <p className="truncate text-xs text-slate-500">
              {tituloRangoResumen}
              {resumen
                ? ` · ${resumen.total_empleados} marcación${
                    resumen.total_empleados === 1 ? '' : 'es'
                  }`
                : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalResumen(false)}
            title="Cerrar"
            aria-label="Cerrar"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-brand-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {cargandoResumen || !resumen ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando resumen…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {resumenCampos.map((r) => (
                  <div
                    key={r.etiqueta}
                    className="rounded-lg bg-slate-50 p-3"
                    title={r.titulo}
                  >
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
              {resumen.total_empleados === 0 && (
                <p className="mt-4 text-center text-sm text-slate-500">
                  No hay marcaciones con estos filtros.
                </p>
              )}
            </>
          )}
        </div>
      </Modal>

      <Card>
        <CardHeader className="pb-3">
          {/* Buscador arriba, filtros debajo */}
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
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <DateInput
              value={desde}
              onChange={(iso) => setDesde(iso)}
              title="Desde"
              wrapperClassName="w-44"
            />
            <DateInput
              value={hasta}
              onChange={(iso) => setHasta(iso)}
              title="Hasta"
              wrapperClassName="w-44"
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
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${badgeEstadoTabla(fila)}`}
                        title={
                          fila.estado === 'tardanza'
                            ? `Entrada tardía (${formatearMinutos(fila.tardanza_minutos)})`
                            : undefined
                        }
                      >
                        {etiquetaEstadoTabla(fila)}
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
            <p className="truncate text-xs text-slate-500">
              {empleadoElegido
                ? `${empleadoElegido.apellido}, ${empleadoElegido.nombre}${
                    formMarcar.fecha ? ` · ${fmtFecha(formMarcar.fecha)}` : ''
                  }`
                : 'Registra la entrada o la salida de un empleado.'}
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
            if (formMarcar.tipo === 'salida' && !puedeMarcarSalida) {
              toast.error('Ese día no admite una salida: primero registra la entrada');
              return;
            }
            if (errorSalida) {
              toast.error(errorSalida);
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
          </div>
          {/* Selector explícito: entrada o salida */}
          <div className="space-y-2">
            <Label>¿Qué vas a marcar?</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormMarcar((f) => ({ ...f, tipo: 'entrada' }))}
                disabled={!puedeMarcarEntrada}
                title={diaCompleto ? 'El día ya tiene entrada y salida' : undefined}
                className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  formMarcar.tipo === 'entrada'
                    ? 'border-brand-500 bg-brand-50 text-brand-600 ring-1 ring-brand-500'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <LogIn className="h-4 w-4" />
                Entrada
              </button>
              <button
                type="button"
                onClick={() => setFormMarcar((f) => ({ ...f, tipo: 'salida' }))}
                disabled={!puedeMarcarSalida}
                title={tituloSalida}
                className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  formMarcar.tipo === 'salida'
                    ? 'border-brand-500 bg-brand-50 text-brand-600 ring-1 ring-brand-500'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <LogOut className="h-4 w-4" />
                Salida
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha-marcar">Fecha</Label>
              <DateInput
                id="fecha-marcar"
                value={formMarcar.fecha}
                onChange={(iso) => setFormMarcar({ ...formMarcar, fecha: iso })}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="hora-marcar">Hora</Label>
                <button
                  type="button"
                  onClick={() => setFormMarcar((f) => ({ ...f, hora: horaActualHHMM() }))}
                  className="text-[11px] font-semibold text-brand-600 transition-colors hover:text-brand-500 hover:underline"
                >
                  Ahora
                </button>
              </div>
              <Input
                id="hora-marcar"
                type="time"
                value={formMarcar.hora}
                onChange={(e) => setFormMarcar({ ...formMarcar, hora: e.target.value })}
              />
            </div>
          </div>

          {/* Estado del día elegido: qué va a pasar al registrar */}
          {avisoDia && (
            <div
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${AVISO_TONO[avisoDia.tono]}`}
            >
              {consultandoDia ? (
                <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />
              ) : avisoDia.tono === 'amber' || avisoDia.tono === 'red' ? (
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ) : formMarcar.tipo === 'salida' ? (
                <LogOut className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ) : (
                <LogIn className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              )}
              <span>{avisoDia.texto}</span>
            </div>
          )}

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
            <Button type="submit" disabled={registrarDeshabilitado}>
              {marcarMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : formMarcar.tipo === 'salida' ? (
                <LogOut className="h-4 w-4" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {formMarcar.tipo === 'salida' ? 'Registrar salida' : 'Registrar entrada'}
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
