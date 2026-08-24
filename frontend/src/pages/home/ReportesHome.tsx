import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  SlidersHorizontal,
  Eye,
  Download,
  Printer,
  X,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Boxes,
  Package,
  ArrowLeftRight,
  Users,
  UserCircle,
  Layers,
  Calculator,
  FileText,
  ClipboardList,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { toast } from "react-hot-toast";
import { authHelpers } from "../../lib/api";

import { dependenciasService } from "../../services/administracion";
import type { Dependencia } from "../../types/dependencia";



type ChartType = "bar" | "line" | "pie";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

interface ReportConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  colorHex: string;
  module: string;
  moduleLabel: string;
  previewEndpoint: string;
  buildPreviewParams: (filters: FilterState) => Record<string, string>;
  transformChartData: (data: any) => { name: string; monto: number; cantidad: number }[];
  computeStats: (data: any) => ChartStats;
  pdfEndpoint: string;
  pdfFilename: string;
  buildPdfParams: (filters: FilterState) => Record<string, string>;
  needsDependencia: boolean;
  needsFechas: boolean;
}

interface FilterState {
  id_dependencia: string;
  fecha_inicio: string;
  fecha_fin: string;
  notas: string;
}

interface ChartStats {
  total: number;
  promedio: number;
  max: number;
  min: number;
  count: number;
}

function getDefaultFilters(userDepId?: number): FilterState {
  const now = new Date();
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  return {
    id_dependencia: userDepId ? String(userDepId) : "",
    fecha_inicio: oneMonthAgo.toISOString().split("T")[0],
    fecha_fin: now.toISOString().split("T")[0],
    notas: "",
  };
}

