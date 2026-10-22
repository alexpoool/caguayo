import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { rrhhService } from '../../services/rrhh';
import { monedaService } from '../../services/api';
import {
  COLOR_ESTADO_NOMINA,
  ESTADOS_NOMINA,
  ETIQUETA_ESTADO_NOMINA,
  type RrhhEstadoNomina,
  type RrhhNominaCreate,
  type RrhhNominaDetalle,
  type RrhhNominaListado,
} from '../../types/rrhh';
import {
  AlertCircle,
  Banknote,
  Calculator,
  CheckCircle2,
  FileDown,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Target,
  Trash2,
  Wallet,
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
import { ModalNuevoPeriodo } from '../../components/rrhh/ModalNuevoPeriodo';

type Pestana = 'nominas' | 'costo';

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

const FORM_VACIO: {
  descripcion: string;
  periodo_id: number | '';
  inicio_periodo: string;
  fin_periodo: string;
  moneda_id: number | '';
  metodo_pago_id: number | '';
  tasa: string;
  porcentaje_impuesto: string;
} = {
  descripcion: '',
  periodo_id: '',
  inicio_periodo: '',
  fin_periodo: '',
  moneda_id: '',
  metodo_pago_id: '',
  tasa: '1',
  porcentaje_impuesto: '5',
};

export function NominaPage() {
  const [pestana, setPestana] = useState<Pestana>('nominas');
  const [modalNueva, setModalNueva] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 p-2 shadow-lg">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Nómina</h1>
            <p className="text-sm text-gray-500">
              Lotes de nómina, su detalle por empleado y el costo
            </p>
          </div>
        </div>
        <Button
          onClick={() => setModalNueva(true)}
          className="gap-2 bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg transition-all duration-300 hover:from-brand-600 hover:to-brand-500 hover:shadow-xl"
        >
          <Plus className="h-4 w-4" />
          Nueva nómina
        </Button>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {(
          [
            ['nominas', 'Nóminas', Banknote],
            ['costo', 'Costo', Calculator],
          ] as const
        ).map(([clave, etiqueta, Icono]) => (
          <button
            key={clave}
            type="button"
            onClick={() => setPestana(clave)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              pestana === clave
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icono className="h-4 w-4" />
            {etiqueta}
          </button>
        ))}
      </div>

      {pestana === 'nominas' ? (
        <ListaNominas onNueva={() => setModalNueva(true)} />
      ) : (
        <VistaCosto />
      )}

      <NominaFormModal
        isOpen={modalNueva}
        onClose={() => setModalNueva(false)}
      />
    </div>
  );
}

// ── Listado y acciones de nómina ────────────────────────────────────────────

function ListaNominas({ onNueva }: { onNueva: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState<RrhhEstadoNomina | ''>('');
  const [aConfirmar, setAConfirmar] = useState<RrhhNominaListado | null>(null);
  const [aEliminar, setAEliminar] = useState<RrhhNominaListado | null>(null);

  // Menú flotante de pagos (Salario / Resultado), con el mismo patrón que el
  // menú de opciones de Empleados: portal a `document.body` y posición fija.
  const [menuPagos, setMenuPagos] = useState<{
    id: number;
    estado: RrhhEstadoNomina;
    periodoId: number | null;
    pagoResultadoId: number | null;
    cantidadPagos: number;
    totalPagado: number | string;
    x: number;
    y: number;
    anchor: { top: number; left: number; right: number; bottom: number };
  } | null>(null);
  const menuPagosRef = useRef<HTMLDivElement>(null);
  const MARGIN = 8;

  useLayoutEffect(() => {
    if (!menuPagos || !menuPagosRef.current) return;
    const m = menuPagosRef.current.getBoundingClientRect();
    let x = menuPagos.x;
    let y = menuPagos.y;
    if (x + m.width > window.innerWidth - MARGIN) {
      x = Math.max(MARGIN, menuPagos.anchor.right - m.width);
    }
    if (y + m.height > window.innerHeight - MARGIN) {
      y = Math.max(MARGIN, menuPagos.anchor.top - m.height - 4);
    }
    if (x !== menuPagos.x || y !== menuPagos.y) {
      setMenuPagos((prev) => (prev ? { ...prev, x, y } : null));
    }
  }, [menuPagos]);

  useEffect(() => {
    if (!menuPagos) return;
    const onDocClick = (e: MouseEvent) => {
      if (
        menuPagosRef.current &&
        !menuPagosRef.current.contains(e.target as Node)
      ) {
        setMenuPagos(null);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuPagos(null);
    };
    const onScrollOrResize = () => setMenuPagos(null);
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
  }, [menuPagos]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['rrhh', 'nomina'] });

  const {
    data: filas = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['rrhh', 'nomina', 'listado', buscar, estado],
    queryFn: () =>
      rrhhService.listarNominas({
        limit: 500,
        buscar: buscar.trim() || undefined,
        estado: estado || undefined,
      }),
  });

  const confirmarMutation = useMutation({
    mutationFn: (id: number) => rrhhService.confirmarNomina(id),
    onSuccess: () => {
      toast.success('Nómina confirmada');
      invalidate();
      setAConfirmar(null);
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo confirmar la nómina'
      );
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: number) => rrhhService.eliminarNomina(id),
    onSuccess: () => {
      toast.success('Nómina eliminada');
      invalidate();
      setAEliminar(null);
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo eliminar la nómina'
      );
    },
  });

  const hayFiltros = buscar.trim() !== '' || estado !== '';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por descripción o periodo..."
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={estado}
              onChange={(e) =>
                setEstado(e.target.value as RrhhEstadoNomina | '')
              }
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Todos los estados</option>
              {ESTADOS_NOMINA.map((valor) => (
                <option key={valor} value={valor}>
                  {ETIQUETA_ESTADO_NOMINA[valor]}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              title="Actualizar"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
            </Button>
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
          ) : filas.length === 0 ? (
            <EmptyState
              mensaje={
                hayFiltros
                  ? 'No hay nóminas que coincidan con los filtros.'
                  : 'Aún no hay nóminas. Pulsa «Nueva nómina» para crear la primera.'
              }
              onNueva={hayFiltros ? undefined : onNueva}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Rango</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Impuesto</TableHead>
                  <TableHead className="text-right">Pagos</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((fila) => (
                  <TableRow key={fila.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900">
                        {fila.descripcion}
                      </div>
                      <div className="text-xs text-slate-500">
                        {fila.cantidad_empleados} empleado
                        {fila.cantidad_empleados === 1 ? '' : 's'}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-slate-600">
                      {fila.periodo_nombre || '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-slate-600">
                      {fmtFecha(fila.inicio_periodo)} –{' '}
                      {fmtFecha(fila.fin_periodo)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          COLOR_ESTADO_NOMINA[fila.estado]
                        }`}
                      >
                        {ETIQUETA_ESTADO_NOMINA[fila.estado]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-slate-700">
                      {fmtMoneda(fila.total_impuesto)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm font-semibold tabular-nums text-brand-600">
                          {fila.cantidad_pagos > 0
                            ? `${fila.cantidad_pagos} · ${fmtMoneda(fila.total_pagado)}`
                            : '—'}
                        </span>
                        <div className="relative inline-block">
                          <Button
                            variant="outline"
                            size="sm"
                            title="Opciones de pago"
                            onClick={(e) => {
                              e.stopPropagation();
                              const r = (
                                e.currentTarget as HTMLButtonElement
                              ).getBoundingClientRect();
                              setMenuPagos(
                                menuPagos && menuPagos.id === fila.id
                                  ? null
                                  : {
                                      id: fila.id,
                                      estado: fila.estado,
                                      periodoId: fila.periodo_id,
                                      pagoResultadoId:
                                        fila.pago_resultado_id ?? null,
                                      cantidadPagos: fila.cantidad_pagos,
                                      totalPagado: fila.total_pagado,
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
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <ActionButton
                          titulo="Descargar recibo"
                          onClick={() => toast('Próximamente')}
                        >
                          <FileDown className="h-4 w-4" />
                        </ActionButton>
                        <ActionButton
                          titulo={
                            fila.estado === 'nomina'
                              ? 'Ver detalle (solo lectura)'
                              : 'Editar nómina'
                          }
                          onClick={() => navigate(`/rrhh/nomina/${fila.id}`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </ActionButton>
                        {fila.estado === 'pre_nomina' && (
                          <ActionButton
                            titulo="Confirmar nómina"
                            onClick={() => setAConfirmar(fila)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </ActionButton>
                        )}
                        <ActionButton
                          titulo="Eliminar nómina"
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

      <ConfirmModal
        isOpen={aConfirmar !== null}
        title="Confirmar nómina"
        message={
          aConfirmar
            ? `¿Confirmar la nómina «${aConfirmar.descripcion}»? Se bloqueará la edición y pasará al estado Nómina.`
            : ''
        }
        confirmText="Confirmar"
        type="warning"
        onConfirm={() => aConfirmar && confirmarMutation.mutate(aConfirmar.id)}
        onClose={() => setAConfirmar(null)}
      />

      <ConfirmModal
        isOpen={aEliminar !== null}
        title="Eliminar nómina"
        message={
          aEliminar
            ? aEliminar.estado === 'nomina'
              ? `¿Seguro que quieres eliminar la nómina «${aEliminar.descripcion}»? También se borrarán los pagos de salario registrados por empleado. Esta acción no se puede deshacer.`
              : `¿Seguro que quieres eliminar la nómina «${aEliminar.descripcion}»? Esta acción no se puede deshacer.`
            : ''
        }
        confirmText="Eliminar"
        type="danger"
        onConfirm={() => aEliminar && eliminarMutation.mutate(aEliminar.id)}
        onClose={() => setAEliminar(null)}
      />

      {menuPagos &&
        createPortal(
          <div
            ref={menuPagosRef}
            className="fixed z-50 w-64 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl animate-fade-in"
            style={{ top: menuPagos.y, left: menuPagos.x }}
          >
            <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Pagos
            </div>
            <button
              type="button"
              disabled={menuPagos.estado === 'pre_nomina'}
              title={
                menuPagos.estado === 'pre_nomina'
                  ? 'Confirma la nómina para registrar los pagos'
                  : 'Registrar o ver los pagos por empleado'
              }
              onClick={() => {
                setMenuPagos(null);
                navigate(`/rrhh/nomina/${menuPagos.id}/pagos`);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-sky-50 hover:text-sky-700 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent disabled:hover:text-gray-400"
            >
              <Banknote className="h-4 w-4 text-sky-600" />
              <span className="flex-1 text-left">Salario</span>
              {menuPagos.cantidadPagos > 0 && (
                <span className="text-xs font-semibold tabular-nums text-gray-500">
                  {menuPagos.cantidadPagos} ·{' '}
                  {fmtMoneda(menuPagos.totalPagado)}
                </span>
              )}
            </button>
            <button
              type="button"
              disabled={
                menuPagos.estado !== 'nomina' || !menuPagos.periodoId
              }
              title={
                menuPagos.estado !== 'nomina'
                  ? 'Confirma la nómina para generar el pago por resultado'
                  : !menuPagos.periodoId
                    ? 'La nómina no tiene periodo; asígnale uno antes de pagar'
                    : 'Crear el pago por resultado de esta nómina'
              }
              onClick={() => {
                setMenuPagos(null);
                navigate(
                  `/rrhh/pagos-resultado/nuevo?nomina=${menuPagos.id}`
                );
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent disabled:hover:text-gray-400"
            >
              <Target className="h-4 w-4 text-emerald-600" />
              <span className="flex-1 text-left">Resultado</span>
              {menuPagos.pagoResultadoId && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  Pagado
                </span>
              )}
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}

// ── Modal de alta / edición de la cabecera ─────────────────────────────────

/**
 * Formulario canónico de la cabecera de una nómina. Se usa al crear desde el
 * listado y al editar los datos de una pre-nómina desde su detalle.
 */
export function NominaFormModal({
  isOpen,
  onClose,
  nomina = null,
}: {
  isOpen: boolean;
  onClose: () => void;
  nomina?: RrhhNominaListado | null;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(FORM_VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [modalPeriodo, setModalPeriodo] = useState(false);
  const inicializado = useRef<number | 'nuevo' | null>(null);

  const esEdicion = nomina !== null;

  useEffect(() => {
    if (!isOpen) {
      inicializado.current = null;
      return;
    }
    const clave = nomina ? nomina.id : 'nuevo';
    if (inicializado.current === clave) return;
    inicializado.current = clave;
    setForm(
      nomina
        ? {
            descripcion: nomina.descripcion,
            periodo_id: nomina.periodo_id ?? '',
            inicio_periodo: nomina.inicio_periodo,
            fin_periodo: nomina.fin_periodo,
            moneda_id: nomina.moneda_id,
            metodo_pago_id: nomina.metodo_pago_id ?? '',
            tasa: String(nomina.tasa),
            porcentaje_impuesto: String(nomina.porcentaje_impuesto),
          }
        : FORM_VACIO
    );
    setErrores({});
  }, [isOpen, nomina]);

  const { data: monedas = [] } = useQuery({
    queryKey: ['monedas'],
    queryFn: () => monedaService.getMonedas(0, 100),
    enabled: isOpen,
  });

  const { data: metodosPago = [] } = useQuery({
    queryKey: ['rrhh', 'catalogos', 'tipos-pago', 'activos'],
    queryFn: () => rrhhService.listarTiposPago({ limit: 500, activo: true }),
    enabled: isOpen,
  });

  const { data: periodos = [] } = useQuery({
    queryKey: ['rrhh', 'catalogos', 'periodos-evaluacion', 'activos'],
    queryFn: () =>
      rrhhService.listarPeriodosEvaluacion({ limit: 500, activo: true }),
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: (payload: RrhhNominaCreate) =>
      nomina
        ? rrhhService.actualizarNomina(nomina.id, payload)
        : rrhhService.crearNomina(payload),
    onSuccess: (data: RrhhNominaDetalle) => {
      toast.success(esEdicion ? 'Nómina actualizada' : 'Nómina creada');
      queryClient.invalidateQueries({ queryKey: ['rrhh', 'nomina'] });
      onClose();
      if (!esEdicion) navigate(`/rrhh/nomina/${data.id}`);
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : 'No se pudo guardar la nómina'
      );
    },
  });

  const set = <K extends keyof typeof FORM_VACIO>(
    key: K,
    value: (typeof FORM_VACIO)[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const validar = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.descripcion.trim())
      errs.descripcion = 'La descripción es obligatoria';
    if (form.periodo_id === '') errs.periodo_id = 'Indica el periodo';
    if (!form.inicio_periodo || !form.fin_periodo) {
      errs.rango = 'Indica el rango completo';
    } else if (form.fin_periodo < form.inicio_periodo) {
      errs.rango = 'El fin no puede ser anterior al inicio';
    }
    if (form.moneda_id === '') errs.moneda_id = 'Elige una moneda';
    const tasa = Number(form.tasa);
    if (form.tasa.trim() === '' || Number.isNaN(tasa) || tasa < 0) {
      errs.tasa = 'Indica una tasa válida';
    }
    const impuesto = Number(form.porcentaje_impuesto);
    if (
      form.porcentaje_impuesto.trim() === '' ||
      Number.isNaN(impuesto) ||
      impuesto < 0 ||
      impuesto > 100
    ) {
      errs.porcentaje_impuesto = 'Debe estar entre 0 y 100';
    }
    setErrores(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validar()) return;
    mutation.mutate({
      descripcion: form.descripcion.trim(),
      periodo_id: form.periodo_id as number,
      inicio_periodo: form.inicio_periodo,
      fin_periodo: form.fin_periodo,
      moneda_id: form.moneda_id as number,
      metodo_pago_id:
        form.metodo_pago_id === '' ? null : Number(form.metodo_pago_id),
      tasa: Number(form.tasa),
      porcentaje_impuesto: Number(form.porcentaje_impuesto),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="!max-w-2xl overflow-hidden !rounded-none [&>button.absolute]:hidden"
    >
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-gradient-to-r from-brand-50 to-brand-100 px-6 py-4 pr-12">
        <div className="rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 p-2">
          <Wallet className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-gray-900">
            {esEdicion ? 'Editar datos de la nómina' : 'Nueva nómina'}
          </h2>
          <p className="text-xs text-slate-500">
            {esEdicion
              ? 'Solo se puede editar mientras esté en pre-nómina.'
              : 'La nómina nace en pre-nómina: después podrás elegir a los empleados.'}
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
          <Label htmlFor="descripcion">Descripción *</Label>
          <Input
            id="descripcion"
            value={form.descripcion}
            onChange={(e) => set('descripcion', e.target.value)}
            placeholder="Ej. Nómina de octubre 2026"
            error={errores.descripcion}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="periodo">Periodo *</Label>
            <div className="flex items-start gap-2">
              <select
                id="periodo"
                value={form.periodo_id}
                onChange={(e) =>
                  set(
                    'periodo_id',
                    e.target.value === '' ? '' : Number(e.target.value)
                  )
                }
                className={`w-full flex-1 rounded-md border px-3 py-2 text-sm ${
                  errores.periodo_id ? 'border-red-500' : 'border-slate-300'
                }`}
              >
                <option value="">Elegir periodo...</option>
                {periodos.map((periodo) => (
                  <option
                    key={periodo.id_periodo_evaluacion}
                    value={periodo.id_periodo_evaluacion}
                  >
                    {periodo.nombre}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setModalPeriodo(true)}
                title="Nuevo periodo"
                className="shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {errores.periodo_id && (
              <p className="text-xs text-red-500">{errores.periodo_id}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="moneda">Moneda *</Label>
            <select
              id="moneda"
              value={form.moneda_id}
              onChange={(e) =>
                set(
                  'moneda_id',
                  e.target.value === '' ? '' : Number(e.target.value)
                )
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Elegir moneda...</option>
              {monedas.map((moneda) => (
                <option key={moneda.id_moneda} value={moneda.id_moneda}>
                  {moneda.nombre} ({moneda.simbolo})
                </option>
              ))}
            </select>
            {errores.moneda_id && (
              <p className="text-xs text-red-500">{errores.moneda_id}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="metodo_pago">Método de pago (opcional)</Label>
          <select
            id="metodo_pago"
            value={form.metodo_pago_id}
            onChange={(e) =>
              set(
                'metodo_pago_id',
                e.target.value === '' ? '' : Number(e.target.value)
              )
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Sin método por defecto</option>
            {metodosPago.map((metodo) => (
              <option key={metodo.id_tipo_pago} value={metodo.id_tipo_pago}>
                {metodo.nombre}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400">
            Se propondrá al registrar los pagos; cada empleado puede cambiarlo.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="inicio">Inicio del periodo *</Label>
            <DateInput
              id="inicio"
              value={form.inicio_periodo}
              onChange={(iso) => set('inicio_periodo', iso)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fin">Fin del periodo *</Label>
            <DateInput
              id="fin"
              value={form.fin_periodo}
              onChange={(iso) => set('fin_periodo', iso)}
            />
          </div>
        </div>
        {errores.rango && (
          <p className="text-xs text-red-500">{errores.rango}</p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tasa">Tasa *</Label>
            <Input
              id="tasa"
              type="number"
              step="0.0001"
              min="0"
              value={form.tasa}
              onChange={(e) => set('tasa', e.target.value)}
              error={errores.tasa}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="impuesto">Porcentaje de impuesto *</Label>
            <Input
              id="impuesto"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.porcentaje_impuesto}
              onChange={(e) => set('porcentaje_impuesto', e.target.value)}
              error={errores.porcentaje_impuesto}
            />
            <p className="text-xs text-slate-400">
              Solo se grava el exceso del devengado sobre el salario promedio.
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 -mx-6 flex items-center gap-2 border-t bg-white px-6 pb-5 pt-4">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            {esEdicion ? 'Guardar cambios' : 'Crear nómina'}
          </Button>
        </div>
      </form>

      <ModalNuevoPeriodo
        isOpen={modalPeriodo}
        onClose={() => setModalPeriodo(false)}
        onCreado={(periodo) => {
          set('periodo_id', periodo.id_periodo_evaluacion);
          setErrores((prev) => ({ ...prev, periodo_id: '' }));
        }}
      />
    </Modal>
  );
}

// ── Vista de costo ──────────────────────────────────────────────────────────

function VistaCosto() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [departamentoId, setDepartamentoId] = useState<number | ''>('');

  const { data: departamentos = [] } = useQuery({
    queryKey: ['rrhh', 'departamentos', 'para-filtro'],
    queryFn: () => rrhhService.listarDepartamentos({ limit: 500, activo: true }),
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['rrhh', 'nomina', 'costo', desde, hasta, departamentoId],
    queryFn: () =>
      rrhhService.reporteCosto({
        desde: desde || undefined,
        hasta: hasta || undefined,
        departamento_id:
          departamentoId === '' ? undefined : departamentoId,
      }),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-3">
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
            value={departamentoId}
            onChange={(e) =>
              setDepartamentoId(
                e.target.value === '' ? '' : Number(e.target.value)
              )
            }
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todos los departamentos</option>
            {departamentos.map((departamento) => (
              <option
                key={departamento.id_departamento}
                value={departamento.id_departamento}
              >
                {departamento.nombre}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            title="Actualizar"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
          </Button>
          <p className="text-xs text-slate-400">
            Solo incluye nóminas confirmadas. Sin fechas se incluye todo.
          </p>
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
        ) : !data || data.departamentos.length === 0 ? (
          <EmptyState mensaje="No hay nóminas confirmadas en el rango seleccionado." />
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Resumen
                titulo="Salario base"
                valor={fmtMoneda(data.total_salario_base)}
              />
              <Resumen
                titulo="Horas extras"
                valor={fmtMoneda(data.total_horas_extras)}
              />
              <Resumen
                titulo="Bonificaciones"
                valor={fmtMoneda(data.total_bonificaciones)}
              />
              <Resumen
                titulo="Deducciones"
                valor={fmtMoneda(data.total_deducciones)}
              />
              <Resumen
                titulo="Neto total"
                valor={fmtMoneda(data.total_neto)}
                destacado
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Departamento</TableHead>
                  <TableHead className="text-right">Empleados</TableHead>
                  <TableHead className="text-right">Salario base</TableHead>
                  <TableHead className="text-right">Extras</TableHead>
                  <TableHead className="text-right">Deducciones</TableHead>
                  <TableHead className="text-right">Bonificaciones</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.departamentos.map((d, i) => (
                  <TableRow key={d.departamento_id ?? `sin-${i}`}>
                    <TableCell className="font-medium text-slate-900">
                      {d.departamento_nombre ?? 'Sin departamento'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {d.cantidad_empleados}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtMoneda(d.salario_base)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtMoneda(d.horas_extras)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-red-600">
                      -{fmtMoneda(d.deducciones)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-green-600">
                      +{fmtMoneda(d.bonificaciones)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {fmtMoneda(d.salario_neto)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-3 text-xs text-slate-400">
              {data.cantidad_nominas} nómina
              {data.cantidad_nominas === 1 ? '' : 's'} confirmada
              {data.cantidad_nominas === 1 ? '' : 's'} en el rango.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Subcomponentes ──────────────────────────────────────────────────────────

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
      <div
        className={`text-xl font-bold tabular-nums ${
          destacado ? 'text-brand-600' : 'text-slate-700'
        }`}
      >
        {valor}
      </div>
      <div className="text-xs text-slate-500">{titulo}</div>
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

function EmptyState({
  mensaje,
  onNueva,
}: {
  mensaje: string;
  onNueva?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Banknote className="h-10 w-10 text-slate-300" />
      <p className="max-w-sm text-sm text-slate-500">{mensaje}</p>
      {onNueva && (
        <Button size="sm" onClick={onNueva} className="mt-2">
          <Plus className="h-4 w-4" />
          Nueva nómina
        </Button>
      )}
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
        {mensaje || 'No se pudieron cargar los datos'}
      </p>
      <Button variant="outline" size="sm" onClick={onReintentar}>
        <Search className="h-4 w-4" />
        Reintentar
      </Button>
    </div>
  );
}
