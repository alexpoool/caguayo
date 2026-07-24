import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { dependenciasService } from "../../services/administracion";
import { Dependencia } from "../../types/dependencia";
import { authHelpers } from "../../lib/api";
import { ArrowLeftRight, Building2, Loader2, Eye, Printer } from "lucide-react";
import ReportNotes from "../../components/ui/ReportNotes";
import { Button } from "../../components/ui/Button";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "/api/v1";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ReporteMovimientosDependencia: React.FC = () => {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [idDependencia, setIdDependencia] = useState<number | null>(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [aprobadoPorNombre, setAprobadoPorNombre] = useState("");
  const [aprobadoPorCargo, setAprobadoPorCargo] = useState("");
  const [notas, setNotas] = useState("");

  const selectedDependencia = useMemo(
    () => dependencias.find((d) => d.id_dependencia === idDependencia) ?? null,
    [dependencias, idDependencia]
  );

  useEffect(() => {
    dependenciasService.getDependencias().then(setDependencias).catch(() => {
      toast.error("No se pudieron cargar las dependencias.");
    });
  }, []);

  const canSubmit = Boolean(idDependencia && fechaInicio && fechaFin);

  const generatePdfBlob = async (): Promise<Blob | null> => {
    setPdfLoading(true);
    try {
      const params = new URLSearchParams({
        id_dependencia: idDependencia!.toString(),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        aprobado_por_nombre: aprobadoPorNombre,
        aprobado_por_cargo: aprobadoPorCargo,
        notas: notas,
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

      return await response.blob();
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error al generar el reporte.");
      return null;
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!canSubmit) {
      toast.error("Complete todos los campos requeridos.");
      return;
    }
    const blob = await generatePdfBlob();
    if (!blob) return;
    const url = window.URL.createObjectURL(blob);
    const newWindow = window.open(url, "_blank");
    if (newWindow) newWindow.focus();
    setTimeout(() => window.URL.revokeObjectURL(url), 60000);
  };

  const handleDownload = async () => {
    if (!canSubmit) {
      toast.error("Complete todos los campos requeridos.");
      return;
    }
    const blob = await generatePdfBlob();
    if (!blob) return;
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `movimientos_dependencia_${idDependencia}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
    toast.success("Reporte generado exitosamente.");
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

      {/* ── Form layout ── */}
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <form noValidate className="space-y-6">
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

            {/* Section: Notas */}
            <ReportNotes value={notas} onChange={setNotas} />

            <div className="flex items-center gap-2">
              {pdfLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <>
                  <Button variant="ghost" size="icon" onClick={handlePreview} className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 h-8 w-8" title="Visualizar documento" disabled={!canSubmit}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleDownload} className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 h-8 w-8" title="Imprimir documento" disabled={!canSubmit}>
                    <Printer className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReporteMovimientosDependencia;
