import React, { useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import { authHelpers } from "../../lib/api";
import { Users, Download, Eye, Loader2 } from "lucide-react";
import ReportNotes from "../../components/ui/ReportNotes";

import { API_BASE_URL as BASE_URL } from "../../config/api";
import { abrirBlob, descargarBlob } from '../../utils/archivos';

const ReporteClientes: React.FC = () => {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [notas, setNotas] = useState("");

  const user = useMemo(() => authHelpers.getUser(), []);
  const userName = user ? `${user.nombre} ${user.primer_apellido}${user.segundo_apellido ? " " + user.segundo_apellido : ""}`.trim() : "";
  const userCargo = user?.cargo || "";

  const buildParams = () => new URLSearchParams({
    aprobado_por_nombre: userName,
    aprobado_por_cargo: userCargo,
    notas,
  });

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const token = authHelpers.getToken() ?? "";
      const r = await fetch(`${BASE_URL}/reportes/clientes?${buildParams()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`${r.status}`);
      abrirBlob(await r.blob());
    } catch { toast.error("Error al generar vista previa"); } finally { setPreviewLoading(false); }
  };

  const handleSubmit = async () => {
    setPdfLoading(true);
    try {
      const token = authHelpers.getToken() ?? "";
      const r = await fetch(`${BASE_URL}/reportes/clientes?${buildParams()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`${r.status}`);
      const blob = await r.blob();
      descargarBlob(blob, "registro_clientes.pdf");
      toast.success("Reporte generado");
    } catch { toast.error("Error al generar reporte"); } finally { setPdfLoading(false); }
  };

  return (
    <div className="flex flex-col p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Registro de Clientes</h1>
            <p className="text-xs text-gray-500">Listado completo de clientes registrados</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={handlePreview} disabled={previewLoading} className="p-2 rounded-lg text-brand-600 hover:bg-brand-50 disabled:opacity-50 transition-colors" title="Vista previa del documento">
            {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          </button>
          <button type="button" onClick={handleSubmit} disabled={pdfLoading} className="p-2 rounded-lg text-brand-600 hover:bg-brand-50 disabled:opacity-50 transition-colors" title="Exportar PDF">
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 w-full max-w-lg mx-auto">
        <div className="space-y-3">
          <div className="flex-shrink-0">
            <ReportNotes value={notas} onChange={setNotas} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReporteClientes;
