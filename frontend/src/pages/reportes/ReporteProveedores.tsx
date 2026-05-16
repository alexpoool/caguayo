import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { dependenciasService } from "../../services/administracion";
import { Dependencia } from "../../types/dependencia";
import { authHelpers } from "../../lib/api";
import { useReportPreview } from "../../hooks/useReportPreview";
import ReportPreviewPanel from "../../components/ui/ReportPreviewPanel";
import type { Column, StatCard } from "../../components/ui/ReportPreviewPanel";
import { UserCircle, Download } from "lucide-react";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = "http://localhost:8000/api/v1";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProveedorPreviewItem {
  nombre: string;
  direccion: string;
  provincia: string;
  municipio: string;
  carnet_identidad?: string;
  vigencia?: string;
  codigo_reup?: string;
}

interface ProveedoresPreviewData {
  dependencia: { nombre: string; direccion: string };
  items: ProveedorPreviewItem[];
  total_items: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TIPO_LABELS: Record<string, string> = {
  NATURAL: "Personas Naturales",
  TCP: "TCP",
  JURIDICA: "Instituciones/Empresas",
};

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

  // ── Seed selects on mount ──────────────────────────────────────────────────
  useEffect(() => {
    dependenciasService.getDependencias().then(setDependencias).catch(() => {
      toast.error("No se pudieron cargar las dependencias");
    });
    dependenciasService.getProvincias().then(setProvincias).catch(() => {
      toast.error("No se pudieron cargar las provincias");
    });
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────
  const selectedDep = useMemo(
    () => dependencias.find((d) => d.id_dependencia === idDependencia) ?? null,
    [dependencias, idDependencia]
  );

  const tipoLabel = tipoEntidad ? (TIPO_LABELS[tipoEntidad] ?? tipoEntidad) : "";

  // ── Preview URL (debounced inside the hook) ────────────────────────────────
  const previewUrl = useMemo<string | null>(() => {
    if (!idDependencia || !tipoEntidad) return null;

    const params = new URLSearchParams({
      id_dependencia: idDependencia.toString(),
      tipo_entidad: tipoEntidad,
    });

    if (idProvincia) {
      params.append("id_provincia", idProvincia.toString());
    }

    return `${BASE_URL}/reportes/proveedores-dependencia/preview?${params.toString()}`;
  }, [idDependencia, tipoEntidad, idProvincia]);

  const {
    data: previewData,
    loading: previewLoading,
    error: previewError,
  } = useReportPreview<ProveedoresPreviewData>(previewUrl);

  // ── Export columns (depends on tipoEntidad) ────────────────────────────────
<<<<<<< HEAD
  const exportColumns = useMemo(() => {
    const base = [
      { header: "Nombre",    value: "nombre" },
      { header: "Dirección", value: "direccion" },
      { header: "Provincia", value: "provincia" },
      { header: "Municipio", value: "municipio" },
=======
  const exportColumns = useMemo<ExportColumn<ProveedorPreviewItem>[]>(() => {
    const base: ExportColumn<ProveedorPreviewItem>[] = [
      { header: "Nombre", accessor: "nombre" },
      { header: "Dirección", accessor: "direccion" },
      { header: "Provincia", accessor: "provincia" },
      { header: "Municipio", accessor: "municipio" },
>>>>>>> Rama_Documentos
    ];
    if (tipoEntidad === "NATURAL") {
      base.push({ header: "Carnet de Identidad", accessor: "carnet_identidad" });
    }
    if (tipoEntidad === "JURIDICA") {
      base.push({ header: "Código REUP", accessor: "codigo_reup" });
    }
    return base;
  }, [tipoEntidad]);

  // ── Preview columns (depends on tipoEntidad) ───────────────────────────────
  const columns = useMemo<Column<ProveedorPreviewItem>[]>(() => {
    const base: Column<ProveedorPreviewItem>[] = [
      {
        header: "Nombre",
        accessor: "nombre",
        className: "font-medium",
      },
      {
        header: "Dirección",
        accessor: "direccion",
      },
      {
        header: "Provincia",
        accessor: "provincia",
      },
      {
        header: "Municipio",
        accessor: "municipio",
      },
    ];

    if (tipoEntidad === "NATURAL") {
      base.push({
        header: "Carnet de Identidad",
        accessor: "carnet_identidad",
      });
    }

    if (tipoEntidad === "JURIDICA") {
      base.push({
        header: "Código REUP",
        accessor: "codigo_reup",
      });
    }

    return base;
  }, [tipoEntidad]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo<StatCard[] | undefined>(() => {
    if (!previewData) return undefined;

    return [
      {
        label: "Total proveedores",
        value: previewData.total_items,
        color: "green",
      },
      {
        label: "Tipo de proveedor",
        value: tipoLabel,
        color: "green",
      },
    ];
  }, [previewData, tipoLabel]);

  // ── Panel subtitle ─────────────────────────────────────────────────────────
  const panelSubtitle =
    selectedDep && tipoLabel
      ? `${selectedDep.nombre} · ${tipoLabel}`
      : undefined;

  // ── PDF export ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!idDependencia || !tipoEntidad) {
      toast.error("Seleccione una dependencia y un tipo de proveedor");
      return;
    }

    setPdfLoading(true);

    try {
      const params = new URLSearchParams({
        id_dependencia: idDependencia.toString(),
        tipo_entidad: tipoEntidad,
        aprobado_por_nombre: aprobadoPorNombre,
        aprobado_por_cargo: aprobadoPorCargo,
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

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proveedores_dependencia_${idDependencia}.pdf`;
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

  // ── Submit button label ────────────────────────────────────────────────────
  const submitLabel = useMemo(() => {
    if (pdfLoading) return "Generando PDF...";
    if (previewData && previewData.total_items > 0) {
      return `Exportar ${previewData.total_items} proveedores como PDF`;
    }
    return "Exportar PDF";
  }, [pdfLoading, previewData]);

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

      {/* ── Split layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] items-start gap-6">
        {/* ── Form panel ── */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* Submit */}
            <button
              type="submit"
              disabled={pdfLoading || !idDependencia || !tipoEntidad}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4 flex-shrink-0" />
              {submitLabel}
            </button>
          </form>
        </div>

        {/* ── Preview panel ── */}
        <ReportPreviewPanel<ProveedorPreviewItem>
          title="Vista previa"
          subtitle={panelSubtitle}
          data={previewData?.items ?? null}
          loading={previewLoading}
          error={previewError}
          columns={columns}
          stats={stats}
          emptyMessage="No se encontraron proveedores con los filtros seleccionados"
          exportFileName={`proveedores_${idDependencia ?? "dep"}_${tipoEntidad.toLowerCase()}`}
        />
      </div>
    </div>
  );
};

export default ReporteProveedores;
