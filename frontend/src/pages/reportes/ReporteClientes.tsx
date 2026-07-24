import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { authHelpers } from "../../lib/api";
import { Users, Loader2, Eye, Printer } from "lucide-react";
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

const ReporteClientes: React.FC = () => {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [aprobadoPorNombre, setAprobadoPorNombre] = useState("");
  const [aprobadoPorCargo, setAprobadoPorCargo] = useState("");
  const [notas, setNotas] = useState("");

  const canSubmit = true;

  const generatePdfBlob = async (): Promise<Blob | null> => {
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
    const blob = await generatePdfBlob();
    if (!blob) return;
    const url = window.URL.createObjectURL(blob);
    const newWindow = window.open(url, "_blank");
    if (newWindow) newWindow.focus();
    setTimeout(() => window.URL.revokeObjectURL(url), 60000);
  };

  const handleDownload = async () => {
    const blob = await generatePdfBlob();
    if (!blob) return;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "registro_clientes.pdf";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success("Reporte generado exitosamente");
  };

  return (
    <div className="space-y-6">
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

      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <form className="space-y-6">
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

            <ReportNotes value={notas} onChange={setNotas} />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              {pdfLoading && (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePreview}
                className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 h-8 w-8"
                title="Visualizar documento"
                disabled={!canSubmit || pdfLoading}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 h-8 w-8"
                title="Imprimir documento"
                disabled={!canSubmit || pdfLoading}
              >
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReporteClientes;
