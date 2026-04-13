import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { CopyX, FileText, Download, RotateCw } from "lucide-react";
import { dependenciasService } from "../../services/administracion";
import { Dependencia } from "../../types/dependencia";
import { authHelpers } from "../../lib/api";

interface Existencia {
  codigo: string;
  descripcion: string;
  cantidad: number;
}

const ReporteExistencias: React.FC = () => {
  const [loadingDatos, setLoadingDatos] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [data, setData] = useState<Existencia[]>([]);
  const [totalElementos, setTotalElementos] = useState(0);

  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [idDependencia, setIdDependencia] = useState<number | null>(null);

  const [aprobadoPorNombre, setAprobadoPorNombre] = useState("");
  const [aprobadoPorCargo, setAprobadoPorCargo] = useState("");

  useEffect(() => {
    dependenciasService.getDependencias().then(setDependencias);
  }, []);

  const fetchPreviewData = async () => {
    if (!idDependencia) {
      toast.error("Seleccione una dependencia primero");
      return;
    }
    setLoadingDatos(true);
    try {
      const token = authHelpers.getToken() || "";
      const response = await fetch(
        `http://localhost:8000/api/v1/reportes/existencias/preview?id_dependencia=${idDependencia}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) throw new Error("Error al obtener la vista previa");
      const result = await response.json();

      const existenciasList = result.existencias || [];
      setData(existenciasList);

      // Calculate total
      const total = existenciasList.reduce(
        (acc: number, curr: Existencia) => acc + curr.cantidad,
        0,
      );
      setTotalElementos(total);
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error al cargar las existencias.");
      setData([]);
    } finally {
      setLoadingDatos(false);
    }
  };

  useEffect(() => {
    if (idDependencia) {
      fetchPreviewData();
    } else {
      setData([]);
    }
  }, [idDependencia]);

  const handleExportPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idDependencia) {
      toast.error("Seleccione una dependencia");
      return;
    }
    setLoadingPdf(true);
    try {
      const params = new URLSearchParams({
        id_dependencia: idDependencia.toString(),
        aprobado_por_nombre: aprobadoPorNombre || "",
        aprobado_por_cargo: aprobadoPorCargo || "",
      });

      const token = authHelpers.getToken() || "";
      const response = await fetch(
        `http://localhost:8000/api/v1/reportes/existencias?${params.toString()}`,
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
      a.download = `existencias_dependencia_${idDependencia}.pdf`;
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Reporte: Existencias en Almacén
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Muestra un balance detallado de la cantidad actual de productos por
            dependencia.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex-grow sm:w-64">
            <select
              value={idDependencia || ""}
              onChange={(e) =>
                setIdDependencia(e.target.value ? Number(e.target.value) : null)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
              required
            >
              <option value="">Seleccionar dependencia...</option>
              {dependencias.map((d) => (
                <option key={d.id_dependencia} value={d.id_dependencia}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={fetchPreviewData}
            disabled={loadingDatos || !idDependencia}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors shrink-0"
          >
            <RotateCw
              className={`w-4 h-4 sm:mr-2 ${loadingDatos ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">
              {loadingDatos ? "Actualizando" : "Actualizar"}
            </span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-xl mb-8">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left leading-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/4">
                Código
              </th>
              <th className="px-6 py-3 text-left leading-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-2/4">
                Descripción de Producto
              </th>
              <th className="px-6 py-3 text-right leading-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/4">
                Cantidad Actual
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {!idDependencia ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center justify-center">
                    <FileText className="h-10 w-10 text-gray-300 mb-3" />
                    <span className="text-gray-500 font-medium">
                      Seleccione una dependencia
                    </span>
                    <span className="text-gray-400 text-sm">
                      Escoja una dependencia arriba para ver sus existencias.
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
                    <span>Cargando inventario...</span>
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
                    {item.descripcion}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-bold">
                    {item.cantidad}
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
                      Almacén vacío
                    </span>
                    <span className="text-gray-400 text-sm">
                      No hay productos en esta dependencia.
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
                Total Elementos en Inventario
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800 text-right">
                {totalElementos}
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
              disabled={loadingPdf || data.length === 0 || !idDependencia}
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

export { ReporteExistencias };
