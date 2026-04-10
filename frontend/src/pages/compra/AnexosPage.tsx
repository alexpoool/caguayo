import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui';
import { anexosService, conveniosService, productosService, monedaService, dependenciasService, clientesService } from '../../services/api';
import type { Productos } from '../../types';
import { Plus, Save, Trash2, Edit, X, Boxes, ArrowLeft, Package, DollarSign, Tag, Eye, User, Search, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';

type View = 'list' | 'form' | 'detail';

export function CompraAnexosPage() {
  const [searchParams] = useSearchParams();
  const initialConvenioId = searchParams.get('convenio');
  const contratoParam = searchParams.get('contrato');
  
  const [view, setView] = useState<View>('list');
  const [anexos, setAnexos] = useState<any[]>([]);
  const [convenios, setConvenios] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [productos, setProductos] = useState<Productos[]>([]);
  const [monedas, setMonedas] = useState<any[]>([]);
  const [dependencias, setDependencias] = useState<any[]>([]);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedConvenio, setSelectedConvenio] = useState<number | null>(initialConvenioId ? Number(initialConvenioId) : null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<{id_producto: number; cantidad: number; precio_venta: number}[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: any | null }>({ isOpen: false, item: null });

  useEffect(() => { 
    const controller = new AbortController();
    loadInitialData(controller.signal); 
    return () => controller.abort();
  }, []);

  const loadInitialData = async (signal?: AbortSignal) => {
    try {
      const [conv, cli, prod, mon, dep] = await Promise.all([
        conveniosService.getConvenios(undefined, undefined, 0, 100, { signal }),
        clientesService.getClientes(0, 1000, { signal }),
        productosService.getProductos(0, 1000, undefined, { signal }),
        monedaService.getMonedas(0, 100, { signal }),
        dependenciasService.getDependencias(undefined, 0, 1000, { signal })
      ]);
      setConvenios(conv);
      setClientes(cli);
      setProductos(prod);
      setMonedas(mon);
      setDependencias(dep);
    } catch (error: any) { 
      if (error.name !== 'AbortError') {
        console.error('Error:', error); 
      }
    }
  };

  useEffect(() => { 
    const controller = new AbortController();
    if (view === 'list') {
      loadAnexos(controller.signal); 
    }
    return () => controller.abort();
  }, [view]);


  const loadAnexos = async (signal?: AbortSignal) => {
    try {
      const data = await anexosService.getAnexos(undefined, undefined, 0, 100, { signal });
      setAnexos(data);
    } catch (error: any) { 
      if (error.name !== 'AbortError') console.error('Error:', error); 
    }
  };

  const handleSave = async () => {
    if (!selectedConvenio || isNaN(Number(selectedConvenio))) {
      toast.error('Debe seleccionar un convenio');
      return;
    }
    try {
      const data = {
        id_convenio: Number(selectedConvenio),
        nombre_anexo: formData.nombre_anexo,
        fecha: formData.fecha,
        id_dependencia: formData.id_dependencia ? Number(formData.id_dependencia) : undefined,
        id_moneda: formData.id_moneda ? Number(formData.id_moneda) : undefined,
        comision: formData.comision ? Number(formData.comision) : undefined,
        items: selectedProducts.map(p => ({
          id_producto: p.id_producto,
          cantidad: p.cantidad,
          precio_venta: p.precio_venta,
          id_moneda: formData.id_moneda ? Number(formData.id_moneda) : 1
        }))
      };
      
      if (editingId) {
        await anexosService.updateAnexo(editingId, data);
      } else {
        await anexosService.createAnexo(data);
      }
      toast.success(editingId ? 'Actualizado' : 'Creado');
      setView('list');
      resetForm();
      loadAnexos();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar anexo?')) return;
    try {
      await anexosService.deleteAnexo(id);
      toast.success('Eliminado');
      loadAnexos();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const resetForm = () => { 
    setFormData({}); 
    setSelectedProducts([]); 
    setEditingId(null);
    setProductSearch('');
  };

  const openForm = (item?: any) => {
    if (item) {
      setEditingId(item.id_anexo);
      setSelectedConvenio(item.id_convenio);
      setFormData({
        id_convenio: item.id_convenio,
        nombre_anexo: item.nombre_anexo,
        fecha: item.fecha,
        id_dependencia: item.id_dependencia,
        id_moneda: item.id_moneda,
        comision: item.comision,
        codigo_anexo: item.codigo_anexo,
      });
      setSelectedProducts(item.items_anexo?.map((p: any) => ({
        id_producto: p.id_producto,
        cantidad: p.cantidad,
        precio_venta: p.precio_venta || p.precio_compra || 0
      })) || []);
    } else { resetForm(); }
    setView('form');
  };

  const addProduct = (producto: Productos) => {
    if (!selectedProducts.find(p => p.id_producto === producto.id_producto)) {
      setSelectedProducts([...selectedProducts, { 
        id_producto: producto.id_producto, 
        cantidad: 1, 
        precio_venta: Number(producto.precio_venta) 
      }]);
    }
  };

  const updateProduct = (id: number, field: string, value: number) => {
    setSelectedProducts(selectedProducts.map(p => 
      p.id_producto === id ? { ...p, [field]: value } : p
    ));
  };

  const removeProduct = (id: number) => {
    setSelectedProducts(selectedProducts.filter(p => p.id_producto !== id));
  };

  const calcTotal = () => selectedProducts.reduce((t, p) => t + (p.cantidad * p.precio_venta), 0);

  const getProductoNombre = (id: number) => {
    const prod = productos.find(p => p.id_producto === id);
    return prod?.nombre || `Producto ${id}`;
  };

  const getDependenciaNombre = (id?: number) => {
    if (!id) return '-';
    const dep = dependencias.find(d => d.id_dependencia === id);
    return dep?.nombre || `Dependencia ${id}`;
  };

  const getMonedaNombre = (id?: number) => {
    if (!id) return '-';
    const mon = monedas.find(m => m.id_moneda === id);
    return mon?.simbolo || `Moneda ${id}`;
  };

  const getClienteFromConvenio = (id_convenio: number) => {
    const convenio = convenios.find(c => c.id_convenio === id_convenio);
    if (!convenio) return null;
    return clientes.find(cli => cli.id_cliente === convenio.id_cliente) || null;
  };

  const productosFiltrados = useMemo(() => {
    if (!productSearch.trim()) return [];
    const search = productSearch.toLowerCase();
    return productos.filter(p => 
      p.nombre.toLowerCase().includes(search) &&
      !selectedProducts.some(sp => sp.id_producto === p.id_producto)
    ).slice(0, 10);
  }, [productos, productSearch, selectedProducts]);

  const filteredAnexos = useMemo(() => {
    let result = anexos;
    if (initialConvenioId) {
      result = result.filter(a => a.id_convenio === Number(initialConvenioId));
    }
    if (contratoParam) {
      result = result.filter(a => a.convenios?.id_cliente === Number(contratoParam));
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(a => 
        a.codigo_anexo?.toLowerCase().includes(term) ||
        a.nombre_anexo?.toLowerCase().includes(term)
      );
    }
    return result;
  }, [anexos, searchTerm, contratoParam, initialConvenioId]);

  const renderList = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-fuchsia-500 to-pink-600 rounded-xl shadow-lg animate-bounce-subtle">
            <Boxes className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Anexos</h1>
            <p className="text-gray-500 mt-1">Gestión de anexos por convenio</p>
          </div>
        </div>
        <Button
          onClick={() => openForm()}
          disabled={convenios.length === 0}
          className="gap-2 bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:from-fuchsia-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:transform-none"
        >
          <Plus className="h-4 w-4" />
          Nuevo Anexo
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
            placeholder="Buscar por código o nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card className="overflow-hidden shadow-sm border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-fuchsia-50 to-pink-50">
              <TableRow>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-fuchsia-600" />
                    Código
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-fuchsia-600" />
                    Nombre
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-fuchsia-600" />
                    Cliente
                  </div>
                </TableHead>
                <TableHead>Comisión</TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-fuchsia-600" />
                    Productos
                  </div>
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnexos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    No hay anexos registrados
                  </TableCell>
                </TableRow>
              ) : (
                filteredAnexos.map((item) => (
                    <TableRow key={item.id_anexo} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setDetailModal({ isOpen: true, item })}>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-fuchsia-50 text-fuchsia-700 rounded text-sm font-mono font-medium">
                          <Tag className="h-3 w-3" />
                          {item.codigo_anexo || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900">{item.nombre_anexo}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600">
                          {getClienteFromConvenio(item.id_convenio)?.nombre || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-500">{item.comision ? `${item.comision}%` : '-'}</TableCell>
                      <TableCell className="text-gray-500">{item.items_anexo?.length || 0}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openForm(item)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8" title="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id_anexo)} className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8" title="Eliminar">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
    </div>
  );

  const renderForm = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => { setView('list'); resetForm(); }}><ArrowLeft className="w-4 h-4" /></Button>
          <CardTitle>{editingId ? 'Editar' : 'Nuevo'} Anexo</CardTitle>
          {editingId && formData.codigo_anexo && (
            <span className="ml-auto font-mono font-bold">{formData.codigo_anexo}</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Convenio</Label>
            {initialConvenioId ? (
              <div className={`mt-1 px-3 py-2 border rounded-lg flex items-center justify-between ${convenioVencido ? 'bg-red-50 border-red-300 text-red-700' : 'bg-gray-100 border-gray-300 text-gray-700'}`}>
                <span>{convenios.find(c => c.id_convenio === Number(initialConvenioId))?.nombre_convenio || `Convenio #${initialConvenioId}`}</span>
                {convenioVencido && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-200 text-red-800 rounded-full text-xs font-medium">
                    <AlertTriangle className="h-3 w-3" />
                    Vencido
                  </span>
                )}
              </div>
            ) : (
              <select className="w-full p-2 border rounded" value={formData.id_convenio || ''} onChange={(e: any) => setFormData({...formData, id_convenio: e.target.value})}>
                <option value="">Seleccionar</option>
                {conveniosVigentes.map(c => <option key={c.id_convenio} value={c.id_convenio}>{c.nombre_convenio}</option>)}
              </select>
            )}
            {convenioVencido && (
              <p className="text-red-600 text-sm mt-1">No se pueden crear anexos para convenios vencidos</p>
            )}
          </div>
          
          <div className="md:col-span-2"><Label>Nombre del Anexo *</Label><Input value={formData.nombre_anexo || ''} onChange={(e: any) => setFormData({...formData, nombre_anexo: e.target.value})} /></div>
          
          <div><Label>Fecha *</Label><Input type="date" value={formData.fecha || ''} onChange={(e: any) => setFormData({...formData, fecha: e.target.value})} /></div>
          
          <div><Label>Dependencia</Label>
            <select className="w-full p-2 border rounded" value={formData.id_dependencia || ''} onChange={(e: any) => setFormData({...formData, id_dependencia: e.target.value})}>
              <option value="">Seleccionar</option>
              {dependencias.map(d => <option key={d.id_dependencia} value={d.id_dependencia}>{d.nombre}</option>)}
            </select>
          </div>
          
          <div><Label>Moneda</Label>
            <select className="w-full p-2 border rounded" value={formData.id_moneda || ''} onChange={(e: any) => setFormData({...formData, id_moneda: e.target.value})}>
              <option value="">Seleccionar</option>
              {monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.nombre} ({m.simbolo})</option>)}
            </select>
          </div>
          
          <div><Label>Comisión (%)</Label><Input type="number" step="0.01" value={formData.comision || ''} onChange={(e: any) => setFormData({...formData, comision: e.target.value})} /></div>
        </div>

        <div className="mt-6">
          <Label className="mb-2 block">Productos</Label>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar producto para agregar..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-9"
            />
            {productSearch.trim() && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {productosFiltrados.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">No se encontraron productos</div>
                ) : (
                  productosFiltrados.map(p => (
                    <button
                      key={p.id_producto}
                      onClick={() => { addProduct(p); setProductSearch(''); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-fuchsia-50 flex justify-between items-center"
                    >
                      <span>{p.nombre}</span>
                      <span className="text-gray-400 text-xs">${Number(p.precio_venta).toFixed(2)}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          
          {selectedProducts.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-left">Cantidad</th>
                    <th className="px-3 py-2 text-left">Precio Venta</th>
                    <th className="px-3 py-2 text-left">Subtotal</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProducts.map(p => (
                    <tr key={p.id_producto} className="border-t">
                      <td className="px-3 py-2">{getProductoNombre(p.id_producto)}</td>
                      <td className="px-3 py-2">
                        <Input 
                          type="number" 
                          min="1" 
                          value={p.cantidad} 
                          onChange={(e: any) => updateProduct(p.id_producto, 'cantidad', Number(e.target.value))}
                          className="w-20 h-8"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input 
                          type="number" 
                          step="0.01"
                          value={p.precio_venta} 
                          onChange={(e: any) => updateProduct(p.id_producto, 'precio_venta', Number(e.target.value))}
                          className="w-24 h-8"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium">${(p.cantidad * p.precio_venta).toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => removeProduct(p.id_producto)} className="text-red-500"><X className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right">Total:</td>
                    <td className="px-3 py-2">${calcTotal().toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
        
        <div className="flex gap-2 mt-6">
          <Button onClick={handleSave} disabled={convenioVencido}><Save className="w-4 h-4 mr-2" />Guardar</Button>
          <Button variant="outline" onClick={() => { setView('list'); resetForm(); }}>Cancelar</Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6">
    
      {view === 'list' && renderList()}
      {view === 'form' && renderForm()}

      {detailModal.isOpen && detailModal.item && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto animate-scale-in">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-fuchsia-50 to-pink-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white shadow-lg">
                    <Boxes className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{detailModal.item.nombre_anexo}</h3>
                    <p className="text-sm text-gray-500 font-mono">{detailModal.item.codigo_anexo || 'Sin código'}</p>
                  </div>
                </div>
                <button onClick={() => setDetailModal({ isOpen: false, item: null })} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                  <p className="text-xs text-purple-600 uppercase tracking-wider mb-1">Fecha</p>
                  <p className="font-bold text-gray-900">{detailModal.item.fecha || 'N/A'}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                  <p className="text-xs text-green-600 uppercase tracking-wider mb-1">Comisión</p>
                  <p className="font-bold text-green-900 text-xl">{detailModal.item.comision ? `${detailModal.item.comision}%` : 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Productos</p>
                  <p className="font-bold text-gray-900 text-xl">{detailModal.item.items_anexo?.length || 0}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Dependencia</p>
                  <p className="font-bold text-gray-900">{getDependenciaNombre(detailModal.item.id_dependencia)}</p>
                </div>
              </div>
              {detailModal.item.items_anexo && detailModal.item.items_anexo.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Detalle de Productos</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 text-xs text-gray-500 font-medium">Código</th>
                          <th className="text-left py-2 text-xs text-gray-500 font-medium">Producto</th>
                          <th className="text-right py-2 text-xs text-gray-500 font-medium">Cant.</th>
                          <th className="text-right py-2 text-xs text-gray-500 font-medium">P. Unit.</th>
                          <th className="text-right py-2 text-xs text-gray-500 font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailModal.item.items_anexo.map((p: any, idx: number) => {
                          const prod = productos.find(pr => pr.id_producto === p.id_producto);
                          const total = p.cantidad * (p.precio_venta || 0);
                          return (
                            <tr key={idx} className="border-b border-gray-100 last:border-0">
                              <td className="py-2 text-gray-500 font-mono text-xs">{prod?.codigo || '-'}</td>
                              <td className="py-2 text-gray-700">{prod?.nombre || `Producto ${p.id_producto}`}</td>
                              <td className="py-2 text-gray-500 text-right">{p.cantidad}</td>
                              <td className="py-2 text-gray-500 text-right">${Number(p.precio_venta || 0).toFixed(2)}</td>
                              <td className="py-2 text-gray-900 font-medium text-right">${total.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={4} className="py-2 text-right text-sm font-bold text-gray-900">Total:</td>
                          <td className="py-2 text-right text-sm font-bold text-green-600">
                            ${detailModal.item.items_anexo.reduce((t: number, p: any) => t + (p.cantidad * (p.precio_venta || 0)), 0).toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button onClick={() => setDetailModal({ isOpen: false, item: null })} className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium">Cerrar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
