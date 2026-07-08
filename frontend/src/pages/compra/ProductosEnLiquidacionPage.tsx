import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui';
import { productosEnLiquidacionService, productosService, monedaService } from '../../services/api';
import type { ProductosEnLiquidacion, ProductosEnLiquidacionCreate } from '../../services/api';
import type { Productos } from '../../types';
import type { Moneda } from '../../types/moneda';
import { useInfiniteList } from '../../hooks/useInfiniteList';
import { Plus, Save, Trash2, Edit, X, ArrowLeft, Search, Check, Package, Tag, DollarSign, ClipboardList, Eye, Boxes, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { esNumeroPositivo, esPorcentaje } from '../../utils/validacionFormularios';

type View = 'list' | 'form';

export function ProductosEnLiquidacionPage() {
  const [view, setView] = useState<View>('list');
  const [allProductos, setAllProductos] = useState<Productos[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: ProductosEnLiquidacion | null }>({ isOpen: false, item: null });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<ProductosEnLiquidacionCreate>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Infinite list ──────────────────────────────────────────────────────────

  const {
    items: productos,
    isLoading,
    isFetchingMore,
    hasMore,
    loadMore,
    refresh,
  } = useInfiniteList<ProductosEnLiquidacion>({
    queryKeyBase: 'productos-liquidacion-pendientes',
    queryFn: (skip, limit) =>
      productosEnLiquidacionService.getProductosEnLiquidacionPendientes(skip, limit),
    limit: 100,
  });

  // IntersectionObserver para scroll infinito
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isFetchingMore) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, hasMore, isFetchingMore]);

  // ── Referencia de datos (productos para select, monedas) ─────────────────

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [prods, mons] = await Promise.all([
          productosService.getProductos(0, 1000),
          monedaService.getMonedas(0, 100)
        ]);
        setAllProductos(prods);
        setMonedas(mons);
      } catch (error) { console.error('Error en operación:', error instanceof Error ? error.message : 'Error desconocido'); }
    };
    loadInitialData();
  }, []);

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    if (!formData.id_producto) newErrors.id_producto = 'Seleccione un producto';
    if (!formData.cantidad || formData.cantidad < 1) newErrors.cantidad = 'La cantidad debe ser mayor o igual a 1';
    if (formData.precio === undefined || formData.precio === null || formData.precio < 0) newErrors.precio = 'El precio no puede ser negativo';
    if (!formData.id_moneda) newErrors.id_moneda = 'Seleccione una moneda';
    if (!formData.tipo_compra) newErrors.tipo_compra = 'Seleccione un tipo de compra';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error(Object.values(newErrors).join('\n• '));
      return;
    }
    try {
      editingId 
        ? await productosEnLiquidacionService.updateProductoEnLiquidacion(editingId, formData)
        : await productosEnLiquidacionService.createProductoEnLiquidacion(formData as ProductosEnLiquidacionCreate);
      toast.success(editingId ? 'Actualizado' : 'Creado');
      setView('list');
      resetForm();
      refresh();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar?')) return;
    try {
      await productosEnLiquidacionService.deleteProducto(id);
      toast.success('Eliminado');
      refresh();
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded shadow-lg animate-bounce-subtle">
            <Boxes className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-baseline">
            <h1 className="text-xl font-bold text-gray-900">Productos en Liquidación</h1>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              {filteredProductos.length === productos.length
                ? `Gestión de productos (${productos.length} items)`
                : `Mostrando ${filteredProductos.length} de ${productos.length} productos`
              }
            </p>
          </div>
        </div>
        <Button
          onClick={() => openForm()}
          className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </Button>
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
            <TableHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
              <TableRow>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-teal-600" />
                    Producto
                  </div>
                </TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-teal-600" />
                    Precio Compra
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-teal-600" />
                    Precio Venta
                  </div>
                </TableHead>
                <TableHead>Tipo Compra</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
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
                          className="text-green-600 hover:text-green-800 hover:bg-green-50 h-8 w-8"
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
        {/* Sentinel para scroll infinito */}
        {hasMore && (
          <div ref={loadMoreRef} className="flex justify-center py-2">
            {isFetchingMore && (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Cargando más...</span>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );

  const renderForm = () => (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => { setView('list'); resetForm(); }}
          className="h-9 w-9"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded shadow-lg animate-bounce-subtle">
            <Boxes className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            {editingId ? 'Editar' : 'Nuevo'} Producto en Liquidación
          </h1>
        </div>
      </div>
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="border-b bg-gray-50/50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-teal-600" />
            {editingId ? 'Editar' : 'Nuevo'} Producto en Liquidación
          </CardTitle>
        </CardHeader>
        <CardContent className="mt-4 space-y-4">
          <div>
            <Label className="text-sm font-medium">Producto *</Label>
            <select 
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
              value={formData.id_producto || ''}
              onChange={(e) => { setFormData({...formData, id_producto: Number(e.target.value)}); setErrors(prev => ({...prev, id_producto: ''})); }}
            >
              <option value="">Seleccionar</option>
              {allProductos.map(p => <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>)}
            </select>
            {errors.id_producto && <p className="text-red-500 text-sm mt-1">{errors.id_producto}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Cantidad *</Label>
              <Input 
                type="number" 
                min="1"
                value={formData.cantidad || ''} 
                onChange={(e: any) => { setFormData({...formData, cantidad: Number(e.target.value)}); setErrors(prev => ({...prev, cantidad: ''})); }}
              />
              {errors.cantidad && <p className="text-red-500 text-sm mt-1">{errors.cantidad}</p>}
            </div>
            <div>
              <Label className="text-sm font-medium">Precio *</Label>
              <Input 
                type="number" 
                step="0.01"
                min="0"
                value={formData.precio || ''} 
                onChange={(e: any) => { setFormData({...formData, precio: Number(e.target.value)}); setErrors(prev => ({...prev, precio: ''})); }}
              />
              {errors.precio && <p className="text-red-500 text-sm mt-1">{errors.precio}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Moneda *</Label>
              <select 
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                value={formData.id_moneda || ''}
                onChange={(e) => { setFormData({...formData, id_moneda: Number(e.target.value)}); setErrors(prev => ({...prev, id_moneda: ''})); }}
              >
                <option value="">Seleccionar</option>
                {monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.nombre}</option>)}
              </select>
              {errors.id_moneda && <p className="text-red-500 text-sm mt-1">{errors.id_moneda}</p>}
            </div>
            <div>
              <Label className="text-sm font-medium">Tipo Compra *</Label>
              <select 
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                value={formData.tipo_compra || ''}
                onChange={(e) => { setFormData({...formData, tipo_compra: e.target.value as any}); setErrors(prev => ({...prev, tipo_compra: ''})); }}
              >
                <option value="">Seleccionar</option>
                <option value="FACTURA">Factura</option>
                <option value="VENTA_EFECTIVO">Venta Efectivo</option>
                <option value="ANEXO">Anexo</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-6 border-t">
            <Button
              onClick={handleSave}
              className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
            >
              <Save className="w-4 h-4" />
              Guardar
            </Button>
            <Button variant="outline" onClick={() => { setView('list'); resetForm(); }}>Cancelar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div>
      {view === 'list' && renderList()}
      {view === 'form' && renderForm()}

      {detailModal.isOpen && detailModal.item && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto animate-scale-in">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
                    <Boxes className="h-7 w-7" />
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
