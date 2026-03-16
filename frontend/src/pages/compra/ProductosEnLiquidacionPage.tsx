import { useState, useEffect, useMemo } from 'react';
import { Button, Input, Card, CardHeader, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui';
import { productosEnLiquidacionService, productosService, monedaService } from '../../services/api';
import type { ProductosEnLiquidacion, ProductosEnLiquidacionCreate } from '../../services/api';
import type { Productos } from '../../types';
import type { Moneda } from '../../types/moneda';
import { Plus, Save, Trash2, Edit, X, ArrowLeft, Search, Check, Package } from 'lucide-react';
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

  const handleLiquidar = async (id: number) => {
    try {
      await productosEnLiquidacionService.liquidarProducto(id);
      toast.success('Marcado como liquidado');
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos en Liquidación</h1>
          <p className="text-gray-500 mt-1">
            {filteredProductos.length === productos.length 
              ? `Gestión de productos (${productos.length} items)`
              : `Mostrando ${filteredProductos.length} de ${productos.length} productos`
            }
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={filterType === 'pendientes' ? 'primary' : 'outline'} size="sm" onClick={() => setFilterType('pendientes')}>
            Pendientes
          </Button>
          <Button variant={filterType === 'liquidadas' ? 'primary' : 'outline'} size="sm" onClick={() => setFilterType('liquidadas')}>
            Liquidadas
          </Button>
          <Button variant={filterType === 'all' ? 'primary' : 'outline'} size="sm" onClick={() => setFilterType('all')}>
            Todas
          </Button>
        </div>
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
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Tipo Compra</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredProductos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                    {searchTerm ? 'No se encontraron productos que coincidan con la búsqueda' : 'No hay productos'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredProductos.map((item) => (
                  <TableRow key={item.id_producto_en_liquidacion} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell>
                      <span className="font-medium text-gray-900">{item.codigo}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-500" />
                        <span>{item.producto?.nombre || `ID: ${item.id_producto}`}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {item.cantidad}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      ${Number(item.precio).toFixed(2)} {item.moneda?.nombre || ''}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {getTipoLabel(item.tipo_compra)}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {new Date(item.fecha).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.liquidada ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {item.liquidada ? 'Liquidada' : 'Pendiente'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!item.liquidada && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleLiquidar(item.id_producto_en_liquidacion)}
                            className="text-green-600 hover:text-green-800 hover:bg-green-50 h-8 w-8"
                            title="Marcar como liquidada"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
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
    </div>
  );
}
