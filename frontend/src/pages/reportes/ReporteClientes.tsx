import React, { useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import { authHelpers } from "../../lib/api";
import { useReportPreview } from "../../hooks/useReportPreview";
import ReportPreviewPanel from "../../components/ui/ReportPreviewPanel";
import type { Column, StatCard } from "../../components/ui/ReportPreviewPanel";
import { Users, Download, Loader2 } from "lucide-react";
import ReportNotes from "../../components/ui/ReportNotes";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClientePreviewItem {
  numero: number;
  nombre: string;
  reeup: string;
  nit: string;
  direccion: string;
}

interface ClientesPreviewData {
  items: ClientePreviewItem[];
  total_items: number;
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const COLUMNS: Column<ClientePreviewItem>[] = [
  {
    header: "No.",
    accessor: "numero",
    align: "right",
    className: "w-12",
  },
  {
    header: "NOMBRE",
    accessor: "nombre",
    className: "font-medium",
  },
  {
    header: "REEUP",
    accessor: "reeup",
    className: "font-mono text-xs",
  },
  {
    header: "NIT",
    accessor: "nit",
    className: "font-mono text-xs",
  },
  {
    header: "DIRECCIÓN",
    accessor: "direccion",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ReporteClientes: React.FC = () => {
  // ── State ─────────────────────────────────────────────────────────────────
  const [pdfLoading, setPdfLoading] = useState(false);
  const [aprobadoPorNombre, setAprobadoPorNombre] = useState("");
  const [aprobadoPorCargo, setAprobadoPorCargo] = useState("");
  const [notas, setNotas] = useState("");

  // ── Preview URL (no filters needed, always active) ────────────────────────
  const previewUrl = useMemo(() => {
    return `${BASE_URL}/reportes/clientes/preview`;
  }, []);

  // ── Live preview data ─────────────────────────────────────────────────────
  const {
    data: previewData,
    loading: previewLoading,
    error: previewError,
  } = useReportPreview<ClientesPreviewData>(previewUrl);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo<StatCard[] | undefined>(() => {
    if (!previewData) return undefined;
    return [
      { label: "Total clientes", value: previewData.total_items, color: "blue" },
    ];
  }, [previewData]);

  // ── PDF export ────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPdfLoading(true);
    try {
      const params = new URLSearchParams({
        aprobado_por_nombre: aprobadoPorNombre,
        aprobado_por_cargo: aprobadoPorCargo,
        notas: notas,
      });

      const token = authHelpers.getToken() ?? "";
      const response = await fetch(
        `${BASE_URL}/reportes/clientes?${params.toString()}`,
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
      a.download = "registro_clientes.pdf";
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
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
          <Users className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 leading-tight">
            Registro de Clientes
          </h1>
          <p className="text-sm text-gray-500">Listado completo de clientes registrados</p>
        </div>
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] items-start gap-6">
        {/* ── Left: form panel ──────────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* ── NOTAS section ──────────────────────────────────────────── */}
            <ReportNotes value={notas} onChange={setNotas} />

            {/* ── Submit button ─────────────────────────────────────────── */}
            <button
              type="submit"
              disabled={pdfLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {pdfLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="w-4 h-4" aria-hidden="true" />
              )}
              {buttonLabel}
            </button>
          </form>
        </div>

        {/* ── Right: live preview panel ──────────────────────────────────── */}
        <ReportPreviewPanel<ClientePreviewItem>
          title="Vista previa del reporte"
          data={previewData?.items ?? null}
          loading={previewLoading}
          error={previewError}
          columns={COLUMNS}
          stats={stats}
          notes={notas}
          emptyMessage="No hay clientes registrados"
          exportFileName="registro_clientes"
        />
      </div>
    </div>
  );
};

export default ReporteClientes;
