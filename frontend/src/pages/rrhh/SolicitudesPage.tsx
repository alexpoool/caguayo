import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rrhhService } from '../../services/rrhh';
import { useInfiniteList } from '../../hooks/useInfiniteList';
import {
  COLOR_ESTADO_SOLICITUD,
  COLOR_TIPO_SOLICITUD,
  type RrhhSolicitudListado,
} from '../../types/rrhh';
import {
  AlertCircle,
  CalendarDays,
  CalendarOff,
  Check,
  ClipboardList,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
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
} from '../../components/ui';

type Pestana = 'solicitudes' | 'calendario';

const TIPO_ETIQUETA: Record<string, string> = {
  vacaciones: 'Vacaciones',
  permiso: 'Permiso',
};

const fmtFecha = (v: string) => {
  const [anio, mes, dia] = v.split('-');
  return `${dia}/${mes}/${anio}`;
};

/** Fecha ISO local (sin desfase de UTC) para los inputs tipo date. */
const hoyISO = () => {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
};

/** Botón de alta con el mismo patrón que «Nueva evaluación» (paleta brand). */
const GRADIENTE =
  'bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300';

export function SolicitudesPage() {
  const [pestana, setPestana] = useState<Pestana>('solicitudes');
  const [modalCrear, setModalCrear] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <ClipboardList className="h-6 w-6 text-brand-600" />
            Solicitudes
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Vacaciones y permisos: solicitud, aprobación y calendario de equipo
          </p>
        </div>
        {pestana === 'solicitudes' && (
          <Button
            size="sm"
            onClick={() => setModalCrear(true)}
            className={`gap-2 ${GRADIENTE}`}
          >
            <Plus className="h-4 w-4" />
            Nueva solicitud
          </Button>
        )}
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {(
          [
            ['solicitudes', 'Solicitudes', ClipboardList],
            ['calendario', 'Calendario', CalendarDays],
          ] as const
        ).map(([clave, etiqueta, Icono]) => (
          <button
            key={clave}
            type="button"
            onClick={() => {
              setPestana(clave);
              setModalCrear(false);
            }}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              pestana === clave
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icono className="h-4 w-4" />
            {etiqueta}
          </button>
        ))}
      </div>

      {pestana === 'solicitudes' ? (
        <ListaSolicitudes
          modalCrear={modalCrear}
          setModalCrear={setModalCrear}
        />
      ) : (
        <VistaCalendario />
      )}
    </div>
  );
}

// ── Listado y acciones ──────────────────────────────────────────────────────

