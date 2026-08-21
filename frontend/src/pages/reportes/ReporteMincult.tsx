import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { monedaService } from "../../services/api";
import { authHelpers } from "../../lib/api";
import { ClipboardList, Download, Eye, Loader2 } from "lucide-react";
import ReportNotes from "../../components/ui/ReportNotes";
import type { Moneda } from "../../types/moneda";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

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

const ReporteMincult: React.FC = () => {
  // ── State ─────────────────────────────────────────────────────────────────
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
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

  // ── Form validation ───────────────────────────────────────────────────────
  const isFormValid = Boolean(fechaInicio && fechaFin);

  // ── Build params ──────────────────────────────────────────────────────────
  const buildParams = () => {
    const params = new URLSearchParams({
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      aprobado_por_nombre: aprobadoPorNombre,
      aprobado_por_cargo: aprobadoPorCargo,
      notas: notas,
    });
    if (idMoneda) params.append("id_moneda", idMoneda.toString());
    if (idPersona.trim()) params.append("id_persona", idPersona.trim());
    return params;
  };

  // ── Preview document in new window ────────────────────────────────────────
  const handlePreview = async () => {
    if (!isFormValid) {
      toast.error("Seleccione un rango de fechas");
      return;
    }
    setPreviewLoading(true);
    try {
      const params = buildParams();
      const token = authHelpers.getToken() ?? "";
      const response = await fetch(
        `${BASE_URL}/reportes/mincult?${params.toString()}`,
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
      window.open(url, "_blank");
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error al generar la vista previa.");
    } finally {
      setPreviewLoading(false);
    }
  };

  // ── PDF export ────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      toast.error("Seleccione un rango de fechas");
      return;
    }
    setPdfLoading(true);
    try {
      const params = buildParams();

      const token = authHelpers.getToken() ?? "";
      const response = await fetch(
        `${BASE_URL}/reportes/mincult?${params.toString()}`,
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
      a.download = `reporte_mincult_${fechaInicio}_${fechaFin}.pdf`;
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

  // ── Button label ─────────────────────────────────────────────────────────
  const buttonLabel = pdfLoading ? "Generando PDF..." : "Exportar PDF";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-pink-600 flex items-center justify-center shadow-sm">
          <ClipboardList className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 leading-tight">
            MINCULT — Escala de Ingresos
          </h1>
          <p className="text-sm text-gray-500">
            Escala de ingresos para el Ministerio de Cultura
          </p>
        </div>
      </div>

      {/* ── Form panel (centered) ───────────────────────────────────────── */}
      <div className="max-w-xl mx-auto">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white"
                  >
                    <option value="">Todas las monedas</option>
                    {monedas.map((m) => (
                      <option key={m.id_moneda} value={m.id_moneda}>
                        {m.nombre} ({m.simbolo})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Persona */}
                <div>
                  <label
                    htmlFor="persona"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Persona / Creador
                  </label>
                  <input
                    id="persona"
                    type="text"
                    value={idPersona}
                    onChange={(e) => setIdPersona(e.target.value)}
                    placeholder="Nombre o código"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>
              </div>
            </div>

            {/* ── NOTAS section ──────────────────────────────────────────── */}
            <ReportNotes value={notas} onChange={setNotas} />

            {/* ── Action buttons ─────────────────────────────────────────── */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handlePreview}
                disabled={!isFormValid || previewLoading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-pink-700 bg-pink-50 border border-pink-200 hover:bg-pink-100 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Vista previa del documento"
              >
                {previewLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
                Vista previa
              </button>
              <button
                type="submit"
                disabled={!isFormValid || pdfLoading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {pdfLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="w-4 h-4" aria-hidden="true" />
                )}
                {buttonLabel}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReporteMincult;
