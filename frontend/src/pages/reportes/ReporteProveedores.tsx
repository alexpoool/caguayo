import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { dependenciasService } from "../../services/administracion";
import { Dependencia } from "../../types/dependencia";
import { authHelpers } from "../../lib/api";
import { UserCircle, Loader2, Eye, Printer } from "lucide-react";
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

const ReporteProveedores: React.FC = () => {
  // ── Form state ─────────────────────────────────────────────────────────────
  const [pdfLoading, setPdfLoading] = useState(false);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [provincias, setProvincias] = useState<
    { id_provincia: number; nombre: string }[]
  >([]);

  const [idDependencia, setIdDependencia] = useState<number | null>(null);
  const [tipoEntidad, setTipoEntidad] = useState<string>("");
  const [idProvincia, setIdProvincia] = useState<number | null>(null);
  const [aprobadoPorNombre, setAprobadoPorNombre] = useState("");
  const [aprobadoPorCargo, setAprobadoPorCargo] = useState("");
  const [notas, setNotas] = useState("");

  const canSubmit = Boolean(idDependencia && tipoEntidad);

  // ── Seed selects on mount ──────────────────────────────────────────────────
  useEffect(() => {
    dependenciasService.getDependencias().then(setDependencias).catch(() => {
      toast.error("No se pudieron cargar las dependencias");
    });
    dependenciasService.getProvincias().then(setProvincias).catch(() => {
      toast.error("No se pudieron cargar las provincias");
    });
  }, []);

  // ── PDF generation ─────────────────────────────────────────────────────────
  const generatePdfBlob = async (): Promise<Blob | null> => {
    if (!canSubmit) {
      toast.error("Seleccione una dependencia y un tipo de proveedor");
      return null;
    }
    setPdfLoading(true);
    try {
      const params = new URLSearchParams({
        id_dependencia: idDependencia!.toString(),
        tipo_entidad: tipoEntidad,
        aprobado_por_nombre: aprobadoPorNombre,
        aprobado_por_cargo: aprobadoPorCargo,
        notas: notas,
      });

      if (idProvincia) {
        params.append("id_provincia", idProvincia.toString());
      }

      const token = authHelpers.getToken() || "";
      const response = await fetch(
        `${BASE_URL}/reportes/proveedores-dependencia?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
    a.download = `proveedores_dependencia_${idDependencia}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success("Reporte generado exitosamente");
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center">
          <UserCircle className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 leading-tight">
            Proveedores por Dependencia
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Listado de proveedores filtrado por tipo y provincia
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
          <form className="space-y-6">
            {/* FILTROS */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
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
                    onChange={(e) =>
                      setIdDependencia(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                    required
                  >
                    <option value="">Seleccionar dependencia</option>
                    {dependencias.map((d) => (
                      <option key={d.id_dependencia} value={d.id_dependencia}>
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo de Proveedor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Proveedor <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={tipoEntidad}
                    onChange={(e) => setTipoEntidad(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                    required
                  >
                    <option value="">Seleccionar tipo</option>
                    <option value="NATURAL">Persona Natural (Creador)</option>
                    <option value="TCP">
                      Trabajador por Cuenta Propia (TCP)
                    </option>
                    <option value="JURIDICA">
                      Institución / Empresa (Jurídica)
                    </option>
                  </select>
                </div>

                {/* Provincia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provincia{" "}
                    <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <select
                    value={idProvincia ?? ""}
                    onChange={(e) =>
                      setIdProvincia(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                  >
                    <option value="">Todas las provincias</option>
                    {provincias.map((p) => (
                      <option key={p.id_provincia} value={p.id_provincia}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* FIRMAS */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Firmas
              </p>

              <div className="space-y-4">
                {/* Aprobado por nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aprobado por (nombre)
                  </label>
                  <input
                    type="text"
                    value={aprobadoPorNombre}
                    onChange={(e) => setAprobadoPorNombre(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* Aprobado por cargo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cargo del aprobador
                  </label>
                  <input
                    type="text"
                    value={aprobadoPorCargo}
                    onChange={(e) => setAprobadoPorCargo(e.target.value)}
                    placeholder="Ej. Director General"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
            </div>

            {/* NOTAS */}
            <div>
              <ReportNotes value={notas} onChange={setNotas} />
            </div>

            {/* Action buttons */}
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

export default ReporteProveedores;
