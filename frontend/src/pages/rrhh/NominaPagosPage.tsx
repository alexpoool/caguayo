import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { rrhhService } from '../../services/rrhh';
import {
  COLOR_ESTADO_NOMINA,
  ETIQUETA_ESTADO_NOMINA,
  type RrhhNominaEmpleadoRead,
  type RrhhNominaPagoItem,
} from '../../types/rrhh';
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Building2,
  Eraser,
  Loader2,
  RefreshCw,
  Save,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  DateInput,
  Input,
} from '../../components/ui';

const fmtMoneda = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === ''
    ? '—'
    : new Intl.NumberFormat('es-CU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(v));

/** `2026-10-01` → `01/10/2026`. Devuelve el original si no es una fecha ISO. */
const fmtFecha = (v: string | null | undefined) => {
  if (!v) return '—';
  const [anio, mes, dia] = v.split('-');
  if (!anio || !mes || !dia) return v;
  return `${dia}/${mes}/${anio}`;
};

/** Fecha ISO local (sin desfase de UTC) para los inputs tipo date. */
const hoyISO = () => {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
};

interface FilaPago {
  fecha_pago: string;
  monto: string;
  metodo_id: string;
  referencia: string;
}

type CampoPago = keyof FilaPago;

function filaInicial(
  empleado: RrhhNominaEmpleadoRead,
  metodoPagoId?: number | null
): FilaPago {
  return {
    // Sin pago guardado se propone hoy, igual que se propone el neto.
    fecha_pago: empleado.fecha_pago ?? hoyISO(),
    monto:
      empleado.monto !== null && empleado.monto !== undefined
        ? String(Number(empleado.monto))
        : String(Number(empleado.neto_a_cobrar)),
    // El pago guardado manda; si está pendiente se propone el método del lote.
    metodo_id: empleado.metodo_id
      ? String(empleado.metodo_id)
      : metodoPagoId
        ? String(metodoPagoId)
        : '',
    referencia: empleado.referencia ?? '',
  };
}

interface GrupoFilas {
  clave: string;
  nombre: string;
  filas: RrhhNominaEmpleadoRead[];
}

function agruparPorDepartamento(
  filas: RrhhNominaEmpleadoRead[]
): GrupoFilas[] {
  const mapa = new Map<string, GrupoFilas>();
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
  'md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_2rem]';

/**
 * Registro de pagos por empleado de una nómina confirmada.
 *
 * A diferencia del detalle (`/rrhh/nomina/:id`), aquí no se muestran los
 * cálculos: cada empleado tiene fecha de pago, monto (prefillado con su neto),
 * método y referencia. Los datos se guardan en `nomina_empleados`.
 */
export function NominaPagosPage() {
  const { id } = useParams<{ id: string }>();
  const nominaId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [pagos, setPagos] = useState<Record<number, FilaPago>>({});

  const {
    data: detalle,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['rrhh', 'nomina', 'detalle', nominaId],
    queryFn: () => rrhhService.obtenerNomina(nominaId),
    enabled: !Number.isNaN(nominaId),
  });

  const { data: metodos = [] } = useQuery({
    queryKey: ['rrhh', 'catalogos', 'tipos-pago', 'pagos-nomina'],
    queryFn: () => rrhhService.listarTiposPago({ limit: 500 }),
  });

  const esEditable = detalle?.estado === 'nomina';

  // Solo se pagan empleados con neto > 0. Si alguno con neto 0 ya tiene un
  // pago guardado se mantiene visible para poder corregirlo o quitarlo.
  const empleadosVisibles = useMemo(
    () =>
      (detalle?.empleados ?? []).filter(
        (empleado) =>
          Number(empleado.neto_a_cobrar) > 0 ||
          (empleado.fecha_pago !== null && empleado.monto !== null)
      ),
    [detalle]
  );

  const metodosDisponibles = useMemo(() => {
    const usados = new Set(
      (detalle?.empleados ?? [])
        .map((empleado) => empleado.metodo_id)
        .filter((id): id is number => id !== null)
    );
    if (detalle?.metodo_pago_id) usados.add(detalle.metodo_pago_id);
    return metodos.filter(
      (metodo) => metodo.activo || usados.has(metodo.id_tipo_pago)
    );
  }, [metodos, detalle]);

  useEffect(() => {
    if (!detalle) return;
    const siguiente: Record<number, FilaPago> = {};
    for (const empleado of detalle.empleados) {
      siguiente[empleado.empleado_id] = filaInicial(
        empleado,
        detalle.metodo_pago_id
      );
    }
    setPagos(siguiente);
  }, [detalle]);

  const grupos = useMemo(
    () => agruparPorDepartamento(empleadosVisibles),
    [empleadosVisibles]
  );

  // El resumen cuenta solo los pagos ya guardados: la fecha viene propuesta
  // con hoy, así que el estado del formulario no significa que ya se pagó.
  const resumen = useMemo(() => {
    const filas = empleadosVisibles;
    let pagados = 0;
    let totalPagado = 0;
    for (const empleado of filas) {
      if (empleado.fecha_pago === null || empleado.monto === null) continue;
      const monto = Number(empleado.monto);
      if (!Number.isFinite(monto) || monto <= 0) continue;
      pagados += 1;
      totalPagado += monto;
    }
    return {
      pagados,
      pendientes: filas.length - pagados,
      totalPagado,
      totalNeto: Number(detalle?.total_neto ?? 0),
    };
  }, [empleadosVisibles, detalle?.total_neto]);

  const cambiar = (empleadoId: number, campo: CampoPago, valor: string) => {
    setPagos((prev) => ({
      ...prev,
      [empleadoId]: { ...prev[empleadoId], [campo]: valor },
    }));
  };

  const limpiar = (empleadoId: number) => {
    const empleado = detalle?.empleados.find(
      (fila) => fila.empleado_id === empleadoId
    );
    if (!empleado) return;
    setPagos((prev) => ({
      ...prev,
      [empleadoId]: {
        fecha_pago: '',
        monto: String(Number(empleado.neto_a_cobrar)),
        metodo_id: '',
        referencia: '',
      },
    }));
  };

  const guardarMutation = useMutation({
    mutationFn: () => {
      // Solo se envían las filas visibles y con una acción real. Las filas
      // pendientes (sin fecha ni método) no se mandan: el backend las dejaría
      // igual y enviar su monto 0 rompe la validación `gt=0`.
      const items: RrhhNominaPagoItem[] = empleadosVisibles.flatMap(
        (empleado) => {
          const fila = pagos[empleado.empleado_id];
          if (!fila) return [];

          const tieneFecha = Boolean(fila.fecha_pago);
          const tieneMetodo = Boolean(fila.metodo_id);
          const monto =
            fila.monto.trim() !== '' ? Number(fila.monto) : null;
          const completa =
            tieneFecha && tieneMetodo && monto !== null && monto > 0;
          const teniaPago =
            empleado.fecha_pago !== null && empleado.monto !== null;

          // Sin pago completo: solo se envía si había uno previo, para
          // quitarlo (fecha, método y monto en null).
          if (!completa && !teniaPago) return [];

          return [
            {
              empleado_id: empleado.empleado_id,
              fecha_pago: completa ? fila.fecha_pago : null,
              monto: completa ? monto : null,
              metodo_id: completa ? Number(fila.metodo_id) : null,
              referencia: completa ? fila.referencia.trim() || null : null,
            },
          ];
        }
      );
      return rrhhService.guardarPagosNomina(nominaId, items);
    },
    onSuccess: () => {
      toast.success('Pagos guardados');
      queryClient.invalidateQueries({
        queryKey: ['rrhh', 'nomina', 'detalle', nominaId],
      });
      queryClient.invalidateQueries({ queryKey: ['rrhh', 'nomina'] });
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : 'No se pudieron guardar los pagos'
      );
    },
  });

  const validar = () => {
    // Solo se valida lo que se muestra y se va a enviar. Los empleados con
    // neto 0 y sin pago guardado quedan ocultos y no deben bloquear el guardado.
    for (const empleado of empleadosVisibles) {
      const fila = pagos[empleado.empleado_id];
      if (!fila) continue;
      const tieneFecha = Boolean(fila.fecha_pago);
      const tieneMetodo = Boolean(fila.metodo_id);
      const nombre = empleado.empleado_nombre ?? `Empleado ${empleado.empleado_id}`;
      if (tieneFecha !== tieneMetodo) {
        toast.error(`${nombre}: indica la fecha y el método de pago`);
        return false;
      }
      if (tieneFecha && tieneMetodo) {
        const monto = Number(fila.monto);
        if (!Number.isFinite(monto) || monto <= 0) {
          toast.error(`${nombre}: indica un monto mayor que cero`);
          return false;
        }
      }
    }
    return true;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!esEditable) return;
    if (!validar()) return;
    guardarMutation.mutate();
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
            title="Volver al detalle de la nómina"
            onClick={() => navigate(`/rrhh/nomina/${nominaId}`)}
            className="mt-1 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold text-slate-900">
              <Banknote className="h-6 w-6 text-brand-600" />
              Pagos de la nómina
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                  COLOR_ESTADO_NOMINA[detalle.estado]
                }`}
              >
                {ETIQUETA_ESTADO_NOMINA[detalle.estado]}
              </span>
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-500">
              <span className="font-medium text-slate-700">
                {detalle.descripcion}
              </span>
              <span className="text-slate-300">·</span>
              <span>
                {fmtFecha(detalle.inicio_periodo)} –{' '}
                {fmtFecha(detalle.fin_periodo)}
              </span>
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Actualizar
        </Button>
      </div>

      {!esEditable && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          <span>
            La nómina todavía está en pre-nómina. Confírmala para registrar los
            pagos.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/rrhh/nomina/${nominaId}`)}
          >
            Ir al detalle
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Resumen
          titulo="Empleados"
          valor={String(empleadosVisibles.length)}
        />
        <Resumen titulo="Pagados" valor={String(resumen.pagados)} />
        <Resumen
          titulo="Total pagado"
          valor={fmtMoneda(resumen.totalPagado)}
          destacado
        />
        <Resumen
          titulo="Pendiente"
          valor={fmtMoneda(Math.max(0, resumen.totalNeto - resumen.totalPagado))}
        />
      </div>

      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-700">
                Pago por empleado
              </h2>
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-600 ring-1 ring-brand-100">
                {resumen.pagados} de {empleadosVisibles.length} pagado
                {empleadosVisibles.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Solo se muestran los empleados con neto a cobrar mayor que cero.
              El monto viene prellenado con ese neto, pero puedes cambiarlo.
              Deja la fecha y el método vacíos para mantener un empleado
              pendiente; usa la goma para quitar un pago guardado.
            </p>
            {metodosDisponibles.length === 0 && (
              <p className="mt-1 text-xs font-medium text-amber-600">
                No hay métodos de pago activos. Créalos en Catálogos → Tipos de
                pago.
              </p>
            )}
          </CardHeader>
          <CardContent>
            {empleadosVisibles.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Users className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">
                  Esta nómina no tiene empleados con neto a cobrar mayor que
                  cero.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {grupos.map((grupo) => (
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
                    {grupo.filas.map((empleado) => {
                      const fila = pagos[empleado.empleado_id];
                      if (!fila) return null;
                      return (
                        <div
                          key={empleado.empleado_id}
                          className={`grid grid-cols-1 items-start gap-2 border-t border-slate-100 px-4 py-3 md:items-center md:gap-3 ${COLUMNAS}`}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800">
                              {empleado.empleado_nombre ?? '—'}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {empleado.empleado_codigo ?? '—'}
                              {empleado.puesto_nombre
                                ? ` · ${empleado.puesto_nombre}`
                                : ''}
                            </p>
                          </div>
                          <DateInput
                            value={fila.fecha_pago}
                            onChange={(iso) =>
                              cambiar(empleado.empleado_id, 'fecha_pago', iso)
                            }
                            disabled={!esEditable}
                            title="Fecha de pago"
                          />
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={fila.monto}
                            onChange={(e) =>
                              cambiar(
                                empleado.empleado_id,
                                'monto',
                                e.target.value
                              )
                            }
                            disabled={!esEditable}
                            title="Monto pagado"
                            className="text-right tabular-nums"
                          />
                          <select
                            value={fila.metodo_id}
                            onChange={(e) =>
                              cambiar(
                                empleado.empleado_id,
                                'metodo_id',
                                e.target.value
                              )
                            }
                            disabled={!esEditable}
                            title="Método de pago"
                            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">Método…</option>
                            {metodosDisponibles.map((metodo) => (
                              <option
                                key={metodo.id_tipo_pago}
                                value={metodo.id_tipo_pago}
                              >
                                {metodo.nombre}
                                {metodo.activo ? '' : ' (inactivo)'}
                              </option>
                            ))}
                          </select>
                          <Input
                            value={fila.referencia}
                            onChange={(e) =>
                              cambiar(
                                empleado.empleado_id,
                                'referencia',
                                e.target.value
                              )
                            }
                            disabled={!esEditable}
                            placeholder="Referencia"
                            title="Referencia del pago"
                            maxLength={50}
                          />
                          <button
                            type="button"
                            title="Quitar el pago de este empleado"
                            onClick={() => limpiar(empleado.empleado_id)}
                            disabled={!esEditable}
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Eraser className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-100 bg-brand-50/60 px-4 py-3">
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-brand-600">
              {fmtMoneda(resumen.totalPagado)}
            </span>{' '}
            pagado · {resumen.pendientes} pendiente
            {resumen.pendientes === 1 ? '' : 's'}
          </div>
          <Button
            type="submit"
            disabled={!esEditable || guardarMutation.isPending}
            className="gap-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:from-brand-600 hover:to-brand-500"
          >
            {guardarMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar pagos
          </Button>
        </div>
      </form>
    </div>
  );
}

function Columnas() {
  return (
    <div
      className={`hidden border-t border-slate-200 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:grid md:gap-3 ${COLUMNAS}`}
    >
      <span>Empleado</span>
      <span>Fecha de pago</span>
      <span className="text-right">Monto</span>
      <span>Método</span>
      <span>Referencia</span>
      <span />
    </div>
  );
}

function Resumen({
  titulo,
  valor,
  destacado,
}: {
  titulo: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-3 ${
        destacado ? 'bg-brand-50 ring-1 ring-brand-100' : 'bg-slate-50'
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {titulo}
      </p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">
        {valor}
      </p>
    </div>
  );
}
