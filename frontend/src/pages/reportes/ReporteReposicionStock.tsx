import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { CopyX, FileText, Download, RotateCw } from "lucide-react";
import { authHelpers } from "../../lib/api";

interface AlertaReposicion {
  codigo: string;
  nombre: string;
  subcategoria: string;
  clasificacion_abc: string;
  stock_actual: number;
  punto_pedido: number;
  stock_minimo: number;
  diferencia: number;
}

const ReporteReposicionStock: React.FC = () => {
  const [loadingDatos, setLoadingDatos] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [data, setData] = useState<AlertaReposicion[]>([]);
  const [totalAlertas, setTotalAlertas] = useState(0);

  const [aprobadoPorNombre, setAprobadoPorNombre] = useState("");
  const [aprobadoPorCargo, setAprobadoPorCargo] = useState("");

  const fetchPreviewData = async () => {
    setLoadingDatos(true);
    try {
      const token = authHelpers.getToken() || "";
      const response = await fetch(
        `http://localhost:8000/api/v1/reportes/alertas-reposicion`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) throw new Error("Error al obtener la vista previa");
      const result = await response.json();
      setData(result.alertas || []);
      setTotalAlertas(result.total_alertas || 0);
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error al cargar los datos de alerta.");
    } finally {
      setLoadingDatos(false);
    }
  };

  useEffect(() => {
    fetchPreviewData();
  }, []);

  const handleExportPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingPdf(true);
    try {
      const params = new URLSearchParams({
        aprobado_por_nombre: aprobadoPorNombre || "",
        aprobado_por_cargo: aprobadoPorCargo || "",
      });

      const token = authHelpers.getToken() || "";
      const response = await fetch(
        `http://localhost:8000/api/v1/reportes/alertas-reposicion/pdf?${params.toString()}`,
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
      a.download = `alertas_reposicion_stock.pdf`;
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
      <div className="flex justify-between items-start flex-col sm:flex-row gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            Reporte: Alertas de Reposición (Stock Crítico)
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Muestra los productos cuyo inventario actual está igual o por debajo
            del Punto de Pedido (ROP).
          </p>
        </div>
        <button
          type="button"
          onClick={fetchPreviewData}
          disabled={loadingDatos}
          className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          <RotateCw
            className={`w-4 h-4 mr-2 ${loadingDatos ? "animate-spin" : ""}`}
          />
          {loadingDatos ? "Actualizando..." : "Actualizar Datos"}
        </button>
      </div>

      <div className="overflow-x-auto border rounded-xl mb-8">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left leading-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Cód.
              </th>
              <th className="px-6 py-3 text-left leading-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Producto
              </th>
              <th className="px-6 py-3 text-left leading-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Categoría
              </th>
              <th className="px-6 py-3 text-center leading-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Clas. ABC
              </th>
              <th className="px-6 py-3 text-right leading-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-6 py-3 text-right leading-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                P. Pedido
              </th>
              <th className="px-6 py-3 text-right leading-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Diferencia
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length > 0 ? (
              data.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.codigo}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 truncate max-w-xs">
                    {item.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.subcategoria}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800`}
                    >
                      {item.clasificacion_abc}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                    {item.stock_actual}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                    {item.punto_pedido}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-red-600">
                    -{item.diferencia}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  {loadingDatos ? (
                    "Cargando inventario..."
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <CopyX className="h-10 w-10 text-gray-300 mb-3" />
                      <span className="text-gray-500 font-medium">
                        No hay alertas
                      </span>
                      <span className="text-gray-400 text-sm">
                        Todos los productos tienen niveles de stock saludables.
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-200">
            <tr>
              <td
                colSpan={6}
                className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800 text-right"
              >
                Total Productos en Alerta
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800 text-right">
                {totalAlertas}
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
              disabled={loadingPdf || data.length === 0}
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

export default ReporteReposicionStock;
