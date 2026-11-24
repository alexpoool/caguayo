import React, { useState, useEffect, useRef } from "react";
import type { CasosUsoReportes } from "../application/casos-uso";
import { useAuth } from "@/shared/ui/auth";
import { toast } from "react-hot-toast";
import type { Dependencia, Productos } from "../domain/reportes";
import { Package, Download, Eye, Loader2, Search, AlertCircle, Filter, X } from "lucide-react";
import ReportNotes from "@/shared/ui/components/ReportNotes";
import { ReportPreviewTable } from "@/shared/ui/components/ReportPreviewTable";
import { formatFecha, toISODateLocal } from "@/utils/fecha";
import { DateInput } from "@/shared/ui/components";
import { abrirBlob, descargarBlob } from "@/utils/archivos";

const FECHA_INICIO_DEFECTO = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return toISODateLocal(d);
})();
const FECHA_FIN_DEFECTO = toISODateLocal();

const ReporteMovimientosProducto: React.FC<{ casosUso: CasosUsoReportes }> = ({ casosUso }) => {
  const { user } = useAuth();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [idDependencia, setIdDependencia] = useState<number | null>(
    () => user?.dependencia?.id_dependencia ?? null,
  );
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
  const [resumenPorTipo, setResumenPorTipo] = useState<any[]>([]);
  const [monedaSimbolo, setMonedaSimbolo] = useState("");
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const focusControllerRef = useRef<AbortController | null>(null);

  const userName = user
    ? `${user.nombre} ${user.primer_apellido}${user.segundo_apellido ? " " + user.segundo_apellido : ""}`.trim()
    : "";
  const userCargo = user?.cargo || "";
  const isFormValid = Boolean(idDependencia && idProducto && fechaInicio && fechaFin && fechaInicio <= fechaFin);

  useEffect(() => {
    casosUso.listarDependencias()
      .then(setDependencias)
      .catch(() => toast.error("Error cargando dependencias"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarProductos = async (texto = "", dependencia = idDependencia, signal?: AbortSignal) => {
    if (!dependencia) {
      setSugerencias([]);
      return [];
    }
    setBuscando(true);
    try {
      const data: any = await casosUso.consultarReporte(
        "/reportes/productos-item-anexo",
        { id_dependencia: String(dependencia), q: texto },
        signal,
      );
      const productos = Array.isArray(data) ? data : [];
      if (!signal?.aborted) setSugerencias(productos);
      return productos as Productos[];
    } catch (error: any) {
      if (error?.name !== "AbortError" && !signal?.aborted) {
        setSugerencias([]);
        toast.error("Error cargando productos de la dependencia");
      }
      return [];
    } finally {
      if (!signal?.aborted) setBuscando(false);
    }
  };

  // Al seleccionar/cambiar dependencia, cargar productos de esa dependencia
  // y elegir automáticamente el primero del listado ordenado por nombre.
  useEffect(() => {
    focusControllerRef.current?.abort();
    setIdProducto(null);
    setProductoSel(null);
    setBusqueda("");
    setPreviewData(null);
    setResumenPorTipo([]);
    if (!idDependencia) {
      setSugerencias([]);
      return;
    }
    const controller = new AbortController();
    focusControllerRef.current = controller;
    let activo = true;
    (async () => {
      const productos = await cargarProductos("", idDependencia, controller.signal);
      if (!activo || controller.signal.aborted || productos.length === 0) return;
      const primero = productos[0];
      setIdProducto(primero.id_producto);
      setProductoSel(primero);
      setBusqueda(primero.nombre);
    })();
    return () => { activo = false; controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idDependencia]);

  // Búsqueda dentro del catálogo disponible en la dependencia seleccionada.
  useEffect(() => {
    if (!idDependencia || (productoSel && busqueda === productoSel.nombre)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setBuscando(true);
      try {
        const data: any = await casosUso.consultarReporte(
          "/reportes/productos-item-anexo",
          { id_dependencia: String(idDependencia), q: busqueda.trim() },
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setSugerencias(Array.isArray(data) ? data : []);
          setSugAbiertas(true);
        }
      } catch (err: any) {
        if (err?.name !== "AbortError" && !controller.signal.aborted) {
          setSugerencias([]);
          toast.error("Error buscando productos");
        }
      } finally {
        if (!controller.signal.aborted) setBuscando(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, idDependencia, productoSel]);

  // La vista previa se actualiza al cambiar cualquiera de los filtros.
  useEffect(() => {
    if (!isFormValid) {
      setPreviewData(null);
      setResumenPorTipo([]);
      setPreviewError(false);
      setTableLoading(false);
      return;
    }
    const controller = new AbortController();
    setTableLoading(true);
    setPreviewError(false);
    const timer = window.setTimeout(async () => {
      try {
        const json: any = await casosUso.consultarReporte(
          "/reportes/movimientos-producto/preview",
          {
            id_dependencia: String(idDependencia),
            id_producto: String(idProducto),
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
          },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setPreviewData(Array.isArray(json?.items) ? json.items : []);
        setResumenPorTipo(Array.isArray(json?.resumen_por_tipo) ? json.resumen_por_tipo : []);
        setMonedaSimbolo(json?.producto?.moneda_simbolo || json?.producto?.moneda || "");
      } catch (err: any) {
        if (err?.name === "AbortError" || controller.signal.aborted) return;
        setPreviewData(null);
        setResumenPorTipo([]);
        setPreviewError(true);
        toast.error("Error al cargar la tabla");
      } finally {
        if (!controller.signal.aborted) setTableLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idDependencia, idProducto, fechaInicio, fechaFin]);

  const seleccionarProducto = (producto: Productos) => {
    setProductoSel(producto);
    setIdProducto(producto.id_producto);
    setBusqueda(producto.nombre);
    setSugAbiertas(false);
    setPreviewData(null);
    setResumenPorTipo([]);
  };

  const handleChangeBusqueda = (valor: string) => {
    setBusqueda(valor);
    setIdProducto(null);
    setProductoSel(null);
    setPreviewData(null);
    setResumenPorTipo([]);
    setSugAbiertas(true);
  };

  const buildParams = () => ({
    id_dependencia: String(idDependencia),
    id_producto: String(idProducto),
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
    aprobado_por_nombre: userName,
    aprobado_por_cargo: userCargo,
    notas,
  });

  const handlePreview = async () => {
    if (!isFormValid) { toast.error("Seleccione dependencia, producto y período"); return; }
    setPreviewLoading(true);
    try {
      const blob = await casosUso.generarReporte("/reportes/movimientos-producto", buildParams());
      abrirBlob(blob);
    } catch { toast.error("Error al generar vista previa"); }
    finally { setPreviewLoading(false); }
  };

  const handleSubmit = async () => {
    if (!isFormValid) { toast.error("Seleccione dependencia, producto y período"); return; }
    setPdfLoading(true);
    try {
      const blob = await casosUso.generarReporte("/reportes/movimientos-producto", buildParams());
      descargarBlob(blob, `movimientos_producto_${idProducto}.pdf`);
      toast.success("Reporte generado");
    } catch { toast.error("Error al generar reporte"); }
    finally { setPdfLoading(false); }
  };

  const renderTabla = () => {
    if (!isFormValid) {
      return (
        <div className="border border-dashed border-gray-300 rounded-xl bg-white px-4 py-8 text-center text-sm text-gray-500">
          Selecciona una dependencia con productos y un período para consultar los movimientos
        </div>
      );
    }
    if (tableLoading) {
      return <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 text-amber-500 animate-spin" /></div>;
    }
    if (previewError) {
      return <div className="flex flex-col items-center gap-2 py-8 text-gray-400"><AlertCircle className="w-6 h-6" /><p className="text-sm">No se pudo cargar la tabla</p></div>;
    }
    if (!previewData) return null;
    return (
      <>
        <ReportPreviewTable
          columns={[
            { key: "fecha", label: "Fecha", render: (v: any) => formatFecha(v) || "—" },
            { key: "saldo_inicial", label: `Saldo inicial${monedaSimbolo ? ` (${monedaSimbolo})` : ""}`, className: "text-right", render: (v: any) => `${monedaSimbolo} ${Number(v ?? 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim() },
            { key: "tipo_movimiento", label: "Tipo de movimiento" },
            { key: "cantidad", label: "Cantidad", className: "text-right" },
            { key: "saldo_final", label: `Saldo final${monedaSimbolo ? ` (${monedaSimbolo})` : ""}`, className: "text-right font-semibold", render: (v: any) => `${monedaSimbolo} ${Number(v ?? 0).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim() },
          ]}
          data={previewData}
          totalItems={previewData.length}
        />
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Resumen por tipo de movimiento</h2>
          {resumenPorTipo.length === 0 ? (
            <p className="text-sm text-gray-500">No hay movimientos en el período seleccionado.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {resumenPorTipo.map(item => (
                <div key={item.tipo} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                  <span className="text-sm text-gray-700">{item.tipo}</span>
                  <span className="text-sm font-semibold tabular-nums">{Number(item.cantidad_total ?? 0).toLocaleString("es-ES")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="relative flex flex-col p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 flex-shrink-0">
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
          <button type="button" onClick={() => setFiltrosAbiertos(true)} className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors" title="Mostrar filtros" aria-label="Mostrar filtros">
            <Filter className="w-4 h-4" />
          </button>
          <button type="button" onClick={handlePreview} disabled={!isFormValid || previewLoading} className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 disabled:opacity-50 transition-colors" title="Vista previa del documento">
            {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          </button>
          <button type="button" onClick={handleSubmit} disabled={!isFormValid || pdfLoading} className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 disabled:opacity-50 transition-colors" title="Exportar PDF">
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {filtrosAbiertos && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 pt-6 sm:pt-10" onMouseDown={e => { if (e.target === e.currentTarget) setFiltrosAbiertos(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="mov-producto-filtros-title" className="w-full max-w-xl rounded-xl border border-gray-200 bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 id="mov-producto-filtros-title" className="text-sm font-bold text-gray-900">Filtros del reporte</h2>
                <p className="text-xs text-gray-500">Selecciona dependencia, producto y período</p>
              </div>
              <button type="button" onClick={() => setFiltrosAbiertos(false)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Cerrar filtros"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Dependencia <span className="text-red-500">*</span></label>
                <select value={idDependencia ?? ""} onChange={e => setIdDependencia(e.target.value ? Number(e.target.value) : null)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white">
                  <option value="">Seleccionar…</option>
                  {dependencias.map(d => <option key={d.id_dependencia} value={d.id_dependencia}>{d.nombre}</option>)}
                </select>
              </div>
              <div className="relative">
                <label className="block text-xs font-medium text-gray-600 mb-1">Producto <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input ref={inputRef} type="text" value={busqueda} onChange={e => handleChangeBusqueda(e.target.value)} onFocus={() => setSugAbiertas(true)} onBlur={() => window.setTimeout(() => setSugAbiertas(false), 120)} onKeyDown={e => { if (e.key === "Enter" && sugerencias.length) { e.preventDefault(); seleccionarProducto(sugerencias[0]); } if (e.key === "Escape") setSugAbiertas(false); }} placeholder={idDependencia ? "Buscar producto en esta dependencia…" : "Selecciona primero una dependencia"} autoComplete="off" disabled={!idDependencia} className="w-full pl-10 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 bg-white disabled:bg-gray-50" />
                  {buscando && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
                </div>
                {sugAbiertas && (
                  <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {sugerencias.length === 0 ? <p className="px-3 py-2 text-xs text-gray-400">{buscando ? "Buscando…" : "Sin productos disponibles"}</p> : sugerencias.map(p => (
                      <button key={p.id_producto} type="button" onMouseDown={e => { e.preventDefault(); seleccionarProducto(p); }} className={`w-full text-left px-3 py-2 text-sm hover:bg-amber-50 ${p.id_producto === idProducto ? "bg-amber-50" : ""}`}>
                        <span className="font-medium text-gray-800">{p.nombre}</span>{p.codigo && <span className="ml-2 text-xs text-gray-400">{p.codigo}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {productoSel && <p className="mt-1 text-[11px] text-green-600">Seleccionado: {productoSel.nombre}{productoSel.codigo ? ` (${productoSel.codigo})` : ""}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Desde <span className="text-red-500">*</span></label><DateInput className="h-10 focus:ring-2 focus:ring-amber-500" value={fechaInicio} onChange={setFechaInicio} /></div>
                <div><label className="block text-xs font-medium text-gray-600 mb-1">Hasta <span className="text-red-500">*</span></label><DateInput className="h-10 focus:ring-2 focus:ring-amber-500" value={fechaFin} onChange={setFechaFin} /></div>
              </div>
              <ReportNotes value={notas} onChange={setNotas} />
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
              <button type="button" onClick={() => setFiltrosAbiertos(false)} className="px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cerrar</button>
              <button type="button" onClick={() => setFiltrosAbiertos(false)} disabled={!isFormValid} className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50">Aplicar filtros</button>
            </div>
          </section>
        </div>
      )}

      <div className="mt-2">{renderTabla()}</div>
    </div>
  );
};

export default ReporteMovimientosProducto;
