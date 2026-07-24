import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { authHelpers } from "../../lib/api";
import { BarChart3, Loader2, Eye, Printer } from "lucide-react";
import ReportNotes from "../../components/ui/ReportNotes";
import { Button } from "../../components/ui/Button";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "/api/v1";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PersonaSimple {
  id_persona: number;
  nombre: string;
  apellidos: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ReporteDesempeno: React.FC = () => {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [personas, setPersonas] = useState<PersonaSimple[]>([]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [idPersona, setIdPersona] = useState<number | null>(null);
  const [estado, setEstado] = useState<string>("");
  const [aprobadoPorNombre, setAprobadoPorNombre] = useState("");
  const [aprobadoPorCargo, setAprobadoPorCargo] = useState("");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    const token = authHelpers.getToken() ?? "";
    fetch(`${BASE_URL}/reportes/personas`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: PersonaSimple[]) => setPersonas(data))
      .catch(() => {
        console.warn("No se pudieron cargar las personas");
      });
  }, []);

  const canSubmit = Boolean(fechaInicio && fechaFin);

  const generatePdfBlob = async (): Promise<Blob | null> => {
    setPdfLoading(true);
    try {
      const params = new URLSearchParams({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        aprobado_por_nombre: aprobadoPorNombre,
        aprobado_por_cargo: aprobadoPorCargo,
        notas: notas,
      });
      if (idPersona) params.append("id_persona", idPersona.toString());
      if (estado) params.append("estado", estado);

      const token = authHelpers.getToken() ?? "";
      const response = await fetch(
        `${BASE_URL}/reportes/desempeno?${params.toString()}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

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
      toast.error("Seleccione un rango de fechas");
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
      toast.error("Seleccione un rango de fechas");
      return;
    }
    const blob = await generatePdfBlob();
    if (!blob) return;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `informe_desempeno_${fechaInicio}_${fechaFin}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success("Reporte generado exitosamente");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center shadow-sm">
          <BarChart3 className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 leading-tight">
            Informe de Desempeño
          </h1>
          <p className="text-sm text-gray-500">
            Rendimiento de creadores en proyectos por rango de fechas
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <form className="space-y-6">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Persona / Creador */}
                <div>
                  <label
                    htmlFor="persona"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Creador
                  </label>
                  <select
                    id="persona"
                    value={idPersona ?? ""}
                    onChange={(e) =>
                      setIdPersona(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
                  >
                    <option value="">Todos los creadores</option>
                    {personas.map((p) => (
                      <option key={p.id_persona} value={p.id_persona}>
                        {p.nombre} {p.apellidos}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Estado */}
                <div>
                  <label
                    htmlFor="estado"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Estado
                  </label>
                  <select
                    id="estado"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
                  >
                    <option value="">Todos</option>
                    <option value="terminado">Terminado</option>
                    <option value="en_proceso">En Proceso</option>
                  </select>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* ── NOTAS section ──────────────────────────────────────────── */}
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

export default ReporteDesempeno;
