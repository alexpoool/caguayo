import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { dependenciasService, productosService } from "../../services/api";
import { Dependencia } from "../../types/dependencia";
import { authHelpers } from "../../lib/api";
import type { Productos } from "../../types/index";
import { Package, Loader2, Eye, Printer } from "lucide-react";
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

const ReporteMovimientosProducto: React.FC = () => {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [productos, setProductos] = useState<Productos[]>([]);
  const [idDependencia, setIdDependencia] = useState<number | null>(null);
  const [idProducto, setIdProducto] = useState<number | null>(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [aprobadoPorNombre, setAprobadoPorNombre] = useState("");
  const [aprobadoPorCargo, setAprobadoPorCargo] = useState("");
  const [notas, setNotas] = useState("");

  const selectedDep = useMemo(
    () => dependencias.find((d) => d.id_dependencia === idDependencia) ?? null,
    [dependencias, idDependencia]
  );

  const selectedProd = useMemo(
    () => productos.find((p) => p.id_producto === idProducto) ?? null,
    [productos, idProducto]
  );

  useEffect(() => {
    dependenciasService.getDependencias().then(setDependencias).catch(() => {
      toast.error("No se pudieron cargar las dependencias.");
    });
    productosService.getProductos(0, 1000).then(setProductos).catch(() => {
      toast.error("No se pudieron cargar los productos.");
    });
  }, []);

  const canSubmit = Boolean(
    idDependencia && idProducto && fechaInicio && fechaFin
  );

  const generatePdfBlob = async (): Promise<Blob | null> => {
    setPdfLoading(true);
    try {
      const params = new URLSearchParams({
        id_dependencia: idDependencia!.toString(),
        id_producto: idProducto!.toString(),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        aprobado_por_nombre: aprobadoPorNombre,
        aprobado_por_cargo: aprobadoPorCargo,
        notas: notas,
      });

      const token = authHelpers.getToken() ?? "";
      const response = await fetch(
        `${BASE_URL}/reportes/movimientos-producto?${params.toString()}`,
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
    anchor.download = `movimientos_producto_${idProducto}.pdf`;
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
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
          <Package className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            Movimientos por Producto
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Trazabilidad de un producto en un rango de fechas
          </p>
        </div>
      </div>

      {/* ── Form layout ── */}
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <form noValidate>
            {/* Section: FILTROS */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
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
                    onChange={(e) => {
                      setIdDependencia(
                        e.target.value ? Number(e.target.value) : null
                      );
                      setIdProducto(null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                  >
                    <option value="">Seleccionar dependencia</option>
                    {dependencias.map((d) => (
                      <option
                        key={d.id_dependencia}
                        value={d.id_dependencia}
                      >
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Producto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Producto <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={idProducto ?? ""}
                    onChange={(e) =>
                      setIdProducto(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    disabled={!idDependencia}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {idDependencia
                        ? "Seleccionar producto"
                        : "Seleccione primero una dependencia"}
                    </option>
                    {productos.map((p) => (
                      <option key={p.id_producto} value={p.id_producto}>
                        {p.codigo
                          ? p.codigo
                          : `#${p.id_producto}`}{" "}
                        - {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fechas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rango de fechas <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="Desde"
                    />
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="Hasta"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 my-6" />

            {/* Section: FIRMAS */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
                Firmas
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aprobado por (nombre)
                  </label>
                  <input
                    type="text"
                    value={aprobadoPorNombre}
                    onChange={(e) => setAprobadoPorNombre(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Section: NOTAS */}
            <div className="mb-6">
              <ReportNotes value={notas} onChange={setNotas} />
            </div>

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

export default ReporteMovimientosProducto;
