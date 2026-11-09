import React, { useState } from "react";
import type { CasosUsoReportes } from '../application/casos-uso';
import { useAuth } from '@/shared/ui/auth';
import { toast } from "react-hot-toast";

import { Layers, Download, Eye, Loader2 } from "lucide-react";
import ReportNotes from "@/shared/ui/components/ReportNotes";


import { abrirBlob, descargarBlob } from '@/utils/archivos';

const ReporteProyectos: React.FC<{ casosUso: CasosUsoReportes }> = ({ casosUso }) => {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [notas, setNotas] = useState("");

  const { user } = useAuth();
  const userName = user ? `${user.nombre} ${user.primer_apellido}${user.segundo_apellido ? " " + user.segundo_apellido : ""}`.trim() : "";
  const userCargo = user?.cargo || "";

  const isFormValid = Boolean(fechaInicio && fechaFin);

  const buildParams = () => new URLSearchParams({
    fecha_inicio: fechaInicio, fecha_fin: fechaFin,
    aprobado_por_nombre: userName, aprobado_por_cargo: userCargo, notas,
  });

  const handlePreview = async () => {
    if (!isFormValid) { toast.error("Seleccione rango de fechas"); return; }
    setPreviewLoading(true);
    try {
            const r = await casosUso.generarReporte('/reportes/proyectos', Object.fromEntries(buildParams()));
      abrirBlob(r);
    } catch { toast.error("Error al generar vista previa"); } finally { setPreviewLoading(false); }
  };

  const handleSubmit = async () => {
    if (!isFormValid) { toast.error("Seleccione rango de fechas"); return; }
    setPdfLoading(true);
    try {
            const r = await casosUso.generarReporte('/reportes/proyectos', Object.fromEntries(buildParams()));
      const blob = r;
      descargarBlob(blob, `proyectos_${fechaInicio}_${fechaFin}.pdf`);
      toast.success("Reporte generado");
    } catch { toast.error("Error al generar reporte"); } finally { setPdfLoading(false); }
  };

  return (
    <div className="flex flex-col p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
            <Layers className="w-4 h-4 text-brand-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Registro de Proyectos</h1>
            <p className="text-xs text-gray-500">Listado de proyectos en un rango de fechas</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={handlePreview} disabled={!isFormValid || previewLoading} className="p-2 rounded-lg text-brand-600 hover:bg-brand-50 disabled:opacity-50 transition-colors" title="Vista previa del documento">
            {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          </button>
          <button type="button" onClick={handleSubmit} disabled={!isFormValid || pdfLoading} className="p-2 rounded-lg text-brand-600 hover:bg-brand-50 disabled:opacity-50 transition-colors" title="Exportar PDF">
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 w-full max-w-lg mx-auto">
        <div className="space-y-3">
          <div className="flex-shrink-0">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Filtros</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Desde <span className="text-red-500">*</span></label>
                  <DateInput className="h-8 focus:ring-2 focus:ring-brand-500" value={fechaInicio} onChange={(fecha) => setFechaInicio(fecha)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Hasta <span className="text-red-500">*</span></label>
                  <DateInput className="h-8 focus:ring-2 focus:ring-brand-500" value={fechaFin} onChange={(fecha) => setFechaFin(fecha)} />
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

export default ReporteProyectos;
import { DateInput } from "@/shared/ui/components";
