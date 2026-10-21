import { useEffect, useRef, useState } from 'react';
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
  Pencil,
  Plus,
  RefreshCw,
  Search,
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
  periodo: string;
  inicio_periodo: string;
  fin_periodo: string;
  moneda_id: number | '';
  tasa: string;
  porcentaje_impuesto: string;
} = {
  descripcion: '',
  periodo: '',
  inicio_periodo: '',
  fin_periodo: '',
  moneda_id: '',
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
                      {fmtFecha(fila.periodo)}
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
                    <TableCell className="text-right">
                      <button
                        type="button"
                        title={
                          fila.estado === 'pre_nomina'
                            ? 'Confirma la nómina para registrar los pagos'
                            : 'Registrar o ver los pagos por empleado'
                        }
                        disabled={fila.estado === 'pre_nomina'}
                        onClick={() =>
                          navigate(`/rrhh/nomina/${fila.id}/pagos`)
                        }
                        className="rounded-md px-2 py-1 text-sm font-semibold tabular-nums text-brand-600 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent"
                      >
                        {fila.cantidad_pagos > 0
                          ? `${fila.cantidad_pagos} · ${fmtMoneda(fila.total_pagado)}`
                          : 'Pagos'}
                      </button>
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
                          <>
                            <ActionButton
                              titulo="Confirmar nómina"
                              onClick={() => setAConfirmar(fila)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </ActionButton>
                            <ActionButton
                              titulo="Eliminar nómina"
                              danger
                              onClick={() => setAEliminar(fila)}
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
            ? `¿Seguro que quieres eliminar la nómina «${aEliminar.descripcion}»? Esta acción no se puede deshacer.`
            : ''
        }
        confirmText="Eliminar"
        type="danger"
        onConfirm={() => aEliminar && eliminarMutation.mutate(aEliminar.id)}
        onClose={() => setAEliminar(null)}
      />
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
            periodo: nomina.periodo,
            inicio_periodo: nomina.inicio_periodo,
            fin_periodo: nomina.fin_periodo,
            moneda_id: nomina.moneda_id,
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
    if (!form.periodo) errs.periodo = 'Indica el periodo';
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
      periodo: form.periodo,
      inicio_periodo: form.inicio_periodo,
      fin_periodo: form.fin_periodo,
      moneda_id: form.moneda_id as number,
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
            <DateInput
              id="periodo"
              value={form.periodo}
              onChange={(iso) => set('periodo', iso)}
            />
            {errores.periodo && (
              <p className="text-xs text-red-500">{errores.periodo}</p>
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