function ListaSolicitudes({
  modalCrear,
  setModalCrear,
}: {
  modalCrear: boolean;
  setModalCrear: (abierto: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const [aAprobar, setAAprobar] = useState<RrhhSolicitudListado | null>(null);
  const [aRechazar, setARechazar] = useState<RrhhSolicitudListado | null>(null);
  const [aCancelar, setACancelar] = useState<RrhhSolicitudListado | null>(null);
  const [aVer, setAVer] = useState<number | null>(null);

  // Lista con scroll infinito (tipo feed): 100 por página, más recientes
  // primero. El buscador vive en el propio hook.
  const {
    items: filas,
    isLoading,
    isFetchingMore,
    isError,
    error,
    hasMore,
    loadMore,
    searchTerm,
    setSearch,
    refresh,
  } = useInfiniteList<RrhhSolicitudListado>({
    queryKeyBase: 'rrhh_solicitudes',
    queryFn: (skip, limit, buscar) =>
      rrhhService.listarSolicitudes({ skip, limit, buscar }),
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

  const refrescarLista = () => {
    refresh();
    queryClient.invalidateQueries({ queryKey: ['rrhh', 'solicitudes'] });
  };

  const cancelarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { empleado_id: number; observaciones?: string } }) =>
      rrhhService.cancelarSolicitud(id, data),
    onSuccess: () => {
      toast.success('Solicitud cancelada');
      refrescarLista();
      setACancelar(null);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo cancelar');
    },
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por nombre, apellido o código..."
              value={searchTerm}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingRows />
          ) : isError ? (
            <ErrorState
              mensaje={error instanceof Error ? error.message : undefined}
              onReintentar={refresh}
            />
          ) : filas.length === 0 ? (
            <EmptyState
              mensaje={
                searchTerm
                  ? 'No se encontraron solicitudes con esa búsqueda.'
                  : 'Aún no hay solicitudes. Pulsa «Nueva solicitud».'
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead className="text-right">Días</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Decisor</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((fila) => (
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
                    <TableCell>
                      <span className="text-slate-700">{TIPO_ETIQUETA[fila.tipo]}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-slate-600">
                      {fmtFecha(fila.fecha_inicio)} – {fmtFecha(fila.fecha_fin)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fila.dias}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          COLOR_ESTADO_SOLICITUD[fila.estado]
                        }`}
                      >
                        {fila.estado}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {fila.aprobador_nombre ?? fila.supervisor_nombre ?? '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <ActionButton titulo="Ver detalle" onClick={() => setAVer(fila.id)}>
                          <Search className="h-4 w-4" />
                        </ActionButton>
                        {fila.estado === 'pendiente' && (
                          <>
                            <ActionButton
                              titulo="Aprobar"
                              onClick={() => setAAprobar(fila)}
                            >
                              <Check className="h-4 w-4" />
                            </ActionButton>
                            <ActionButton
                              titulo="Rechazar"
                              danger
                              onClick={() => setARechazar(fila)}
                            >
                              <X className="h-4 w-4" />
                            </ActionButton>
                            <ActionButton
                              titulo="Cancelar"
                              danger
                              onClick={() => setACancelar(fila)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </ActionButton>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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

      <ModalCrear
        isOpen={modalCrear}
        onClose={() => setModalCrear(false)}
        onListo={refrescarLista}
      />
      <ModalDecision
        solicitud={aAprobar}
        accion="aprobar"
        onClose={() => setAAprobar(null)}
        onListo={refrescarLista}
      />
      <ModalDecision
        solicitud={aRechazar}
        accion="rechazar"
        onClose={() => setARechazar(null)}
        onListo={refrescarLista}
      />
      <ModalDetalle solicitudId={aVer} onClose={() => setAVer(null)} />

      <ConfirmModal
        isOpen={aCancelar !== null}
        title="Cancelar solicitud"
        message={
          aCancelar
            ? `¿Seguro que quieres cancelar la solicitud de ${
                aCancelar.empleado_nombre ?? 'este empleado'
              } (${TIPO_ETIQUETA[aCancelar.tipo]}, ${aCancelar.dias} días)?`
            : ''
        }
        type="danger"
        onConfirm={() =>
          aCancelar &&
          cancelarMutation.mutate({
            id: aCancelar.id,
            data: {
              empleado_id: aCancelar.empleado_id,
              observaciones: 'Cancelada por el solicitante',
            },
          })
        }
        onClose={() => setACancelar(null)}
      />
    </div>
  );
}

// ── Modal de creación ───────────────────────────────────────────────────────

function ModalCrear({
  isOpen,
  onClose,
  onListo,
}: {
  isOpen: boolean;
  onClose: () => void;
  onListo: () => void;
}) {
  const queryClient = useQueryClient();
  const [empleadoId, setEmpleadoId] = useState<number | ''>('');
  const [tipo, setTipo] = useState('vacaciones');
  const [inicio, setInicio] = useState(hoyISO());
  const [fin, setFin] = useState(hoyISO());
  const [motivo, setMotivo] = useState('');

  const { data: empleados = [] } = useQuery({
    queryKey: ['rrhh', 'empleados', 'activos'],
    queryFn: () => rrhhService.listarEmpleados({ activo: true, limit: 500 }),
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: () =>
      rrhhService.crearSolicitud({
        empleado_id: empleadoId as number,
        tipo: tipo as 'vacaciones' | 'permiso',
        fecha_inicio: inicio,
        fecha_fin: fin,
        motivo: motivo || null,
      }),
    onSuccess: () => {
      toast.success('Solicitud creada');
      queryClient.invalidateQueries({ queryKey: ['rrhh', 'solicitudes'] });
      onListo();
      onClose();
      setMotivo('');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear');
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (empleadoId === '') {
      toast.error('Elige el empleado');
      return;
    }
    if (fin < inicio) {
      toast.error('El fin debe ser posterior o igual al inicio');
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-md overflow-hidden !rounded-none [&>button.absolute]:hidden"
    >
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-gradient-to-r from-brand-50 to-brand-100 px-6 py-4 pr-12">
        <div className="rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 p-2">
          <ClipboardList className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-gray-900">
            Nueva solicitud
          </h2>
          <p className="text-xs text-slate-500">
            Queda «pendiente» hasta que el supervisor o RRHH la decidan.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Cerrar"
          aria-label="Cerrar"
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-brand-100 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
        <div className="space-y-2">
          <Label>Empleado</Label>
          <select
            value={empleadoId}
            onChange={(e) => setEmpleadoId(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Elegir empleado...</option>
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre} {e.apellido} ({e.codigo_empleado})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Tipo</Label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="vacaciones">Vacaciones</option>
            <option value="permiso">Permiso</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ini">Inicio</Label>
            <DateInput id="ini" value={inicio} onChange={(iso) => setInicio(iso)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fin">Fin</Label>
            <DateInput id="fin" value={fin} onChange={(iso) => setFin(iso)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="motivo">Motivo</Label>
          <textarea
            id="motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Opcional"
          />
        </div>

        <div className="sticky bottom-0 -mx-6 flex items-center gap-2 border-t bg-white px-6 pb-5 pt-4">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Crear
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Modal de decisión (aprobar o rechazar) ──────────────────────────────────

function ModalDecision({
  solicitud,
  accion,
  onClose,
  onListo,
}: {
  solicitud: RrhhSolicitudListado | null;
  accion: 'aprobar' | 'rechazar';
  onClose: () => void;
  onListo: () => void;
}) {
  const queryClient = useQueryClient();
  // Sin auth en backend: quién decide viaja en el payload. Se precarga el
  // supervisor del solicitante, que es el aprobador natural.
  const [decisorId, setDecisorId] = useState<number | ''>('');
  const [observaciones, setObservaciones] = useState('');

  const { data: empleados = [] } = useQuery({
    queryKey: ['rrhh', 'empleados', 'activos'],
    queryFn: () => rrhhService.listarEmpleados({ activo: true, limit: 500 }),
    enabled: solicitud !== null,
  });

  // Precarga: el supervisor del solicitante.
  const decisorInicial =
    decisorId !== ''
      ? decisorId
      : solicitud?.supervisor_id ?? '';
  const decisorElegido =
    decisorInicial === '' ? (decisorId === '' ? '' : decisorId) : decisorInicial;

  const mutation = useMutation({
    mutationFn: () => {
      const data = {
        empleado_id: (decisorElegido === '' ? solicitud?.empleado_id : decisorElegido) as number,
        observaciones: observaciones || null,
      };
      return accion === 'aprobar'
        ? rrhhService.aprobarSolicitud(solicitud!.id, data)
        : rrhhService.rechazarSolicitud(solicitud!.id, data);
    },
    onSuccess: () => {
      toast.success(
        accion === 'aprobar' ? 'Solicitud aprobada' : 'Solicitud rechazada'
      );
      queryClient.invalidateQueries({ queryKey: ['rrhh', 'solicitudes'] });
      onListo();
      onClose();
      setObservaciones('');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo procesar');
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (decisorElegido === '') {
      toast.error('Indica quién decide');
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal
      isOpen={solicitud !== null}
      onClose={onClose}
      className="!max-w-md overflow-hidden !rounded-none [&>button.absolute]:hidden"
    >
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-gradient-to-r from-brand-50 to-brand-100 px-6 py-4 pr-12">
        <div className="rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 p-2">
          {accion === 'aprobar' ? (
            <Check className="h-5 w-5 text-white" />
          ) : (
            <AlertCircle className="h-5 w-5 text-white" />
          )}
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-gray-900">
            {accion === 'aprobar' ? 'Aprobar solicitud' : 'Rechazar solicitud'}
          </h2>
          {solicitud && (
            <p className="truncate text-xs text-slate-500">
              {solicitud.empleado_nombre} · {TIPO_ETIQUETA[solicitud.tipo]} ·{' '}
              {fmtFecha(solicitud.fecha_inicio)} – {fmtFecha(solicitud.fecha_fin)}{' '}
              ({solicitud.dias} días)
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Cerrar"
          aria-label="Cerrar"
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-brand-100 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
        <div className="space-y-2">
          <Label>
            {accion === 'aprobar' ? 'Aprobado por' : 'Rechazado por'}
          </Label>
          <select
            value={decisorElegido}
            onChange={(e) => setDecisorId(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Elegir decisor...</option>
            {empleados.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre} {e.apellido}
                {solicitud?.supervisor_id === e.id ? ' (supervisor)' : ''}
              </option>
            ))}
          </select>
          {solicitud?.supervisor_nombre && (
            <p className="text-xs text-slate-400">
              Supervisor del solicitante: {solicitud.supervisor_nombre}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="obs">Observaciones</Label>
          <textarea
            id="obs"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder={accion === 'aprobar' ? 'Opcional' : 'Motivo del rechazo'}
          />
        </div>

        <div className="sticky bottom-0 -mx-6 flex items-center gap-2 border-t bg-white px-6 pb-5 pt-4">
          <Button
            type="submit"
            disabled={mutation.isPending}
            variant={accion === 'rechazar' ? 'danger' : 'primary'}
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : accion === 'aprobar' ? (
              <Check className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
            {accion === 'aprobar' ? 'Aprobar' : 'Rechazar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Modal de detalle ────────────────────────────────────────────────────────

function ModalDetalle({
  solicitudId,
  onClose,
}: {
  solicitudId: number | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['rrhh', 'solicitudes', 'detalle', solicitudId],
    queryFn: () => rrhhService.obtenerSolicitud(solicitudId as number),
    enabled: solicitudId !== null,
  });

  return (
    <Modal
      isOpen={solicitudId !== null}
      onClose={onClose}
      className="!max-w-lg overflow-hidden !rounded-none [&>button.absolute]:hidden"
    >
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-gradient-to-r from-brand-50 to-brand-100 px-6 py-4 pr-12">
        <div className="rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 p-2">
          <ClipboardList className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-gray-900">
            Solicitud {data ? `#${data.id}` : ''}
          </h2>
          {data && (
            <p className="truncate text-xs text-slate-500">
              {TIPO_ETIQUETA[data.tipo]} · {fmtFecha(data.fecha_inicio)} –{' '}
              {fmtFecha(data.fecha_fin)} ({data.dias} días)
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Cerrar"
          aria-label="Cerrar"
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-brand-100 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="space-y-4 px-6 py-5">
        {isLoading || !data ? (
          <LoadingRows />
        ) : (
          <dl className="space-y-2 text-sm">
            <Fila label="Empleado" valor={`${data.empleado_nombre ?? '—'} (${data.empleado_codigo ?? '—'})`} />
            <Fila label="Departamento" valor={data.departamento_nombre ?? '—'} />
            <Fila label="Estado" valor={data.estado} />
            <Fila label="Motivo" valor={data.motivo ?? '—'} />
            <Fila
              label="Decisor"
              valor={data.aprobador_nombre ?? '—'}
            />
            <Fila
              label="Supervisor"
              valor={data.supervisor_nombre ?? 'Sin supervisor asignado'}
            />
            <Fila
              label="Fecha de decisión"
              valor={
                data.fecha_aprobacion
                  ? new Date(data.fecha_aprobacion).toLocaleString('es-CU')
                  : '—'
              }
            />
            <Fila label="Observaciones" valor={data.observaciones ?? '—'} />
          </dl>
        )}
      </div>
    </Modal>
  );
}

function Fila({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{valor}</dd>
    </div>
  );
}

// ── Calendario de equipo ────────────────────────────────────────────────────

function VistaCalendario() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth()); // 0-11
  const [departamentoId, setDepartamentoId] = useState<number | ''>('');

  const desde = `${anio}-${String(mes + 1).padStart(2, '0')}-01`;
  const ultimoDia = new Date(anio, mes + 1, 0).getDate();
  const hasta = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

  const { data: departamentos = [] } = useQuery({
    queryKey: ['rrhh', 'departamentos', 'activos'],
    queryFn: () => rrhhService.listarDepartamentos({ activo: true }),
  });

  const { data: ausencias = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['rrhh', 'solicitudes', 'calendario', desde, hasta, departamentoId],
    queryFn: () =>
      rrhhService.solicitudesCalendario({
        desde,
        hasta,
        departamento_id: departamentoId === '' ? undefined : departamentoId,
      }),
  });

  const cambiarMes = (delta: number) => {
    const d = new Date(anio, mes + delta, 1);
    setAnio(d.getFullYear());
    setMes(d.getMonth());
  };

  /** Días del mes con una ausencia, agrupados por día. */
  const porDia = useMemo(() => {
    const mapa: Record<number, typeof ausencias> = {};
    for (const a of ausencias) {
      const ini = new Date(`${a.fecha_inicio}T00:00:00`);
      const fin = new Date(`${a.fecha_fin}T00:00:00`);
      // Recorre los días del rango que caen en el mes mostrado.
      const desdeD = new Date(anio, mes, 1);
      const hastaD = new Date(anio, mes, ultimoDia);
      const desdeClamp = ini > desdeD ? ini : desdeD;
      const finClamp = fin < hastaD ? fin : hastaD;
      for (let d = new Date(desdeClamp); d <= finClamp; d.setDate(d.getDate() + 1)) {
        const dia = d.getDate();
        if (!mapa[dia]) mapa[dia] = [];
        mapa[dia].push(a);
      }
    }
    return mapa;
  }, [ausencias, anio, mes, ultimoDia]);

  const nombreMes = new Date(anio, mes, 1).toLocaleDateString('es-CU', {
    month: 'long',
    year: 'numeric',
  });

  const totalDias = useMemo(
    () => ausencias.reduce((acc, a) => acc + a.dias, 0),
    [ausencias]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => cambiarMes(-1)}>
            ‹
          </Button>
          <span className="min-w-40 text-center text-sm font-semibold capitalize text-slate-800">
            {nombreMes}
          </span>
          <Button variant="outline" size="sm" onClick={() => cambiarMes(1)}>
            ›
          </Button>
          <select
            value={departamentoId}
            onChange={(e) =>
              setDepartamentoId(e.target.value === '' ? '' : Number(e.target.value))
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
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
            <Leyenda color={COLOR_TIPO_SOLICITUD.vacaciones} etiqueta="Vacaciones" />
            <Leyenda color={COLOR_TIPO_SOLICITUD.permiso} etiqueta="Permiso" />
            <span className="text-slate-400">
              (relleno = aprobada, contorno = pendiente)
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingRows />
        ) : isError ? (
          <ErrorState mensaje="No se pudo cargar el calendario" onReintentar={refetch} />
        ) : (
          <>
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: ultimoDia }, (_, i) => i + 1).map((dia) => {
                const delDia = porDia[dia] || [];
                return (
                  <div
                    key={dia}
                    className="min-h-20 rounded-md border border-slate-100 bg-slate-50 p-1"
                  >
                    <div className="text-xs font-medium text-slate-500">{dia}</div>
                    <div className="mt-1 space-y-0.5">
                      {delDia.slice(0, 3).map((a) => (
                        <div
                          key={a.id}
                          title={`${a.empleado_nombre} · ${TIPO_ETIQUETA[a.tipo]} (${a.estado}) · ${a.dias} días`}
                          className={`truncate rounded px-1 py-0.5 text-[10px] leading-tight text-white ${
                            COLOR_TIPO_SOLICITUD[a.tipo]
                          } ${a.estado === 'pendiente' ? 'ring-1 ring-slate-400 ring-offset-1 opacity-70' : ''}`}
                        >
                          {a.empleado_nombre}
                        </div>
                      ))}
                      {delDia.length > 3 && (
                        <div className="text-[10px] text-slate-400">
                          +{delDia.length - 3} más
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span>
                <strong className="text-slate-700">{ausencias.length}</strong> solicitudes en el
                mes
              </span>
              <span>
                <strong className="text-slate-700">{totalDias}</strong> días de ausencia
              </span>
            </div>

            {ausencias.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <CalendarOff className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">
                  No hay ausencias aprobadas ni pendientes en este mes.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Leyenda({ color, etiqueta }: { color: string; etiqueta: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
      {etiqueta}
    </span>
  );
}

// ── Subcomponentes ──────────────────────────────────────────────────────────

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
      <ClipboardList className="h-10 w-10 text-slate-300" />
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
      <p className="text-sm text-slate-600">{mensaje || 'No se pudieron cargar los datos'}</p>
      <Button variant="outline" size="sm" onClick={onReintentar}>
        <Search className="h-4 w-4" />
        Reintentar
      </Button>
    </div>
  );
}
