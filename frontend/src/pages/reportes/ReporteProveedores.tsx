import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { CopyX, FileText, Download, RotateCw } from "lucide-react";
import { dependenciasService } from "../../services/administracion";
import { Dependencia } from "../../types/dependencia";
import { authHelpers } from "../../lib/api";

interface Proveedor {
  nombre: string;
  codigo: string;
  saldo: number;
}

const ReporteProveedores: React.FC = () => {
  const [loadingDatos, setLoadingDatos] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [data, setData] = useState<Proveedor[]>([]);
  const [totalSaldo, setTotalSaldo] = useState(0);

  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [provincias, setProvincias] = useState<
    { id_provincia: number; nombre: string }[]
  >([]);

  const [idDependencia, setIdDependencia] = useState<number | null>(null);
  const [tipoEntidad, setTipoEntidad] = useState("");
  const [idProvincia, setIdProvincia] = useState<number | null>(null);

  const [aprobadoPorNombre, setAprobadoPorNombre] = useState("");
  const [aprobadoPorCargo, setAprobadoPorCargo] = useState("");

  useEffect(() => {
    dependenciasService.getDependencias().then(setDependencias);
    dependenciasService.getProvincias().then(setProvincias);
  }, []);

  const fetchPreviewData = async () => {
    if (!idDependencia || !tipoEntidad) {
      toast.error("Complete dependencia y tipo de entidad");
      return;
    }
    setLoadingDatos(true);
    try {
      const params = new URLSearchParams({
        id_dependencia: idDependencia.toString(),
        tipo_entidad: tipoEntidad,
      });

      if (idProvincia) {
        params.append("id_provincia", idProvincia.toString());
      }

      const token = authHelpers.getToken() || "";
      const response = await fetch(
        `http://localhost:8000/api/v1/reportes/proveedores-dependencia/preview?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) throw new Error("Error al obtener la vista previa");
      const result = await response.json();

      const proveedoresList = result.proveedores || [];
      setData(proveedoresList);

      const total = proveedoresList.reduce(
        (acc: number, curr: Proveedor) => acc + curr.saldo,
        0,
      );
      setTotalSaldo(total);
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error al cargar los proveedores.");
      setData([]);
    } finally {
      setLoadingDatos(false);
    }
  };

  const isValidToSearch = Boolean(idDependencia && tipoEntidad);

  useEffect(() => {
    if (isValidToSearch) {
      fetchPreviewData();
    } else {
      setData([]);
      setTotalSaldo(0);
    }
  }, [idDependencia, tipoEntidad, idProvincia]);

  const handleExportPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidToSearch) {
      toast.error("Complete los filtros requeridos");
      return;
    }
    setLoadingPdf(true);
    try {
      const params = new URLSearchParams({
        id_dependencia: idDependencia!.toString(),
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
        },
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
      a.remove();

      toast.success("Reporte exportado exitosamente");
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error al exportar el reporte.");
    } finally {
      setLoadingPdf(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6 border-b pb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          Reporte: Proveedores por Dependencia
        </h2>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          Consulte los proveedores asociados a una dependencia y su saldo
          actual.
        </p>

        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-grow min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Dependencia *
            </label>
            <select
              value={idDependencia || ""}
              onChange={(e) =>
                setIdDependencia(e.target.value ? Number(e.target.value) : null)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
            >
              <option value="">Seleccionar dependencia...</option>
              {dependencias.map((d) => (
                <option key={d.id_dependencia} value={d.id_dependencia}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-grow min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Tipo Entidad *
            </label>
            <select
              value={tipoEntidad}
              onChange={(e) => setTipoEntidad(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
            >
              <option value="">Seleccionar tipo...</option>
              <option value="NATURAL">Persona Natural (Creador)</option>
              <option value="TCP">Trabajador por Cuenta Propia (TCP)</option>
              <option value="JURIDICA">Institución / Empresa</option>
            </select>
          </div>

          <div className="flex-grow min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Provincia (Opcional)
            </label>
            <select
              value={idProvincia || ""}
              onChange={(e) =>
                setIdProvincia(e.target.value ? Number(e.target.value) : null)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
            >
              <option value="">Todas las provincias</option>
              {provincias.map((p) => (
                <option key={p.id_provincia} value={p.id_provincia}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={fetchPreviewData}
            disabled={loadingDatos || !isValidToSearch}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors shrink-0"
          >
            <RotateCw
              className={`w-4 h-4 mr-2 ${loadingDatos ? "animate-spin" : ""}`}
            />
            Actualizar
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-xl mb-8">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left leading-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">
                Código
              </th>
              <th className="px-6 py-3 text-left leading-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">
                Nombre del Proveedor
              </th>
              <th className="px-6 py-3 text-right leading-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/3">
                Saldo
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {!isValidToSearch ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center justify-center">
                    <FileText className="h-10 w-10 text-gray-300 mb-3" />
                    <span className="text-gray-500 font-medium">
                      Complete los filtros
                    </span>
                    <span className="text-gray-400 text-sm">
                      Seleccione dependencia y tipo de entidad.
                    </span>
                  </div>
                </td>
              </tr>
            ) : loadingDatos ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center justify-center">
                    <RotateCw className="h-8 w-8 text-indigo-400 mb-3 animate-spin" />
                    <span>Cargando proveedores...</span>
                  </div>
                </td>
              </tr>
            ) : data.length > 0 ? (
              data.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.codigo}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {item.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-bold">
                    ${item.saldo.toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center justify-center">
                    <CopyX className="h-10 w-10 text-gray-300 mb-3" />
                    <span className="text-gray-500 font-medium">
                      Sin resultados
                    </span>
                    <span className="text-gray-400 text-sm">
                      No se encontraron proveedores con estos filtros.
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-200">
            <tr>
              <td
                colSpan={2}
                className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800 text-right"
              >
                Saldo Total
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800 text-right">
                ${totalSaldo.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
          <FileText className="w-5 h-5 mr-2 text-indigo-600" />
          Opciones de Exportación
        </h3>
        <form
          onSubmit={handleExportPdf}
          className="bg-gray-50 p-5 rounded-lg border border-gray-200"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Aprobado Por (Nombre)
              </label>
              <input
                type="text"
                value={aprobadoPorNombre}
                onChange={(e) => setAprobadoPorNombre(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              type="submit"
              disabled={loadingPdf || data.length === 0 || !isValidToSearch}
              className="flex items-center px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <Download className="w-5 h-5 mr-2" />
              {loadingPdf ? "Generando Archivo..." : "Descargar Reporte PDF"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export { ReporteProveedores };
