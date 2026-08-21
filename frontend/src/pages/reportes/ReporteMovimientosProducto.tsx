import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { dependenciasService, productosService } from "../../services/api";
import { Dependencia } from "../../types/dependencia";
import { authHelpers } from "../../lib/api";
import type { Productos } from "../../types/index";
import { Package, Download, Eye, Loader2 } from "lucide-react";
import ReportNotes from "../../components/ui/ReportNotes";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

const ReporteMovimientosProducto: React.FC = () => {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [productos, setProductos] = useState<Productos[]>([]);
  const [idDependencia, setIdDependencia] = useState<number | null>(null);
  const [idProducto, setIdProducto] = useState<number | null>(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [notas, setNotas] = useState("");

  const user = useMemo(() => authHelpers.getUser(), []);
  const userName = user ? `${user.nombre} ${user.primer_apellido}${user.segundo_apellido ? " " + user.segundo_apellido : ""}`.trim() : "";
  const userCargo = user?.cargo || "";

  const isFormValid = Boolean(idDependencia && idProducto && fechaInicio && fechaFin);

  useEffect(() => {
    dependenciasService.getDependencias().then(setDependencias).catch(() => toast.error("Error cargando dependencias"));
    productosService.getProductos(0, 1000).then(setProductos).catch(() => toast.error("Error cargando productos"));
  }, []);

  const buildParams = () => new URLSearchParams({
    id_dependencia: idDependencia!.toString(), id_producto: idProducto!.toString(),
    fecha_inicio: fechaInicio, fecha_fin: fechaFin,
    aprobado_por_nombre: userName, aprobado_por_cargo: userCargo, notas,
  });

  const handlePreview = async () => {
    if (!isFormValid) { toast.error("Complete los campos requeridos"); return; }
    setPreviewLoading(true);
    try {
      const token = authHelpers.getToken() ?? "";
      const r = await fetch(`${BASE_URL}/reportes/movimientos-producto?${buildParams()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`${r.status}`);
      window.open(window.URL.createObjectURL(await r.blob()), "_blank");
    } catch { toast.error("Error al generar vista previa"); } finally { setPreviewLoading(false); }
  };

  const handleSubmit = async () => {
    if (!isFormValid) { toast.error("Complete los campos requeridos"); return; }
    setPdfLoading(true);
    try {
      const token = authHelpers.getToken() ?? "";
      const r = await fetch(`${BASE_URL}/reportes/movimientos-producto?${buildParams()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`${r.status}`);
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = window.URL.createObjectURL(blob);
      a.download = `movimientos_producto_${idProducto}.pdf`;
      a.click();
      toast.success("Reporte generado");
    } catch { toast.error("Error al generar reporte"); } finally { setPdfLoading(false); }
  };

  return (
    <div className="flex flex-col p-4">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Package className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Movimientos por Producto</h1>
            <p className="text-xs text-gray-500">Trazabilidad de un producto en un rango de fechas</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={handlePreview} disabled={!isFormValid || previewLoading} className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 disabled:opacity-50 transition-colors" title="Vista previa del documento">
            {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          </button>
          <button type="button" onClick={handleSubmit} disabled={!isFormValid || pdfLoading} className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 disabled:opacity-50 transition-colors" title="Exportar PDF">
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 w-full max-w-lg mx-auto">
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-shrink-0">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Filtros</p>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Dependencia <span className="text-red-500">*</span></label>
                  <select value={idDependencia ?? ""} onChange={e => { setIdDependencia(e.target.value ? Number(e.target.value) : null); setIdProducto(null); }} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white">
                    <option value="">Seleccionar…</option>
                    {dependencias.map(d => <option key={d.id_dependencia} value={d.id_dependencia}>{d.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Producto <span className="text-red-500">*</span></label>
                  <select value={idProducto ?? ""} onChange={e => setIdProducto(e.target.value ? Number(e.target.value) : null)} disabled={!idDependencia} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white disabled:bg-gray-50 disabled:text-gray-400">
                    <option value="">{idDependencia ? "Seleccionar producto" : "Primero seleccione dependencia"}</option>
                    {productos.map(p => <option key={p.id_producto} value={p.id_producto}>{p.codigo ? p.codigo : `#${p.id_producto}`} - {p.nombre}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Desde <span className="text-red-500">*</span></label>
                    <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Hasta <span className="text-red-500">*</span></label>
                    <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <ReportNotes value={notas} onChange={setNotas} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReporteMovimientosProducto;
