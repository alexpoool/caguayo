import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportesService } from '../../services/reportesService';
import { dependenciasService } from '../../services/administracion';
import { Download, ArrowLeft, Filter, FileText, Info, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ReporteExistenciasPage() {
  const [dependenciaId, setDependenciaId] = useState<number | undefined>(undefined);
  const [fechaCorte, setFechaCorte] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar dependencias reales desde el backend
  const { data: dependencias, isLoading: loadingDeps } = useQuery({
    queryKey: ['dependencias'],
    queryFn: () => dependenciasService.getDependencias(),
  });

  // Solo consultar datos cuando el usuario haya enviado el formulario
  const { data: stockData, isLoading: loadingStock, refetch } = useQuery({
    queryKey: ['reportes', 'stock', dependenciaId, fechaCorte],
    queryFn: () => reportesService.getInventarioStock(dependenciaId, fechaCorte || undefined),
    enabled: submitted,
  });

  const handleSubmit = () => {
    if (!dependenciaId) {
      setError('Debe seleccionar una dependencia.');
      return;
    }
    setError(null);
    setSubmitted(true);
    refetch();
  };

  const handleReset = () => {
    setSubmitted(false);
    setDependenciaId(undefined);
    setFechaCorte('');
    setError(null);
  };

  const handleExport = async () => {
    if (!dependenciaId) {
      setError('Debe seleccionar una dependencia para generar el PDF.');
      return;
    }
    setIsExporting(true);
    try {
      await reportesService.downloadStockPdf(dependenciaId, fechaCorte || undefined);
    } catch (err) {
      console.error("Error downloading PDF:", err);
      setError('Error al generar el PDF. Intente nuevamente.');
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
        {submitted && (
          <button
            onClick={handleExport}
            disabled={isExporting || !stockData?.length}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Generar PDF
          </button>
        )}
      </div>

      {/* Contenido principal */}
      <div className="flex-1 overflow-auto p-4">
        {!submitted ? (
          /* ========== FORMULARIO DE PARÁMETROS ========== */
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-800">Parámetros del Reporte</h2>
                  <p className="text-sm text-gray-500">Configure los filtros para generar el reporte de existencias</p>
                </div>
              </div>

              {/* Selector de Dependencia */}
              <div className="mb-5">
                <label htmlFor="dependencia" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Dependencia <span className="text-red-500">*</span>
                </label>
                <select
                  id="dependencia"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    error && !dependenciaId ? 'border-red-400 bg-red-50' : 'border-gray-300'
                  }`}
                  value={dependenciaId || ''}
                  onChange={(e) => {
                    setDependenciaId(e.target.value ? Number(e.target.value) : undefined);
                    setError(null);
                  }}
                  disabled={loadingDeps}
                >
                  <option value="">
                    {loadingDeps ? 'Cargando dependencias...' : '-- Seleccione una dependencia --'}
                  </option>
                  {dependencias?.map((dep) => (
                    <option key={dep.id_dependencia} value={dep.id_dependencia}>
                      {dep.nombre}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Solo se procesarán movimientos hacia o desde la dependencia seleccionada.
                </p>
              </div>

              {/* Selector de Fecha de Corte */}
              <div className="mb-5">
                <label htmlFor="fecha_corte" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Fecha de corte
                </label>
                <input
                  id="fecha_corte"
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={fechaCorte}
                  onChange={(e) => setFechaCorte(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Si se deja vacío, el stock se calculará con todos los movimientos hasta la fecha actual.
                </p>
              </div>

              {/* Información de columnas del PDF */}
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800 mb-1">Columnas del reporte PDF</p>
                    <p className="text-xs text-blue-600">
                      El documento generado contendrá las columnas: <strong>CÓDIGO</strong>, <strong>DESCRIPCIÓN</strong> y <strong>CANTIDAD</strong>.
                      La cantidad se calcula como la suma algebraica de todos los movimientos (entradas y salidas) del producto en la dependencia seleccionada.
                    </p>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Botones */}
              <div className="flex items-center justify-end gap-3">
                <Link
                  to="/reportes/inventario"
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </Link>
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  <Filter className="w-4 h-4" />
                  Consultar
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ========== VISTA DE RESULTADOS ========== */
          <div>
            {/* Barra de filtros activos */}
            <div className="bg-white p-3 border border-gray-200 rounded-lg mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Filter className="w-4 h-4 text-gray-400" />
                <span>
                  <strong>Dependencia:</strong>{' '}
                  {dependencias?.find((d) => d.id_dependencia === dependenciaId)?.nombre || '-'}
                </span>
                {fechaCorte && (
                  <span className="border-l pl-3 border-gray-300">
                    <strong>Corte:</strong> {new Date(fechaCorte + 'T00:00:00').toLocaleDateString('es-ES')}
                  </span>
                )}
              </div>
              <button
                onClick={handleReset}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Cambiar parámetros
              </button>
            </div>

            {/* Tabla de resultados */}
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
                  {loadingStock ? (
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
        )}
      </div>
    </div>
  );
}
