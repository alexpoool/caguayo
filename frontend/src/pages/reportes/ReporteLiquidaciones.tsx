import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { authHelpers } from "../../lib/api";
import { Calculator, Download, Eye, Loader2 } from "lucide-react";
import ReportNotes from "../../components/ui/ReportNotes";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

const ReporteLiquidaciones: React.FC = () => {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [idCliente, setIdCliente] = useState<number | null>(null);
  const [clientes, setClientes] = useState<{id_cliente: number; nombre: string; codigo: string}[]>([]);
  const [notas, setNotas] = useState("");

  const user = useMemo(() => authHelpers.getUser(), []);
  const userName = user ? `${user.nombre} ${user.primer_apellido}${user.segundo_apellido ? " " + user.segundo_apellido : ""}`.trim() : "";
  const userCargo = user?.cargo || "";

  const isFormValid = Boolean(fechaInicio && fechaFin);

  useEffect(() => {
    const token = authHelpers.getToken() ?? "";
    fetch(`${BASE_URL}/clientes`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((d: any) => setClientes(Array.isArray(d) ? d : d.items || []))
      .catch(() => {});
  }, []);

  const buildParams = () => {
    const p = new URLSearchParams({
      fecha_inicio: fechaInicio, fecha_fin: fechaFin,
      aprobado_por_nombre: userName, aprobado_por_cargo: userCargo, notas,
    });
    if (idCliente) p.append("id_cliente", idCliente.toString());
    return p;
  };

  const handlePreview = async () => {
    if (!isFormValid) { toast.error("Seleccione rango de fechas"); return; }
    setPreviewLoading(true);
    try {
      const token = authHelpers.getToken() ?? "";
      const r = await fetch(`${BASE_URL}/reportes/liquidaciones?${buildParams()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`${r.status}`);
      window.open(window.URL.createObjectURL(await r.blob()), "_blank");
    } catch { toast.error("Error al generar vista previa"); } finally { setPreviewLoading(false); }
  };

  const handleSubmit = async () => {
    if (!isFormValid) { toast.error("Seleccione rango de fechas"); return; }
    setPdfLoading(true);
    try {
      const token = authHelpers.getToken() ?? "";
      const r = await fetch(`${BASE_URL}/reportes/liquidaciones?${buildParams()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`${r.status}`);
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = window.URL.createObjectURL(blob);
      a.download = `liquidaciones_${fechaInicio}_${fechaFin}.pdf`;
      a.click();
      toast.success("Reporte generado");
    } catch { toast.error("Error al generar reporte"); } finally { setPdfLoading(false); }
  };

  return (
    <div className="flex flex-col p-4">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
            <Calculator className="w-4 h-4 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Resumen de Liquidaciones</h1>
            <p className="text-xs text-gray-500">Liquidaciones por rango de fechas</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={handlePreview} disabled={!isFormValid || previewLoading} className="p-2 rounded-lg text-cyan-600 hover:bg-cyan-50 disabled:opacity-50 transition-colors" title="Vista previa del documento">
            {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          </button>
          <button type="button" onClick={handleSubmit} disabled={!isFormValid || pdfLoading} className="p-2 rounded-lg text-cyan-600 hover:bg-cyan-50 disabled:opacity-50 transition-colors" title="Exportar PDF">
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
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Desde <span className="text-red-500">*</span></label>
                    <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Hasta <span className="text-red-500">*</span></label>
                    <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Cliente</label>
                  <select value={idCliente ?? ""} onChange={e => setIdCliente(e.target.value ? Number(e.target.value) : null)} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 bg-white">
                    <option value="">Todos</option>
                    {clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.codigo ? c.codigo + " - " : ""}{c.nombre}</option>)}
                  </select>
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

export default ReporteLiquidaciones;
