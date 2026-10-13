import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rrhhService } from '../../services/rrhh';
import {
  COLOR_ESTADO_NOMINA,
  type RrhhEstadoNomina,
  type RrhhNominaListado,
  type RrhhNominaDetalle,
} from '../../types/rrhh';
import {
  Banknote,
  Calculator,
  Eye,
  FileDown,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  AlertCircle,
  Wallet,
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
} from '../../components/ui';

type Pestana = 'nominas' | 'costo';

const fmtMoneda = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === ''
    ? '—'
    : new Intl.NumberFormat('es-CU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(v));

const fmtFecha = (v: string) => {
  const [anio, mes, dia] = v.split('-');
  return `${dia}/${mes}/${anio}`;
};

export function NominaPage() {
  const [pestana, setPestana] = useState<Pestana>('nominas');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <Banknote className="h-6 w-6 text-brand-600" />
          Nómina y pagos
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Generación, pago y control de costos de la nómina
        </p>
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
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icono className="h-4 w-4" />
            {etiqueta}
          </button>
        ))}
      </div>

      {pestana === 'nominas' ? <ListaNominas /> : <VistaCosto />}
    </div>
  );
}

// ── Listado y acciones de nómina ────────────────────────────────────────────

function ListaNominas() {
  const queryClient = useQueryClient();

  const [estado, setEstado] = useState<RrhhEstadoNomina | ''>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [modalGenerar, setModalGenerar] = useState(false);
  const [aPagar, setAPagar] = useState<RrhhNominaListado | null>(null);
  const [aAnular, setAAnular] = useState<RrhhNominaListado | null>(null);
  const [aVer, setAVer] = useState<number | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['rrhh', 'nomina'] });

  const {
    data: filas = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['rrhh', 'nomina', estado, desde, hasta],
    queryFn: () =>
      rrhhService.listarNominas({
        limit: 500,
        estado: estado || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
      }),
  });

  const anularMutation = useMutation({
    mutationFn: (id: number) => rrhhService.anularNomina(id),
    onSuccess: (res) => {
      toast.success(
        res.era_pagada ? 'Nómina anulada (quedó auditada)' : 'Nómina anulada'
      );
      invalidate();
      setAAnular(null);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo anular');
    },
  });

  const descargarMutation = useMutation({
    mutationFn: (id: number) => rrhhService.descargarRecibo(id),
    onSuccess: ({ blob, nombre }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: () => toast.error('No se pudo generar el recibo'),
  });

  const hayFiltros = estado !== '' || desde !== '' || hasta !== '';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
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
              value={estado}
              onChange={(e) => setEstado(e.target.value as RrhhEstadoNomina | '')}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="pagada">Pagada</option>
              <option value="anulada">Anulada</option>
            </select>
            <Button size="sm" onClick={() => setModalGenerar(true)}>
              <Plus className="h-4 w-4" />
              Generar nómina
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
                  : 'Aún no se ha generado ninguna nómina. Pulsa «Generar nómina».'
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead className="text-right">Pagado</TableHead>
                  <TableHead>Estado</TableHead>
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
                    <TableCell className="whitespace-nowrap text-slate-600">
                      {fmtFecha(fila.inicio_periodo)} – {fmtFecha(fila.fin_periodo)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {fmtMoneda(fila.salario_neto)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-slate-600">
                      {fmtMoneda(fila.total_pagado)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          COLOR_ESTADO_NOMINA[fila.estado]
                        }`}
                      >
                        {fila.estado}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <ActionButton titulo="Ver detalle" onClick={() => setAVer(fila.id)}>
                          <Eye className="h-4 w-4" />
                        </ActionButton>
                        <ActionButton
                          titulo="Descargar recibo"
                          onClick={() => descargarMutation.mutate(fila.id)}
                        >
                          <FileDown className="h-4 w-4" />
                        </ActionButton>
                        {fila.estado === 'pendiente' && (
                          <>
                            <ActionButton titulo="Registrar pago" onClick={() => setAPagar(fila)}>
                              <Wallet className="h-4 w-4" />
                            </ActionButton>
                            <ActionButton titulo="Anular" danger onClick={() => setAAnular(fila)}>
                              <Trash2 className="h-4 w-4" />
                            </ActionButton>
                          </>
                        )}
                        {fila.estado === 'pagada' && (
                          <ActionButton titulo="Anular" danger onClick={() => setAAnular(fila)}>
                            <Trash2 className="h-4 w-4" />
                          </ActionButton>
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

      <ModalGenerar isOpen={modalGenerar} onClose={() => setModalGenerar(false)} onListo={invalidate} />
      <ModalPagar nomina={aPagar} onClose={() => setAPagar(null)} onListo={invalidate} />
      <ModalDetalle nominaId={aVer} onClose={() => setAVer(null)} />

      <ConfirmModal
        isOpen={aAnular !== null}
        title="Anular nómina"
        message={
          aAnular
            ? `¿Seguro que quieres anular la nómina de ${
                aAnular.empleado_nombre ?? 'este empleado'
              } (${fmtMoneda(aAnular.salario_neto)})? ${
                aAnular.estado === 'pagada'
                  ? 'Está pagada, así que la anulación quedará registrada en la auditoría.'
                  : ''
              }`
            : ''
        }
        type="danger"
        onConfirm={() => aAnular && anularMutation.mutate(aAnular.id)}
        onClose={() => setAAnular(null)}
      />
    </div>
  );
}

// ── Modal de generación ─────────────────────────────────────────────────────

function ModalGenerar({
  isOpen,
  onClose,
  onListo,
}: {
  isOpen: boolean;
  onClose: () => void;
  onListo: () => void;
}) {
  const queryClient = useQueryClient();
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');

  const { data: departamentos = [] } = useQuery({
    queryKey: ['rrhh', 'departamentos', 'activos'],
    queryFn: () => rrhhService.listarDepartamentos({ activo: true }),
    enabled: isOpen,
  });
  const [departamentoId, setDepartamentoId] = useState<number | ''>('');

  const mutation = useMutation({
    mutationFn: () =>
      rrhhService.generarNominas({
        inicio_periodo: inicio,
        fin_periodo: fin,
        departamento_id: departamentoId === '' ? null : departamentoId,
      }),
    onSuccess: (res) => {
      toast.success(`Nóminas creadas: ${res.creadas}. Omitidas: ${res.omitidas}.`);
      queryClient.invalidateQueries({ queryKey: ['rrhh', 'nomina'] });
      onListo();
      onClose();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo generar');
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inicio || !fin) {
      toast.error('Indica el periodo completo');
      return;
    }
    if (fin < inicio) {
      toast.error('El fin del periodo debe ser posterior o igual al inicio');
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <div className="border-b p-6 pb-5">
        <h2 className="text-lg font-semibold text-slate-900">Generar nómina</h2>
        <p className="mt-1 text-sm text-slate-500">
          Se genera para todos los empleados activos. Los que ya tengan nómina
          para ese periodo se omiten.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="inicio">Inicio del periodo</Label>
            <Input
              id="inicio"
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fin">Fin del periodo</Label>
            <Input id="fin" type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Departamento (opcional)</Label>
          <select
            value={departamentoId}
            onChange={(e) =>
              setDepartamentoId(e.target.value === '' ? '' : Number(e.target.value))
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todos los departamentos</option>
            {departamentos.map((d) => (
              <option key={d.id_departamento} value={d.id_departamento}>
                {d.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 border-t border-slate-100 pt-4">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Generar
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Modal de pago ───────────────────────────────────────────────────────────

function ModalPagar({
  nomina,
  onClose,
  onListo,
}: {
  nomina: RrhhNominaListado | null;
  onClose: () => void;
  onListo: () => void;
}) {
  const queryClient = useQueryClient();
  const [metodoId, setMetodoId] = useState<number | ''>('');
  const [fecha, setFecha] = useState('');
  const [referencia, setReferencia] = useState('');

  const { data: tipos = [] } = useQuery({
    queryKey: ['rrhh', 'catalogos', 'tipos-pago'],
    queryFn: () => rrhhService.listarTiposPago({ activo: true }),
    enabled: nomina !== null,
  });

  const mutation = useMutation({
    mutationFn: () =>
      rrhhService.pagarNomina(nomina!.id, {
        metodo_id: metodoId as number,
        monto: nomina!.salario_neto ?? 0,
        fecha_pago: fecha || null,
        referencia: referencia || null,
      }),
    onSuccess: () => {
      toast.success('Nómina pagada');
      queryClient.invalidateQueries({ queryKey: ['rrhh', 'nomina'] });
      onListo();
      onClose();
      setMetodoId('');
      setFecha('');
      setReferencia('');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo registrar el pago');
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (metodoId === '') {
      toast.error('Elige el método de pago');
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal isOpen={nomina !== null} onClose={onClose} className="max-w-md">
      <div className="border-b p-6 pb-5">
        <h2 className="text-lg font-semibold text-slate-900">Registrar pago</h2>
        <p className="mt-1 text-sm text-slate-500">
          {nomina?.empleado_nombre ?? ''} · Neto a pagar:{' '}
          <span className="font-semibold">{fmtMoneda(nomina?.salario_neto)}</span>
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 p-6">
        <div className="space-y-2">
          <Label>Método de pago</Label>
          <select
            value={metodoId}
            onChange={(e) => setMetodoId(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Elegir método...</option>
            {tipos.map((t) => (
              <option key={t.id_tipo_pago} value={t.id_tipo_pago}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha de pago</Label>
            <Input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ref">Referencia</Label>
            <Input
              id="ref"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>
        <p className="text-xs text-slate-400">
          El monto se registra por el neto exacto. Una vez pagada, la nómina
          queda inmutable y solo puede anularse.
        </p>
        <div className="flex items-center gap-2 border-t border-slate-100 pt-4">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            Registrar pago
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Modal de detalle ────────────────────────────────────────────────────────

function ModalDetalle({ nominaId, onClose }: { nominaId: number | null; onClose: () => void }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['rrhh', 'nomina', 'detalle', nominaId],
    queryFn: () => rrhhService.obtenerNomina(nominaId as number),
    enabled: nominaId !== null,
  });

  return (
    <Modal isOpen={nominaId !== null} onClose={onClose} className="max-w-2xl">
      <div className="border-b p-6 pb-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Detalle de la nómina {data ? `#${data.id}` : ''}
        </h2>
        {data && (
          <p className="mt-1 text-sm text-slate-500">
            {data.empleado_nombre} · {fmtFecha(data.inicio_periodo)} –{' '}
            {fmtFecha(data.fin_periodo)}
          </p>
        )}
      </div>
      <div className="space-y-4 p-6">
        {isLoading ? (
          <LoadingRows />
        ) : isError || !data ? (
          <p className="text-sm text-slate-500">No se pudo cargar el detalle.</p>
        ) : (
          <>
            <ResumenFilas
              filas={[
                ['Salario base', fmtMoneda(data.salario_base)],
                ['Horas extras', fmtMoneda(data.horas_extras)],
                ['Bonificaciones', `+${fmtMoneda(data.bonificaciones)}`],
                ['Deducciones', `-${fmtMoneda(data.deducciones)}`],
              ]}
              neto={fmtMoneda(data.salario_neto)}
            />
            {data.deducciones_aplicadas.length > 0 && (
              <SeccionDetalle titulo="Deducciones aplicadas" items={data.deducciones_aplicadas} signo="-" />
            )}
            {data.bonificaciones_aplicadas.length > 0 && (
              <SeccionDetalle titulo="Bonificaciones aplicadas" items={data.bonificaciones_aplicadas} signo="+" />
            )}
            {data.pagos.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-700">Pagos</h3>
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
                    {data.pagos.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{fmtFecha(p.fecha_pago)}</TableCell>
                        <TableCell>{p.metodo_nombre ?? '—'}</TableCell>
                        <TableCell>{p.referencia ?? '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtMoneda(p.monto)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
        <div className="flex justify-end border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ResumenFilas({ filas, neto }: { filas: [string, string][]; neto: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <dl className="space-y-1">
        {filas.map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm">
            <dt className="text-slate-600">{k}</dt>
            <dd className="tabular-nums text-slate-900">{v}</dd>
          </div>
        ))}
        <div className="flex justify-between border-t border-slate-200 pt-1 text-sm font-semibold">
          <dt>Salario neto</dt>
          <dd className="tabular-nums text-brand-700">{neto}</dd>
        </div>
      </dl>
    </div>
  );
}

function SeccionDetalle({
  titulo,
  items,
  signo,
}: {
  titulo: string;
  items: { tipo_nombre: string | null; es_porcentaje: boolean; valor_original: number | string | null; monto_aplicado: number | string }[];
  signo: string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{titulo}</h3>
      <ul className="divide-y divide-slate-100">
        {items.map((item, i) => (
          <li key={i} className="flex justify-between py-1 text-sm">
            <span className="text-slate-700">
              {item.tipo_nombre ?? '—'}
              {item.es_porcentaje && item.valor_original !== null
                ? ` (${item.valor_original}%)`
                : ''}
            </span>
            <span className="tabular-nums text-slate-900">
              {signo}
              {fmtMoneda(item.monto_aplicado)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Vista de costo ──────────────────────────────────────────────────────────

function VistaCosto() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['rrhh', 'nomina', 'costo', desde, hasta],
    queryFn: () =>
      rrhhService.reporteCosto({ desde: desde || undefined, hasta: hasta || undefined }),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-3">
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
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <p className="text-xs text-slate-400">
            Excluye las nóminas anuladas. Sin fechas se incluye todo.
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
          <EmptyState mensaje="No hay nóminas en el rango seleccionado." />
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Resumen titulo="Salario base" valor={fmtMoneda(data.total_salario_base)} />
              <Resumen titulo="Horas extras" valor={fmtMoneda(data.total_horas_extras)} />
              <Resumen titulo="Bonificaciones" valor={fmtMoneda(data.total_bonificaciones)} />
              <Resumen titulo="Deducciones" valor={fmtMoneda(data.total_deducciones)} />
              <Resumen titulo="Neto total" valor={fmtMoneda(data.total_neto)} destacado />
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
    <div className={`rounded-lg p-3 ${destacado ? 'bg-brand-50 ring-1 ring-brand-100' : 'bg-slate-50'}`}>
      <div className={`text-xl font-bold tabular-nums ${destacado ? 'text-brand-700' : 'text-slate-700'}`}>
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

function EmptyState({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Banknote className="h-10 w-10 text-slate-300" />
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
