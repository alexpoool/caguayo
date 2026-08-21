import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { monedaService } from "../../services/api";
import { authHelpers } from "../../lib/api";
import { Receipt, Download, Eye, Loader2 } from "lucide-react";
import ReportNotes from "../../components/ui/ReportNotes";
import type { Moneda } from "../../types/moneda";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

const ReporteOnat: React.FC = () => {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [personas, setPersonas] = useState<{id_persona: number; nombre: string}[]>([]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [idMoneda, setIdMoneda] = useState<number | null>(null);
  const [idPersona, setIdPersona] = useState<number | null>(null);
  const [notas, setNotas] = useState("");

  const user = useMemo(() => authHelpers.getUser(), []);
  const userName = user ? `${user.nombre} ${user.primer_apellido}${user.segundo_apellido ? " " + user.segundo_apellido : ""}`.trim() : "";
  const userCargo = user?.cargo || "";

  const isFormValid = Boolean(fechaInicio && fechaFin);


  useEffect(() => {
    monedaService.getMonedas().then(setMonedas).catch(() => {});
    const token = authHelpers.getToken() ?? "";
    fetch(`${BASE_URL}/reportes/personas`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then((d: any) => setPersonas(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const buildParams = () => {
    const p = new URLSearchParams({
      fecha_inicio: fechaInicio, fecha_fin: fechaFin,
      aprobado_por_nombre: userName, aprobado_por_cargo: userCargo, notas,
    });
    if (idMoneda) p.append("id_moneda", idMoneda.toString());
    if (idPersona) p.append("id_persona", idPersona.toString());
    return p;
  };

  const handlePreview = async () => {
    if (!isFormValid) { toast.error("Seleccione rango de fechas"); return; }
    setPreviewLoading(true);
    try {
      const token = authHelpers.getToken() ?? "";
      const r = await fetch(`${BASE_URL}/reportes/onat?${buildParams()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`${r.status}`);
      window.open(window.URL.createObjectURL(await r.blob()), "_blank");
    } catch { toast.error("Error al generar vista previa"); } finally { setPreviewLoading(false); }
  };

  const handleSubmit = async () => {
    if (!isFormValid) { toast.error("Seleccione rango de fechas"); return; }
    setPdfLoading(true);
    try {
      const token = authHelpers.getToken() ?? "";
      const r = await fetch(`${BASE_URL}/reportes/onat?${buildParams()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`${r.status}`);
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = window.URL.createObjectURL(blob);
      a.download = `onat_${fechaInicio}_${fechaFin}.pdf`;
      a.click();
      toast.success("Reporte generado");
    } catch { toast.error("Error al generar reporte"); } finally { setPdfLoading(false); }
  };

  return (
    <div className="flex flex-col p-4">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
            <Receipt className="w-4 h-4 text-rose-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">ONAT — Ingresos y Retenciones</h1>
            <p className="text-xs text-gray-500">Ingresos, retenciones e importe neto por creador</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={handlePreview} disabled={!isFormValid || previewLoading} className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors" title="Vista previa del documento">
            {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          </button>
          <button type="button" onClick={handleSubmit} disabled={!isFormValid || pdfLoading} className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors" title="Exportar PDF">
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
                    <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Hasta <span className="text-red-500">*</span></label>
                    <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Moneda</label>
                  <select value={idMoneda ?? ""} onChange={e => setIdMoneda(e.target.value ? Number(e.target.value) : null)} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 bg-white">
                    <option value="">Todas</option>
                    {monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.nombre} ({m.simbolo})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Persona / Creador</label>
                  <select value={idPersona ?? ""} onChange={e => setIdPersona(e.target.value ? Number(e.target.value) : null)} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 bg-white">
                    <option value="">Todas</option>
                    {personas.map(p => <option key={p.id_persona} value={p.id_persona}>{p.nombre}</option>)}
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

export default ReporteOnat;
