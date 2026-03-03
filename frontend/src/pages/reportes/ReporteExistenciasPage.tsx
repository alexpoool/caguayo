import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportesService } from '../../services/reportesService';
import { Download, ArrowLeft, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ReporteExistenciasPage() {
  const [dependenciaId, setDependenciaId] = useState<number | undefined>(undefined);

  const { data: stockData, isLoading } = useQuery({
    queryKey: ['reportes', 'stock', dependenciaId],
    queryFn: () => reportesService.getInventarioStock(dependenciaId),
  });

  const handleExport = async () => {
    try {
      await reportesService.downloadStockPdf(dependenciaId);
    } catch (error) {
      console.error("Error downloading PDF:", error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/reportes/inventario" className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Existencias por Producto</h1>
            <p className="text-sm text-gray-500">Consulta de stock actual</p>
          </div>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Generar PDF
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 border-b border-gray-200 flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-700">Filtros:</span>
        <select 
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-64"
            value={dependenciaId || ''}
            onChange={(e) => setDependenciaId(e.target.value ? Number(e.target.value) : undefined)}
        >
            <option value="">Todas las dependencias</option>
            {/* Logic to populate dependencies needed later */}
            <option value="1">Dependencia 1 (Mock)</option>
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                    <tr><td colSpan={4} className="px-6 py-4 text-center">Cargando...</td></tr>
                ) : stockData?.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No hay datos</td></tr>
                ) : (
                    stockData?.map((item) => (
                        <tr key={item.id_producto} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.codigo}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{item.nombre}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.categoria} / {item.subcategoria}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${Number(item.stock_actual) < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                {Number(item.stock_actual).toLocaleString()}
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
