import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { dependenciasService } from "../../services/administracion";
import { Dependencia } from "../../types/dependencia";
import { authHelpers } from "../../lib/api";

const ReporteProveedores: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [provincias, setProvincias] = useState<{ id_provincia: number; nombre: string }[]>([]);
  const [idDependencia, setIdDependencia] = useState<number | null>(null);
  const [tipoEntidad, setTipoEntidad] = useState("");
  const [idProvincia, setIdProvincia] = useState<number | null>(null);
  const [aprobadoPorNombre, setAprobadoPorNombre] = useState("");
  const [aprobadoPorCargo, setAprobadoPorCargo] = useState("");

  useEffect(() => {
    dependenciasService.getDependencias().then(setDependencias);
    dependenciasService.getProvincias().then(setProvincias);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idDependencia || !tipoEntidad) {
      toast.error("Complete todos los campos requeridos");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        id_dependencia: idDependencia.toString(),
        tipo_entidad: tipoEntidad,
        aprobado_por_nombre: aprobadoPorNombre || "",
        aprobado_por_cargo: aprobadoPorCargo || "",
      });

      if (idProvincia) {
        params.append("id_provincia", idProvincia.toString());
      }

      const token = authHelpers.getToken() || "";
      const response = await fetch(
        `http://localhost:8000/api/v1/reportes/proveedores-dependencia?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proveedores_dependencia_${idDependencia}.pdf`;
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Reporte generado exitosamente");
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error al generar el reporte.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Generar Reporte: Proveedores por Dependencia</h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dependencia *
            </label>
            <select
              value={idDependencia || ""}
              onChange={(e) => setIdDependencia(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Seleccionar dependencia</option>
              {dependencias.map((d) => (
                <option key={d.id_dependencia} value={d.id_dependencia}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Proveedor *
            </label>
            <select
              value={tipoEntidad}
              onChange={(e) => setTipoEntidad(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Seleccionar tipo</option>
              <option value="NATURAL">Persona Natural (Creador)</option>
              <option value="TCP">Trabajador por Cuenta Propia (TCP)</option>
              <option value="JURIDICA">Institución / Empresa (Jurídica)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provincia (Opcional)
            </label>
            <select
              value={idProvincia || ""}
              onChange={(e) => setIdProvincia(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todas las provincias</option>
              {provincias.map((p) => (
                <option key={p.id_provincia} value={p.id_provincia}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <h3 className="text-md font-medium text-gray-800 mt-6 mb-3">Firmas e Información Adicional</h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Aprobado Por (Nombre)
            </label>
            <input
              type="text"
              value={aprobadoPorNombre}
              onChange={(e) => setAprobadoPorNombre(e.target.value)}
              placeholder="Ej. Juan Pérez"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cargo del Aprobador
            </label>
            <input
              type="text"
              value={aprobadoPorCargo}
              onChange={(e) => setAprobadoPorCargo(e.target.value)}
              placeholder="Ej. Director General"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Generando..." : "Generar PDF"}
        </button>
      </form>
    </div>
  );
};

export default ReporteProveedores;
