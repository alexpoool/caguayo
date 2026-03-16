import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Filter,
  Eye,
  DollarSign,
  FileText
} from 'lucide-react';
import { 
  liquidacionService, 
  productosEnLiquidacionService,
  type Liquidacion, 
  type LiquidacionCreate,
  type ProductosEnLiquidacion 
} from '../../services/api';
import { clientesService, type Cliente } from '../../services/api';
import { anexosService, type Anexo } from '../../services/api';
import { monedaService, type Moneda } from '../../services/api';

type TabType = 'todas' | 'pendientes' | 'liquidadas';

export function LiquidacionesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('todas');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLiquidacion, setSelectedLiquidacion] = useState<Liquidacion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [filtroCliente, setFiltroCliente] = useState<number | null>(null);
  const [filtroAnexo, setFiltroAnexo] = useState<number | null>(null);
  
  const [selectedProductos, setSelectedProductos] = useState<number[]>([]);
  const [formData, setFormData] = useState<LiquidacionCreate>({
    id_cliente: 0,
    id_convenio: undefined,
    id_anexo: undefined,
    id_moneda: 1,
    devengado: 0,
    tributario: 0,
    comision_bancaria: 0,
    gasto_empresa: 0,
    tipo_pago: 'TRANSFERENCIA',
    observaciones: '',
    producto_ids: []
  });

  const { data: liquidaciones = [], isLoading } = useQuery({
    queryKey: ['liquidaciones', activeTab],
    queryFn: async () => {
      if (activeTab === 'pendientes') {
        return liquidacionService.getLiquidacionesPendientes();
      } else if (activeTab === 'liquidadas') {
        return liquidacionService.getLiquidacionesLiquidadas();
      }
      return liquidacionService.getLiquidaciones();
    }
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-proveedores'],
    queryFn: async () => {
      const allClientes = await clientesService.getClientes();
      return allClientes.filter((c: Cliente) => 
        c.tipo_relacion === 'PROVEEDOR' || c.tipo_relacion === 'AMBAS'
      );
    }
  });

  const { data: anexos = [] } = useQuery({
    queryKey: ['anexos'],
    queryFn: () => anexosService.getAnexos()
  });

  const { data: monedas = [] } = useQuery({
    queryKey: ['monedas'],
    queryFn: () => monedaService.getMonedas()
  });

  const { data: productosPendientes = [] } = useQuery({
    queryKey: ['productos-pendientes', filtroCliente, filtroAnexo],
    queryFn: () => {
      if (!filtroCliente) return Promise.resolve([]);
      return liquidacionService.getProductosPendientesByCliente(filtroCliente, filtroAnexo || undefined);
    },
    enabled: !!filtroCliente
  });

  const createMutation = useMutation({
    mutationFn: (data: LiquidacionCreate) => liquidacionService.createLiquidacion(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liquidaciones'] });
      queryClient.invalidateQueries({ queryKey: ['productos-pendientes'] });
      toast.success('Liquidación creada correctamente');
      setShowModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Error al crear liquidación');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => liquidacionService.deleteLiquidacion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liquidaciones'] });
      toast.success('Liquidación eliminada');
    },
    onError: () => {
      toast.error('Error al eliminar liquidación');
    }
  });

  const confirmarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      liquidacionService.confirmarLiquidacion(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liquidaciones'] });
      toast.success('Liquidación confirmada');
    },
    onError: () => {
      toast.error('Error al confirmar liquidación');
    }
  });

  const resetForm = () => {
    setFormData({
      id_cliente: 0,
      id_convenio: undefined,
      id_anexo: undefined,
      id_moneda: 1,
      devengado: 0,
      tributario: 0,
      comision_bancaria: 0,
      gasto_empresa: 0,
      tipo_pago: 'TRANSFERENCIA',
      observaciones: '',
      producto_ids: []
    });
    setFiltroCliente(null);
    setFiltroAnexo(null);
    setSelectedProductos([]);
  };

  const handleClienteChange = (clienteId: number) => {
    setFiltroCliente(clienteId);
    setFiltroAnexo(null);
    setFormData(prev => ({
      ...prev,
      id_cliente: clienteId,
      id_anexo: undefined,
      producto_ids: []
    }));
    setSelectedProductos([]);
  };

  const handleAnexoChange = (anexoId: number | null) => {
    setFiltroAnexo(anexoId);
    setFormData(prev => ({
      ...prev,
      id_anexo: anexoId || undefined,
      producto_ids: []
    }));
    setSelectedProductos([]);
  };

  const handleProductoSelect = (productoId: number) => {
    setSelectedProductos(prev => {
      if (prev.includes(productoId)) {
        return prev.filter(id => id !== productoId);
      }
      return [...prev, productoId];
    });
    setFormData(prev => ({
      ...prev,
      producto_ids: prev.producto_ids.includes(productoId)
        ? prev.producto_ids.filter(id => id !== productoId)
        : [...prev.producto_ids, productoId]
    }));
  };

  const handleSelectAll = () => {
    const allIds = productosPendientes.map((p: ProductosEnLiquidacion) => p.id_producto_en_liquidacion);
    setSelectedProductos(allIds);
    setFormData(prev => ({ ...prev, producto_ids: allIds }));
  };

  const handleDeselectAll = () => {
    setSelectedProductos([]);
    setFormData(prev => ({ ...prev, producto_ids: [] }));
  };

  const calculateImporte = () => {
    return productosPendientes
      .filter((p: ProductosEnLiquidacion) => selectedProductos.includes(p.id_producto_en_liquidacion))
      .reduce((sum: number, p: ProductosEnLiquidacion) => {
        return sum + (p.precio * p.cantidad);
      }, 0);
  };

  const calculateNetoPagar = () => {
    const importe = calculateImporte();
    const tributario = Number(formData.tributario) || 0;
    const comision = Number(formData.comision_bancaria) || 0;
    const gasto = Number(formData.gasto_empresa) || 0;
    return importe - tributario - comision - gasto;
  };

  const filteredLiquidaciones = liquidaciones.filter((l: Liquidacion) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return l.codigo?.toLowerCase().includes(search) || 
           l.cliente?.nombre?.toLowerCase().includes(search);
  });

  const getClienteNombre = (clienteId: number) => {
    const cliente = clientes.find((c: Cliente) => c.id_cliente === clienteId);
    return cliente?.nombre || 'N/A';
  };

  const getAnexoInfo = (anexoId: number) => {
    const anexo = anexos.find((a: Anexo) => a.id_anexo === anexoId);
    return anexo?.nombre_anexo || 'N/A';
  };

  const clienteAnexos = filtroCliente 
    ? anexos.filter((a: Anexo) => {
        const anexo = anexos.find((an: Anexo) => an.id_anexo === a.id_anexo);
        return true;
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Liquidaciones</h1>
        <button
          onClick={() => navigate('/compra/liquidaciones/crear')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva Liquidación
        </button>
      </div>

      <div className="flex gap-4 border-b">
        {(['todas', 'pendientes', 'liquidadas'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar liquidaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Anexo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Importe</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Neto Pagar</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">Cargando...</td>
              </tr>
            ) : filteredLiquidaciones.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No hay liquidaciones</td>
              </tr>
            ) : (
              filteredLiquidaciones.map((liquidacion: Liquidacion) => (
                <tr key={liquidacion.id_liquidacion} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{liquidacion.codigo}</td>
                  <td className="px-4 py-3">{getClienteNombre(liquidacion.id_cliente)}</td>
                  <td className="px-4 py-3">{liquidacion.id_anexo ? getAnexoInfo(liquidacion.id_anexo) : '-'}</td>
                  <td className="px-4 py-3">{liquidacion.importe?.toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium">{liquidacion.neto_pagar?.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      liquidacion.liquidada 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {liquidacion.liquidada ? 'Liquidada' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{new Date(liquidacion.fecha_emision).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedLiquidacion(liquidacion);
                          setShowDetailModal(true);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Ver detalle"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {!liquidacion.liquidada && (
                        <button
                          onClick={() => {
                            if (confirm('¿Confirmar liquidación?')) {
                              confirmarMutation.mutate({
                                id: liquidacion.id_liquidacion,
                                data: {
                                  tipo_pago: liquidacion.tipo_pago,
                                  devengado: liquidacion.devengado,
                                  tributario: liquidacion.tributario,
                                  comision_bancaria: liquidacion.comision_bancaria,
                                  gasto_empresa: liquidacion.gasto_empresa
                                }
                              });
                            }
                          }}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Confirmar"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm('¿Eliminar liquidación?')) {
                            deleteMutation.mutate(liquidacion.id_liquidacion);
                          }
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Nueva Liquidación</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
                  <select
                    value={filtroCliente || ''}
                    onChange={(e) => handleClienteChange(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar proveedor</option>
                    {clientes.map((cliente: Cliente) => (
                      <option key={cliente.id_cliente} value={cliente.id_cliente}>
                        {cliente.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Anexo</label>
                  <select
                    value={filtroAnexo || ''}
                    onChange={(e) => handleAnexoChange(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={!filtroCliente}
                  >
                    <option value="">Todos los anexos</option>
                    {anexos.map((anexo: Anexo) => (
                      <option key={anexo.id_anexo} value={anexo.id_anexo}>
                        {anexo.nombre_anexo}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Moneda *</label>
                  <select
                    value={formData.id_moneda}
                    onChange={(e) => setFormData(prev => ({ ...prev, id_moneda: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {monedas.map((moneda: Moneda) => (
                      <option key={moneda.id_moneda} value={moneda.id_moneda}>
                        {moneda.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Pago</label>
                  <select
                    value={formData.tipo_pago}
                    onChange={(e) => setFormData(prev => ({ ...prev, tipo_pago: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
              </div>

              {filtroCliente && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-700">Productos Pendientes</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSelectAll}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Seleccionar todos
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={handleDeselectAll}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Deseleccionar todos
                      </button>
                    </div>
                  </div>
                  
                  {productosPendientes.length === 0 ? (
                    <p className="text-gray-500 text-sm py-4">No hay productos pendientes para este proveedor</p>
                  ) : (
                    <div className="border rounded-lg max-h-60 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left"></th>
                            <th className="px-3 py-2 text-left">Código</th>
                            <th className="px-3 py-2 text-left">Producto</th>
                            <th className="px-3 py-2 text-right">Cantidad</th>
                            <th className="px-3 py-2 text-right">Precio Venta</th>
                            <th className="px-3 py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {productosPendientes.map((prod: ProductosEnLiquidacion) => (
                            <tr key={prod.id_producto_en_liquidacion} className="hover:bg-gray-50">
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={selectedProductos.includes(prod.id_producto_en_liquidacion)}
                                  onChange={() => handleProductoSelect(prod.id_producto_en_liquidacion)}
                                  className="rounded"
                                />
                              </td>
                              <td className="px-3 py-2">{prod.codigo}</td>
                              <td className="px-3 py-2">{prod.producto?.nombre || `Producto ${prod.id_producto}`}</td>
                              <td className="px-3 py-2 text-right">{prod.cantidad}</td>
                              <td className="px-3 py-2 text-right">{prod.precio?.toLocaleString()}</td>
                              <td className="px-3 py-2 text-right font-medium">
                                {(prod.precio * prod.cantidad).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tributario (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tributario}
                    onChange={(e) => setFormData(prev => ({ ...prev, tributario: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comisión Bancaria (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.comision_bancaria}
                    onChange={(e) => setFormData(prev => ({ ...prev, comision_bancaria: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gasto Empresa</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.gasto_empresa}
                    onChange={(e) => setFormData(prev => ({ ...prev, gasto_empresa: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Devengado (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.devengado}
                    onChange={(e) => setFormData(prev => ({ ...prev, devengado: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Importe Total:</span>
                  <span className="text-xl font-bold">{calculateImporte().toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Tributario:</span>
                  <span>- {Number(formData.tributario || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Comisión:</span>
                  <span>- {Number(formData.comision_bancaria || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Gasto Empresa:</span>
                  <span>- {Number(formData.gasto_empresa || 0).toLocaleString()}</span>
                </div>
                <div className="border-t pt-2 flex justify-between items-center">
                  <span className="font-medium">Neto a Pagar:</span>
                  <span className="text-2xl font-bold text-green-600">{calculateNetoPagar().toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!formData.id_cliente || selectedProductos.length === 0) {
                    toast.error('Seleccione un proveedor y al menos un producto');
                    return;
                  }
                  createMutation.mutate({
                    ...formData,
                    id_cliente: filtroCliente!
                  });
                }}
                disabled={createMutation.isPending || selectedProductos.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creando...' : 'Crear Liquidación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedLiquidacion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Detalle de Liquidación</h2>
              <button onClick={() => { setShowDetailModal(false); setSelectedLiquidacion(null); }} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Código</p>
                  <p className="font-medium">{selectedLiquidacion.codigo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estado</p>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    selectedLiquidacion.liquidada 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedLiquidacion.liquidada ? 'Liquidada' : 'Pendiente'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Proveedor</p>
                  <p className="font-medium">{getClienteNombre(selectedLiquidacion.id_cliente)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Anexo</p>
                  <p className="font-medium">{selectedLiquidacion.id_anexo ? getAnexoInfo(selectedLiquidacion.id_anexo) : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha Emisión</p>
                  <p className="font-medium">{new Date(selectedLiquidacion.fecha_emision).toLocaleDateString()}</p>
                </div>
                {selectedLiquidacion.fecha_liquidacion && (
                  <div>
                    <p className="text-sm text-gray-500">Fecha Liquidación</p>
                    <p className="font-medium">{new Date(selectedLiquidacion.fecha_liquidacion).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4 mb-4">
                <h3 className="font-medium mb-3">Montos</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Importe:</span>
                    <span>{selectedLiquidacion.importe?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tributario:</span>
                    <span>- {selectedLiquidacion.tributario?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Comisión Bancaria:</span>
                    <span>- {selectedLiquidacion.comision_bancaria?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gasto Empresa:</span>
                    <span>- {selectedLiquidacion.gasto_empresa?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span>Neto a Pagar:</span>
                    <span className="text-green-600">{selectedLiquidacion.neto_pagar?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {selectedLiquidacion.observaciones && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500 mb-1">Observaciones</p>
                  <p>{selectedLiquidacion.observaciones}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => { setShowDetailModal(false); setSelectedLiquidacion(null); }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
