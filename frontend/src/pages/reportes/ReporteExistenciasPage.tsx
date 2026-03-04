import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportesService } from '../../services/reportesService';
import { dependenciasService } from '../../services/administracion';
import { Download, ArrowLeft, Filter, Calendar, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ReporteExistenciasPage() {
  const [selectedDep, setSelectedDep] = useState<string>('');
  const [fechaCorte, setFechaCorte] = useState<string>('');

  // Derive dependenciaId for API calls
  const dependenciaId = selectedDep && selectedDep !== 'todas' ? Number(selectedDep) : undefined;
  const hasDepSelected = selectedDep !== '';
  const [isExporting, setIsExporting] = useState(false);

  // Cargar dependencias reales desde el backend
  const { data: dependencias, isLoading: loadingDeps } = useQuery({
    queryKey: ['dependencias'],
    queryFn: () => dependenciasService.getDependencias(),
  });

  const { data: stockData, isLoading: loadingStock } = useQuery({
    queryKey: ['reportes', 'stock', dependenciaId, fechaCorte, selectedDep],
    queryFn: () => reportesService.getInventarioStock(dependenciaId, fechaCorte || undefined),
    enabled: hasDepSelected,
  });

  const handleExport = async () => {
    if (!hasDepSelected) return;
    setIsExporting(true);
    try {
      await reportesService.downloadStockPdf(dependenciaId, fechaCorte || undefined);
    } catch (err) {
      console.error("Error downloading PDF:", err);
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
            <h1 className="text-lg font-bold text-gray-800">Existencias por Producto</h1>
            <p className="text-sm text-gray-500">Reporte de stock por dependencia con fecha de corte</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting || !hasDepSelected || !stockData?.length}
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
            value={fechaCorte}
            onChange={(e) => setFechaCorte(e.target.value)}
            placeholder="Fecha de corte"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {!hasDepSelected ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                    Seleccione una dependencia para ver las existencias
                  </td>
                </tr>
              ) : loadingStock ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Calculando existencias...</span>
                    </div>
                  </td>
                </tr>
              ) : stockData?.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron productos con existencia para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                stockData?.map((item) => (
                  <tr key={item.id_producto} className="hover:bg-gray-50">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-mono text-gray-900">
                      {item.codigo || '-'}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">{item.nombre}</td>
                    <td
                      className={`px-6 py-3 whitespace-nowrap text-sm text-right font-bold ${
                        Number(item.stock_actual) < 0 ? 'text-red-600' : 'text-blue-600'
                      }`}
                    >
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
