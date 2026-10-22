import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { rrhhService } from '../../services/rrhh';
import {
  AlertCircle,
  ArrowLeft,
  Calculator,
  CalendarRange,
  Check,
  Loader2,
  Plus,
  Save,
  Target,
  Users,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  DateInput,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui';
import { ModalNuevoPeriodo } from '../../components/rrhh/ModalNuevoPeriodo';

const hoyISO = () => {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
};

const fmtMoneda = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === ''
    ? '—'
    : new Intl.NumberFormat('es-CU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(v));

const fmtNumero = (v: number | string | null | undefined, max = 4) =>
  v === null || v === undefined || v === ''
    ? '—'
    : new Intl.NumberFormat('es-CU', {
        maximumFractionDigits: max,
      }).format(Number(v));

/**
 * Etiqueta del selector. El selector solo muestra periodos pendientes, por
 * eso no lleva estado.
 */
const etiquetaPeriodo = (periodo: { nombre: string }) => periodo.nombre;

const GRADIENTE =
  'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300';

/**
 * Alta de un pago por resultado.
 *
 * Primero se elige un periodo del catálogo. Al elegirlo se cargan todos los
 * empleados con evaluación en ese periodo; vienen seleccionados y se pueden
 * descartar antes de guardar. El promedio, los coeficientes y los importes se
 * calculan automáticamente (no son campos editables).
 */
export function PagoResultadoNuevoPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const nominaParam = Number(searchParams.get('nomina')) || null;

  const [nominaId, setNominaId] = useState<number | ''>(nominaParam ?? '');
  const [periodoId, setPeriodoId] = useState<number | ''>('');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [inicio, setInicio] = useState(hoyISO());
  const [fin, setFin] = useState(hoyISO());
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [modalPeriodo, setModalPeriodo] = useState(false);
  const periodoInicializado = useRef<number | null>(null);
  const nominaInicializada = useRef<number | null>(null);

  const { data: nominas = [], isLoading: cargandoNominas } = useQuery({
    queryKey: ['rrhh', 'nomina', 'confirmadas'],
    queryFn: () => rrhhService.listarNominas({ estado: 'nomina', limit: 1000 }),
  });

  const { data: nominaDetalle } = useQuery({
    queryKey: ['rrhh', 'nomina', nominaParam],
    queryFn: () => rrhhService.obtenerNomina(nominaParam as number),
    enabled: nominaParam !== null,
  });

  const nominaSeleccionada = nominaParam
    ? nominaDetalle
    : nominas.find((nomina) => nomina.id === nominaId) ?? null;
  const nominaFijada = nominaParam !== null;
  const sinPeriodo = Boolean(nominaSeleccionada && !nominaSeleccionada.periodo_id);

  const { data: periodos = [], isLoading: cargandoPeriodos } = useQuery({
    queryKey: ['rrhh', 'catalogos', 'periodos-evaluacion', 'activos'],
    queryFn: () =>
      rrhhService.listarPeriodosEvaluacion({ limit: 500, activo: true }),
  });

  const { data: pagosDeNomina = [] } = useQuery({
    queryKey: ['rrhh', 'pagos-resultado', 'nomina', nominaId || null],
    queryFn: () =>
      rrhhService.listarPagosResultado({
        nomina_id: Number(nominaId),
        limit: 1,
      }),
    enabled: nominaId !== '',
  });
  const pagoExistente = pagosDeNomina[0] ?? null;

  const {
    data: preview,
    isLoading: cargandoPreview,
    isError: errorPreview,
    error: detalleErrorPreview,
  } = useQuery({
    queryKey: ['rrhh', 'pagos-resultado', 'preview', periodoId],
    queryFn: () => rrhhService.previewPagoResultado(Number(periodoId)),
    enabled: !!periodoId,
  });

  // Al elegir una nómina se preselecciona su periodo (editable). El monto
  // arranca en cero: el usuario decide cuánto repartir.
  useEffect(() => {
    if (!nominaSeleccionada) return;
    if (nominaInicializada.current === nominaSeleccionada.id) return;
    nominaInicializada.current = nominaSeleccionada.id;
    setNominaId(nominaSeleccionada.id);
    if (nominaSeleccionada.periodo_id) {
      periodoInicializado.current = null;
      setPeriodoId(nominaSeleccionada.periodo_id);
    }
  }, [nominaSeleccionada]);

  // Un periodo solo se puede pagar una vez: el selector oculta los ya pagados.
  // Se conserva el periodo de la nómina aunque ya esté pagado para mostrar el
  // aviso en lugar de dejar el selector vacío.
  const periodosDisponibles = useMemo(
    () =>
      periodos.filter(
        (periodo) =>
          !periodo.pagado_x_resultado ||
          periodo.id_periodo_evaluacion === periodoId
      ),
    [periodos, periodoId]
  );

  const periodoSeleccionado = periodos.find(
    (periodo) => periodo.id_periodo_evaluacion === periodoId
  );
  const yaPagado = Boolean(
    periodoSeleccionado?.pagado_x_resultado || preview?.pagado_x_resultado
  );

  useEffect(() => {
    if (!preview) return;
    if (periodoInicializado.current === preview.periodo_evaluacion_id) return;
    periodoInicializado.current = preview.periodo_evaluacion_id;
    setSeleccionados(
      new Set(preview.empleados.map((empleado) => empleado.empleado_id))
    );
    // El preview propone el rango real de las evaluaciones del periodo; el
    // usuario puede editarlo antes de guardar.
    setInicio(preview.inicio_periodo || hoyISO());
    setFin(preview.fin_periodo || hoyISO());
  }, [preview]);

  const calculo = useMemo(() => {
    const datos = (preview?.empleados ?? []).filter((empleado) =>
      seleccionados.has(empleado.empleado_id)
    );
    const puntuaciones = datos.map((empleado) =>
      Number(empleado.puntuacion || 0)
    );
    const promedio =
      puntuaciones.length > 0
        ? puntuaciones.reduce((acc, v) => acc + v, 0) / puntuaciones.length
        : 0;
    const coeficientes = puntuaciones.map((puntuacion) =>
      promedio > 0 ? puntuacion / promedio : 0
    );
    const sumaCoeficientes = coeficientes.reduce((acc, v) => acc + v, 0);
    const montoNumero = Number(monto) || 0;
    const filas = datos.map((empleado, indice) => ({
      ...empleado,
      coeficiente: coeficientes[indice],
      montoIndividual:
        sumaCoeficientes > 0
          ? (coeficientes[indice] * montoNumero) / sumaCoeficientes
          : 0,
    }));
    return {
      filas,
      promedio,
      sumaCoeficientes,
      totalCalculado: filas.reduce(
        (acc, fila) => acc + fila.montoIndividual,
        0
      ),
    };
  }, [preview, seleccionados, monto]);

  const toggleEmpleado = (id: number) => {
    setSeleccionados((actual) => {
      const siguiente = new Set(actual);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  };

  const seleccionarTodos = () => {
    setSeleccionados(
      new Set((preview?.empleados ?? []).map((empleado) => empleado.empleado_id))
    );
  };

  const createMutation = useMutation({
    mutationFn: () =>
      rrhhService.crearPagoResultado({
        nomina_id: Number(nominaId),
        periodo_evaluacion_id: Number(periodoId),
        descripcion: descripcion.trim() || null,
        inicio_periodo: inicio,
        fin_periodo: fin,
        monto: Number(monto),
        empleado_ids: [...seleccionados],
      }),
    onSuccess: (creado) => {
      toast.success('Pago por resultado creado');
      queryClient.invalidateQueries({ queryKey: ['rrhh', 'pagos-resultado'] });
      queryClient.invalidateQueries({ queryKey: ['rrhh', 'nomina'] });
      queryClient.invalidateQueries({
        queryKey: ['rrhh', 'catalogos', 'periodos-evaluacion'],
      });
      navigate(`/rrhh/pagos-resultado/${creado.id_pago_x_resultado}`);
    },
    onError: (err: any) =>
      toast.error(err?.message || 'No se pudo crear el pago por resultado'),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (nominaId === '') errs.nomina = 'Selecciona una nómina confirmada';
    else if (pagoExistente) {
      errs.nomina = 'Ya existe un pago por resultado para esta nómina';
    } else if (sinPeriodo) {
      errs.nomina =
        'La nómina no tiene periodo; edítala y asígnale uno antes de pagar';
    }
    if (!periodoId) errs.periodo = 'Selecciona un periodo';
    else if (yaPagado) {
      errs.periodo = 'Ya existe un pago por resultado para este periodo';
    }
    if (!monto || Number(monto) <= 0)
      errs.monto = 'Introduce un monto mayor que cero';
    if (!inicio || !fin) errs.fechas = 'Completa el rango de fechas';
    else if (fin < inicio)
      errs.fechas = 'El fin debe ser posterior o igual al inicio';
    if (seleccionados.size === 0)
      errs.empleados = 'Selecciona al menos un empleado';
    if (calculo.promedio <= 0)
      errs.empleados =
        'Las evaluaciones seleccionadas no tienen puntuación; califica al menos una';
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;
    createMutation.mutate();
  };

  const volver = () =>
    nominaParam
      ? navigate(`/rrhh/nomina/${nominaParam}`)
      : navigate('/rrhh/pagos-resultado');

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={volver}
            className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            title={nominaParam ? 'Volver a la nómina' : 'Volver al historial'}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="rounded bg-gradient-to-br from-sky-500 to-sky-600 p-2 shadow-lg">
            <Target className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Nuevo pago por resultado
            </h1>
            <p className="text-sm text-slate-500">
              {nominaParam
                ? 'Pago para una nómina concreta: revisa el periodo y define el monto.'
                : 'Elige la nómina y el periodo, revisa a los empleados y define el monto.'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <h2 className="text-base font-semibold text-slate-900">
              1. Nómina y periodo
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nomina">Nómina *</Label>
              {nominaFijada ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-sky-200 bg-sky-50/60 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-sky-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {nominaDetalle?.descripcion ||
                          `Nómina #${nominaParam}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        Nómina #{nominaParam}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/rrhh/nomina/${nominaParam}`)}
                  >
                    Ver nómina
                  </Button>
                </div>
              ) : (
                <select
                  id="nomina"
                  value={nominaId}
                  disabled={cargandoNominas}
                  onChange={(e) => {
                    const id = e.target.value
                      ? Number(e.target.value)
                      : '';
                    nominaInicializada.current = null;
                    setNominaId(id);
                    setErrores({});
                  }}
                  className={`w-full rounded-md border px-3 py-2 text-sm transition-all duration-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500 ${
                    errores.nomina ? 'border-red-500' : 'border-slate-300'
                  }`}
                >
                  <option value="">Selecciona una nómina confirmada</option>
                  {nominas.map((nomina) => (
                    <option key={nomina.id} value={nomina.id}>
                      #{nomina.id} · {nomina.descripcion}
                    </option>
                  ))}
                </select>
              )}
              {errores.nomina && (
                <p className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {errores.nomina}
                </p>
              )}
              {pagoExistente && (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1">
                    Esta nómina ya tiene un pago por resultado.
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate(
                        `/rrhh/pagos-resultado/${pagoExistente.id_pago_x_resultado}`
                      )
                    }
                  >
                    Ver pago
                  </Button>
                </div>
              )}
              {sinPeriodo && (
                <p className="flex items-start gap-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                  Esta nómina no tiene periodo asignado. Edítala y asígnale uno
                  antes de generar el pago por resultado.
                </p>
              )}
              {!nominaFijada && nominas.length === 0 && !cargandoNominas && (
                <p className="text-xs text-amber-600">
                  No hay nóminas confirmadas. Confirma una nómina primero.
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="periodo_evaluacion">
                  Periodo *
                </Label>
                <div className="flex items-start gap-2">
                  <select
                    id="periodo_evaluacion"
                    value={periodoId}
                    disabled={cargandoPeriodos}
                    onChange={(e) => {
                      const id = e.target.value ? Number(e.target.value) : '';
                      periodoInicializado.current = null;
                      setPeriodoId(id);
                      setSeleccionados(new Set());
                      setInicio(hoyISO());
                      setFin(hoyISO());
                      setErrores({});
                    }}
                    className={`w-full flex-1 rounded-md border px-3 py-2 text-sm transition-all duration-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-500 ${
                      errores.periodo ? 'border-red-500' : 'border-slate-300'
                    }`}
                  >
                    <option value="">Selecciona un periodo</option>
                    {periodosDisponibles.map((periodo) => (
                      <option
                        key={periodo.id_periodo_evaluacion}
                        value={periodo.id_periodo_evaluacion}
                      >
                        {etiquetaPeriodo(periodo)}
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
                {yaPagado && (
                  <p className="flex items-start gap-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                    Ya existe un pago por resultado para este periodo. Elimínalo
                    desde el historial antes de crear otro.
                  </p>
                )}
                {periodos.length === 0 && !cargandoPeriodos && (
                  <p className="text-xs text-amber-600">
                    No hay periodos activos. Usa «Nuevo periodo» para crear
                    uno.
                  </p>
                )}
                {periodos.length > 0 &&
                  periodosDisponibles.length === 0 &&
                  !cargandoPeriodos && (
                    <p className="text-xs text-amber-600">
                      Todos los periodos activos ya tienen pago por resultado.
                      Crea uno nuevo con el botón + para registrar otro pago.
                    </p>
                  )}
                {errores.periodo && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errores.periodo}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="monto">Monto total a repartir *</Label>
                <Input
                  id="monto"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  className={errores.monto ? 'border-red-500' : ''}
                />
                {errores.monto && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errores.monto}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="inicio_periodo">Inicio del periodo *</Label>
                <DateInput
                  id="inicio_periodo"
                  value={inicio}
                  onChange={setInicio}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fin_periodo">Fin del periodo *</Label>
                <DateInput
                  id="fin_periodo"
                  value={fin}
                  onChange={setFin}
                />
              </div>
            </div>
            {errores.fechas && (
              <p className="flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="h-3 w-3" />
                {errores.fechas}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej. Reparto del bono de productividad"
              />
            </div>
          </CardContent>
        </Card>

        {!periodoId ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <CalendarRange className="h-9 w-9 text-slate-300" />
              <p className="text-sm text-slate-600">
                Selecciona una nómina y su periodo para cargar a los empleados
                evaluados.
              </p>
            </CardContent>
          </Card>
        ) : cargandoPreview ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-10 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando empleados del periodo...
            </CardContent>
          </Card>
        ) : errorPreview ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm text-slate-600">
                {detalleErrorPreview instanceof Error
                  ? detalleErrorPreview.message
                  : 'No se pudieron cargar los empleados del periodo.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  2. Empleados evaluados
                </h2>
                <p className="text-sm text-slate-500">
                  {preview?.empleados.length ?? 0} empleado
                  {(preview?.empleados.length ?? 0) === 1 ? '' : 's'} en el
                  periodo. Desmarca los que no quieras incluir.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={seleccionarTodos}
                >
                  <Check className="h-4 w-4" />
                  Todos
                </Button>
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                  {seleccionados.size} seleccionado
                  {seleccionados.size === 1 ? '' : 's'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {errores.empleados && (
                <p className="flex items-center gap-1 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errores.empleados}
                </p>
              )}
              {preview && preview.empleados.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Users className="h-9 w-9 text-slate-300" />
                  <p className="text-sm text-slate-600">
                    No hay empleados con evaluación en este periodo.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10" />
                        <TableHead>Empleado</TableHead>
                        <TableHead>Departamento</TableHead>
                        <TableHead className="text-right">Puntuación</TableHead>
                        <TableHead className="text-right">Coeficiente</TableHead>
                        <TableHead className="text-right">
                          Monto individual
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calculo.filas.map((fila) => (
                        <TableRow key={fila.empleado_id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={seleccionados.has(fila.empleado_id)}
                              onChange={() => toggleEmpleado(fila.empleado_id)}
                              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-slate-900">
                              {fila.empleado_nombre || 'Empleado'}
                            </div>
                            <div className="text-xs text-slate-500">
                              {fila.empleado_codigo || '—'}
                            </div>
                            {!fila.puntuada && (
                              <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                Sin puntuar
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {fila.departamento_nombre || '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-slate-700">
                            {fmtNumero(fila.puntuacion, 2)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-slate-700">
                            {fmtNumero(fila.coeficiente)}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums text-slate-900">
                            {fmtMoneda(fila.montoIndividual)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="grid gap-3 rounded-lg border border-sky-100 bg-sky-50/60 p-3 sm:grid-cols-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
                    Promedio general
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {fmtNumero(calculo.promedio)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
                    Suma de coeficientes
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {fmtNumero(calculo.sumaCoeficientes)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
                    Monto a repartir
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {fmtMoneda(Number(monto) || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
                    Total calculado
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {fmtMoneda(calculo.totalCalculado)}
                  </p>
                </div>
              </div>

              <p className="flex items-start gap-1.5 text-xs text-slate-500">
                <Calculator className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                coeficiente = puntuación / promedio general · monto individual =
                (coeficiente × monto) / suma de coeficientes. Estos valores los
                recalcula el servidor al guardar.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={volver}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={
              createMutation.isPending ||
              nominaId === '' ||
              sinPeriodo ||
              Boolean(pagoExistente) ||
              !periodoId ||
              yaPagado ||
              calculo.filas.length === 0
            }
            className={`gap-2 ${GRADIENTE}`}
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar pago
          </Button>
        </div>
      </form>

      <ModalNuevoPeriodo
        isOpen={modalPeriodo}
        onClose={() => setModalPeriodo(false)}
        onCreado={(periodo) => {
          periodoInicializado.current = null;
          setPeriodoId(periodo.id_periodo_evaluacion);
          setSeleccionados(new Set());
          setInicio(hoyISO());
          setFin(hoyISO());
          setErrores({});
        }}
      />
    </div>
  );
}