const REPORTS: ReportConfig[] = [
  {
    id: "existencias",
    title: "Existencias",
    description: "Stock actual de productos por dependencia con totales generales.",
    icon: <Boxes className="h-4 w-4" />,
    color: "bg-blue-50",
    colorHex: "#3b82f6",
    module: "inventario",
    moduleLabel: "Inventario",
    previewEndpoint: "/reportes/existencias/preview",
    buildPreviewParams: (f) => ({ id_dependencia: f.id_dependencia || "1" }),
    transformChartData: (data) => {
      const items = data?.items || [];
      return items.slice(0, 7).map((item: any) => ({
        name: (item.nombre || item.producto || "Item").substring(0, 12),
        monto: Number(item.valor_total || item.cantidad || 0),
        cantidad: Number(item.cantidad || 0),
      }));
    },
    computeStats: (data) => {
      const items = data?.items || [];
      const valores = items.map((i: any) => Number(i.valor_total || i.cantidad || 0));
      return computeBasicStats(valores);
    },
    pdfEndpoint: "/reportes/existencias",
    pdfFilename: "existencias.pdf",
    buildPdfParams: (f) => ({ id_dependencia: f.id_dependencia || "1", aprobado_por_nombre: "", aprobado_por_cargo: "", notas: f.notas }),
    needsDependencia: true,
    needsFechas: false,
  },
  {
    id: "movimientos-dependencia",
    title: "Movimientos por Dependencia",
    description: "Historial de movimientos filtrado por dependencia y período.",
    icon: <ArrowLeftRight className="h-4 w-4" />,
    color: "bg-green-50",
    colorHex: "#10b981",
    module: "inventario",
    moduleLabel: "Inventario",
    previewEndpoint: "/reportes/movimientos-dependencia/preview",
    buildPreviewParams: (f) => ({
      id_dependencia: f.id_dependencia || "1",
      fecha_inicio: f.fecha_inicio,
      fecha_fin: f.fecha_fin,
    }),
    transformChartData: (data) => {
      const e = Number(data?.total_entradas || 0);
      const s = Number(data?.total_salidas || 0);
      return [
        { name: "Entradas", monto: e, cantidad: e },
        { name: "Salidas", monto: s, cantidad: s },
      ];
    },
    computeStats: (data) => computeBasicStats([Number(data?.total_entradas || 0), Number(data?.total_salidas || 0)]),
    pdfEndpoint: "/reportes/movimientos-dependencia",
    pdfFilename: "movimientos_dependencia.pdf",
    buildPdfParams: (f) => ({ id_dependencia: f.id_dependencia || "1", fecha_inicio: f.fecha_inicio, fecha_fin: f.fecha_fin, aprobado_por_nombre: "", aprobado_por_cargo: "", notas: f.notas }),
    needsDependencia: true,
    needsFechas: true,
  },
  {
    id: "movimientos-producto",
    title: "Movimientos por Producto",
    description: "Seguimiento detallado de un producto específico en el tiempo.",
    icon: <Package className="h-4 w-4" />,
    color: "bg-purple-50",
    colorHex: "#8b5cf6",
    module: "inventario",
    moduleLabel: "Inventario",
    previewEndpoint: "/reportes/movimientos-producto/preview",
    buildPreviewParams: (f) => ({
      id_dependencia: f.id_dependencia || "1",
      id_producto: "1",
      fecha_inicio: f.fecha_inicio,
      fecha_fin: f.fecha_fin,
    }),
    transformChartData: (data) => {
      const e = Number(data?.total_entradas || 0);
      const s = Number(data?.total_salidas || 0);
      return [
        { name: "Entradas", monto: e, cantidad: e },
        { name: "Salidas", monto: s, cantidad: s },
      ];
    },
    computeStats: (data) => computeBasicStats([Number(data?.total_entradas || 0), Number(data?.total_salidas || 0)]),
    pdfEndpoint: "/reportes/movimientos-producto",
    pdfFilename: "movimientos_producto.pdf",
    buildPdfParams: (f) => ({ id_dependencia: f.id_dependencia || "1", id_producto: "1", fecha_inicio: f.fecha_inicio, fecha_fin: f.fecha_fin, aprobado_por_nombre: "", aprobado_por_cargo: "", notas: f.notas }),
    needsDependencia: true,
    needsFechas: true,
  },
  {
    id: "clientes",
    title: "Registro de Clientes",
    description: "Listado de clientes registrados con historial de compras.",
    icon: <Users className="h-4 w-4" />,
    color: "bg-cyan-50",
    colorHex: "#06b6d4",
    module: "tienda",
    moduleLabel: "Tienda",
    previewEndpoint: "/reportes/clientes/preview",
    buildPreviewParams: () => ({}),
    transformChartData: (data) => {
      const items = data?.items || [];
      const tipos: Record<string, number> = {};
      items.forEach((c: any) => { tipos[c.tipo_entidad || "Otro"] = (tipos[c.tipo_entidad || "Otro"] || 0) + 1; });
      return Object.entries(tipos).slice(0, 7).map(([name, cantidad]) => ({ name: name.substring(0, 12), monto: cantidad * 100, cantidad }));
    },
    computeStats: (data) => { const items = data?.items || []; return { total: items.length, promedio: 0, max: items.length, min: 0, count: items.length }; },
    pdfEndpoint: "/reportes/clientes",
    pdfFilename: "registro_clientes.pdf",
    buildPdfParams: (f) => ({ aprobado_por_nombre: "", aprobado_por_cargo: "", notas: f.notas }),
    needsDependencia: false,
    needsFechas: false,
  },
  {
    id: "proveedores",
    title: "Proveedores",
    description: "Listado de proveedores registrados con información de contacto.",
    icon: <UserCircle className="h-4 w-4" />,
    color: "bg-amber-50",
    colorHex: "#f59e0b",
    module: "compra",
    moduleLabel: "Compra",
    previewEndpoint: "/reportes/proveedores-dependencia/preview",
    buildPreviewParams: (f) => ({ id_dependencia: f.id_dependencia || "1", tipo_entidad: "NATURAL" }),
    transformChartData: (data) => {
      const items = data?.items || [];
      return items.slice(0, 7).map((item: any) => ({ name: (item.nombre || "Proveedor").substring(0, 12), monto: Number(item.monto_total || 0), cantidad: 1 }));
    },
    computeStats: (data) => { const items = data?.items || []; return { total: items.length, promedio: 0, max: items.length, min: 0, count: items.length }; },
    pdfEndpoint: "/reportes/proveedores-dependencia",
    pdfFilename: "proveedores.pdf",
    buildPdfParams: (f) => ({ id_dependencia: f.id_dependencia || "1", tipo_entidad: "NATURAL", aprobado_por_nombre: "", aprobado_por_cargo: "", notas: f.notas }),
    needsDependencia: true,
    needsFechas: false,
  },
  {
    id: "liquidaciones",
    title: "Resumen de Liquidaciones",
    description: "Resumen de liquidaciones realizadas por período y proveedor.",
    icon: <Calculator className="h-4 w-4" />,
    color: "bg-pink-50",
    colorHex: "#ec4899",
    module: "compra",
    moduleLabel: "Compra",
    previewEndpoint: "/reportes/liquidaciones/preview",
    buildPreviewParams: (f) => ({ fecha_inicio: f.fecha_inicio, fecha_fin: f.fecha_fin }),
    transformChartData: (data) => {
      const items = data?.items || [];
      return items.slice(0, 7).map((item: any) => ({ name: (item.cliente_nombre || item.concepto || "Liq.").substring(0, 12), monto: Number(item.monto_total || item.total || 0), cantidad: Number(item.cantidad_productos || 1) }));
    },
    computeStats: (data) => { const items = data?.items || []; return computeBasicStats(items.map((i: any) => Number(i.monto_total || i.total || 0))); },
    pdfEndpoint: "/reportes/liquidaciones",
    pdfFilename: "resumen_liquidaciones.pdf",
    buildPdfParams: (f) => ({ fecha_inicio: f.fecha_inicio, fecha_fin: f.fecha_fin, aprobado_por_nombre: "", aprobado_por_cargo: "", notas: f.notas }),
    needsDependencia: false,
    needsFechas: true,
  },
  {
    id: "proyectos",
    title: "Registro de Proyectos",
    description: "Listado de proyectos con estado, fechas y montos.",
    icon: <Layers className="h-4 w-4" />,
    color: "bg-indigo-50",
    colorHex: "#6366f1",
    module: "proyectos",
    moduleLabel: "Proyectos",
    previewEndpoint: "/reportes/proyectos/preview",
    buildPreviewParams: (f) => ({ fecha_inicio: f.fecha_inicio, fecha_fin: f.fecha_fin }),
    transformChartData: (data) => {
      const items = data?.items || [];
      return items.slice(0, 7).map((item: any) => ({ name: (item.nombre || item.titulo || "Proy.").substring(0, 12), monto: Number(item.monto_total || item.presupuesto || 0), cantidad: 1 }));
    },
    computeStats: (data) => { const items = data?.items || []; return computeBasicStats(items.map((i: any) => Number(i.monto_total || i.presupuesto || 0))); },
    pdfEndpoint: "/reportes/proyectos",
    pdfFilename: "registro_proyectos.pdf",
    buildPdfParams: (f) => ({ fecha_inicio: f.fecha_inicio, fecha_fin: f.fecha_fin, aprobado_por_nombre: "", aprobado_por_cargo: "", notas: f.notas }),
    needsDependencia: false,
    needsFechas: true,
  },
  {
    id: "creadores",
    title: "Registro de Creadores",
    description: "Listado de creadores participantes en proyectos.",
    icon: <Users className="h-4 w-4" />,
    color: "bg-violet-50",
    colorHex: "#8b5cf6",
    module: "proyectos",
    moduleLabel: "Proyectos",
    previewEndpoint: "/reportes/personas",
    buildPreviewParams: () => ({}),
    transformChartData: (data) => {
      const items = Array.isArray(data) ? data : [];
      return items.slice(0, 7).map((item: any) => ({ name: (item.nombre || "Creador").substring(0, 12), monto: Number(item.proyectos_count || 1) * 100, cantidad: Number(item.proyectos_count || 1) }));
    },
    computeStats: (data) => { const items = Array.isArray(data) ? data : []; return { total: items.length, promedio: 0, max: items.length, min: 0, count: items.length }; },
    pdfEndpoint: "/reportes/desempeno",
    pdfFilename: "registro_creadores.pdf",
    buildPdfParams: (f) => ({ aprobado_por_nombre: "", aprobado_por_cargo: "", notas: f.notas }),
    needsDependencia: false,
    needsFechas: false,
  },
  {
    id: "desempeno",
    title: "Informe de Desempeño",
    description: "Análisis de rendimiento y productividad por proyecto.",
    icon: <BarChart3 className="h-4 w-4" />,
    color: "bg-orange-50",
    colorHex: "#f97316",
    module: "proyectos",
    moduleLabel: "Proyectos",
    previewEndpoint: "/reportes/desempeno/preview",
    buildPreviewParams: (f) => ({ fecha_inicio: f.fecha_inicio, fecha_fin: f.fecha_fin }),
    transformChartData: (data) => {
      const porPersona = data?.totales_por_persona || {};
      return Object.entries(porPersona).slice(0, 7).map(([name, total]: [string, any]) => ({ name: name.substring(0, 12), monto: Number(total?.total_valor || total || 0), cantidad: Number(total?.total_cobro || 0) }));
    },
    computeStats: (data) => { const porPersona = data?.totales_por_persona || {}; return computeBasicStats(Object.values(porPersona).map((t: any) => Number(t?.total_valor || t || 0))); },
    pdfEndpoint: "/reportes/desempeno",
    pdfFilename: "informe_desempeno.pdf",
    buildPdfParams: (f) => ({ fecha_inicio: f.fecha_inicio, fecha_fin: f.fecha_fin, aprobado_por_nombre: "", aprobado_por_cargo: "", notas: f.notas }),
    needsDependencia: false,
    needsFechas: true,
  },
  {
    id: "onat",
    title: "ONAT — Ingresos y Retenciones",
    description: "Reporte de ingresos y retenciones para ONAT.",
    icon: <FileText className="h-4 w-4" />,
    color: "bg-red-50",
    colorHex: "#ef4444",
    module: "ministerios",
    moduleLabel: "Ministerios",
    previewEndpoint: "/reportes/onat/preview",
    buildPreviewParams: (f) => ({ fecha_inicio: f.fecha_inicio, fecha_fin: f.fecha_fin }),
    transformChartData: (data) => {
      const items = data?.items || [];
      return items.slice(0, 7).map((item: any) => ({ name: (item.creador_nombre || item.concepto || "ONAT").substring(0, 12), monto: Number(item.retenido || item.monto || 0), cantidad: Number(item.retencion || 0) }));
    },
    computeStats: (data) => { const items = data?.items || []; return computeBasicStats(items.map((i: any) => Number(i.retenido || i.monto || 0))); },
    pdfEndpoint: "/reportes/onat",
    pdfFilename: "reporte_onat.pdf",
    buildPdfParams: (f) => ({ fecha_inicio: f.fecha_inicio, fecha_fin: f.fecha_fin, aprobado_por_nombre: "", aprobado_por_cargo: "", notas: f.notas }),
    needsDependencia: false,
    needsFechas: true,
  },
  {
    id: "mincult",
    title: "MINCULT — Escala de Ingresos",
    description: "Escala de ingresos para el Ministerio de Cultura.",
    icon: <ClipboardList className="h-4 w-4" />,
    color: "bg-fuchsia-50",
    colorHex: "#d946ef",
    module: "ministerios",
    moduleLabel: "Ministerios",
    previewEndpoint: "/reportes/mincult/preview",
    buildPreviewParams: (f) => ({ fecha_inicio: f.fecha_inicio, fecha_fin: f.fecha_fin }),
    transformChartData: (data) => {
      const items = data?.items || [];
      return items.slice(0, 7).map((item: any) => ({ name: (item.bracket || item.rango || "MINCULT").substring(0, 12), monto: Number(item.total_devengado || item.devengado || 0), cantidad: Number(item.liquidaciones || 1) }));
    },
    computeStats: (data) => { const items = data?.items || []; return computeBasicStats(items.map((i: any) => Number(i.total_devengado || i.devengado || 0))); },
    pdfEndpoint: "/reportes/mincult",
    pdfFilename: "reporte_mincult.pdf",
    buildPdfParams: (f) => ({ fecha_inicio: f.fecha_inicio, fecha_fin: f.fecha_fin, aprobado_por_nombre: "", aprobado_por_cargo: "", notas: f.notas }),
    needsDependencia: false,
    needsFechas: true,
  },
];

