import { API_BASE_URL } from "../../lib/api";
import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { CopyX, FileText, Download, RotateCw } from "lucide-react";
import { dependenciasService } from "../../services/administracion";
import { productosService } from "../../services/api";
import { Dependencia } from "../../types/dependencia";
import { authHelpers } from "../../lib/api";

interface ProductoMin {
  id_producto: number;
  codigo: string;
  nombre: string;
}

interface MovimientoProducto {
  movimiento: string;
  tipo: string;
  fecha: string;
  estado: string;
  cantidad: number;
}

const ReporteMovimientosProducto: React.FC = () => {
  const [loadingDatos, setLoadingDatos] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [data, setData] = useState<MovimientoProducto[]>([]);
  const [totalMovimientos, setTotalMovimientos] = useState(0);

  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [productos, setProductos] = useState<ProductoMin[]>([]);

  const [idDependencia, setIdDependencia] = useState<number | null>(null);
  const [idProducto, setIdProducto] = useState<number | null>(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const [aprobadoPorNombre, setAprobadoPorNombre] = useState("");
  const [aprobadoPorCargo, setAprobadoPorCargo] = useState("");

  useEffect(() => {
    dependenciasService.getDependencias().then(setDependencias);
    productosService
      .getProductos(0, 1000)
      .then((res: any) =>
        setProductos(Array.isArray(res) ? res : res.items || []),
      );
  }, []);

  const isValidToSearch = Boolean(
    idDependencia && idProducto && fechaInicio && fechaFin,
  );

  const fetchPreviewData = async () => {
    if (!isValidToSearch) {
      toast.error("Complete todos los filtros requeridos");
      return;
    }
    setLoadingDatos(true);
    try {
      const params = new URLSearchParams({
        id_dependencia: idDependencia!.toString(),
        id_producto: idProducto!.toString(),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      });

      const token = authHelpers.getToken() || "";
      const response = await fetch(
        `${API_BASE_URL}/reportes/movimientos-producto/preview?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) throw new Error("Error al obtener la vista previa");
      const result = await response.json();

      const movimientosList = result.movimientos || [];
      setData(movimientosList);
      setTotalMovimientos(movimientosList.length);
    } catch (error) {
      console.error(error);
      toast.error("Hubo un error al cargar el kardex del producto.");
      setData([]);
    } finally {
      setLoadingDatos(false);
    }
  };

  useEffect(() => {
    if (isValidToSearch) {
      fetchPreviewData();
    } else {
      setData([]);
      setTotalMovimientos(0);
    }
  }, [idDependencia, idProducto, fechaInicio, fechaFin]);

  const handleExportPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidToSearch) {
      toast.error("Complete los filtros requeridos antes de exportar");
      return;
    }
    setLoadingPdf(true);
    try {
      const params = new URLSearchParams({
        id_dependencia: idDependencia!.toString(),
        id_producto: idProducto!.toString(),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        aprobado_por_nombre: aprobadoPorNombre || "",
        aprobado_por_cargo: aprobadoPorCargo || "",
      });

      const token = authHelpers.getToken() || "";
      const response = await fetch(
        `${API_BASE_URL}/reportes/movimientos-producto?${params.toString()}`,
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
      a.download = `kardex_producto_${idProducto}_dep_${idDependencia}.pdf`;
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
          Reporte: Kardex de Producto
        </h2>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          Consulte todos los movimientos físicos que afectaron el inventario de
          un artículo específico.
        </p>

        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-grow min-w-[200px] w-1/4">
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

          <div className="flex-grow min-w-[200px] w-1/4">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Producto *
            </label>
            <select
              value={idProducto || ""}
              onChange={(e) =>
                setIdProducto(e.target.value ? Number(e.target.value) : null)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
            >
              <option value="">Seleccionar producto...</option>
              {productos.map((p) => (
                <option key={p.id_producto} value={p.id_producto}>
                  {p.codigo} - {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="w-1/6 min-w-[140px]">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Fecha Inicio *
            </label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
            />
          </div>

          <div className="w-1/6 min-w-[140px]">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Fecha Fin *
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
            />
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
              <th className="px-6 py-3 text-left leading-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-3 text-left leading-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Documento
              </th>
              <th className="px-6 py-3 text-center leading-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-center leading-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-right leading-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Unidades
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {!isValidToSearch ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center justify-center">
                    <FileText className="h-10 w-10 text-gray-300 mb-3" />
                    <span className="text-gray-500 font-medium">
                      Complete los filtros
                    </span>
                    <span className="text-gray-400 text-sm">
                      Seleccione dependencia, producto y un rango de fechas.
                    </span>
                  </div>
                </td>
              </tr>
            ) : loadingDatos ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center justify-center">
                    <RotateCw className="h-8 w-8 text-indigo-400 mb-3 animate-spin" />
                    <span>Cargando transacciones...</span>
                  </div>
                </td>
              </tr>
            ) : data.length > 0 ? (
              data.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.fecha).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.movimiento}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.tipo.includes("IN") || item.tipo.includes("RECEpcion") ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}
                    >
                      {item.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.estado.toLowerCase() === "confirmado" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}
                    >
                      {item.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-bold">
                    {item.cantidad}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center justify-center">
                    <CopyX className="h-10 w-10 text-gray-300 mb-3" />
                    <span className="text-gray-500 font-medium">
                      Sin variaciones de stock
                    </span>
                    <span className="text-gray-400 text-sm">
                      Este producto no tuvo movimientos en las fechas indicadas.
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-gray-50 border-t-2 border-gray-200">
            <tr>
              <td
                colSpan={4}
                className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800 text-right"
              >
                Operaciones Registradas
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800 text-right">
                {totalMovimientos}
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

export { ReporteMovimientosProducto };
