import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportesService } from '../../services/reportesService';
import { dependenciasService } from '../../services/administracion';
import { Download, ArrowLeft, Filter, Calendar, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export function ReporteMovimientosDependenciaPage() {
  const [selectedDep, setSelectedDep] = useState<string>('');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  // Derive dependenciaId for API calls
  const dependenciaId = selectedDep && selectedDep !== 'todas' ? Number(selectedDep) : undefined;
  const hasDepSelected = selectedDep !== '';

  // Cargar dependencias reales desde el backend
  const { data: dependencias, isLoading: loadingDeps } = useQuery({
    queryKey: ['dependencias'],
    queryFn: () => dependenciasService.getDependencias(),
  });

  const { data: movimientosData, isLoading } = useQuery({
    queryKey: ['reportes', 'movimientos-dep', dependenciaId, fechaInicio, fechaFin],
    queryFn: () => reportesService.getInventarioMovimientos({
      fecha_inicio: fechaInicio || undefined,
      fecha_fin: fechaFin || undefined,
      id_dependencia: dependenciaId
    }),
    enabled: hasDepSelected || (!!fechaInicio && !!fechaFin) // Only run if filters active (optional logic) or always run
  });

  const hasFilters = hasDepSelected || (!!fechaInicio && !!fechaFin);
  const hasData = movimientosData && movimientosData.length > 0;

  const handleExport = async () => {
    if (!hasData) return;
    setIsExporting(true);
    try {
      await reportesService.downloadMovimientosPdf({
        fecha_inicio: fechaInicio || undefined,
        fecha_fin: fechaFin || undefined,
        id_dependencia: dependenciaId
      });
    } catch (error) {
      console.error("Error downloading PDF:", error);
    } finally {
      setIsExporting(false);
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
            <h1 className="text-lg font-bold text-gray-800">Movimientos por Dependencia</h1>
            <p className="text-sm text-gray-500">Historial de entradas y salidas</p>
          </div>
        </div>
        <button 
          onClick={handleExport}
          disabled={isExporting || !hasData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Generar PDF
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 border-b border-gray-200 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select 
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-64"
                value={selectedDep}
                onChange={(e) => setSelectedDep(e.target.value)}
                disabled={loadingDeps}
            >
                <option value="">
                  {loadingDeps ? 'Cargando...' : 'Seleccionar dependencia'}
                </option>
                <option value="todas">Todas las dependencias</option>
                {dependencias?.map((dep) => (
                  <option key={dep.id_dependencia} value={dep.id_dependencia}>
                    {dep.nombre}
                  </option>
                ))}
            </select>
        </div>

        <div className="flex items-center gap-2 border-l pl-4 border-gray-200">
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
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
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
                     {!hasFilters ? (
                         <tr>
                           <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                             Seleccione una dependencia o rango de fechas para ver los movimientos
                           </td>
                         </tr>
                     ) : isLoading ? (
                         <tr>
                           <td colSpan={6} className="px-6 py-8 text-center">
                             <div className="flex items-center justify-center gap-2 text-gray-500">
                               <Loader2 className="w-5 h-5 animate-spin" />
                               <span>Cargando movimientos...</span>
                             </div>
                           </td>
                         </tr>
                     ) : movimientosData?.length === 0 ? (
                         <tr>
                           <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                             No hay datos para mostrar con los filtros seleccionados.
                           </td>
                         </tr>
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
      </div>
    </div>
  );
}
