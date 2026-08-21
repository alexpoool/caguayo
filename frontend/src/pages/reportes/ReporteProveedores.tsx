import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { dependenciasService } from "../../services/administracion";
import { Dependencia } from "../../types/dependencia";
import { authHelpers } from "../../lib/api";
import { UserCircle, Download, Eye, Loader2 } from "lucide-react";
import ReportNotes from "../../components/ui/ReportNotes";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

const ReporteProveedores: React.FC = () => {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [provincias, setProvincias] = useState<{ id_provincia: number; nombre: string }[]>([]);
  const [idDependencia, setIdDependencia] = useState<number | null>(null);
  const [tipoEntidad, setTipoEntidad] = useState("");
  const [idProvincia, setIdProvincia] = useState<number | null>(null);
  const [notas, setNotas] = useState("");

  const user = useMemo(() => authHelpers.getUser(), []);
  const userName = user ? `${user.nombre} ${user.primer_apellido}${user.segundo_apellido ? " " + user.segundo_apellido : ""}`.trim() : "";
  const userCargo = user?.cargo || "";

  const isFormValid = Boolean(idDependencia && tipoEntidad);

  useEffect(() => {
    dependenciasService.getDependencias().then(setDependencias).catch(() => toast.error("Error cargando dependencias"));
    dependenciasService.getProvincias().then(setProvincias).catch(() => toast.error("Error cargando provincias"));
  }, []);

  const buildParams = () => {
    const p = new URLSearchParams({
      id_dependencia: idDependencia!.toString(), tipo_entidad: tipoEntidad,
      aprobado_por_nombre: userName, aprobado_por_cargo: userCargo, notas,
    });
    if (idProvincia) p.append("id_provincia", idProvincia.toString());
    return p;
  };

  const handlePreview = async () => {
    if (!isFormValid) { toast.error("Seleccione dependencia y tipo"); return; }
    setPreviewLoading(true);
    try {
      const token = authHelpers.getToken() || "";
      const r = await fetch(`${BASE_URL}/reportes/proveedores-dependencia?${buildParams()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`${r.status}`);
      window.open(window.URL.createObjectURL(await r.blob()), "_blank");
    } catch { toast.error("Error al generar vista previa"); } finally { setPreviewLoading(false); }
  };

  const handleSubmit = async () => {
    if (!isFormValid) { toast.error("Seleccione dependencia y tipo"); return; }
    setPdfLoading(true);
    try {
      const token = authHelpers.getToken() || "";
      const r = await fetch(`${BASE_URL}/reportes/proveedores-dependencia?${buildParams()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`${r.status}`);
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = window.URL.createObjectURL(blob);
      a.download = `proveedores_${idDependencia}.pdf`;
      a.click();
      toast.success("Reporte generado");
    } catch { toast.error("Error al generar reporte"); } finally { setPdfLoading(false); }
  };

  return (
    <div className="flex flex-col p-4">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
            <UserCircle className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Proveedores por Dependencia</h1>
            <p className="text-xs text-gray-500">Listado filtrado por tipo y provincia</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={handlePreview} disabled={!isFormValid || previewLoading} className="p-2 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors" title="Vista previa del documento">
            {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          </button>
          <button type="button" onClick={handleSubmit} disabled={!isFormValid || pdfLoading} className="p-2 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors" title="Exportar PDF">
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
                  <select value={idDependencia ?? ""} onChange={e => setIdDependencia(e.target.value ? Number(e.target.value) : null)} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white" required>
                    <option value="">Seleccionar dependencia</option>
                    {dependencias.map(d => <option key={d.id_dependencia} value={d.id_dependencia}>{d.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Tipo de proveedor <span className="text-red-500">*</span></label>
                  <select value={tipoEntidad} onChange={e => setTipoEntidad(e.target.value)} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white" required>
                    <option value="">Seleccionar tipo</option>
                    <option value="NATURAL">Persona Natural</option>
                    <option value="TCP">TCP</option>
                    <option value="JURIDICA">Institución / Empresa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Provincia <span className="text-gray-400 font-normal">(opc.)</span></label>
                  <select value={idProvincia ?? ""} onChange={e => setIdProvincia(e.target.value ? Number(e.target.value) : null)} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white">
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
