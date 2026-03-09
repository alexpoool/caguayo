import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { movimientosService } from '../services/api';
import { Input } from '../components/ui';
import {
  ArrowLeft,
  Search,
  Package,
  Building,
  Truck,
  FileText,
  Hash
} from 'lucide-react';

interface RecepcionStock {
  id_movimiento: number;
  id_producto: number;
  nombre_producto: string;
  codigo_producto: string | null;
  cantidad: number;
  id_dependencia: number;
  nombre_dependencia: string;
  id_proveedor: number | null;
  proveedor_nombre: string | null;
  id_convenio: number | null;
  convenio_nombre: string | null;
  id_anexo: number | null;
  anexo_nombre: string | null;
  anexo_numero: string | null;
  fecha: string;
  codigo: string | null;
}

export function RecepcionesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: recepciones = [], isLoading } = useQuery({
    queryKey: ['recepciones-stock'],
    queryFn: () => movimientosService.getRecepcionesStock(),
    staleTime: 0,
    refetchOnMount: true,
  });

  const filteredRecepciones = recepciones.filter((r: RecepcionStock) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      r.nombre_producto?.toLowerCase().includes(search) ||
      r.proveedor_nombre?.toLowerCase().includes(search) ||
      r.nombre_dependencia?.toLowerCase().includes(search) ||
      r.convenio_nombre?.toLowerCase().includes(search) ||
      r.anexo_nombre?.toLowerCase().includes(search) ||
      r.codigo?.toLowerCase().includes(search)
    );
  });

  const handleSelectRecepcion = (recepcion: RecepcionStock) => {
    const returnTo = location.state?.returnTo || '/movimientos/ajuste';
    navigate(returnTo, {
      state: {
        recepcionSeleccionada: recepcion,
        from: '/movimientos/seleccionar-recepcion'
      }
    });
  };

  const handleGoBack = () => {
    const returnTo = location.state?.returnTo || '/movimientos/ajuste';
    navigate(returnTo);
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleGoBack}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Seleccionar Recepción
            </h1>
            <p className="text-gray-500 mt-1">
              Elige una recepción para crear un ajuste
            </p>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por código, producto, proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 py-3 text-lg"
          />
        </div>
      </div>

      {/* Tabla de Recepciones */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Código
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Producto
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Cantidad
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Proveedor
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Convenio / Anexo
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Dependencia
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center items-center gap-2">
                      <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      Cargando recepciones...
                    </div>
                  </td>
                </tr>
              ) : filteredRecepciones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? 'No se encontraron recepciones' : 'No hay recepciones disponibles'}
                  </td>
                </tr>
              ) : (
                filteredRecepciones.map((recepcion: RecepcionStock) => (
                  <tr
                    key={recepcion.id_movimiento}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => handleSelectRecepcion(recepcion)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {recepcion.codigo || recepcion.id_movimiento}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {recepcion.nombre_producto}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-800">
                        {recepcion.cantidad}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {recepcion.proveedor_nombre || 'Sin proveedor'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        {recepcion.convenio_nombre && (
                          <span className="text-sm text-gray-900">{recepcion.convenio_nombre}</span>
                        )}
                        {recepcion.anexo_nombre && (
                          <span className="text-xs text-gray-500">
                            {recepcion.anexo_nombre} ({recepcion.anexo_numero})
                          </span>
                        )}
                        {!recepcion.convenio_nombre && !recepcion.anexo_nombre && (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {recepcion.nombre_dependencia}
                        </span>
                      </div>
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
