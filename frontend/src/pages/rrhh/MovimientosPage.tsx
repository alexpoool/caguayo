import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rrhhService } from '../../services/rrhh';
import {
  type RrhhConsolidado,
  type RrhhMovimientoListado,
  type RrhhDeduccionCreate,
  type RrhhBonificacionCreate,
  type RrhhMovimientoUpdate,
  type RrhhEliminarResponse,
} from '../../types/rrhh';
import {
  MinusCircle,
  PlusCircle,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  RefreshCw,
  AlertCircle,
  Loader2,
  Search,
  Scale,
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
  SearchSelect,
} from '../../components/ui';

type Pestana = 'deducciones' | 'bonificaciones' | 'consolidado';

/** Lo que ve la tabla, tras normalizar las claves propias de cada tabla. */
interface FilaMovimiento extends RrhhMovimientoListado {
  id: number;
  tipo_id: number;
}

/** Forma común de un tipo de catálogo, tras normalizar su clave. */
interface TipoCatalogo {
  id: number;
  nombre: string;
  es_porcentaje: boolean;
}

/**
 * Lo que distingue a una deducción de una bonificación.
 *
 * Se normaliza a tipos comunes (`TipoCatalogo`, `RrhhMovimientoListado`) para
 * que el componente pueda renderizar ambas pestañas sin ramificar en cada
 * acceso; la clave concreta (`pk`, `campoTipo`) solo se usa para leer y
 * escribir los campos propios de cada tabla.
 */
interface ConfigMovimiento {
  etiqueta: string;
  plural: string;
  pk: 'id_deducciones' | 'id_bonificaciones';
  campoTipo: 'tipo_deducciones_id' | 'tipo_bonificaciones_id';
  pkTipo: 'id_tipos_deducciones' | 'id_tipos_bonificaciones';
  rutaTipos: string;
  listado: (p?: Record<string, unknown>) => Promise<FilaMovimiento[]>;
  crear: (d: Record<string, unknown>) => Promise<unknown>;
  editar: (id: number, d: Record<string, unknown>) => Promise<unknown>;
  borrar: (id: number) => Promise<RrhhEliminarResponse>;
  tipos: () => Promise<TipoCatalogo[]>;
}

const CONFIG: Record<'deducciones' | 'bonificaciones', ConfigMovimiento> = {
  deducciones: {
    etiqueta: 'Deducción',
    plural: 'Deducciones',
    pk: 'id_deducciones',
    campoTipo: 'tipo_deducciones_id',
    pkTipo: 'id_tipos_deducciones',
    rutaTipos: '/rrhh/catalogos/tipos-deducciones',
    listado: async (p) => {
      const filas = await rrhhService.listarDeducciones(p);
      return filas.map((f) => ({
        ...(f as unknown as RrhhMovimientoListado),
        id: f.id_deducciones,
        tipo_id: f.tipo_deducciones_id,
      }));
    },
    crear: (d) => rrhhService.createDeduccion(d as unknown as RrhhDeduccionCreate),
    editar: (id, d) => rrhhService.updateDeduccion(id, d as unknown as RrhhMovimientoUpdate),
    borrar: (id) => rrhhService.deleteDeduccion(id),
    tipos: async () => {
      const tipos = await rrhhService.listarTiposDeduccion({ limit: 500, activo: true });
      return tipos.map((t) => ({
        id: t.id_tipos_deducciones,
        nombre: t.nombre,
        es_porcentaje: t.es_porcentaje,
      }));
    },
  },
  bonificaciones: {
    etiqueta: 'Bonificación',
    plural: 'Bonificaciones',
    pk: 'id_bonificaciones',
    campoTipo: 'tipo_bonificaciones_id',
    pkTipo: 'id_tipos_bonificaciones',
    rutaTipos: '/rrhh/catalogos/tipos-bonificaciones',
    listado: async (p) => {
      const filas = await rrhhService.listarBonificaciones(p);
      return filas.map((f) => ({
        ...(f as unknown as RrhhMovimientoListado),
        id: f.id_bonificaciones,
        tipo_id: f.tipo_bonificaciones_id,
      }));
    },
    crear: (d) => rrhhService.createBonificacion(d as unknown as RrhhBonificacionCreate),
    editar: (id, d) => rrhhService.updateBonificacion(id, d as unknown as RrhhMovimientoUpdate),
    borrar: (id) => rrhhService.deleteBonificacion(id),
    tipos: async () => {
      const tipos = await rrhhService.listarTiposBonificacion({ limit: 500, activo: true });
      return tipos.map((t) => ({
        id: t.id_tipos_bonificaciones,
        nombre: t.nombre,
        es_porcentaje: t.es_porcentaje,
      }));
    },
  },
};

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

