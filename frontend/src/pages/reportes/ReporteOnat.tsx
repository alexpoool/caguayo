import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { monedaService } from "../../services/api";
import { authHelpers } from "../../lib/api";
import { useReportPreview } from "../../hooks/useReportPreview";
import ReportPreviewPanel from "../../components/ui/ReportPreviewPanel";
import type { Column, StatCard } from "../../components/ui/ReportPreviewPanel";
import { Receipt, Download, Loader2 } from "lucide-react";
import ReportNotes from "../../components/ui/ReportNotes";
import type { Moneda } from "../../types/moneda";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OnatPreviewItem {
  creador: string;
  ci: string;
  importe: number;
  caguayo: number;
  ingreso_bruto: number;
  retencion: number;
  empresa: number;
  ingreso_neto: number;
}

interface OnatPreviewData {
  items: OnatPreviewItem[];
  total_items: number;
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const COLUMNS: Column<OnatPreviewItem>[] = [
  {
    header: "CREADOR",
    accessor: "creador",
    className: "font-medium",
  },
  {
    header: "CI",
    accessor: "ci",
    className: "font-mono text-xs",
  },
  {
    header: "IMPORTE",
    accessor: "importe",
    align: "right",
  },
  {
    header: "CAGUAYO",
    accessor: "caguayo",
    align: "right",
  },
  {
    header: "INGRESO BRUTO",
    accessor: "ingreso_bruto",
    align: "right",
  },
  {
    header: "RETENCIÓN",
    accessor: "retencion",
    align: "right",
  },
  {
    header: "EMPRESA",
    accessor: "empresa",
    align: "right",
  },
  {
    header: "INGRESO NETO",
    accessor: "ingreso_neto",
    align: "right",
    className: "font-semibold",
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

const ReporteOnat: React.FC = () => {
  // ── State ─────────────────────────────────────────────────────────────────
  const [pdfLoading, setPdfLoading] = useState(false);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [idMoneda, setIdMoneda] = useState<number | null>(null);
  const [idPersona, setIdPersona] = useState("");
  const [aprobadoPorNombre, setAprobadoPorNombre] = useState("");
  const [aprobadoPorCargo, setAprobadoPorCargo] = useState("");
  const [notas, setNotas] = useState("");

  // ── Load monedas on mount ─────────────────────────────────────────────────
  useEffect(() => {
    monedaService.getMonedas().then(setMonedas).catch(() => {
      toast.error("No se pudieron cargar las monedas");
    });
  }, []);

  // ── Preview URL ───────────────────────────────────────────────────────────
  const previewUrl = useMemo<string | null>(() => {
    if (!fechaInicio || !fechaFin) return null;
    const params = new URLSearchParams({
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
    });
    if (idMoneda) params.append("id_moneda", idMoneda.toString());
    if (idPersona.trim()) params.append("id_persona", idPersona.trim());
    return `${BASE_URL}/reportes/onat/preview?${params.toString()}`;
  }, [fechaInicio, fechaFin, idMoneda, idPersona]);

  // ── Live preview data ─────────────────────────────────────────────────────
  const {
    data: previewData,
    loading: previewLoading,
    error: previewError,
  } = useReportPreview<OnatPreviewData>(previewUrl);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo<StatCard[] | undefined>(() => {
    if (!previewData) return undefined;
    return [
      { label: "Total registros", value: previewData.total_items, color: "red" },
    ];
  }, [previewData]);

  // ── Preview subtitle ──────────────────────────────────────────────────────
  const previewSubtitle =
    fechaInicio && fechaFin
      ? `${formatDateEs(fechaInicio)} – ${formatDateEs(fechaFin)}`
      : undefined;

  // ── Form validation ───────────────────────────────────────────────────────
  const isFormValid = Boolean(fechaInicio && fechaFin);

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
      toast.error("Seleccione un rango de fechas");
      return;
    }
    setPdfLoading(true);
    try {
      const params = new URLSearchParams({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        aprobado_por_nombre: aprobadoPorNombre,
        aprobado_por_cargo: aprobadoPorCargo,
        notas: notas,
      });
      if (idMoneda) params.append("id_moneda", idMoneda.toString());
      if (idPersona.trim()) params.append("id_persona", idPersona.trim());

      const token = authHelpers.getToken() ?? "";
      const response = await fetch(
        `${BASE_URL}/reportes/onat?${params.toString()}`,
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
      a.download = `reporte_onat_${fechaInicio}_${fechaFin}.pdf`;
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-rose-600 flex items-center justify-center shadow-sm">
          <Receipt className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 leading-tight">
            ONAT — Ingresos y Retenciones
          </h1>
          <p className="text-sm text-gray-500">
            Reporte de ingresos, retenciones e importe neto por creador
          </p>
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

              <div className="space-y-4">
                {/* Date range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="fecha-inicio"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Desde <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="fecha-inicio"
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="fecha-fin"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Hasta <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="fecha-fin"
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Moneda */}
                <div>
                  <label
                    htmlFor="moneda"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Moneda
                  </label>
                  <select
                    id="moneda"
                    value={idMoneda ?? ""}
                    onChange={(e) =>
                      setIdMoneda(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white"
                  >
                    <option value="">Todas las monedas</option>
                    {monedas.map((m) => (
                      <option key={m.id_moneda} value={m.id_moneda}>
                        {m.nombre} ({m.simbolo})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Persona (text input) */}
                <div>
                  <label
                    htmlFor="persona"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Nombre del Artista / Creador
                  </label>
                  <input
                    id="persona"
                    type="text"
                    value={idPersona}
                    onChange={(e) => setIdPersona(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  />
                </div>
              </div>
            </div>

            {/* ── NOTAS section ──────────────────────────────────────────── */}
            <ReportNotes value={notas} onChange={setNotas} />

            {/* ── Submit button ─────────────────────────────────────────── */}
            <button
              type="submit"
              disabled={!isFormValid || pdfLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        <ReportPreviewPanel<OnatPreviewItem>
          title="Vista previa del reporte"
          subtitle={previewSubtitle}
          data={previewData?.items ?? null}
          loading={previewLoading}
          error={previewError}
          columns={COLUMNS}
          stats={stats}
          notes={notas}
          emptyMessage="No se encontraron registros con los filtros seleccionados"
          exportFileName={`reporte_onat_${fechaInicio}_${fechaFin}`}
        />
      </div>
    </div>
  );
};

export default ReporteOnat;
