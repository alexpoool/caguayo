import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { dependenciasService } from "../../services/administracion";
import { Dependencia } from "../../types/dependencia";
import { authHelpers } from "../../lib/api";
import { useReportPreview } from "../../hooks/useReportPreview";
import ReportPreviewPanel from "../../components/ui/ReportPreviewPanel";
import type { Column, StatCard } from "../../components/ui/ReportPreviewPanel";
import { Boxes, Download, Building2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = "http://localhost:8000/api/v1";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExistenciasPreviewItem {
  codigo: string;
  descripcion: string;
  cantidad: number;
}

interface ExistenciasPreviewData {
  dependencia: { nombre: string; direccion: string };
  items: ExistenciasPreviewItem[];
  total_items: number;
  total_cantidad: number;
}

// ---------------------------------------------------------------------------
// Columns (defined outside the component to keep a stable reference)
// ---------------------------------------------------------------------------

const COLUMNS: Column<ExistenciasPreviewItem>[] = [
  {
    header: "Código",
    accessor: "codigo",
    className: "font-mono text-xs",
  },
  {
    header: "Descripción",
    accessor: "descripcion",
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

const ReporteExistencias: React.FC = () => {
  // ── State ─────────────────────────────────────────────────────────────────
  const [pdfLoading, setPdfLoading] = useState(false);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [idDependencia, setIdDependencia] = useState<number | null>(null);
  const [aprobadoPorNombre, setAprobadoPorNombre] = useState("");
  const [aprobadoPorCargo, setAprobadoPorCargo] = useState("");

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedDep = useMemo(
    () => dependencias.find((d) => d.id_dependencia === idDependencia) ?? null,
    [dependencias, idDependencia]
  );

  // ── Load dependencias on mount ────────────────────────────────────────────
  useEffect(() => {
    dependenciasService.getDependencias().then(setDependencias);
  }, []);

  // ── Preview URL (only when a dependencia is selected) ─────────────────────
  const previewUrl = useMemo(() => {
    if (!idDependencia) return null;
    return `${BASE_URL}/reportes/existencias/preview?id_dependencia=${idDependencia}`;
  }, [idDependencia]);

  // ── Live preview data ─────────────────────────────────────────────────────
  const {
    data: previewData,
    loading: previewLoading,
    error: previewError,
  } = useReportPreview<ExistenciasPreviewData>(previewUrl);

  // ── Stats (only when preview data is available) ───────────────────────────
  const stats = useMemo<StatCard[] | undefined>(() => {
    if (!previewData) return undefined;
    return [
      { label: "Total productos", value: previewData.total_items, color: "blue" },
      {
        label: "Total unidades",
        value: previewData.total_cantidad.toLocaleString(),
        color: "green",
      },
    ];
  }, [previewData]);

  // ── PDF export ────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idDependencia) {
      toast.error("Seleccione una dependencia");
      return;
    }

    setPdfLoading(true);
    try {
      const params = new URLSearchParams({
        id_dependencia: idDependencia.toString(),
        aprobado_por_nombre: aprobadoPorNombre,
        aprobado_por_cargo: aprobadoPorCargo,
      });

      const token = authHelpers.getToken() ?? "";
      const response = await fetch(
        `${BASE_URL}/reportes/existencias?${params.toString()}`,
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
      const a = document.createElement("a");
      a.href = url;
      a.download = `existencias_dependencia_${idDependencia}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Reporte generado exitosamente");
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error al generar el reporte.");
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Button label ──────────────────────────────────────────────────────────
  const buttonLabel = pdfLoading
    ? "Generando PDF..."
    : previewData
    ? `Exportar ${previewData.total_items} registros como PDF`
    : "Exportar PDF";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
          <Boxes className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 leading-tight">
            Reporte de Existencias
          </h1>
          <p className="text-sm text-gray-500">Inventario actual por dependencia</p>
        </div>
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] items-start gap-6">
        {/* ── Left: form panel ──────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ── FILTROS section ───────────────────────────────────────── */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Filtros
              </p>

              <div>
                <label
                  htmlFor="dependencia"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Dependencia <span className="text-red-500">*</span>
                </label>
                <select
                  id="dependencia"
                  value={idDependencia ?? ""}
                  onChange={(e) =>
                    setIdDependencia(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  required
                >
                  <option value="">Seleccionar dependencia</option>
                  {dependencias.map((d) => (
                    <option key={d.id_dependencia} value={d.id_dependencia}>
                      {d.nombre}
                    </option>
                  ))}
                </select>

                {/* Direccion hint */}
                {selectedDep?.direccion && (
                  <div className="flex items-start gap-1.5 mt-1.5">
                    <Building2 className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-500 leading-snug">
                      {selectedDep.direccion}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── FIRMAS section ────────────────────────────────────────── */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Firmas e Información Adicional
              </p>

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="aprobado-nombre"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Aprobado por (Nombre)
                  </label>
                  <input
                    id="aprobado-nombre"
                    type="text"
                    value={aprobadoPorNombre}
                    onChange={(e) => setAprobadoPorNombre(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="aprobado-cargo"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Cargo del Aprobador
                  </label>
                  <input
                    id="aprobado-cargo"
                    type="text"
                    value={aprobadoPorCargo}
                    onChange={(e) => setAprobadoPorCargo(e.target.value)}
                    placeholder="Ej. Director General"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* ── Submit button ─────────────────────────────────────────── */}
            <button
              type="submit"
              disabled={!idDependencia || pdfLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              {buttonLabel}
            </button>
          </form>
        </div>

        {/* ── Right: live preview panel ──────────────────────────────────── */}
        <ReportPreviewPanel<ExistenciasPreviewItem>
          title="Vista previa del reporte"
          subtitle={
            selectedDep ? `Dependencia: ${selectedDep.nombre}` : undefined
          }
          data={previewData?.items ?? null}
          loading={previewLoading}
          error={previewError}
          columns={COLUMNS}
          stats={stats}
          emptyMessage="Esta dependencia no tiene productos registrados"
          exportFileName={`existencias_${idDependencia ?? "dependencia"}`}
        />
      </div>
    </div>
  );
};

export default ReporteExistencias;
