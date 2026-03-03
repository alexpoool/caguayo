import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportesService } from '../../services/reportesService';
import { Download, ArrowLeft, Filter, Search, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export function ReporteKardexPage() {
  const [productoId, setProductoId] = useState<number | undefined>(undefined);
  const [searchCode, setSearchCode] = useState(''); // Just a text input for ID for now, improved with full search later
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');

  const { data: movimientosData, isLoading } = useQuery({
    queryKey: ['reportes', 'kardex', productoId, fechaInicio, fechaFin],
    queryFn: () => reportesService.getInventarioMovimientos({
      fecha_inicio: fechaInicio || undefined,
      fecha_fin: fechaFin || undefined,
      id_producto: productoId
    }),
    enabled: !!productoId
  });

  const handleExport = async () => {
    try {
      await reportesService.downloadMovimientosPdf({
        fecha_inicio: fechaInicio || undefined,
        fecha_fin: fechaFin || undefined,
        id_producto: productoId
      });
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
            <h1 className="text-lg font-bold text-gray-800">Movimientos por Producto (Kardex)</h1>
            <p className="text-sm text-gray-500">Trazabilidad detallada por artículo</p>
          </div>
        </div>
        <button 
          onClick={handleExport}
          disabled={!productoId}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Generar PDF
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 border-b border-gray-200 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 border-r pr-4 border-gray-200">
            <Search className="w-4 h-4 text-gray-400" />
            <input 
                type="text"
                placeholder="ID Producto (Temporal)"
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-40"
                value={searchCode}
                onChange={(e) => {
                    setSearchCode(e.target.value);
                    if (e.target.value) setProductoId(Number(e.target.value));
                    else setProductoId(undefined);
                }}
            />
            {/* Note: In a real implementation this would be a Product Combobox/Autocomplete */}
        </div>

        <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
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
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {!productoId ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                <Search className="w-12 h-12 mb-2 opacity-20" />
                <p>Seleccione un producto para ver su historial</p>
            </div>
        ) : (
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dependencia</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observación</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Entrada</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Salida</th>
                            {/* <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th> */}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (
                            <tr><td colSpan={6} className="px-6 py-4 text-center">Cargando...</td></tr>
                        ) : movimientosData?.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No hay movimientos en este período</td></tr>
                        ) : (
                            movimientosData?.map((item) => (
                                <tr key={item.id_movimiento} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {format(new Date(item.fecha), 'dd/MM/yyyy HH:mm')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.factor > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {item.tipo}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.dependencia}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{item.observacion || '-'}</td>
                                    
                                    {/* Entrada Column */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                                        {item.factor > 0 ? item.cantidad : '-'}
                                    </td>
                                    
                                    {/* Salida Column */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                                        {item.factor < 0 ? item.cantidad : '-'}
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
