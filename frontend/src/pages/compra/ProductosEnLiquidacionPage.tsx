import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Card, CardHeader, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui';
import { productosEnLiquidacionService, productosService, monedaService } from '../../services/api';
import type { ProductosEnLiquidacion, ProductosEnLiquidacionCreate } from '../../services/api';
import type { Productos } from '../../types';
import type { Moneda } from '../../types/moneda';
import { Plus, Save, Trash2, Edit, X, ArrowLeft, Search, Check, Package, Tag, DollarSign, ClipboardList, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

type View = 'list' | 'form';
type FilterType = 'all' | 'pendientes' | 'liquidadas';

export function ProductosEnLiquidacionPage() {
  const [view, setView] = useState<View>('list');
  const [filterType, setFilterType] = useState<FilterType>('pendientes');
  const [productos, setProductos] = useState<ProductosEnLiquidacion[]>([]);
  const [allProductos, setAllProductos] = useState<Productos[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: ProductosEnLiquidacion | null }>({ isOpen: false, item: null });
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<ProductosEnLiquidacionCreate>>({});

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    try {
      const [prods, mons] = await Promise.all([
        productosService.getProductos(0, 1000),
        monedaService.getMonedas(0, 100)
      ]);
      setAllProductos(prods);
      setMonedas(mons);
    } catch (error) { console.error('Error:', error); }
  };

  const loadProductos = async () => {
    setLoading(true);
    try {
      let data: ProductosEnLiquidacion[];
      if (filterType === 'pendientes') {
        data = await productosEnLiquidacionService.getProductosEnLiquidacionPendientes();
      } else if (filterType === 'liquidadas') {
        data = await productosEnLiquidacionService.getProductosEnLiquidacionLiquidadas();
      } else {
        data = await productosEnLiquidacionService.getProductosEnLiquidacion();
      }
      setProductos(data);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (view === 'list') loadProductos(); }, [view, filterType]);

  const handleSave = async () => {
    try {
      if (!formData.id_producto || !formData.cantidad || !formData.precio || !formData.id_moneda || !formData.tipo_compra) {
        toast.error('Complete todos los campos requeridos');
        return;
      }
      editingId 
        ? await productosEnLiquidacionService.updateProductoEnLiquidacion(editingId, formData)
        : await productosEnLiquidacionService.createProductoEnLiquidacion(formData as ProductosEnLiquidacionCreate);
      toast.success(editingId ? 'Actualizado' : 'Creado');
      setView('list');
      resetForm();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar?')) return;
    try {
      await productosEnLiquidacionService.deleteProducto(id);
      toast.success('Eliminado');
      loadProductos();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const resetForm = () => { setFormData({}); setEditingId(null); };

  const openForm = (item?: ProductosEnLiquidacion) => {
    if (item) {
      setEditingId(item.id_producto_en_liquidacion);
      setFormData({ 
        id_producto: item.id_producto,
        cantidad: item.cantidad,
        precio: item.precio,
        id_moneda: item.id_moneda,
        tipo_compra: item.tipo_compra,
      });
    } else { resetForm(); }
    setView('form');
  };

  const filteredProductos = useMemo(() => {
    if (!searchTerm) return productos;
    return productos.filter(p => 
      p.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.producto?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tipo_compra?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [productos, searchTerm]);

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'FACTURA': return 'Factura';
      case 'VENTA_EFECTIVO': return 'Venta Efectivo';
      case 'ANEXO': return 'Anexo';
      default: return tipo;
    }
  };

  const renderList = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg animate-bounce-subtle">
            <ClipboardList className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Productos en Liquidación</h1>
            <p className="text-gray-500 mt-1">
              {filteredProductos.length === productos.length 
                ? `Gestión de productos (${productos.length} items)`
                : `Mostrando ${filteredProductos.length} de ${productos.length} productos`
              }
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 border-b">
        {(['pendientes', 'liquidadas', 'all'] as FilterType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterType(tab)}
            className={`px-4 py-2 font-medium transition-colors ${
              filterType === tab
                ? 'text-lime-600 border-b-2 border-lime-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'all' ? 'Todas' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card className="overflow-hidden shadow-sm border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-red-50 to-rose-50">
              <TableRow>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-red-600" />
                    Producto
                  </div>
                </TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-red-600" />
                    Precio Compra
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-red-600" />
                    Precio Venta
                  </div>
                </TableHead>
                <TableHead>Tipo Compra</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredProductos.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                    {searchTerm ? 'No se encontraron productos que coincidan con la búsqueda' : 'No hay productos'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProductos.map((item) => (
                  <TableRow key={item.id_producto_en_liquidacion} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setDetailModal({ isOpen: true, item })}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-500" />
                        <span>{item.producto?.nombre || `${item.id_producto}`}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {item.cantidad}
                    </TableCell>
                    <TableCell className="font-medium text-green-700">
                      ${Number(item.precio).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-medium text-blue-700">
                      ${Number(item.producto?.precio_venta || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {getTipoLabel(item.tipo_compra)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.liquidada ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {item.liquidada ? 'Liquidada' : 'Pendiente'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openForm(item)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id_producto_en_liquidacion)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8"
                          title="Eliminar"
                        >
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
          <h2 className="text-xl font-semibold">{editingId ? 'Editar' : 'Nuevo'} Producto en Liquidación</h2>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Producto *</label>
            <select 
              className="w-full p-2 border rounded-lg"
              value={formData.id_producto || ''}
              onChange={(e) => setFormData({...formData, id_producto: Number(e.target.value)})}
            >
              <option value="">Seleccionar</option>
              {allProductos.map(p => <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad *</label>
              <Input 
                type="number" 
                min="1"
                value={formData.cantidad || ''} 
                onChange={(e: any) => setFormData({...formData, cantidad: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio *</label>
              <Input 
                type="number" 
                step="0.01"
                value={formData.precio || ''} 
                onChange={(e: any) => setFormData({...formData, precio: Number(e.target.value)})}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda *</label>
              <select 
                className="w-full p-2 border rounded-lg"
                value={formData.id_moneda || ''}
                onChange={(e) => setFormData({...formData, id_moneda: Number(e.target.value)})}
              >
                <option value="">Seleccionar</option>
                {monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Compra *</label>
              <select 
                className="w-full p-2 border rounded-lg"
                value={formData.tipo_compra || ''}
                onChange={(e) => setFormData({...formData, tipo_compra: e.target.value as any})}
              >
                <option value="">Seleccionar</option>
                <option value="FACTURA">Factura</option>
                <option value="VENTA_EFECTIVO">Venta Efectivo</option>
                <option value="ANEXO">Anexo</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" />Guardar</Button>
            <Button variant="outline" onClick={() => { setView('list'); resetForm(); }}>Cancelar</Button>
          </div>
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
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-rose-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg">
                    <ClipboardList className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{detailModal.item.producto?.nombre || 'Producto'}</h3>
                    <p className="text-sm text-gray-500 font-mono">{detailModal.item.codigo || 'Sin código'}</p>
                  </div>
                </div>
                <button onClick={() => setDetailModal({ isOpen: false, item: null })} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                  <p className="text-xs text-green-600 uppercase tracking-wider mb-1">Precio de Compra</p>
                  <p className="font-bold text-green-900 text-xl">${Number(detailModal.item.precio).toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">Precio de Venta</p>
                  <p className="font-bold text-blue-900 text-xl">${Number(detailModal.item.producto?.precio_venta || 0).toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-100">
                  <p className="text-xs text-orange-600 uppercase tracking-wider mb-1">Cantidad</p>
                  <p className="font-bold text-orange-900 text-xl">{detailModal.item.cantidad}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tipo Compra</p>
                  <p className="font-bold text-gray-900">{getTipoLabel(detailModal.item.tipo_compra)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                  <p className="text-xs text-purple-600 uppercase tracking-wider mb-1">Fecha</p>
                  <p className="font-bold text-gray-900">{new Date(detailModal.item.fecha).toLocaleDateString()}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Moneda</p>
                  <p className="font-bold text-gray-900">{detailModal.item.moneda?.nombre || 'N/A'}</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-violet-50 p-4 rounded-xl border border-indigo-100">
                <p className="text-xs text-indigo-600 uppercase tracking-wider mb-1">Total (Precio Venta × Cantidad)</p>
                <p className="font-bold text-indigo-900 text-2xl">${Number((detailModal.item.producto?.precio_venta || 0) * detailModal.item.cantidad).toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Estado</p>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${detailModal.item.liquidada ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                  {detailModal.item.liquidada ? 'Liquidada' : 'Pendiente'}
                </span>
              </div>
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
