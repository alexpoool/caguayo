import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { rrhhService } from '../../services/rrhh';
import {
  COLOR_ESTADO_SOLICITUD,
  ESTADOS_SOLICITUD,
  RRHH_ESTADOS_ASISTENCIA,
  RRHH_ESTADO_ASISTENCIA_BADGE,
  type RrhhEstadoAsistencia,
  type RrhhEstadoSolicitud,
} from '../../types/rrhh';
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  Clock,
  Download,
  RefreshCw,
  Search,
  Users,
} from 'lucide-react';
import {
  Button,
  DateInput,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui';

type Pestana = 'evaluaciones' | 'nomina' | 'asistencia' | 'solicitudes';

const PESTANAS: [Pestana, string, typeof BarChart3][] = [
  ['evaluaciones', 'Evaluaciones', ClipboardCheck],
  ['nomina', 'Nómina', Banknote],
  ['asistencia', 'Asistencia', Clock],
  ['solicitudes', 'Solicitudes', CalendarDays],
];

/** Fecha ISO local (sin desfase de UTC) para los inputs tipo date. */
const hoyISO = () => {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
};

/** Primer día del mes calendario actual (ISO local). */
const primerDiaMesISO = () => `${hoyISO().slice(0, 7)}-01`;

/** Último día del mes calendario actual (ISO local). */
const ultimoDiaMesISO = () => {
  const d = new Date();
  const dia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
};

const fmtMoneda = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === ''
    ? '—'
    : new Intl.NumberFormat('es-CU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(v));

/** Promedio ponderado 0–5 con dos decimales; «—» sin puntuar. */
const fmtProm5 = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === '' ? '—' : Number(v).toFixed(2);

const fmtFecha = (v: string) => {
  const [anio, mes, dia] = v.split('-');
  return `${dia}/${mes}/${anio}`;
};

const fmtHora = (v: string | null | undefined) => (v ? v.slice(0, 5) : '—');

const capital = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

/** Descarga un CSV simple (cabeceras + filas) con BOM para Excel. */
const exportarCSV = (
  nombre: string,
  cabeceras: string[],
  filas: (string | number)[][],
) => {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [cabeceras, ...filas]
    .map((f) => f.map(esc).join(','))
    .join('\n');
  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nombre;
  link.click();
  URL.revokeObjectURL(url);
};

// Degradado de la página (naranja), siguiendo el patrón de Monedas
const GRADIENTE =
  'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300';

export function ReportesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // La pestaña vive en la URL (`?tab=`), igual que en Catálogos.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const pestana: Pestana = PESTANAS.some(([id]) => id === tabParam)
    ? (tabParam as Pestana)
    : 'evaluaciones';

  const cambiarTab = (id: Pestana) => setSearchParams({ tab: id });

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header con icono animado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded shadow-lg animate-bounce-subtle">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">Reportes</h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              Vista global del módulo: indicadores del día, nómina del mes y
              reportes exportables
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <Button
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ['rrhh'] })
            }
            title="Recargar indicadores y reportes"
            className={`gap-2 ${GRADIENTE}`}
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/rrhh')}
            className="gap-2 hover:scale-105 transition-transform"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>
      </div>

      <TarjetasDashboard />

      {/* Pestañas */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {PESTANAS.map(([id, etiqueta, Icono]) => (
          <button
            key={id}
            type="button"
            onClick={() => cambiarTab(id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              pestana === id
                ? 'border-orange-600 text-orange-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icono className="h-4 w-4" />
            {etiqueta}
          </button>
        ))}
      </div>

      {pestana === 'evaluaciones' ? (
        <PestanaEvaluaciones />
      ) : pestana === 'nomina' ? (
        <PestanaNomina />
      ) : pestana === 'asistencia' ? (
        <PestanaAsistencia />
      ) : (
        <PestanaSolicitudes />
      )}
    </div>
  );
}

// ── Tarjetas dashboard (5 indicadores, cada uno con su query) ───────────────

function TarjetasDashboard() {
  const empleados = useQuery({
    queryKey: ['rrhh', 'reportes', 'empleados-activos'],
    queryFn: () => rrhhService.listarEmpleados({ limit: 500, activo: true }),
  });

  const hoy = hoyISO();
  const asistencia = useQuery({
    queryKey: ['rrhh', 'reportes', 'asistencia-hoy', hoy],
    queryFn: () => rrhhService.resumenAsistenciaDia({ fecha: hoy }),
  });

  const desdeMes = primerDiaMesISO();
  const hastaMes = ultimoDiaMesISO();
  const nominaMes = useQuery({
    queryKey: ['rrhh', 'reportes', 'nomina-mes', desdeMes, hastaMes],
    queryFn: () => rrhhService.reporteCosto({ desde: desdeMes, hasta: hastaMes }),
  });

  const solicitudes = useQuery({
    queryKey: ['rrhh', 'reportes', 'solicitudes-pendientes'],
    queryFn: () => rrhhService.resumenSolicitudes(),
  });

  const valor = (
    q: { isLoading: boolean; isError: boolean },
    f: () => string,
  ) => (q.isLoading ? '…' : q.isError ? '—' : f());

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <TarjetaStat
        titulo="Empleados activos"
        icono={<Users className="h-5 w-5" />}
        valor={valor(empleados, () => String(empleados.data?.length ?? 0))}
      />
      <TarjetaStat
        titulo="Asistencia hoy"
        icono={<Clock className="h-5 w-5" />}
        valor={valor(
          asistencia,
          () =>
            `${asistencia.data?.presentes ?? 0}/${asistencia.data?.total_empleados ?? 0}`,
        )}
      />
      <TarjetaStat
        titulo="Nómina del mes (neto)"
        icono={<Banknote className="h-5 w-5" />}
        valor={valor(nominaMes, () => fmtMoneda(nominaMes.data?.total_neto))}
      />
      <TarjetaStat
        titulo="Solicitudes pendientes"
        icono={<CalendarDays className="h-5 w-5" />}
        valor={valor(
          solicitudes,
          () =>
            String(
              solicitudes.data?.find((s) => s.estado === 'pendiente')?.cantidad ??
                0,
            ),
        )}
      />
    </div>
  );
}

