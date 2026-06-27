import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { dependenciasService } from "../../services/administracion";
import { authHelpers } from "../../lib/api";
import { useReportPreview } from "../../hooks/useReportPreview";
import ReportPreviewPanel from "../../components/ui/ReportPreviewPanel";
import type { Column, StatCard } from "../../components/ui/ReportPreviewPanel";
import { UserCircle, Download, Loader2 } from "lucide-react";
import ReportNotes from "../../components/ui/ReportNotes";
import type { Provincia, Municipio } from "../../types/ubicacion";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreadorPreviewItem {
  ci: string;
  nombre_apellidos: string;
  direccion: string;
  registro: string;
  codigo: string;
  vigencia: string;
}

interface CreadoresPreviewData {
  items: CreadorPreviewItem[];
  total_items: number;
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const COLUMNS: Column<CreadorPreviewItem>[] = [
  {
    header: "CI",
    accessor: "ci",
    className: "font-mono text-xs",
  },
  {
    header: "NOMBRE Y APELLIDOS",
    accessor: "nombre_apellidos",
    className: "font-medium",
  },
  {
    header: "DIRECCIÓN",
    accessor: "direccion",
  },
  {
    header: "REGISTRO",
    accessor: "registro",
  },
  {
    header: "CÓDIGO",
    accessor: "codigo",
    className: "font-mono text-xs",
  },
  {
    header: "VIGENCIA",
    accessor: "vigencia",
  },
];

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

  // ── Preview URL ───────────────────────────────────────────────────────────
  const previewUrl = useMemo<string | null>(() => {
    const params = new URLSearchParams();
    if (idProvincia) params.append("id_provincia", idProvincia.toString());
    if (idMunicipio) params.append("id_municipio", idMunicipio.toString());
    if (vigencia) params.append("vigencia", vigencia);
    if (textoBusqueda.trim()) params.append("texto_busqueda", textoBusqueda.trim());

    const qs = params.toString();
    return `${BASE_URL}/reportes/creadores/preview${qs ? `?${qs}` : ""}`;
  }, [idProvincia, idMunicipio, vigencia, textoBusqueda]);

  // ── Live preview data ─────────────────────────────────────────────────────
  const {
    data: previewData,
    loading: previewLoading,
    error: previewError,
  } = useReportPreview<CreadoresPreviewData>(previewUrl);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo<StatCard[] | undefined>(() => {
    if (!previewData) return undefined;
    return [
      { label: "Total creadores", value: previewData.total_items, color: "green" },
    ];
  }, [previewData]);

  // ── Button label ─────────────────────────────────────────────────────────
  const buttonLabel = pdfLoading
    ? "Generando PDF..."
    : previewData && previewData.total_items > 0
    ? `Exportar ${previewData.total_items} registros como PDF`
    : "Exportar PDF";

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

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "registro_creadores.pdf";
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

            {/* ── Submit button ─────────────────────────────────────────── */}
            <button
              type="submit"
              disabled={pdfLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        <ReportPreviewPanel<CreadorPreviewItem>
          title="Vista previa del reporte"
          data={previewData?.items ?? null}
          loading={previewLoading}
          error={previewError}
          columns={COLUMNS}
          stats={stats}
          notes={notas}
          emptyMessage="No se encontraron creadores con los filtros seleccionados"
          exportFileName="registro_creadores"
        />
      </div>
    </div>
  );
};

export default ReporteCreadores;
