import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { dependenciasService } from "../../services/api";
import { Dependencia } from "../../types/dependencia";
import { authHelpers } from "../../lib/api";
import type { Productos } from "../../types/index";
import { Package, Download, Eye, Loader2, Table2, Search } from "lucide-react";
import ReportNotes from "../../components/ui/ReportNotes";
import { ReportPreviewTable } from "../../components/ui/ReportPreviewTable";
import { formatFecha } from "../../utils/fecha";
import { DateInput } from "../../components/ui";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

// Fecha por defecto: último mes (mismo criterio que ReportesHome)
const FECHA_INICIO_DEFECTO = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split("T")[0];
})();
const FECHA_FIN_DEFECTO = new Date().toISOString().split("T")[0];

const ReporteMovimientosProducto: React.FC = () => {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [idDependencia, setIdDependencia] = useState<number | null>(null);

  // Buscador de productos (item_anexo)
  const [busqueda, setBusqueda] = useState("");
  const [sugerencias, setSugerencias] = useState<Productos[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [sugAbiertas, setSugAbiertas] = useState(false);
  const [idProducto, setIdProducto] = useState<number | null>(null);
  const [productoSel, setProductoSel] = useState<Productos | null>(null);

  const [fechaInicio, setFechaInicio] = useState(FECHA_INICIO_DEFECTO);
  const [fechaFin, setFechaFin] = useState(FECHA_FIN_DEFECTO);
  const [notas, setNotas] = useState("");
  const [previewData, setPreviewData] = useState<any[] | null>(null);

  const user = useMemo(() => authHelpers.getUser(), []);
  const userName = user ? `${user.nombre} ${user.primer_apellido}${user.segundo_apellido ? " " + user.segundo_apellido : ""}`.trim() : "";
  const userCargo = user?.cargo || "";

  const isFormValid = Boolean(idDependencia && idProducto && fechaInicio && fechaFin);

  useEffect(() => {
    dependenciasService.getDependencias().then(setDependencias).catch(() => toast.error("Error cargando dependencias"));
  }, []);

  // Búsqueda con debounce contra /reportes/productos-item-anexo
  useEffect(() => {
    const texto = busqueda.trim();
    if (!texto) {
      setSugerencias([]);
      setBuscando(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBuscando(true);
      try {
        const token = authHelpers.getToken() ?? "";
        const r = await fetch(`${BASE_URL}/reportes/productos-item-anexo?q=${encodeURIComponent(texto)}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!r.ok) throw new Error(`${r.status}`);
        const data = await r.json();
        setSugerencias(Array.isArray(data) ? data : []);
        setSugAbiertas(true);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setSugerencias([]);
          setSugAbiertas(true);
        }
      } finally {
        setBuscando(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [busqueda]);

  const seleccionarProducto = (p: Productos) => {
    setProductoSel(p);
    setIdProducto(p.id_producto);
    setBusqueda(p.nombre);
    setSugAbiertas(false);
    setPreviewData(null);
  };

  const handleChangeBusqueda = (valor: string) => {
    setBusqueda(valor);
    // Cualquier cambio invalida la selección anterior
    if (idProducto) {
      setIdProducto(null);
      setProductoSel(null);
    }
    setPreviewData(null);
  };

  const buildParams = () => new URLSearchParams({
    id_dependencia: idDependencia!.toString(), id_producto: idProducto!.toString(),
    fecha_inicio: fechaInicio, fecha_fin: fechaFin,
    aprobado_por_nombre: userName, aprobado_por_cargo: userCargo, notas,
  });

  const handleTablePreview = async () => {
    if (!isFormValid) { toast.error("Complete los campos requeridos"); return; }
    setTableLoading(true);
    setPreviewData(null);
    try {
      const token = authHelpers.getToken() ?? "";
      const r = await fetch(`${BASE_URL}/reportes/movimientos-producto/preview?id_dependencia=${idDependencia}&id_producto=${idProducto}&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`${r.status}`);
      const json = await r.json();
      setPreviewData(json.items || []);
    } catch { toast.error("Error al cargar vista previa"); } finally { setTableLoading(false); }
  };

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
          <button type="button" onClick={handleTablePreview} disabled={!isFormValid || tableLoading} className="p-2 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors" title="Vista previa de tabla">
            {tableLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Table2 className="w-4 h-4" />}
          </button>
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
          <div className="flex-shrink-0">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Filtros</p>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Dependencia <span className="text-red-500">*</span></label>
                  <select value={idDependencia ?? ""} onChange={e => { setIdDependencia(e.target.value ? Number(e.target.value) : null); setPreviewData(null); }} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white">
                    <option value="">Seleccionar…</option>
                    {dependencias.map(d => <option key={d.id_dependencia} value={d.id_dependencia}>{d.nombre}</option>)}
                  </select>
                </div>
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Producto <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={busqueda}
                      onChange={e => handleChangeBusqueda(e.target.value)}
                      onFocus={() => { if (sugerencias.length > 0) setSugAbiertas(true); }}
                      onBlur={() => setSugAbiertas(false)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (sugerencias.length > 0) seleccionarProducto(sugerencias[0]);
                        } else if (e.key === "Escape") {
                          setSugAbiertas(false);
                        }
                      }}
                      placeholder={idProducto ? "" : "Buscar por nombre o código…"}
                      autoComplete="off"
                      className="w-full pl-8 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white"
                    />
                    {buscando && (
                      <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 animate-spin" />
                    )}
                  </div>

                  {sugAbiertas && (
                    <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                      {sugerencias.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-gray-400">
                          {buscando ? "Buscando…" : "Sin productos encontrados"}
                        </p>
                      ) : (
                        sugerencias.map(p => (
                          <button
                            key={p.id_producto}
                            type="button"
                            onMouseDown={e => { e.preventDefault(); seleccionarProducto(p); }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-amber-50 transition-colors ${p.id_producto === idProducto ? "bg-amber-50" : ""}`}
                          >
                            <span className="font-medium text-gray-800">{p.nombre}</span>
                            {p.codigo && <span className="ml-2 text-xs text-gray-400">{p.codigo}</span>}
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {productoSel && (
                    <p className="mt-1 text-[11px] text-green-600">
                      Seleccionado: {productoSel.nombre}{productoSel.codigo ? ` (${productoSel.codigo})` : ""}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Desde <span className="text-red-500">*</span></label>
                    <DateInput className="h-8 focus:ring-2 focus:ring-amber-500" value={fechaInicio} onChange={(fecha) => { setFechaInicio(fecha); setPreviewData(null); }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Hasta <span className="text-red-500">*</span></label>
                    <DateInput className="h-8 focus:ring-2 focus:ring-amber-500" value={fechaFin} onChange={(fecha) => { setFechaFin(fecha); setPreviewData(null); }} />
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

      {previewData && (
        <div className="mt-4">
          <ReportPreviewTable
            columns={[
              { key: "fecha", label: "Fecha", render: (v: any) => formatFecha(v) || "—" },
              { key: "tipo", label: "Tipo" },
              { key: "producto", label: "Producto", render: () => productoSel?.nombre || "—" },
              { key: "cantidad", label: "Cantidad", className: "text-right" },
            ]}
            data={previewData}
            totalItems={previewData.length}
          />
        </div>
      )}
    </div>
  );
};

export default ReporteMovimientosProducto;
