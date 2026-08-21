import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { dependenciasService } from "../../services/administracion";
import { authHelpers } from "../../lib/api";
import { UserCircle, Download, Eye, Loader2 } from "lucide-react";
import ReportNotes from "../../components/ui/ReportNotes";
import type { Provincia, Municipio } from "../../types/ubicacion";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

const ReporteCreadores: React.FC = () => {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [idProvincia, setIdProvincia] = useState<number | null>(null);
  const [idMunicipio, setIdMunicipio] = useState<number | null>(null);
  const [vigencia, setVigencia] = useState("");
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [notas, setNotas] = useState("");

  const user = useMemo(() => authHelpers.getUser(), []);
  const userName = user ? `${user.nombre} ${user.primer_apellido}${user.segundo_apellido ? " " + user.segundo_apellido : ""}`.trim() : "";
  const userCargo = user?.cargo || "";

  useEffect(() => { dependenciasService.getProvincias().then(setProvincias).catch(() => toast.error("Error cargando provincias")); }, []);
  useEffect(() => {
    if (!idProvincia) { setMunicipios([]); setIdMunicipio(null); return; }
    dependenciasService.getMunicipios(idProvincia).then(setMunicipios).catch(() => toast.error("Error cargando municipios"));
  }, [idProvincia]);

  const buildParams = () => {
    const p = new URLSearchParams({
      aprobado_por_nombre: userName, aprobado_por_cargo: userCargo, notas,
    });
    if (idProvincia) p.append("id_provincia", idProvincia.toString());
    if (idMunicipio) p.append("id_municipio", idMunicipio.toString());
    if (vigencia) p.append("vigencia", vigencia);
    if (textoBusqueda.trim()) p.append("texto_busqueda", textoBusqueda.trim());
    return p;
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const token = authHelpers.getToken() ?? "";
      const r = await fetch(`${BASE_URL}/proyecto/?${buildParams()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`${r.status}`);
      window.open(window.URL.createObjectURL(await r.blob()), "_blank");
    } catch { toast.error("Error al generar vista previa"); } finally { setPreviewLoading(false); }
  };

  const handleSubmit = async () => {
    setPdfLoading(true);
    try {
      const token = authHelpers.getToken() ?? "";
      const r = await fetch(`${BASE_URL}/proyecto/?${buildParams()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`${r.status}`);
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = window.URL.createObjectURL(blob);
      a.download = "creadores.pdf";
      a.click();
      toast.success("Reporte generado");
    } catch { toast.error("Error al generar reporte"); } finally { setPdfLoading(false); }
  };

  return (
    <div className="flex flex-col p-4">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
            <UserCircle className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Registro de Creadores</h1>
            <p className="text-xs text-gray-500">Filtrado por ubicación y vigencia</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={handlePreview} disabled={previewLoading} className="p-2 rounded-lg text-teal-600 hover:bg-teal-50 disabled:opacity-50 transition-colors" title="Vista previa del documento">
            {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          </button>
          <button type="button" onClick={handleSubmit} disabled={pdfLoading} className="p-2 rounded-lg text-teal-600 hover:bg-teal-50 disabled:opacity-50 transition-colors" title="Exportar PDF">
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
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Búsqueda</label>
                  <input type="text" value={textoBusqueda} onChange={e => setTextoBusqueda(e.target.value)} placeholder="Nombre, CI, código..." className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Provincia</label>
                    <select value={idProvincia ?? ""} onChange={e => { setIdProvincia(e.target.value ? Number(e.target.value) : null); setIdMunicipio(null); }} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 bg-white">
                      <option value="">Todas</option>
                      {provincias.map(p => <option key={p.id_provincia} value={p.id_provincia}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5">Municipio</label>
                    <select value={idMunicipio ?? ""} onChange={e => setIdMunicipio(e.target.value ? Number(e.target.value) : null)} disabled={!idProvincia} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 bg-white disabled:bg-gray-50">
                      <option value="">{idProvincia ? "Todos" : "Primero provincia"}</option>
                      {municipios.map(m => <option key={m.id_municipio} value={m.id_municipio}>{m.nombre}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Vigencia</label>
                  <select value={vigencia} onChange={e => setVigencia(e.target.value)} className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 bg-white">
                    <option value="">Todos</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
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

export default ReporteCreadores;