export function MovimientosPage() {
  const [pestana, setPestana] = useState<Pestana>('deducciones');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <Scale className="h-6 w-6 text-brand-600" />
          Deducciones y bonificaciones
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Movimientos que se aplican en la nómina de cada empleado
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {(
          [
            ['deducciones', 'Deducciones', MinusCircle],
            ['bonificaciones', 'Bonificaciones', PlusCircle],
            ['consolidado', 'Consolidado', Wallet],
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

      {pestana === 'consolidado' ? (
        <ConsolidadoVista />
      ) : (
        <TablaMovimientos tipo={pestana} />
      )}
    </div>
  );
}

// ── Listado y CRUD de un tipo de movimiento ────────────────────────────────

function TablaMovimientos({ tipo }: { tipo: 'deducciones' | 'bonificaciones' }) {
  const cfg = CONFIG[tipo];
  const queryClient = useQueryClient();

  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<number | ''>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<FilaMovimiento | null>(null);
  const [aEliminar, setAEliminar] = useState<FilaMovimiento | null>(null);

  const [formData, setFormData] = useState<{
    empleado_id: number | null;
    tipo_id: number | '';
    valor: string;
    inicio_periodo: string;
    fin_periodo: string;
    observaciones: string;
  }>({
    empleado_id: null,
    tipo_id: '',
    valor: '',
    inicio_periodo: '',
    fin_periodo: '',
    observaciones: '',
  });
  const [busquedaEmpleado, setBusquedaEmpleado] = useState('');

  const { data: tipos = [] } = useQuery({
    queryKey: ['rrhh', 'catalogos', cfg.rutaTipos],
    queryFn: () => cfg.tipos(),
  });

  // Candidatos del selector: lista inicial al abrir el modal, busca bajo demanda
  const { data: candidatosEmpleado = [], isFetching: buscandoEmpleado } = useQuery({
    queryKey: ['rrhh', 'empleados', 'candidatos', busquedaEmpleado],
    queryFn: () => rrhhService.candidatosEmpleados(busquedaEmpleado),
    enabled: modalAbierto,
  });

  const {
    data: filas = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['rrhh', tipo, busqueda, filtroTipo, desde, hasta],
    queryFn: () =>
      cfg.listado({
        limit: 500,
        buscar: busqueda || undefined,
        tipo_id: filtroTipo === '' ? undefined : filtroTipo,
        desde: desde || undefined,
        hasta: hasta || undefined,
      }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['rrhh', tipo] });

  const tipoEnFormulario = tipos.find((t) => t.id === formData.tipo_id);
  const esPorcentaje = tipoEnFormulario?.es_porcentaje === true;

  const saveMutation = useMutation({
    mutationFn: () => {
      const base = {
        empleado_id: formData.empleado_id,
        valor: Number(formData.valor),
        inicio_periodo: formData.inicio_periodo,
        fin_periodo: formData.fin_periodo,
        observaciones: formData.observaciones || null,
      };
      const payload = {
        ...base,
        [cfg.campoTipo]: formData.tipo_id === '' ? null : formData.tipo_id,
      };
      if (editando) {
        return cfg.editar(editando.id, payload);
      }
      return cfg.crear(payload);
    },
    onSuccess: () => {
      toast.success(
        editando
          ? `${cfg.etiqueta} actualizada`
          : `${cfg.etiqueta} creada`
      );
      invalidate();
      cerrarModal();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => cfg.borrar(id),
    onSuccess: () => {
      toast.success(`${cfg.etiqueta} eliminada`);
      invalidate();
      setAEliminar(null);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar');
    },
  });

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditando(null);
    setFormData({
      empleado_id: null,
      tipo_id: '',
      valor: '',
      inicio_periodo: '',
      fin_periodo: '',
      observaciones: '',
    });
    setBusquedaEmpleado('');
  };

  const abrirNuevo = () => {
    setEditando(null);
    setFormData({
      empleado_id: null,
      tipo_id: '',
      valor: '',
      inicio_periodo: '',
      fin_periodo: '',
      observaciones: '',
    });
    setBusquedaEmpleado('');
    setModalAbierto(true);
  };

  const abrirEditar = (fila: FilaMovimiento) => {
    setEditando(fila);
    setFormData({
      empleado_id: fila.empleado_id,
      tipo_id: fila.tipo_id,
      valor: String(fila.valor),
      inicio_periodo: fila.inicio_periodo,
      fin_periodo: fila.fin_periodo,
      observaciones: fila.observaciones ?? '',
    });
    setModalAbierto(true);
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

  const opcionesTipo = tipos.map((t) => ({
    value: t.id,
    label: t.nombre,
    description: t.es_porcentaje ? 'Porcentual' : 'Importe fijo',
  }));

  const validar = (): string | null => {
    if (!formData.empleado_id) return 'Elige un empleado';
    if (formData.tipo_id === '') return 'Elige un tipo';
    if (formData.valor === '' || Number.isNaN(Number(formData.valor)))
      return 'Indica un valor válido';
    if (Number(formData.valor) < 0) return 'El valor no puede ser negativo';
    if (!formData.inicio_periodo || !formData.fin_periodo)
      return 'Indica el periodo completo';
    if (formData.fin_periodo < formData.inicio_periodo)
      return 'El fin del periodo debe ser posterior o igual al inicio';
    if (esPorcentaje && Number(formData.valor) > 100)
      return 'Un valor porcentual no puede superar 100';
    return null;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validar();
    if (error) {
      toast.error(error);
      return;
    }
    saveMutation.mutate();
  };

  const hayFiltros = busqueda !== '' || filtroTipo !== '' || desde !== '' || hasta !== '';

  return (
    <div className="space-y-4">
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
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value === '' ? '' : Number(e.target.value))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Todos los tipos</option>
              {opcionesTipo.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={abrirNuevo}>
              <Plus className="h-4 w-4" />
              Nueva {cfg.etiqueta.toLowerCase()}
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
                  ? `No hay ${cfg.plural.toLowerCase()} que coincidan con los filtros.`
                  : `Aún no hay ${cfg.plural.toLowerCase()} registradas.`
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Periodo</TableHead>
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
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          fila.es_porcentaje
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {fila.tipo_nombre ?? '—'}
                        {fila.es_porcentaje ? ' %' : ''}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fila.es_porcentaje ? `${fila.valor} %` : fmtMoneda(fila.valor)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {fmtMoneda(fila.monto)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-slate-600">
                      {fmtFecha(fila.inicio_periodo)} – {fmtFecha(fila.fin_periodo)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <ActionButton titulo="Editar" onClick={() => abrirEditar(fila)}>
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

      <Modal
        isOpen={modalAbierto}
        onClose={cerrarModal}
        className="!max-w-lg overflow-hidden !rounded-none [&>button.absolute]:hidden"
      >
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-gradient-to-r from-brand-50 to-brand-100 px-6 py-4 pr-12">
          <div className="rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 p-2">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-gray-900">
              {editando
                ? `Editar ${cfg.etiqueta.toLowerCase()}`
                : `Nueva ${cfg.etiqueta.toLowerCase()}`}
            </h2>
            {editando && (
              <p className="truncate text-xs text-slate-500">
                {editando.empleado_nombre ?? ''} ·{' '}
                {fmtFecha(editando.inicio_periodo)} –{' '}
                {fmtFecha(editando.fin_periodo)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={cerrarModal}
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
            <SearchSelect
              options={opcionesEmpleado}
              value={formData.empleado_id}
              onChange={(v) => setFormData({ ...formData, empleado_id: v })}
              onSearch={setBusquedaEmpleado}
              placeholder="Buscar empleado..."
              loading={buscandoEmpleado}
              emptyMessage="Sin resultados"
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <select
              value={formData.tipo_id}
              onChange={(e) =>
                setFormData({ ...formData, tipo_id: e.target.value === '' ? '' : Number(e.target.value) })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Elegir tipo...</option>
              {opcionesTipo.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} {t.description ? `(${t.description})` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400">
              Los tipos se gestionan en{' '}
              <a href={cfg.rutaTipos} className="text-brand-600 underline">
                Catálogos
              </a>
              .
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor {esPorcentaje ? '(%)' : ''}</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
              />
              {esPorcentaje && (
                <p className="text-xs text-slate-400">
                  Porcentaje del salario. Máximo 100.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Input
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Opcional"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inicio">Inicio del periodo</Label>
              <Input
                id="inicio"
                type="date"
                value={formData.inicio_periodo}
                onChange={(e) => setFormData({ ...formData, inicio_periodo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fin">Fin del periodo</Label>
              <Input
                id="fin"
                type="date"
                value={formData.fin_periodo}
                onChange={(e) => setFormData({ ...formData, fin_periodo: e.target.value })}
              />
            </div>
          </div>
          <div className="sticky bottom-0 -mx-6 flex items-center gap-2 border-t bg-white px-6 pb-5 pt-4">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {editando ? 'Guardar cambios' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={aEliminar !== null}
        title={`Eliminar ${cfg.etiqueta.toLowerCase()}`}
        message={
          aEliminar
            ? `¿Seguro que quieres eliminar ${aEliminar.tipo_nombre ?? 'este movimiento'} de ${aEliminar.empleado_nombre ?? 'este empleado'}? No se podrá hacer si ya se aplicó a una nómina.`
            : ''
        }
        type="danger"
        onConfirm={() => aEliminar && deleteMutation.mutate(aEliminar.id)}
        onClose={() => setAEliminar(null)}
      />
    </div>
  );
}

// ── Vista consolidada ──────────────────────────────────────────────────────

function ConsolidadoVista() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['rrhh', 'movimientos', 'consolidado', desde, hasta],
    queryFn: () =>
      rrhhService.consolidadoMovimientos({
        desde: desde || undefined,
        hasta: hasta || undefined,
      }),
  });

  const consolidado: RrhhConsolidado | undefined = data;

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
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <p className="text-xs text-slate-400">
              Sin fechas se incluye todo. Los porcentuales se calculan con el
              salario actual.
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
          ) : (
            <>
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Resumen titulo="Total deducciones" valor={fmtMoneda(consolidado?.total_deducciones)} />
                <Resumen titulo="Total bonificaciones" valor={fmtMoneda(consolidado?.total_bonificaciones)} />
                <Resumen
                  titulo="Saldo"
                  valor={fmtMoneda(consolidado?.saldo)}
                  destacado
                />
              </div>
              {!consolidado || consolidado.empleados.length === 0 ? (
                <EmptyState mensaje="No hay movimientos en el rango seleccionado." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead className="text-right">Deducciones</TableHead>
                      <TableHead className="text-right">Bonificaciones</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consolidado.empleados.map((fila) => (
                      <TableRow key={fila.empleado_id}>
                        <TableCell>
                          <div className="font-medium text-slate-900">
                            {fila.empleado_nombre}
                          </div>
                          <div className="text-xs text-slate-500">
                            {fila.empleado_codigo ?? '—'}
                            {fila.departamento_nombre ? ` · ${fila.departamento_nombre}` : ''}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-red-600">
                          −{fmtMoneda(fila.total_deducciones)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-green-600">
                          +{fmtMoneda(fila.total_bonificaciones)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold tabular-nums ${
                            Number(fila.saldo) < 0 ? 'text-red-600' : 'text-slate-900'
                          }`}
                        >
                          {fmtMoneda(fila.saldo)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Subcomponentes ─────────────────────────────────────────────────────────

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
        className={`text-2xl font-bold tabular-nums ${
          destacado ? 'text-brand-700' : 'text-slate-700'
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

function EmptyState({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Scale className="h-10 w-10 text-slate-300" />
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
        Reintentar
      </Button>
    </div>
  );
}
