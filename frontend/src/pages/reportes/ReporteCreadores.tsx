import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { dependenciasService } from "../../services/administracion";
import { authHelpers } from "../../lib/api";
import { UserCircle, Loader2, Eye, Printer } from "lucide-react";
import ReportNotes from "../../components/ui/ReportNotes";
import { Button } from "../../components/ui/Button";
import type { Provincia, Municipio } from "../../types/ubicacion";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "/api/v1";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ReporteCreadores: React.FC = () => {
  // ── State ─────────────────────────────────────────────────────────────────
  const [pdfLoading, setPdfLoading] = useState(false);
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [idProvincia, setIdProvincia] = useState<number | null>(null);
  const [idMunicipio, setIdMunicipio] = useState<number | null>(null);
  const [vigencia, setVigencia] = useState<string>("");
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [aprobadoPorNombre, setAprobadoPorNombre] = useState("");
  const [aprobadoPorCargo, setAprobadoPorCargo] = useState("");
  const [notas, setNotas] = useState("");

  const canSubmit = true;

  // ── Load provincias on mount ──────────────────────────────────────────────
  useEffect(() => {
    dependenciasService.getProvincias().then(setProvincias).catch(() => {
      toast.error("No se pudieron cargar las provincias");
    });
  }, []);

  // ── Load municipios when provincia changes ────────────────────────────────
  useEffect(() => {
    if (!idProvincia) {
      setMunicipios([]);
      setIdMunicipio(null);
      return;
    }
    dependenciasService.getMunicipios(idProvincia).then(setMunicipios).catch(() => {
      toast.error("No se pudieron cargar los municipios");
    });
  }, [idProvincia]);

  // ── PDF generation ────────────────────────────────────────────────────────
  const generatePdfBlob = async (): Promise<Blob | null> => {
    setPdfLoading(true);
    try {
      const params = new URLSearchParams({
        aprobado_por_nombre: aprobadoPorNombre,
        aprobado_por_cargo: aprobadoPorCargo,
        notas: notas,
      });
      if (idProvincia) params.append("id_provincia", idProvincia.toString());
      if (idMunicipio) params.append("id_municipio", idMunicipio.toString());
      if (vigencia) params.append("vigencia", vigencia);
      if (textoBusqueda.trim()) params.append("texto_busqueda", textoBusqueda.trim());

      const token = authHelpers.getToken() ?? "";
      const response = await fetch(
        `${BASE_URL}/reportes/creadores?${params.toString()}`,
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
    a.download = "registro_creadores.pdf";
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
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center shadow-sm">
          <UserCircle className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 leading-tight">
            Registro de Creadores
          </h1>
          <p className="text-sm text-gray-500">
            Listado de creadores filtrado por ubicación y vigencia
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
                {/* Búsqueda por texto */}
                <div>
                  <label
                    htmlFor="texto-busqueda"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Búsqueda
                  </label>
                  <input
                    id="texto-busqueda"
                    type="text"
                    value={textoBusqueda}
                    onChange={(e) => setTextoBusqueda(e.target.value)}
                    placeholder="Nombre, CI, código..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                {/* Provincia */}
                <div>
                  <label
                    htmlFor="provincia"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Provincia
                  </label>
                  <select
                    id="provincia"
                    value={idProvincia ?? ""}
                    onChange={(e) => {
                      setIdProvincia(
                        e.target.value ? Number(e.target.value) : null
                      );
                      setIdMunicipio(null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                  >
                    <option value="">Todas las provincias</option>
                    {provincias.map((p) => (
                      <option key={p.id_provincia} value={p.id_provincia}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Municipio */}
                <div>
                  <label
                    htmlFor="municipio"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Municipio
                  </label>
                  <select
                    id="municipio"
                    value={idMunicipio ?? ""}
                    onChange={(e) =>
                      setIdMunicipio(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    disabled={!idProvincia}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {idProvincia
                        ? "Todos los municipios"
                        : "Seleccione una provincia primero"}
                    </option>
                    {municipios.map((m) => (
                      <option key={m.id_municipio} value={m.id_municipio}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vigencia */}
                <div>
                  <label
                    htmlFor="vigencia"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Vigencia
                  </label>
                  <select
                    id="vigencia"
                    value={vigencia}
                    onChange={(e) => setVigencia(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                  >
                    <option value="">Todos</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* ── NOTAS section ──────────────────────────────────────────── */}
            <ReportNotes value={notas} onChange={setNotas} />

            {/* ── Action buttons ────────────────────────────────────────── */}
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

export default ReporteCreadores;
