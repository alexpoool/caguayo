import React, { useState, useEffect } from "react";
import type { CasosUsoReportes } from '../application/casos-uso';
import { useAuth } from '@/shared/ui/auth';
import { toast } from "react-hot-toast";

import { Dependencia } from "../domain/reportes";

import { UserCircle, Download, Eye, Loader2 } from "lucide-react";
import ReportNotes from "@/shared/ui/components/ReportNotes";


import { abrirBlob, descargarBlob } from '@/utils/archivos';

const ReporteProveedores: React.FC<{ casosUso: CasosUsoReportes }> = ({ casosUso }) => {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [provincias, setProvincias] = useState<{ id_provincia: number; nombre: string }[]>([]);
  const [idDependencia, setIdDependencia] = useState<number | null>(null);
  const [idProvincia, setIdProvincia] = useState<number | null>(null);
  const [notas, setNotas] = useState("");

  const { user } = useAuth();
  const userName = user ? `${user.nombre} ${user.primer_apellido}${user.segundo_apellido ? " " + user.segundo_apellido : ""}`.trim() : "";
  const userCargo = user?.cargo || "";

  useEffect(() => {
    casosUso.listarDependencias().then(setDependencias).catch(() => toast.error("Error cargando dependencias"));
    casosUso.listarProvincias().then(setProvincias).catch(() => toast.error("Error cargando provincias"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildParams = () => {
    const p = new URLSearchParams({
      aprobado_por_nombre: userName, aprobado_por_cargo: userCargo, notas,
    });
    if (idDependencia) p.append("id_dependencia", idDependencia.toString());
    if (idProvincia) p.append("id_provincia", idProvincia.toString());
    return p;
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
            const r = await casosUso.generarReporte('/reportes/proveedores-dependencia', Object.fromEntries(buildParams()));
      abrirBlob(r);
    } catch { toast.error("Error al generar vista previa"); } finally { setPreviewLoading(false); }
  };

  const handleSubmit = async () => {
    setPdfLoading(true);
    try {
            const r = await casosUso.generarReporte('/reportes/proveedores-dependencia', Object.fromEntries(buildParams()));
      const blob = r;
      descargarBlob(blob, "proveedores.pdf");
      toast.success("Reporte generado");
    } catch { toast.error("Error al generar reporte"); } finally { setPdfLoading(false); }
  };

  return (
    <div className="flex flex-col p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <UserCircle className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Registro de Proveedores</h1>
            <p className="text-xs text-gray-500">Listado de todos los proveedores registrados</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={handlePreview} disabled={previewLoading} className="p-2 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors" title="Vista previa del documento">
            {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          </button>
          <button type="button" onClick={handleSubmit} disabled={pdfLoading} className="p-2 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors" title="Exportar PDF">
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
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Dependencia <span className="text-gray-400 font-normal">(opc.)</span></label>
                  <select value={idDependencia ?? ""} onChange={e => setIdDependencia(e.target.value ? Number(e.target.value) : null)} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-base sm:text-sm focus:ring-2 focus:ring-green-500 bg-white">
                    <option value="">Todas</option>
                    {dependencias.map(d => <option key={d.id_dependencia} value={d.id_dependencia}>{d.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Provincia <span className="text-gray-400 font-normal">(opc.)</span></label>
                  <select value={idProvincia ?? ""} onChange={e => setIdProvincia(e.target.value ? Number(e.target.value) : null)} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-base sm:text-sm focus:ring-2 focus:ring-green-500 bg-white">
                    <option value="">Todas</option>
                    {provincias.map(p => <option key={p.id_provincia} value={p.id_provincia}>{p.nombre}</option>)}
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

export default ReporteProveedores;