const PIE_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899",
];

const FALLBACK_DATA = [
  { name: "Ene", monto: 4000, cantidad: 240 },
  { name: "Feb", monto: 3000, cantidad: 139 },
  { name: "Mar", monto: 5000, cantidad: 980 },
  { name: "Abr", monto: 4500, cantidad: 390 },
  { name: "May", monto: 6000, cantidad: 480 },
  { name: "Jun", monto: 5500, cantidad: 380 },
  { name: "Jul", monto: 7000, cantidad: 430 },
];

function computeBasicStats(values: number[]): ChartStats {
  if (values.length === 0) return { total: 0, promedio: 0, max: 0, min: 0, count: 0 };
  const total = values.reduce((s, v) => s + v, 0);
  return { total, promedio: Math.round(total / values.length), max: Math.max(...values), min: Math.min(...values), count: values.length };
}

function buildQueryString(params: Record<string, string>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) sp.append(k, v); });
  return sp.toString();
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("es-VE");
}

export function ReportesHome() {
  const [searchParams, setSearchParams] = useSearchParams();
  const reportId = searchParams.get("report");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [filterOpen, setFilterOpen] = useState(false);
  const [prevReportId, setPrevReportId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Get logged user's dependencia
  const user = useMemo(() => authHelpers.getUser(), []);
  const userDepId = user?.dependencia?.id_dependencia;

  // Filter state with smart defaults
  const [filters, setFilters] = useState<FilterState>(() => getDefaultFilters(userDepId));
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);

  // Load dependencias
  useEffect(() => {
    dependenciasService.getDependencias().then(setDependencias).catch(() => {});
  }, []);

  const activeReport = useMemo(
    () => REPORTS.find((r) => r.id === reportId) ?? REPORTS[0],
    [reportId]
  );

  // Reset filters with smart defaults when report changes
  useEffect(() => {
    setFilters(getDefaultFilters(userDepId));
  }, [activeReport.id, userDepId]);

  // Build preview URL
  const previewUrl = useMemo(() => {
    const params = activeReport.buildPreviewParams(filters);
    const qs = buildQueryString(params);
    return `${BASE_URL}${activeReport.previewEndpoint}${qs ? `?${qs}` : ""}`;
  }, [activeReport, filters]);

  // Fetch chart data directly with full control
  const [previewData, setPreviewData] = useState<any>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel previous request
    if (fetchControllerRef.current) fetchControllerRef.current.abort();
    const controller = new AbortController();
    fetchControllerRef.current = controller;

    setChartLoading(true);
    setChartError(null);

    const timer = setTimeout(async () => {
      try {
        const token = authHelpers.getToken() ?? "";
        const r = await fetch(previewUrl, {
          signal: controller.signal,
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!r.ok) throw new Error(`${r.status}`);
        const data = await r.json();
        if (!controller.signal.aborted) {
          setPreviewData(data);
          setChartLoading(false);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setChartError(err?.message || "Error")
          setChartLoading(false);
        }
      }
    }, 300);

    return () => { controller.abort(); clearTimeout(timer); };
  }, [previewUrl]);

  // Transform chart data
  const chartData = useMemo(() => {
    if (!previewData) return null;
    try {
      const transformed = activeReport.transformChartData(previewData);
      return transformed && transformed.length > 0 ? transformed : null;
    } catch { return null; }
  }, [previewData, activeReport]);

  // Compute summary stats
  const stats = useMemo<ChartStats>(() => {
    if (!previewData) return { total: 0, promedio: 0, max: 0, min: 0, count: 0 };
    try { return activeReport.computeStats(previewData); }
    catch { return { total: 0, promedio: 0, max: 0, min: 0, count: 0 }; }
  }, [previewData, activeReport]);

  useEffect(() => {
    if (!reportId) setSearchParams({ report: "existencias" }, { replace: true });
  }, [reportId, setSearchParams]);

  useEffect(() => {
    if (prevReportId && prevReportId !== reportId) {
      setIsTransitioning(true);
      const timer = setTimeout(() => setIsTransitioning(false), 300);
      return () => clearTimeout(timer);
    }
    setPrevReportId(reportId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node) && overlayRef.current && overlayRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filterOpen]);

  const handleSelectReport = useCallback((id: string) => { setSearchParams({ report: id }); }, [setSearchParams]);
  const updateFilter = useCallback((key: string, value: string) => { setFilters((prev) => ({ ...prev, [key]: value })); }, []);

  const handleDownload = useCallback(async () => {
    const params = activeReport.buildPdfParams(filters);
    const qs = buildQueryString(params);
    const url = `${BASE_URL}${activeReport.pdfEndpoint}${qs ? `?${qs}` : ""}`;
    try {
      const token = authHelpers.getToken() ?? "";
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`${r.status}`);
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = window.URL.createObjectURL(blob);
      a.download = activeReport.pdfFilename;
      a.click();
      toast.success("Reporte descargado");
    } catch { toast.error("Error al descargar reporte"); }
  }, [activeReport, filters]);

  const handlePreview = useCallback(async () => {
    const params = activeReport.buildPdfParams(filters);
    const qs = buildQueryString(params);
    const url = `${BASE_URL}${activeReport.pdfEndpoint}${qs ? `?${qs}` : ""}`;
    try {
      const token = authHelpers.getToken() ?? "";
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`${r.status}`);
      window.open(window.URL.createObjectURL(await r.blob()), "_blank");
    } catch { toast.error("Error al generar vista previa"); }
  }, [activeReport, filters]);

  const handlePrint = useCallback(() => { window.print(); }, []);

  const displayData = chartData && chartData.length > 0 ? chartData : FALLBACK_DATA;

  const renderChart = () => {
    if (chartLoading) return <div className="h-[300px] flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
    if (chartError) return <div className="h-[300px] flex flex-col items-center justify-center text-gray-400 gap-2"><AlertCircle className="w-8 h-8" /><p className="text-sm">No se pudieron cargar los datos</p><p className="text-xs text-gray-300">Mostrando datos de ejemplo</p></div>;

    const gridAndAxis = (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} />
        <YAxis stroke="#6b7280" fontSize={12} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", boxShadow: "0 4px 6px rgba(0,0,0,0.07)" }} />
        <Legend />
      </>
    );

    if (chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={displayData}>
            {gridAndAxis}
            <Line type="monotone" dataKey="monto" stroke={activeReport.colorHex} strokeWidth={3} dot={{ fill: activeReport.colorHex, r: 4 }} activeDot={{ r: 6 }} name="Monto" animationDuration={500} />
            <Line type="monotone" dataKey="cantidad" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", r: 3 }} name="Cantidad" animationDuration={500} />
          </LineChart>
        </ResponsiveContainer>
      );
    }
    if (chartType === "pie") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={displayData} cx="50%" cy="50%" innerRadius={60} outerRadius={120} paddingAngle={3} dataKey="monto" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} animationDuration={500}>
              {displayData.map((_, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={displayData}>
          {gridAndAxis}
          <Bar dataKey="monto" fill={activeReport.colorHex} radius={[4, 4, 0, 0]} name="Monto" animationDuration={500} />
          <Bar dataKey="cantidad" fill="#10b981" radius={[4, 4, 0, 0]} name="Cantidad" animationDuration={500} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const chartButtons: { type: ChartType; icon: React.ReactNode; label: string }[] = [
    { type: "bar", icon: <BarChart3 className="w-4 h-4" />, label: "Barras" },
    { type: "line", icon: <LineChartIcon className="w-4 h-4" />, label: "Línea" },
    { type: "pie", icon: <PieChartIcon className="w-4 h-4" />, label: "Pastel" },
  ];

  return (
    <div className="h-[calc(100vh-8rem)] overflow-auto p-6">
      <div className="max-w-6xl mx-auto">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-5">
          {/* Left: Chart type icons */}
          <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
            {chartButtons.map((btn) => (
              <button key={btn.type} onClick={() => setChartType(btn.type)} title={btn.label}
                className={`p-2 rounded-lg transition-all duration-150 ${chartType === btn.type ? "bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-200" : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"}`}>
                {btn.icon}
              </button>
            ))}
          </div>

          {/* Center: Filter icon with dropdown */}
          <div className="relative" ref={filterRef}>
            <button onClick={() => setFilterOpen((prev) => !prev)} title="Filtros"
              className={`p-2.5 rounded-xl border transition-all duration-150 ${filterOpen ? "bg-blue-50 text-blue-600 border-blue-300 shadow-sm ring-2 ring-blue-100" : "bg-white text-gray-500 border-gray-200 shadow-sm hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300"}`}>
              <SlidersHorizontal className="w-5 h-5" />
            </button>

            {filterOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[420px] bg-white rounded-2xl border border-gray-200 shadow-2xl p-5 z-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900">Filtros — {activeReport.title}</h3>
                  <button onClick={() => setFilterOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Unified filter form */}
                <div className="space-y-3">
                  {activeReport.needsDependencia && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Dependencia</label>
                      <select value={filters.id_dependencia} onChange={(e) => updateFilter("id_dependencia", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Seleccionar dependencia</option>
                        {dependencias.map((d) => <option key={d.id_dependencia} value={d.id_dependencia}>{d.nombre}</option>)}
                      </select>
                    </div>
                  )}
                  {activeReport.needsFechas && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Desde</label>
                        <input type="date" value={filters.fecha_inicio} onChange={(e) => updateFilter("fecha_inicio", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Hasta</label>
                        <input type="date" value={filters.fecha_fin} onChange={(e) => updateFilter("fecha_fin", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Notas / Observaciones</label>
                    <textarea rows={2} value={filters.notas} onChange={(e) => updateFilter("notas", e.target.value)}
                      placeholder="Agregue notas para el reporte..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Action icons */}
          <div className="flex items-center gap-1">
            <button onClick={handlePreview} title="Vista previa" className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300 transition-all duration-150">
              <Eye className="w-4 h-4" />
            </button>
            <button onClick={handleDownload} title="Descargar PDF" className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300 transition-all duration-150">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={handlePrint} title="Imprimir" className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300 transition-all duration-150">
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chart card */}
        <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5 transition-all duration-300 ease-in-out ${isTransitioning ? "opacity-0 scale-[0.98]" : "opacity-100 scale-100"}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${activeReport.color} flex items-center justify-center`} style={{ color: activeReport.colorHex }}>
                {activeReport.icon}
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">{activeReport.title}</h2>
                <p className="text-xs text-gray-400">{activeReport.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: activeReport.colorHex }} />Monto</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Cantidad</span>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4">{renderChart()}</div>

          {/* Summary statistics */}
          <div className="border-t border-gray-100 pt-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total", value: stats.total, icon: <DollarSign className="w-4 h-4 text-blue-600" />, bg: "bg-blue-100" },
                { label: "Promedio", value: stats.promedio, icon: <TrendingUp className="w-4 h-4 text-emerald-600" />, bg: "bg-emerald-100" },
                { label: "Máximo", value: stats.max, icon: <TrendingUp className="w-4 h-4 text-amber-600" />, bg: "bg-amber-100" },
                { label: "Mínimo", value: stats.min, icon: <TrendingDown className="w-4 h-4 text-red-600" />, bg: "bg-red-100" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>{s.icon}</div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
                    <p className="text-sm font-bold text-gray-900">{formatNumber(s.value)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Report selector */}
        <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-4 transition-all duration-300 ease-in-out delay-75 ${isTransitioning ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Seleccionar reporte</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {REPORTS.map((report) => (
              <button key={report.id} onClick={() => handleSelectReport(report.id)}
                className={`flex items-center gap-2.5 p-3 rounded-xl text-left transition-all duration-150 ${activeReport.id === report.id ? "bg-blue-50 border-2 border-blue-200 shadow-sm" : "bg-gray-50 border-2 border-transparent hover:bg-gray-100 hover:border-gray-200"}`}>
                <div className={`w-7 h-7 rounded-lg ${report.color} flex items-center justify-center flex-shrink-0`} style={{ color: report.colorHex }}>
                  {report.icon}
                </div>
                <span className={`text-xs font-medium truncate ${activeReport.id === report.id ? "text-blue-700" : "text-gray-600"}`}>{report.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
