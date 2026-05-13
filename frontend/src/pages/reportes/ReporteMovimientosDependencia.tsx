import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { dependenciasService } from "../../services/administracion";
import { Dependencia } from "../../types/dependencia";
import { authHelpers } from "../../lib/api";
import { useReportPreview } from "../../hooks/useReportPreview";
import ReportPreviewPanel from "../../components/ui/ReportPreviewPanel";
import type { Column, StatCard } from "../../components/ui/ReportPreviewPanel";
import { ArrowLeftRight, Download, Building2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = "http://localhost:8000/api/v1";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MovimientosDependenciaPreviewItem {
  fecha: string;
  operacion: string;
  producto: string;
  tipo: "Entrada" | "Salida" | "Neutro";
  cantidad: number;
}

interface MovimientosDependenciaPreviewData {
  dependencia: { nombre: string; direccion: string };
  items: MovimientosDependenciaPreviewItem[];
  total_items: number;
  total_entradas: number;
  total_salidas: number;
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const COLUMNS: Column<MovimientosDependenciaPreviewItem>[] = [
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
    header: "Producto",
    accessor: "producto",
  },
  {
    header: "Tipo",
    accessor: (row) => {
      const styles: Record<
        MovimientosDependenciaPreviewItem["tipo"],
        string
      > = {
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
// Helpers
// ---------------------------------------------------------------------------

function formatDateEs(isoDate: string): string {
  return new Date(isoDate + "T00:00:00").toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ReporteMovimientosDependencia: React.FC = () => {
  // ── State ─────────────────────────────────────────────────────────────────
  const [pdfLoading, setPdfLoading] = useState(false);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [idDependencia, setIdDependencia] = useState<number | null>(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [aprobadoPorNombre, setAprobadoPorNombre] = useState("");
  const [aprobadoPorCargo, setAprobadoPorCargo] = useState("");

  // ── Derived: selected dependencia object ──────────────────────────────────
  const selectedDependencia = useMemo(
    () => dependencias.find((d) => d.id_dependencia === idDependencia) ?? null,
    [dependencias, idDependencia]
  );

  // ── Load dependencias on mount ────────────────────────────────────────────
  useEffect(() => {
    dependenciasService.getDependencias().then(setDependencias).catch(() => {
      toast.error("No se pudieron cargar las dependencias.");
    });
  }, []);

  // ── Preview URL (debounced by hook) ───────────────────────────────────────
  const previewUrl = useMemo(() => {
    if (!idDependencia || !fechaInicio || !fechaFin) return null;
    const params = new URLSearchParams({
      id_dependencia: idDependencia.toString(),
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
    });
    return `${BASE_URL}/reportes/movimientos-dependencia/preview?${params.toString()}`;
  }, [idDependencia, fechaInicio, fechaFin]);

  // ── Live preview ──────────────────────────────────────────────────────────
  const {
    data: previewData,
    loading: previewLoading,
    error: previewError,
  } = useReportPreview<MovimientosDependenciaPreviewData>(previewUrl);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats: StatCard[] | undefined = previewData
    ? [
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
      ]
    : undefined;

  // ── Preview subtitle ──────────────────────────────────────────────────────
  const previewSubtitle =
    selectedDependencia && fechaInicio && fechaFin
      ? `${selectedDependencia.nombre} · ${formatDateEs(fechaInicio)} – ${formatDateEs(fechaFin)}`
      : undefined;

  // ── Form validation ───────────────────────────────────────────────────────
  const isFormValid = Boolean(idDependencia && fechaInicio && fechaFin);

  // ── Button label ─────────────────────────────────────────────────────────
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
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        aprobado_por_nombre: aprobadoPorNombre,
        aprobado_por_cargo: aprobadoPorCargo,
      });

      const token = authHelpers.getToken() || "";
      const response = await fetch(
        `${BASE_URL}/reportes/movimientos-dependencia?${params.toString()}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to generate report");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `movimientos_dependencia_${idDependencia}.pdf`;
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
        <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
          <ArrowLeftRight className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 leading-tight">
            Movimientos por Dependencia
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Historial de movimientos en un rango de fechas
          </p>
        </div>
      </div>

      {/* ── Split layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] items-start gap-6">
        {/* ── Form panel ── */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {/* Section: Filtros */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Filtros
              </p>

              {/* Dependencia */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dependencia <span className="text-red-500">*</span>
                </label>
                <select
                  value={idDependencia ?? ""}
                  onChange={(e) =>
                    setIdDependencia(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                >
                  <option value="">Seleccionar dependencia…</option>
                  {dependencias.map((d) => (
                    <option key={d.id_dependencia} value={d.id_dependencia}>
                      {d.nombre}
                    </option>
                  ))}
                </select>

                {/* Direccion hint */}
                {selectedDependencia?.direccion && (
                  <p className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-400">
                    <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{selectedDependencia.direccion}</span>
                  </p>
                )}
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Desde <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hasta <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Section: Firmas */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Firmas e Información Adicional
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aprobado por (nombre)
                </label>
                <input
                  type="text"
                  value={aprobadoPorNombre}
                  onChange={(e) => setAprobadoPorNombre(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!isFormValid || pdfLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" />
              {buttonLabel}
            </button>
          </form>
        </div>

        {/* ── Preview panel ── */}
        <ReportPreviewPanel<MovimientosDependenciaPreviewItem>
          title="Vista Previa"
          subtitle={previewSubtitle}
          data={previewData?.items ?? null}
          loading={previewLoading}
          error={previewError}
          columns={COLUMNS}
          stats={stats}
          emptyMessage="No se encontraron movimientos para el período seleccionado"
          exportFileName={`movimientos_dep_${idDependencia ?? "dep"}_${fechaInicio}_${fechaFin}`}
        />
      </div>
    </div>
  );
};

export default ReporteMovimientosDependencia;
