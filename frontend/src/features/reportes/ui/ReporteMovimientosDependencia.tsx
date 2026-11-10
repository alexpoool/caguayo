import React, { useState, useEffect, useMemo } from "react";
import type { CasosUsoReportes } from '../application/casos-uso';
import { useAuth } from '@/shared/ui/auth';
import { toast } from "react-hot-toast";

import { Dependencia } from "../domain/reportes";

import { ArrowLeftRight, Download, Building2, Eye, Loader2, Table2 } from "lucide-react";
import ReportNotes from "@/shared/ui/components/ReportNotes";
import { ReportPreviewTable } from "@/shared/ui/components/ReportPreviewTable";


import { abrirBlob, descargarBlob } from '@/utils/archivos';

const ReporteMovimientosDependencia: React.FC<{ casosUso: CasosUsoReportes }> = ({ casosUso }) => {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [idDependencia, setIdDependencia] = useState<number | null>(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [notas, setNotas] = useState("");
  const [previewData, setPreviewData] = useState<any[] | null>(null);

  const { user } = useAuth();
  const userName = user ? `${user.nombre} ${user.primer_apellido}${user.segundo_apellido ? " " + user.segundo_apellido : ""}`.trim() : "";
  const userCargo = user?.cargo || "";

  const selectedDep = useMemo(() => dependencias.find(d => d.id_dependencia === idDependencia) ?? null, [dependencias, idDependencia]);
  const isFormValid = Boolean(idDependencia && fechaInicio && fechaFin);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { casosUso.listarDependencias().then(setDependencias).catch(() => toast.error("Error cargando dependencias")); }, []);

  const buildParams = () => new URLSearchParams({
    id_dependencia: idDependencia!.toString(), fecha_inicio: fechaInicio, fecha_fin: fechaFin,
    aprobado_por_nombre: userName, aprobado_por_cargo: userCargo, notas,
  });

  const handleTablePreview = async () => {
    if (!isFormValid) { toast.error("Complete los campos requeridos"); return; }
    setTableLoading(true);
    setPreviewData(null);
    try {
      const json: any = await casosUso.consultarReporte(
        '/reportes/movimientos-dependencia/preview',
        {
          id_dependencia: String(idDependencia),
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
        },
      );
      setPreviewData(json.items || []);
    } catch { toast.error("Error al cargar vista previa"); } finally { setTableLoading(false); }
  };

  const handlePreview = async () => {
    if (!isFormValid) { toast.error("Complete los campos requeridos"); return; }
    setPreviewLoading(true);
    try {
            const r = await casosUso.generarReporte('/reportes/movimientos-dependencia', Object.fromEntries(buildParams()));
      abrirBlob(r);
    } catch { toast.error("Error al generar vista previa"); } finally { setPreviewLoading(false); }
  };

  const handleSubmit = async () => {
    if (!isFormValid) { toast.error("Complete los campos requeridos"); return; }
    setPdfLoading(true);
    try {
            const r = await casosUso.generarReporte('/reportes/movimientos-dependencia', Object.fromEntries(buildParams()));
      const blob = r;
      descargarBlob(blob, `movimientos_dep_${idDependencia}.pdf`);
      toast.success("Reporte generado");
    } catch { toast.error("Error al generar reporte"); } finally { setPdfLoading(false); }
  };

  return (
    <div className="flex flex-col p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
            <ArrowLeftRight className="w-4 h-4 text-brand-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Movimientos por Dependencia</h1>
            <p className="text-xs text-gray-500">Historial de movimientos en un rango de fechas</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={handleTablePreview} disabled={!isFormValid || tableLoading} className="p-2 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors" title="Vista previa de tabla">
            {tableLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Table2 className="w-4 h-4" />}
          </button>
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
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Dependencia <span className="text-red-500">*</span></label>
                  <select value={idDependencia ?? ""} onChange={e => { setIdDependencia(e.target.value ? Number(e.target.value) : null); setPreviewData(null); }} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-base sm:text-sm focus:ring-2 focus:ring-brand-500 bg-white">
                    <option value="">Seleccionar…</option>
                    {dependencias.map(d => <option key={d.id_dependencia} value={d.id_dependencia}>{d.nombre}</option>)}
                  </select>
                  {selectedDep?.direccion && <p className="flex items-center gap-1 mt-1 text-[10px] text-gray-400"><Building2 className="w-3 h-3 flex-shrink-0" />{selectedDep.direccion}</p>}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Desde <span className="text-red-500">*</span></label>
                    <DateInput className="h-11 sm:h-8 focus:ring-2 focus:ring-brand-500" value={fechaInicio} onChange={(fecha) => { setFechaInicio(fecha); setPreviewData(null); }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Hasta <span className="text-red-500">*</span></label>
                    <DateInput className="h-11 sm:h-8 focus:ring-2 focus:ring-brand-500" value={fechaFin} onChange={(fecha) => { setFechaFin(fecha); setPreviewData(null); }} />
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
              { key: "codigo", label: "Código" },
              { key: "nombre", label: "Nombre" },
              { key: "saldo_inicial", label: "Saldo Inicial", className: "text-right", render: (v: any) => Number(v ?? 0).toFixed(2) },
              { key: "recepcion", label: "Recepción", className: "text-right" },
              { key: "compra", label: "Compra", className: "text-right" },
              { key: "venta", label: "Venta", className: "text-right" },
              { key: "merma", label: "Merma", className: "text-right" },
              { key: "donacion", label: "Donación", className: "text-right" },
              { key: "devolucion", label: "Devolución", className: "text-right" },
              { key: "saldo_final", label: "Saldo Final", className: "text-right font-semibold", render: (v: any) => Number(v ?? 0).toFixed(2) },
            ]}
            data={previewData}
            totalItems={previewData.length}
          />
        </div>
      )}
    </div>
  );
};

export default ReporteMovimientosDependencia;
import { DateInput } from "@/shared/ui/components";
