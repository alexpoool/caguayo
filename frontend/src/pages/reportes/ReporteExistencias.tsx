import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { dependenciasService } from "../../services/administracion";
import { Dependencia } from "../../types/dependencia";
import { authHelpers } from "../../lib/api";
import { Boxes, Download, Building2, Eye, Loader2 } from "lucide-react";
import ReportNotes from "../../components/ui/ReportNotes";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

const ReporteExistencias: React.FC = () => {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [idDependencia, setIdDependencia] = useState<number | null>(null);
  const [notas, setNotas] = useState("");

  const user = useMemo(() => authHelpers.getUser(), []);
  const userName = user ? `${user.nombre} ${user.primer_apellido}${user.segundo_apellido ? " " + user.segundo_apellido : ""}`.trim() : "";
  const userCargo = user?.cargo || "";

  const selectedDep = useMemo(() => dependencias.find(d => d.id_dependencia === idDependencia) ?? null, [dependencias, idDependencia]);
  useEffect(() => { dependenciasService.getDependencias().then(setDependencias); }, []);

  const buildParams = () => new URLSearchParams({
    id_dependencia: idDependencia?.toString() ?? "",
    aprobado_por_nombre: userName, aprobado_por_cargo: userCargo, notas,
  });

  const handlePreview = async () => {
    if (!idDependencia) { toast.error("Seleccione una dependencia"); return; }
    setPreviewLoading(true);
    try {
      const token = authHelpers.getToken() ?? "";
      const r = await fetch(`${BASE_URL}/reportes/existencias?${buildParams()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`${r.status}`);
      window.open(window.URL.createObjectURL(await r.blob()), "_blank");
    } catch { toast.error("Error al generar vista previa"); } finally { setPreviewLoading(false); }
  };

  const handleSubmit = async () => {
    if (!idDependencia) { toast.error("Seleccione una dependencia"); return; }
    setPdfLoading(true);
    try {
      const token = authHelpers.getToken() ?? "";
      const r = await fetch(`${BASE_URL}/reportes/existencias?${buildParams()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`${r.status}`);
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = window.URL.createObjectURL(blob);
      a.download = `existencias_${idDependencia}.pdf`;
      a.click();
      toast.success("Reporte generado");
    } catch { toast.error("Error al generar reporte"); } finally { setPdfLoading(false); }
  };

  return (
    <div className="flex flex-col p-4">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Boxes className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Reporte de Existencias</h1>
            <p className="text-xs text-gray-500">Inventario actual por dependencia</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={handlePreview} disabled={!idDependencia || previewLoading} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors" title="Vista previa del documento">
            {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          </button>
          <button type="button" onClick={handleSubmit} disabled={!idDependencia || pdfLoading} className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors" title="Exportar PDF">
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 w-full max-w-lg mx-auto">
        <div className="space-y-3">
          <div className="flex-shrink-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Filtros</p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Dependencia <span className="text-red-500">*</span></label>
                <select value={idDependencia ?? ""} onChange={e => setIdDependencia(e.target.value ? Number(e.target.value) : null)} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white" required>
                  <option value="">Seleccionar dependencia</option>
                  {dependencias.map(d => <option key={d.id_dependencia} value={d.id_dependencia}>{d.nombre}</option>)}
                </select>
                {selectedDep?.direccion && (
                  <p className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                    <Building2 className="w-3 h-3 flex-shrink-0" />{selectedDep.direccion}
                  </p>
                )}
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

export default ReporteExistencias;
