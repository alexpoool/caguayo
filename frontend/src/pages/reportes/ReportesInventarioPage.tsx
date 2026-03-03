import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportesService, StockReportData, MovimientosReportData } from '../../services/reportesService';
import { FileText, Filter, Calendar, Search, Download } from 'lucide-react';
import { format } from 'date-fns';

export function ReportesInventarioPage() {
  const [activeTab, setActiveTab] = useState<'existencias' | 'movimientos'>('existencias');
  
  // Filters
  const [dependenciaId, setDependenciaId] = useState<number | undefined>(undefined);
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [productoId, setProductoId] = useState<number | undefined>(undefined);

  const { data: stockData, isLoading: loadingStock } = useQuery({
    queryKey: ['reportes', 'stock', dependenciaId],
    queryFn: () => reportesService.getInventarioStock(dependenciaId),
    enabled: activeTab === 'existencias'
  });

  const { data: movimientosData, isLoading: loadingMovimientos } = useQuery({
    queryKey: ['reportes', 'movimientos', fechaInicio, fechaFin, dependenciaId, productoId],
    queryFn: () => reportesService.getInventarioMovimientos({
      fecha_inicio: fechaInicio || undefined,
      fecha_fin: fechaFin || undefined,
      id_dependencia: dependenciaId, 
      id_producto: productoId
    }),
    enabled: activeTab === 'movimientos'
  });

  const handleExport = async () => {
    try {
        if (activeTab === 'existencias') {
            await reportesService.downloadStockPdf(dependenciaId);
        } else {
            await reportesService.downloadMovimientosPdf({
                fecha_inicio: fechaInicio || undefined,
                fecha_fin: fechaFin || undefined,
                id_dependencia: dependenciaId, 
                id_producto: productoId
            });
        }
    } catch (error) {
        console.error("Error downloading PDF:", error);
        // Toast error
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reportes de Inventario</h1>
          <p className="text-gray-600">Visualiza y analiza el estado y movimientos del inventario</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 text-gray-700 shadow-sm"
            >
                <Download className="w-4 h-4" />
                Exportar PDF
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('existencias')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'existencias'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Existencias Actuales
          </button>
          <button
            onClick={() => setActiveTab('movimientos')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'movimientos'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            Historial de Movimientos
          </button>
        </nav>
      </div>

      {/* Filters (simplified for now) */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-gray-600">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            {/* Dependency Filter Mockup - needs actual select populated from API */}
            <select 
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                value={dependenciaId || ''}
                onChange={(e) => setDependenciaId(e.target.value ? Number(e.target.value) : undefined)}
            >
                <option value="">Todas las dependencias</option>
                {/* Dynamically load dependencies here */}
            </select>

            {activeTab === 'movimientos' && (
                <>
                    <input 
                        type="date" 
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                    />
                    <span className="text-gray-400">-</span>
                    <input 
                        type="date" 
                        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                    />
                </>
            )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {activeTab === 'existencias' && (
            <div className="overflow-x-auto">
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
                        {loadingStock ? (
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
        )}

        {activeTab === 'movimientos' && (
             <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-gray-200">
                 <thead className="bg-gray-50">
                     <tr>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dependencia</th>
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observación</th>
                         <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cant.</th>
                     </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                     {loadingMovimientos ? (
                         <tr><td colSpan={6} className="px-6 py-4 text-center">Cargando...</td></tr>
                     ) : movimientosData?.length === 0 ? (
                         <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No hay movimientos en este período</td></tr>
                     ) : (
                         movimientosData?.map((item) => (
                             <tr key={item.id_movimiento} className="hover:bg-gray-50">
                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                     {format(new Date(item.fecha), 'dd/MM/yyyy HH:mm')}
                                 </td>
                                 <td className="px-6 py-4 text-sm text-gray-900 font-medium">{item.producto}</td>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                     <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.factor > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                         {item.tipo}
                                     </span>
                                 </td>
                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.dependencia}</td>
                                 <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{item.observacion || '-'}</td>
                                 <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${item.factor > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                     {item.factor > 0 ? '+' : ''}{item.cantidad}
                                 </td>
                             </tr>
                         ))
                     )}
                 </tbody>
             </table>
         </div>
        )}
      </div>
    </div>
  );
}
