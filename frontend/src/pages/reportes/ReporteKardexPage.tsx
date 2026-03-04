import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportesService } from '../../services/reportesService';
import { productosService } from '../../services/api';
import { dependenciasService } from '../../services/administracion';
import { useDebounce } from '../../hooks/useDebounce';
import { Download, ArrowLeft, Search, Calendar, X, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export function ReporteKardexPage() {
  const [productoId, setProductoId] = useState<number | undefined>(undefined);
  const [selectedDep, setSelectedDep] = useState<string>('');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  
  // Product Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const searchRef = useRef<HTMLDivElement>(null);

  // Derive dependenciaId for API calls
  const dependenciaId = selectedDep && selectedDep !== 'todas' ? Number(selectedDep) : undefined;

  // Cargar dependencias reales desde el backend
  const { data: dependencias, isLoading: loadingDeps } = useQuery({
    queryKey: ['dependencias'],
    queryFn: () => dependenciasService.getDependencias(),
  });

  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search Query for Products
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['productos', 'search', debouncedSearchTerm],
    queryFn: () => productosService.getProductos(0, 10, debouncedSearchTerm),
    enabled: showResults && debouncedSearchTerm.length >= 2,
    staleTime: 60000,
  });

  const handleSelectProduct = (product: any) => {
    setProductoId(product.id_producto);
    const loteInfo = product.codigo_lote ? ` [Lote: ${product.codigo_lote}]` : '';
    setSearchTerm(`${product.codigo} - ${product.nombre}${loteInfo}`);
    setShowResults(false);
  };

  const handleClearProduct = () => {
    setProductoId(undefined);
    setSearchTerm('');
  };

  const { data: movimientosData, isLoading } = useQuery({
    queryKey: ['reportes', 'kardex', productoId, dependenciaId, selectedDep, fechaInicio, fechaFin],
    queryFn: () => reportesService.getInventarioMovimientos({
      fecha_inicio: fechaInicio || undefined,
      fecha_fin: fechaFin || undefined,
      id_producto: productoId,
      id_dependencia: dependenciaId
    }),
    enabled: !!productoId
  });

  const handleExport = async () => {
    if (!productoId) return;
    try {
      await reportesService.downloadMovimientosPdf({
        fecha_inicio: fechaInicio || undefined,
        fecha_fin: fechaFin || undefined,
        id_producto: productoId,
        id_dependencia: dependenciaId
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
            <h1 className="text-lg font-bold text-gray-800">Movimientos por Producto</h1>
            <p className="text-sm text-gray-500">Trazabilidad detallada por artículo</p>
          </div>
        </div>
        <button 
          onClick={handleExport}
          disabled={!productoId || isLoading || (movimientosData?.length === 0)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Generar PDF
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 border-b border-gray-200 flex items-center gap-4 flex-wrap">
        
        {/* Product Search (Combobox) */}
        <div className="relative w-80" ref={searchRef}>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:border-blue-300 focus:ring focus:ring-blue-200 sm:text-sm"
                    placeholder="Buscar producto por nombre o código..."
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (!showResults) setShowResults(true);
                        if (e.target.value === '') handleClearProduct();
                    }}
                    onFocus={() => {
                        if (searchTerm.length >= 2) setShowResults(true);
                    }}
                />
                {productoId && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer" onClick={handleClearProduct}>
                        <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </div>
                )}
            </div>

            {/* Dropdown Results */}
            {showResults && (searchTerm.length >= 2) && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                    {isSearching ? (
                        <div className="text-center py-2 text-gray-500">Buscando...</div>
                    ) : searchResults && searchResults.length > 0 ? (
                        searchResults.map((product: any) => (
                            <div
                                key={product.id_producto}
                                className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50"
                                onClick={() => handleSelectProduct(product)}
                            >
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded shrink-0">{product.codigo}</span>
                                        <span className="font-medium truncate">{product.nombre}</span>
                                    </div>
                                    {product.codigo_lote && (
                                        <span className="text-[11px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded w-fit">
                                            Lote: {product.codigo_lote}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-2 text-gray-500">No se encontraron productos</div>
                    )}
                </div>
            )}
        </div>

        {/* Dependencia Filter */}
        <div className="flex items-center gap-2 border-l pl-4 border-gray-200">
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
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo Inicial</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dependencia</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observación</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Entrada</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Salida</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo Final</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (
                            <tr><td colSpan={9} className="px-6 py-4 text-center">Cargando...</td></tr>
                        ) : movimientosData?.length === 0 ? (
                            <tr><td colSpan={9} className="px-6 py-4 text-center text-gray-500">No hay movimientos en este período</td></tr>
                        ) : (
                            movimientosData?.map((item) => (
                                <tr key={item.id_movimiento} className="hover:bg-gray-50">
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {format(new Date(item.fecha), 'dd/MM/yyyy HH:mm')}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                                        {item.codigo_movimiento || item.codigo_producto || '-'}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-700 font-medium">
                                        {item.saldo_inicial}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.factor > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {item.tipo}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{item.dependencia}</td>
                                    <td className="px-4 py-4 text-sm text-gray-500 truncate max-w-xs">{item.observacion || '-'}</td>
                                    
                                    {/* Entrada Column */}
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">
                                        {item.factor > 0 ? item.cantidad : '-'}
                                    </td>
                                    
                                    {/* Salida Column */}
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">
                                        {item.factor < 0 ? item.cantidad : '-'}
                                    </td>

                                    {/* Saldo Final Column */}
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-800 font-bold">
                                        {item.saldo_final}
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
