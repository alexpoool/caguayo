import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { dependenciasService, productosService } from "../../services/api";
import { Dependencia } from "../../types/dependencia";
import { authHelpers } from "../../lib/api";
import type { Productos } from "../../types/index";
import { useReportPreview } from "../../hooks/useReportPreview";
import ReportPreviewPanel from "../../components/ui/ReportPreviewPanel";
import type { Column, StatCard, ExportColumn } from "../../components/ui/ReportPreviewPanel";
import { Package, Download, Loader2 } from "lucide-react";
import ReportNotes from "../../components/ui/ReportNotes";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MovimientosProductoPreviewItem {
  fecha: string;
  operacion: string;
  tipo: "Entrada" | "Salida" | "Neutro";
  cantidad: number;
}

interface MovimientosProductoPreviewData {
  dependencia: { nombre: string; direccion: string };
  producto: { codigo: string; nombre: string };
  items: MovimientosProductoPreviewItem[];
  total_items: number;
  total_entradas: number;
  total_salidas: number;
}

// ---------------------------------------------------------------------------
// Export columns
// ---------------------------------------------------------------------------

const EXPORT_COLUMNS: ExportColumn<MovimientosProductoPreviewItem>[] = [
  { header: "Fecha", accessor: "fecha" },
  { header: "Operación", accessor: "operacion" },
  { header: "Tipo", accessor: "tipo" },
  { header: "Cantidad", accessor: "cantidad" },
];

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const COLUMNS: Column<MovimientosProductoPreviewItem>[] = [
  {
    header: "Fecha",
    accessor: (row) =>
      new Date(row.fecha + "T00:00:00").toLocaleDateString("es-ES"),
  },
  {
    header: "Operación",
    accessor: "operacion",
  },
  {
    header: "Tipo",
    accessor: (row) => {
      const styles: Record<MovimientosProductoPreviewItem["tipo"], string> = {
        Entrada: "bg-green-100 text-green-700",
        Salida: "bg-red-100 text-red-700",
        Neutro: "bg-gray-100 text-gray-600",
      };
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            styles[row.tipo] ?? "bg-gray-100 text-gray-600"
          }`}
        >
          {row.tipo}
        </span>
      );
    },
  },
  {
    header: "Cantidad",
    accessor: "cantidad",
    align: "right",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ReporteMovimientosProducto: React.FC = () => {
  // ── State ─────────────────────────────────────────────────────────────────
  const [pdfLoading, setPdfLoading] = useState(false);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [productos, setProductos] = useState<Productos[]>([]);
  const [idDependencia, setIdDependencia] = useState<number | null>(null);
  const [idProducto, setIdProducto] = useState<number | null>(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [aprobadoPorNombre, setAprobadoPorNombre] = useState("");
  const [aprobadoPorCargo, setAprobadoPorCargo] = useState("");
  const [notas, setNotas] = useState("");

  // ── Derived: selected objects ─────────────────────────────────────────────
  const selectedDep = useMemo(
    () => dependencias.find((d) => d.id_dependencia === idDependencia) ?? null,
    [dependencias, idDependencia]
  );

  const selectedProd = useMemo(
    () => productos.find((p) => p.id_producto === idProducto) ?? null,
    [productos, idProducto]
  );

  // ── Load data on mount ────────────────────────────────────────────────────
  useEffect(() => {
    dependenciasService.getDependencias().then(setDependencias).catch(() => {
      toast.error("No se pudieron cargar las dependencias.");
    });
    productosService.getProductos(0, 1000).then(setProductos).catch(() => {
      toast.error("No se pudieron cargar los productos.");
    });
  }, []);

  // ── Preview URL (debounced by hook) ───────────────────────────────────────
  const previewUrl = useMemo(() => {
    if (!idDependencia || !idProducto || !fechaInicio || !fechaFin) return null;
    const params = new URLSearchParams({
      id_dependencia: idDependencia.toString(),
      id_producto: idProducto.toString(),
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
    });
    return `${BASE_URL}/reportes/movimientos-producto/preview?${params.toString()}`;
  }, [idDependencia, idProducto, fechaInicio, fechaFin]);

  // ── Live preview ──────────────────────────────────────────────────────────
  const {
    data: previewData,
    loading: previewLoading,
    error: previewError,
  } = useReportPreview<MovimientosProductoPreviewData>(previewUrl);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats: StatCard[] | undefined = useMemo(() => {
    if (!previewData) return undefined;
    const cards: StatCard[] = [
      { label: "Total registros", value: previewData.total_items, color: "gray" },
      {
        label: "Total entradas",
        value: previewData.total_entradas.toLocaleString(),
        color: "green",
      },
      {
        label: "Total salidas",
        value: previewData.total_salidas.toLocaleString(),
        color: "red",
      },
    ];
    if (previewData.producto) {
      cards.push({
        label: "Producto",
        value: previewData.producto.nombre,
        color: "amber",
      });
    }
    return cards;
  }, [previewData]);

  // ── Preview subtitle ──────────────────────────────────────────────────────
  const previewSubtitle =
    selectedDep && selectedProd
      ? `${selectedDep.nombre} · ${selectedProd.nombre}`
      : undefined;

  // ── Form validation ───────────────────────────────────────────────────────
  const isFormValid = Boolean(
    idDependencia && idProducto && fechaInicio && fechaFin
  );

  // ── Button label ──────────────────────────────────────────────────────────
  const buttonLabel = pdfLoading
    ? "Generando PDF..."
    : previewData && previewData.total_items > 0
    ? `Exportar ${previewData.total_items} registros como PDF`
    : "Exportar PDF";

  // ── PDF export ────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      toast.error("Complete todos los campos requeridos.");
      return;
    }
    setPdfLoading(true);
    try {
      const params = new URLSearchParams({
        id_dependencia: idDependencia!.toString(),
        id_producto: idProducto!.toString(),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        aprobado_por_nombre: aprobadoPorNombre,
        aprobado_por_cargo: aprobadoPorCargo,
        notas: notas,
      });

      const token = authHelpers.getToken() ?? "";
      const response = await fetch(
        `${BASE_URL}/reportes/movimientos-producto?${params.toString()}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `movimientos_producto_${idProducto}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(anchor);

      toast.success("Reporte generado exitosamente.");
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error al generar el reporte.");
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
          <Package className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            Movimientos por Producto
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Trazabilidad de un producto en un rango de fechas
          </p>
        </div>
      </div>

      {/* ── Split layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] items-start gap-6">
        {/* ── Form panel ── */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} noValidate>
            {/* Section: FILTROS */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Filtros
              </p>

              <div className="space-y-4">
                {/* Dependencia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dependencia <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={idDependencia ?? ""}
                    onChange={(e) => {
                      setIdDependencia(
                        e.target.value ? Number(e.target.value) : null
                      );
                      setIdProducto(null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                  >
                    <option value="">Seleccionar dependencia</option>
                    {dependencias.map((d) => (
                      <option
                        key={d.id_dependencia}
                        value={d.id_dependencia}
                      >
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Producto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Producto <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={idProducto ?? ""}
                    onChange={(e) =>
                      setIdProducto(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    disabled={!idDependencia}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {idDependencia
                        ? "Seleccionar producto"
                        : "Seleccione primero una dependencia"}
                    </option>
                    {productos.map((p) => (
                      <option key={p.id_producto} value={p.id_producto}>
                        {p.codigo
                          ? p.codigo
                          : `#${p.id_producto}`}{" "}
                        - {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fechas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rango de fechas <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="Desde"
                    />
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="Hasta"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 my-6" />

            {/* Section: FIRMAS */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Firmas
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aprobado por (nombre)
                  </label>
                  <input
                    type="text"
                    value={aprobadoPorNombre}
                    onChange={(e) => setAprobadoPorNombre(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cargo del aprobador
                  </label>
                  <input
                    type="text"
                    value={aprobadoPorCargo}
                    onChange={(e) => setAprobadoPorCargo(e.target.value)}
                    placeholder="Ej. Director General"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Section: NOTAS */}
            <div className="mb-6">
              <ReportNotes value={notas} onChange={setNotas} />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!isFormValid || pdfLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {pdfLoading ? (
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
              ) : (
                <Download className="w-4 h-4 flex-shrink-0" />
              )}
              {buttonLabel}
            </button>
          </form>
        </div>

        {/* ── Preview panel ── */}
        <ReportPreviewPanel<MovimientosProductoPreviewItem>
          title="Vista previa — Movimientos por Producto"
          subtitle={previewSubtitle}
          data={previewData?.items ?? null}
          loading={previewLoading}
          error={previewError}
          columns={COLUMNS}
          stats={stats}
          notes={notas}
          emptyMessage="No se encontraron movimientos para el producto en el rango de fechas seleccionado."
          exportFileName={`movimientos_prod_${idProducto ?? "prod"}_${fechaInicio}_${fechaFin}`}
        />
      </div>
    </div>
  );
};

export default ReporteMovimientosProducto;
