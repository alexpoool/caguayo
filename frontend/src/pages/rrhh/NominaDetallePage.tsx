import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { rrhhService } from '../../services/rrhh';
import {
  COLOR_ESTADO_NOMINA,
  ETIQUETA_ESTADO_NOMINA,
  type RrhhNominaCandidato,
  type RrhhNominaEmpleadoRead,
} from '../../types/rrhh';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  MinusCircle,
  Pencil,
  Save,
  Users,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  ConfirmModal,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui';
import { NominaFormModal } from './NominaPage';

const fmtMoneda = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === ''
    ? '—'
    : new Intl.NumberFormat('es-CU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(v));

const fmtNumero = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === ''
    ? '—'
    : new Intl.NumberFormat('es-CU', { maximumFractionDigits: 4 }).format(
        Number(v)
      );

/** `2026-10-01` → `01/10/2026`. Devuelve el original si no es una fecha ISO. */
const fmtFecha = (v: string | null | undefined) => {
  if (!v) return '—';
  const [anio, mes, dia] = v.split('-');
  if (!anio || !mes || !dia) return v;
  return `${dia}/${mes}/${anio}`;
};

/** A cobrar = salario base + horas extras del periodo. */
const aCobrar = (fila: {
  salario_base: number | string;
  horas_extras: number | string;
}) => Number(fila.salario_base) + Number(fila.horas_extras);

interface GrupoFilas<T> {
  clave: string;
  nombre: string;
  filas: T[];
}

function agruparPorDepartamento<
  T extends {
    departamento_id: number | null;
    departamento_nombre: string | null;
  },
>(filas: T[]): GrupoFilas<T>[] {
  const mapa = new Map<string, GrupoFilas<T>>();
  for (const fila of filas) {
    const clave =
      fila.departamento_id === null ? 'sin' : String(fila.departamento_id);
    const grupo = mapa.get(clave) ?? {
      clave,
      nombre: fila.departamento_nombre ?? 'Sin departamento',
      filas: [],
    };
    grupo.filas.push(fila);
    mapa.set(clave, grupo);
  }
  return [...mapa.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es')
  );
}

const COLUMNAS =
  'md:grid-cols-[1.25rem_minmax(0,1.7fr)_minmax(0,1.1fr)_repeat(6,minmax(0,1fr))]';

export function NominaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const nominaId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editarOpen, setEditarOpen] = useState(false);
  const [confirmarOpen, setConfirmarOpen] = useState(false);
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const inicializado = useRef<number | null>(null);

  const {
    data: detalle,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['rrhh', 'nomina', 'detalle', nominaId],
    queryFn: () => rrhhService.obtenerNomina(nominaId),
    enabled: !Number.isNaN(nominaId),
  });

  const esPreNomina = detalle?.estado === 'pre_nomina';

  const {
    data: candidatos = [],
    isLoading: cargandoCandidatos,
    isError: errorCandidatos,
    refetch: refetchCandidatos,
  } = useQuery({
    queryKey: ['rrhh', 'nomina', 'candidatos', nominaId],
    queryFn: () => rrhhService.candidatosNomina(nominaId),
    enabled: esPreNomina,
  });

  // Selección local inicial: los empleados que ya están en el lote.
  useEffect(() => {
    if (!detalle) return;
    if (inicializado.current === detalle.id) return;
    inicializado.current = detalle.id;
    setSeleccion(new Set(detalle.empleados.map((e) => e.empleado_id)));
  }, [detalle]);

  // Los candidatos confirman la selección guardada en el servidor.
  const inicializadoCandidatos = useRef<number | null>(null);
  useEffect(() => {
    if (!detalle || candidatos.length === 0) return;
    if (inicializadoCandidatos.current === detalle.id) return;
    inicializadoCandidatos.current = detalle.id;
    const ids = new Set(detalle.empleados.map((e) => e.empleado_id));
    for (const candidato of candidatos) {
      if (candidato.seleccionado) ids.add(candidato.empleado_id);
    }
    setSeleccion(ids);
  }, [detalle, candidatos]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['rrhh', 'nomina'] });
  };

  const actuales = useMemo(
    () =>
      new Set((detalle?.empleados ?? []).map((empleado) => empleado.empleado_id)),
    [detalle]
  );

  const hayCambios = useMemo(() => {
    if (seleccion.size !== actuales.size) return true;
    for (const empleadoId of seleccion) {
      if (!actuales.has(empleadoId)) return true;
    }
    return false;
  }, [seleccion, actuales]);

  const guardarMutation = useMutation({
    mutationFn: () =>
      rrhhService.guardarEmpleadosNomina(
        nominaId,
        [...seleccion].sort((a, b) => a - b)
      ),
    onSuccess: () => {
      toast.success('Selección guardada');
      invalidate();
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo guardar la selección'
      );
    },
  });

  const confirmarMutation = useMutation({
    mutationFn: async () => {
      if (hayCambios) {
        await rrhhService.guardarEmpleadosNomina(
          nominaId,
          [...seleccion].sort((a, b) => a - b)
        );
      }
      return await rrhhService.confirmarNomina(nominaId);
    },
    onSuccess: () => {
      toast.success('Nómina confirmada');
      invalidate();
      setConfirmarOpen(false);
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo confirmar la nómina'
      );
    },
  });

  const gruposCandidatos = useMemo(
    () => agruparPorDepartamento(candidatos),
    [candidatos]
  );

  const gruposDetalle = useMemo(
    () => agruparPorDepartamento(detalle?.empleados ?? []),
    [detalle]
  );

  const totalesSeleccion = useMemo(() => {
    const totales = {
      devengado: 0,
      impuesto: 0,
      deducciones: 0,
      neto: 0,
    };
    for (const candidato of candidatos) {
      if (!seleccion.has(candidato.empleado_id)) continue;
      totales.devengado += Number(candidato.devengado);
      totales.impuesto += Number(candidato.impuesto);
      totales.deducciones += Number(candidato.deducciones);
      totales.neto += Number(candidato.neto_a_cobrar);
    }
    return totales;
  }, [candidatos, seleccion]);

  const alternar = (empleadoId: number) => {
    setSeleccion((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(empleadoId)) siguiente.delete(empleadoId);
      else siguiente.add(empleadoId);
      return siguiente;
    });
  };

  const marcarGrupo = (empleados: RrhhNominaCandidato[], marcar: boolean) => {
    setSeleccion((prev) => {
      const siguiente = new Set(prev);
      for (const empleado of empleados) {
        if (marcar) siguiente.add(empleado.empleado_id);
        else siguiente.delete(empleado.empleado_id);
      }
      return siguiente;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded-md bg-slate-100" />
        <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (isError || !detalle) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-sm text-slate-600">
          {error instanceof Error
            ? error.message
            : 'No se pudo cargar la nómina'}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/rrhh/nomina')}
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            title="Volver al listado"
            onClick={() => navigate('/rrhh/nomina')}
            className="mt-1 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold text-slate-900">
              <Wallet className="h-6 w-6 text-brand-600" />
              {detalle.descripcion}
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                  COLOR_ESTADO_NOMINA[detalle.estado]
                }`}
              >
                {ETIQUETA_ESTADO_NOMINA[detalle.estado]}
              </span>
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-500">
              <span>Periodo {fmtFecha(detalle.periodo)}</span>
              <span className="text-slate-300">·</span>
              <span>
                {fmtFecha(detalle.inicio_periodo)} –{' '}
                {fmtFecha(detalle.fin_periodo)}
              </span>
              <span className="text-slate-300">·</span>
              <span>
                {detalle.moneda_nombre ?? 'Moneda'}
                {detalle.moneda_simbolo ? ` (${detalle.moneda_simbolo})` : ''} ·
                Tasa {fmtNumero(detalle.tasa)}
              </span>
              <span className="text-slate-300">·</span>
              <span>Impuesto {fmtNumero(detalle.porcentaje_impuesto)}%</span>
            </p>
          </div>
        </div>

        {esPreNomina && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditarOpen(true)}
            >
              <Pencil className="h-4 w-4" />
              Editar datos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => guardarMutation.mutate()}
              disabled={
                !hayCambios ||
                guardarMutation.isPending ||
                confirmarMutation.isPending
              }
              title={
                hayCambios
                  ? 'Guardar la selección de empleados'
                  : 'No hay cambios en la selección'
              }
            >
              {guardarMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar selección
            </Button>
            <Button
              size="sm"
              onClick={() => setConfirmarOpen(true)}
              disabled={
                seleccion.size === 0 ||
                guardarMutation.isPending ||
                confirmarMutation.isPending
              }
              title={
                seleccion.size === 0
                  ? 'Añade al menos un empleado para confirmar'
                  : 'Confirmar la nómina y bloquear su edición'
              }
              className="gap-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:from-brand-600 hover:to-brand-500"
            >
              {confirmarMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Confirmar nómina
            </Button>
          </div>
        )}
      </div>

      {!esPreNomina && (
        <div className="flex items-center gap-2 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-600">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Nómina confirmada: solo lectura. No se pueden añadir ni quitar
          empleados.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Resumen
          titulo="Empleados"
          valor={String(detalle.cantidad_empleados)}
          icono={Users}
        />
        <Resumen
          titulo="Total devengado"
          valor={fmtMoneda(detalle.total_devengado)}
          icono={CircleDollarSign}
        />
        <Resumen
          titulo="Total deducciones"
          valor={fmtMoneda(detalle.total_deducciones)}
          icono={MinusCircle}
        />
        <Resumen
          titulo="Neto total"
          valor={fmtMoneda(detalle.total_neto)}
          icono={Wallet}
          destacado
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-700">
              {esPreNomina ? 'Empleados del lote' : 'Detalle por empleado'}
            </h2>
            <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-600 ring-1 ring-brand-100">
              {esPreNomina
                ? `${seleccion.size} seleccionado${seleccion.size === 1 ? '' : 's'}`
                : `${detalle.empleados.length} empleado${detalle.empleados.length === 1 ? '' : 's'}`}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {esPreNomina
              ? 'Marca a los empleados activos que entrarán en la nómina. Al confirmar el lote, la selección queda bloqueada.'
              : 'Importes calculados al confirmar la nómina. Solo lectura.'}
          </p>
        </CardHeader>
        <CardContent>
          {esPreNomina ? (
            errorCandidatos ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <AlertCircle className="h-8 w-8 text-red-400" />
                <p className="text-sm text-slate-600">
                  No se pudieron cargar los empleados.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchCandidatos()}
                >
                  Reintentar
                </Button>
              </div>
            ) : cargandoCandidatos ? (
              <LoadingRows />
            ) : candidatos.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Users className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">
                  No hay empleados activos para incluir en la nómina.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {gruposCandidatos.map((grupo) => {
                  const ids = grupo.filas.map((fila) => fila.empleado_id);
                  const todas = ids.every((empleadoId) =>
                    seleccion.has(empleadoId)
                  );
                  const algunas = ids.some((empleadoId) =>
                    seleccion.has(empleadoId)
                  );
                  return (
                    <div
                      key={grupo.clave}
                      className="overflow-hidden rounded-lg border border-slate-200"
                    >
                      <label
                        className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
                          todas
                            ? 'bg-brand-50'
                            : 'bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={todas}
                          onChange={(e) =>
                            marcarGrupo(grupo.filas, e.target.checked)
                          }
                          className="sr-only"
                        />
                        <CheckVisual todas={todas} algunas={algunas} />
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <span className="flex-1 font-semibold text-gray-800">
                          {grupo.nombre}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({grupo.filas.length})
                        </span>
                      </label>

                      <Columnas />
                      {grupo.filas.map((fila) => (
                        <FilaCandidato
                          key={fila.empleado_id}
                          fila={fila}
                          marcada={seleccion.has(fila.empleado_id)}
                          onToggle={() => alternar(fila.empleado_id)}
                        />
                      ))}
                    </div>
                  );
                })}

                <div className="rounded-lg border border-brand-100 bg-brand-50/60 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-brand-600">
                      Totales de la selección ({seleccion.size})
                    </span>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-slate-700">
                      <span>
                        Devengado:{' '}
                        <strong className="tabular-nums">
                          {fmtMoneda(totalesSeleccion.devengado)}
                        </strong>
                      </span>
                      <span>
                        Impuesto:{' '}
                        <strong className="tabular-nums">
                          {fmtMoneda(totalesSeleccion.impuesto)}
                        </strong>
                      </span>
                      <span>
                        Deducciones:{' '}
                        <strong className="tabular-nums">
                          {fmtMoneda(totalesSeleccion.deducciones)}
                        </strong>
                      </span>
                      <span>
                        Neto:{' '}
                        <strong className="tabular-nums text-brand-600">
                          {fmtMoneda(totalesSeleccion.neto)}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : gruposDetalle.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Users className="h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">
                Esta nómina no tiene empleados.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {gruposDetalle.map((grupo) => (
                <div
                  key={grupo.clave}
                  className="overflow-hidden rounded-lg border border-slate-200"
                >
                  <div className="flex items-center gap-3 bg-slate-50 px-4 py-3">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="flex-1 font-semibold text-gray-800">
                      {grupo.nombre}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({grupo.filas.length})
                    </span>
                  </div>
                  <Columnas />
                  {grupo.filas.map((fila) => (
                    <FilaDetalle
                      key={fila.id_nomina_empleado}
                      fila={fila}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {detalle.pagos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <h2 className="text-sm font-semibold text-slate-700">Pagos</h2>
            <p className="text-xs text-slate-500">
              {fmtMoneda(detalle.total_pagado)} pagado en{' '}
              {detalle.cantidad_pagos} pago
              {detalle.cantidad_pagos === 1 ? '' : 's'}.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detalle.pagos.map((pago) => (
                  <TableRow key={pago.id}>
                    <TableCell className="whitespace-nowrap text-slate-600">
                      {fmtFecha(pago.fecha_pago)}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {pago.metodo_nombre ?? '—'}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {pago.referencia ?? '—'}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {fmtMoneda(pago.monto)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <NominaFormModal
        isOpen={editarOpen}
        onClose={() => setEditarOpen(false)}
        nomina={detalle}
      />

      <ConfirmModal
        isOpen={confirmarOpen}
        title="Confirmar nómina"
        message={`¿Confirmar la nómina «${detalle.descripcion}»? Quedará bloqueada como solo lectura y no podrás añadir ni quitar empleados.`}
        confirmText="Confirmar nómina"
        type="warning"
        onConfirm={() => confirmarMutation.mutate()}
        onClose={() => setConfirmarOpen(false)}
      />
    </div>
  );
}

// ── Subcomponentes ─────────────────────────────────────────────────────────

function Resumen({
  titulo,
  valor,
  icono: Icono,
  destacado,
}: {
  titulo: string;
  valor: string;
  icono: React.ComponentType<{ className?: string }>;
  destacado?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-3 ${
        destacado ? 'bg-brand-50 ring-1 ring-brand-100' : 'bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-2">
        <Icono
          className={`h-4 w-4 ${destacado ? 'text-brand-600' : 'text-slate-400'}`}
        />
        <span
          className={`text-lg font-bold tabular-nums ${
            destacado ? 'text-brand-600' : 'text-slate-700'
          }`}
        >
          {valor}
        </span>
      </div>
      <div className="text-xs text-slate-500">{titulo}</div>
    </div>
  );
}

function CheckVisual({
  todas,
  algunas,
}: {
  todas: boolean;
  algunas: boolean;
}) {
  return (
    <div
      className={`flex h-5 w-5 items-center justify-center rounded border ${
        todas
          ? 'border-brand-500 bg-brand-500'
          : algunas
            ? 'border-brand-500 bg-brand-100'
            : 'border-gray-300'
      }`}
    >
      {todas && <Check className="h-3 w-3 text-white" />}
      {algunas && !todas && (
        <div className="h-2 w-2 rounded-full bg-brand-500" />
      )}
    </div>
  );
}

function Columnas() {
  return (
    <div
      className={`hidden gap-3 border-b bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:grid md:items-center ${COLUMNAS}`}
    >
      <span />
      <span>Nombre</span>
      <span>Puesto</span>
      <span className="text-right">A cobrar</span>
      <span className="text-right">Bonificaciones</span>
      <span className="text-right">Devengado</span>
      <span className="text-right">Impuesto</span>
      <span className="text-right">Deducciones</span>
      <span className="text-right">Neto a cobrar</span>
    </div>
  );
}

function CeldaImporte({
  etiqueta,
  valor,
  tono = 'text-slate-700',
}: {
  etiqueta: string;
  valor: number | string;
  tono?: string;
}) {
  return (
    <div className={`text-right text-sm tabular-nums ${tono}`}>
      <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-400 md:hidden">
        {etiqueta}
      </span>
      {fmtMoneda(valor)}
    </div>
  );
}

function FilaCandidato({
  fila,
  marcada,
  onToggle,
}: {
  fila: RrhhNominaCandidato;
  marcada: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`grid cursor-pointer grid-cols-1 gap-2 border-b border-slate-100 px-4 py-3 transition-colors last:border-b-0 hover:bg-slate-50/70 md:items-center md:gap-3 ${COLUMNAS} ${
        marcada ? 'bg-brand-50/40' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={marcada}
        onChange={onToggle}
        className="sr-only"
      />
      <div
        className={`flex h-5 w-5 items-center justify-center rounded border ${
          marcada
            ? 'border-brand-500 bg-brand-500'
            : 'border-gray-300 bg-white'
        }`}
      >
        {marcada && <Check className="h-3 w-3 text-white" />}
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900">
          {fila.empleado_nombre ?? '—'}
        </p>
        <p className="truncate font-mono text-xs text-slate-500">
          {fila.empleado_codigo ?? '—'}
        </p>
      </div>
      <div className="truncate text-sm text-slate-600">
        {fila.puesto_nombre ?? '—'}
      </div>
      <CeldaImporte etiqueta="A cobrar" valor={aCobrar(fila)} />
      <CeldaImporte
        etiqueta="Bonificaciones"
        valor={fila.bonificaciones}
        tono="text-green-600"
      />
      <CeldaImporte etiqueta="Devengado" valor={fila.devengado} />
      <CeldaImporte etiqueta="Impuesto" valor={fila.impuesto} />
      <CeldaImporte
        etiqueta="Deducciones"
        valor={fila.deducciones}
        tono="text-red-600"
      />
      <CeldaImporte
        etiqueta="Neto a cobrar"
        valor={fila.neto_a_cobrar}
        tono="font-semibold text-slate-900"
      />
    </label>
  );
}

function FilaDetalle({ fila }: { fila: RrhhNominaEmpleadoRead }) {
  return (
    <div
      className={`grid grid-cols-1 gap-2 border-b border-slate-100 px-4 py-3 last:border-b-0 md:items-center md:gap-3 ${COLUMNAS}`}
    >
      <span />
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900">
          {fila.empleado_nombre ?? '—'}
        </p>
        <p className="truncate font-mono text-xs text-slate-500">
          {fila.empleado_codigo ?? '—'}
        </p>
      </div>
      <div className="truncate text-sm text-slate-600">
        {fila.puesto_nombre ?? '—'}
      </div>
      <CeldaImporte etiqueta="A cobrar" valor={aCobrar(fila)} />
      <CeldaImporte
        etiqueta="Bonificaciones"
        valor={fila.bonificaciones}
        tono="text-green-600"
      />
      <CeldaImporte etiqueta="Devengado" valor={fila.devengado} />
      <CeldaImporte etiqueta="Impuesto" valor={fila.impuesto} />
      <CeldaImporte
        etiqueta="Deducciones"
        valor={fila.deducciones}
        tono="text-red-600"
      />
      <CeldaImporte
        etiqueta="Neto a cobrar"
        valor={fila.neto_a_cobrar}
        tono="font-semibold text-slate-900"
      />
    </div>
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