function TarjetaStat({
  titulo,
  valor,
  icono,
}: {
  titulo: string;
  valor: string;
  icono: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-orange-50 p-2 text-orange-600">
          {icono}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500">
            {titulo}
          </p>
          <p className="truncate text-xl font-bold tabular-nums text-slate-900">
            {valor}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Pestaña: Evaluaciones ───────────────────────────────────────────────────

function PestanaEvaluaciones() {
  const [departamentoId, setDepartamentoId] = useState<number | ''>('');
  const [empleadoId, setEmpleadoId] = useState<number | ''>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const { data: departamentos = [] } = useQuery({
    queryKey: ['rrhh', 'departamentos', 'para-reporte'],
    queryFn: () => rrhhService.listarDepartamentos({ limit: 500, activo: true }),
  });

  const { data: empleados = [] } = useQuery({
    queryKey: ['rrhh', 'empleados', 'para-reporte'],
    queryFn: () => rrhhService.listarEmpleados({ limit: 500, activo: true }),
  });

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'rrhh',
      'reportes',
      'evaluaciones',
      departamentoId,
      empleadoId,
      desde,
      hasta,
    ],
    queryFn: () =>
      rrhhService.reporteEvaluaciones({
        departamento_id: departamentoId === '' ? undefined : departamentoId,
        empleado_id: empleadoId === '' ? undefined : empleadoId,
        desde: desde || undefined,
        hasta: hasta || undefined,
      }),
  });

  const exportar = () => {
    if (!data) return;
    exportarCSV(
      'reporte_evaluaciones.csv',
      [
        'Empleado',
        'Código',
        'Departamento',
        'Evaluaciones',
        'Promedio objetivos (0-5)',
      ],
      data.empleados.map((e) => [
        e.empleado_nombre ?? '',
        e.empleado_codigo ?? '',
        e.departamento_nombre ?? '',
        e.cantidad_evaluaciones,
        e.promedio_objetivos ?? '',
      ]),
    );
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-3">
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
          <select
            value={empleadoId}
            onChange={(e) =>
              setEmpleadoId(e.target.value === '' ? '' : Number(e.target.value))
            }
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todos los empleados</option>
            {empleados.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.nombre} {emp.apellido}
              </option>
            ))}
          </select>
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
          <Button
            variant="outline"
            size="sm"
            onClick={exportar}
            disabled={!data || data.empleados.length === 0}
            className="ml-auto"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
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
        ) : !data || data.empleados.length === 0 ? (
          <EmptyState mensaje="No hay evaluaciones en el rango seleccionado." />
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <Resumen titulo="Evaluaciones" valor={String(data.cantidad_evaluaciones)} />
              <Resumen
                titulo="Prom. objetivos (/ 5)"
                valor={fmtProm5(data.promedio_objetivos)}
                destacado
              />
            </div>
            <Table>
              <TableHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead className="text-right">Evaluaciones</TableHead>
                  <TableHead className="text-right">Prom. objetivos (/ 5)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.empleados.map((e) => (
                  <TableRow key={e.empleado_id} className="hover:bg-gray-50 transition-colors">
                    <TableCell>
                      <div className="font-medium text-slate-900">
                        {e.empleado_nombre ?? '—'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {e.empleado_codigo ?? '—'}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {e.departamento_nombre ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {e.cantidad_evaluaciones}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {fmtProm5(e.promedio_objetivos)}
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

// ── Pestaña: Nómina ─────────────────────────────────────────────────────────

function PestanaNomina() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [departamentoId, setDepartamentoId] = useState<number | ''>('');

  const { data: departamentos = [] } = useQuery({
    queryKey: ['rrhh', 'departamentos', 'para-reporte'],
    queryFn: () => rrhhService.listarDepartamentos({ limit: 500, activo: true }),
  });

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['rrhh', 'reportes', 'nomina', desde, hasta, departamentoId],
    queryFn: () =>
      rrhhService.reporteCosto({
        desde: desde || undefined,
        hasta: hasta || undefined,
        departamento_id: departamentoId === '' ? undefined : departamentoId,
      }),
  });

  const exportar = () => {
    if (!data) return;
    exportarCSV(
      'reporte_nomina.csv',
      [
        'Departamento',
        'Empleados',
        'Salario base',
        'Horas extras',
        'Deducciones',
        'Bonificaciones',
        'Neto',
      ],
      data.departamentos.map((d) => [
        d.departamento_nombre ?? 'Sin departamento',
        d.cantidad_empleados,
        d.salario_base,
        d.horas_extras,
        d.deducciones,
        d.bonificaciones,
        d.salario_neto,
      ]),
    );
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
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
          <p className="text-xs text-slate-400">
            Excluye las nóminas anuladas. Sin fechas se incluye todo.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={exportar}
            disabled={!data || data.departamentos.length === 0}
            className="ml-auto"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
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
        ) : !data || data.departamentos.length === 0 ? (
          <EmptyState mensaje="No hay nóminas en el rango seleccionado." />
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
              <Resumen titulo="Nóminas" valor={String(data.cantidad_nominas)} />
              <Resumen titulo="Salario base" valor={fmtMoneda(data.total_salario_base)} />
              <Resumen titulo="Horas extras" valor={fmtMoneda(data.total_horas_extras)} />
              <Resumen titulo="Deducciones" valor={fmtMoneda(data.total_deducciones)} />
              <Resumen titulo="Bonificaciones" valor={fmtMoneda(data.total_bonificaciones)} />
              <Resumen titulo="Neto total" valor={fmtMoneda(data.total_neto)} destacado />
            </div>
            <Table>
              <TableHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
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
                  <TableRow key={d.departamento_id ?? `sin-${i}`} className="hover:bg-gray-50 transition-colors">
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

// ── Pestaña: Asistencia ─────────────────────────────────────────────────────

function PestanaAsistencia() {
  // Por defecto, el mes calendario actual.
  const [desde, setDesde] = useState(primerDiaMesISO);
  const [hasta, setHasta] = useState(ultimoDiaMesISO);
  const [estado, setEstado] = useState<RrhhEstadoAsistencia | ''>('');
  const [departamentoId, setDepartamentoId] = useState<number | ''>('');

  const { data: departamentos = [] } = useQuery({
    queryKey: ['rrhh', 'departamentos', 'para-reporte'],
    queryFn: () => rrhhService.listarDepartamentos({ limit: 500, activo: true }),
  });

  const {
    data: filas = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'rrhh',
      'reportes',
      'asistencia',
      desde,
      hasta,
      estado,
      departamentoId,
    ],
    queryFn: () =>
      rrhhService.listarAsistencias({
        limit: 1000,
        desde: desde || undefined,
        hasta: hasta || undefined,
        estado: estado || undefined,
        departamento_id: departamentoId === '' ? undefined : departamentoId,
      }),
  });

  // Totales calculados en cliente sobre las filas del rango.
  const stats = useMemo(() => {
    const contar = (e: RrhhEstadoAsistencia) =>
      filas.filter((f) => f.estado === e).length;
    return {
      total: filas.length,
      presentes: contar('presente'),
      ausentes: contar('ausente'),
      tardanzas: contar('tardanza'),
      permisos: contar('permiso'),
      vacaciones: contar('vacaciones'),
    };
  }, [filas]);

  const exportar = () => {
    exportarCSV(
      'reporte_asistencia.csv',
      ['Fecha', 'Empleado', 'Departamento', 'Estado', 'Entrada', 'Salida', 'Tardanza (min)'],
      filas.map((f) => [
        f.fecha,
        f.empleado_nombre ?? '',
        f.departamento_nombre ?? '',
        f.estado,
        f.hora_entrada ?? '',
        f.hora_salida ?? '',
        f.tardanza_minutos,
      ]),
    );
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
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
            value={estado}
            onChange={(e) =>
              setEstado(e.target.value as RrhhEstadoAsistencia | '')
            }
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todos los estados</option>
            {RRHH_ESTADOS_ASISTENCIA.map((op) => (
              <option key={op.valor} value={op.valor}>
                {op.etiqueta}
              </option>
            ))}
          </select>
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
          <Button
            variant="outline"
            size="sm"
            onClick={exportar}
            disabled={filas.length === 0}
            className="ml-auto"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
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
          <EmptyState mensaje="No hay asistencias en el rango seleccionado." />
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
              <Resumen titulo="Registros" valor={String(stats.total)} />
              <Resumen titulo="Presentes" valor={String(stats.presentes)} />
              <Resumen titulo="Ausentes" valor={String(stats.ausentes)} />
              <Resumen titulo="Tardanzas" valor={String(stats.tardanzas)} />
              <Resumen titulo="Permisos" valor={String(stats.permisos)} />
              <Resumen titulo="Vacaciones" valor={String(stats.vacaciones)} destacado />
            </div>
            {filas.length >= 1000 && (
              <div className="mb-4 flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>
                  El rango es grande: se muestran los primeros 1000 registros.
                  Refina el rango con las fechas o los filtros para ver el resto.
                </p>
              </div>
            )}
            <Table>
              <TableHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Salida</TableHead>
                  <TableHead className="text-right">Tardanza</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f) => (
                  <TableRow key={f.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="whitespace-nowrap text-slate-600">
                      {fmtFecha(f.fecha)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">
                        {f.empleado_nombre ?? '—'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {f.departamento_nombre ?? '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          RRHH_ESTADO_ASISTENCIA_BADGE[f.estado]
                        }`}
                      >
                        {capital(f.estado)}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums text-slate-600">
                      {fmtHora(f.hora_entrada)}
                    </TableCell>
                    <TableCell className="tabular-nums text-slate-600">
                      {fmtHora(f.hora_salida)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {f.tardanza_minutos > 0
                        ? `${f.tardanza_minutos} min`
                        : '—'}
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

// ── Pestaña: Solicitudes ────────────────────────────────────────────────────

function PestanaSolicitudes() {
  const [estado, setEstado] = useState<RrhhEstadoSolicitud | ''>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  // El resumen es global por estado (el servicio solo admite empleado_id).
  const {
    data: resumen = [],
    isLoading: cargandoResumen,
    isError: errorResumen,
    refetch: refetchResumen,
  } = useQuery({
    queryKey: ['rrhh', 'reportes', 'solicitudes', 'resumen'],
    queryFn: () => rrhhService.resumenSolicitudes(),
  });

  const {
    data: filas = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['rrhh', 'reportes', 'solicitudes', 'ultimas', estado, desde, hasta],
    queryFn: () =>
      rrhhService.listarSolicitudes({
        limit: 100,
        estado: estado || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
      }),
  });

  const exportar = () => {
    exportarCSV(
      'reporte_solicitudes.csv',
      ['Empleado', 'Departamento', 'Tipo', 'Estado', 'Desde', 'Hasta', 'Días'],
      filas.map((s) => [
        s.empleado_nombre ?? '',
        s.departamento_nombre ?? '',
        s.tipo,
        s.estado,
        s.fecha_inicio,
        s.fecha_fin,
        s.dias,
      ]),
    );
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-700">
              Resumen por estado
            </h2>
            <p className="text-xs text-slate-400">Global, sin filtros de fecha</p>
          </div>
        </CardHeader>
        <CardContent>
          {cargandoResumen ? (
            <LoadingRows />
          ) : errorResumen ? (
            <ErrorState onReintentar={refetchResumen} />
          ) : (
            <Table>
              <TableHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumen.map((r) => (
                  <TableRow key={r.estado}>
                    <TableCell>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          COLOR_ESTADO_SOLICITUD[r.estado]
                        }`}
                      >
                        {capital(r.estado)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {r.cantidad}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-700">
              Últimas solicitudes
            </h2>
            <select
              value={estado}
              onChange={(e) =>
                setEstado(e.target.value as RrhhEstadoSolicitud | '')
              }
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Todos los estados</option>
              {ESTADOS_SOLICITUD.map((e) => (
                <option key={e} value={e}>
                  {capital(e)}
                </option>
              ))}
            </select>
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
            <Button
              variant="outline"
              size="sm"
              onClick={exportar}
              disabled={filas.length === 0}
              className="ml-auto"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
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
            <EmptyState mensaje="No hay solicitudes que coincidan con los filtros." />
          ) : (
            <Table>
              <TableHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Rango</TableHead>
                  <TableHead className="text-right">Días</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((s) => (
                  <TableRow key={s.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell>
                      <div className="font-medium text-slate-900">
                        {s.empleado_nombre ?? '—'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {s.departamento_nombre ?? '—'}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {capital(s.tipo)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          COLOR_ESTADO_SOLICITUD[s.estado]
                        }`}
                      >
                        {capital(s.estado)}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">
                      {fmtFecha(s.fecha_inicio)} – {fmtFecha(s.fecha_fin)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.dias}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Subcomponentes compartidos ──────────────────────────────────────────────

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
        destacado ? 'bg-orange-50 ring-1 ring-orange-100' : 'bg-slate-50'
      }`}
    >
      <div
        className={`text-xl font-bold tabular-nums ${
          destacado ? 'text-orange-700' : 'text-slate-700'
        }`}
      >
        {valor}
      </div>
      <div className="text-xs text-slate-500">{titulo}</div>
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

function EmptyState({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="p-4 bg-slate-50 rounded-full mb-2">
        <Search className="h-10 w-10 text-slate-300" />
      </div>
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
        {mensaje || 'No se pudieron cargar los datos'}
      </p>
      <Button variant="outline" size="sm" onClick={onReintentar}>
        <RefreshCw className="h-4 w-4" />
        Reintentar
      </Button>
    </div>
  );
}
