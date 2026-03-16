import { useState, useEffect } from 'react';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { anexosService, conveniosService, productosService, monedaService, dependenciasService } from '../../services/api';
import type { Productos } from '../../types';
import { Plus, Save, Trash2, Edit, X, Boxes, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';

type View = 'list' | 'form' | 'detail';

export function CompraAnexosPage() {
  const [searchParams] = useSearchParams();
  const initialConvenioId = searchParams.get('convenio');
  
  const [view, setView] = useState<View>('list');
  const [anexos, setAnexos] = useState<any[]>([]);
  const [convenios, setConvenios] = useState<any[]>([]);
  const [productos, setProductos] = useState<Productos[]>([]);
  const [monedas, setMonedas] = useState<any[]>([]);
  const [dependencias, setDependencias] = useState<any[]>([]);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedConvenio, setSelectedConvenio] = useState<number | null>(initialConvenioId ? Number(initialConvenioId) : null);
  const [selectedProducts, setSelectedProducts] = useState<{id_producto: number; cantidad: number; precio_compra: number}[]>([]);

  useEffect(() => { loadInitialData(); }, []);
  useEffect(() => { if (view === 'list') loadAnexos(); }, [view, selectedConvenio]);

  const loadInitialData = async () => {
    try {
      const [conv, prod, mon, dep] = await Promise.all([
        conveniosService.getConvenios(),
        productosService.getProductos(0, 1000),
        monedaService.getMonedas(0, 100),
        dependenciasService.getDependencias(undefined, 0, 1000)
      ]);
      setConvenios(conv.filter((c: any) => new Date(c.vigencia) >= new Date()));
      setProductos(prod);
      setMonedas(mon);
      setDependencias(dep);
    } catch (error) { console.error('Error:', error); }
  };

  const loadAnexos = async () => {
    try {
      const data = await anexosService.getAnexos(selectedConvenio || undefined);
      setAnexos(data);
    } catch (error) { console.error('Error:', error); }
  };

  const handleSave = async () => {
    try {
      const data = {
        id_convenio: selectedConvenio!,
        nombre_anexo: formData.nombre_anexo,
        fecha: formData.fecha,
        id_dependencia: formData.id_dependencia ? Number(formData.id_dependencia) : undefined,
        id_moneda: formData.id_moneda ? Number(formData.id_moneda) : undefined,
        comision: formData.comision ? Number(formData.comision) : undefined,
        productos: selectedProducts.map(p => ({
          id_producto: p.id_producto,
          cantidad: p.cantidad,
          precio_compra: p.precio_compra
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
  };

  const openForm = (item?: any) => {
    if (item) {
      setEditingId(item.id_anexo);
      setSelectedConvenio(item.id_convenio);
      setFormData({
        nombre_anexo: item.nombre_anexo,
        fecha: item.fecha,
        id_dependencia: item.id_dependencia,
        id_moneda: item.id_moneda,
        comision: item.comision,
        codigo_anexo: item.codigo_anexo,
      });
      setSelectedProducts(item.productos?.map((p: any) => ({
        id_producto: p.id_producto,
        cantidad: p.cantidad,
        precio_compra: p.precio_compra || 0
      })) || []);
    } else { resetForm(); }
    setView('form');
  };

  const addProduct = (producto: Productos) => {
    if (!selectedProducts.find(p => p.id_producto === producto.id_producto)) {
      setSelectedProducts([...selectedProducts, { 
        id_producto: producto.id_producto, 
        cantidad: 1, 
        precio_compra: Number(producto.precio_compra) 
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

  const calcTotal = () => selectedProducts.reduce((t, p) => t + (p.cantidad * p.precio_compra), 0);

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

  const renderList = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Anexos</h2>
        <div className="flex gap-2">
          <select 
            className="p-2 border rounded" 
            value={selectedConvenio || ''} 
            onChange={(e: any) => setSelectedConvenio(Number(e.target.value) || null)}
          >
            <option value="">Todos los convenios</option>
            {convenios.map(c => <option key={c.id_convenio} value={c.id_convenio}>{c.codigo_convenio} - {c.nombre_convenio}</option>)}
          </select>
          <Button onClick={() => openForm()} disabled={!selectedConvenio}><Plus className="w-4 h-4 mr-2" />Nuevo</Button>
        </div>
      </div>
      
      {!selectedConvenio && (
        <p className="text-gray-500">Seleccione un convenio para ver sus anexos.</p>
      )}
      
      {selectedConvenio && anexos.length === 0 ? (
        <p className="text-gray-500">No hay anexos registrados.</p>
      ) : selectedConvenio && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-600">Código</th>
                  <th className="text-left p-3 font-medium text-gray-600">Nombre</th>
                  <th className="text-left p-3 font-medium text-gray-600">Comisión</th>
                  <th className="text-left p-3 font-medium text-gray-600">Productos</th>
                  <th className="text-right p-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {anexos.map((item) => (
                  <tr key={item.id_anexo} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-amber-600" />
                        <span className="font-mono text-sm">{item.codigo_anexo || '-'}</span>
                      </div>
                    </td>
                    <td className="p-3 font-medium">{item.nombre_anexo}</td>
                    <td className="p-3 text-gray-600">{item.comision ? `${item.comision}%` : '-'}</td>
                    <td className="p-3 text-gray-600">{item.productos?.length || 0}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openForm(item)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id_anexo)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
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
          <div className="flex flex-wrap gap-2 mb-3">
            {productos.map(p => (
              <Button 
                key={p.id_producto} 
                variant="outline" 
                size="sm" 
                onClick={() => addProduct(p)} 
                disabled={selectedProducts.some(sp => sp.id_producto === p.id_producto)}
              >
                {p.nombre}
              </Button>
            ))}
          </div>
          
          {selectedProducts.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Producto</th>
                    <th className="px-3 py-2 text-left">Cantidad</th>
                    <th className="px-3 py-2 text-left">Precio Compra</th>
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
                          value={p.precio_compra} 
                          onChange={(e: any) => updateProduct(p.id_producto, 'precio_compra', Number(e.target.value))}
                          className="w-24 h-8"
                        />
                      </td>
                      <td className="px-3 py-2 font-medium">${(p.cantidad * p.precio_compra).toFixed(2)}</td>
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
          <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" />Guardar</Button>
          <Button variant="outline" onClick={() => { setView('list'); resetForm(); }}>Cancelar</Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Gestión de Anexos</h1>
      {view === 'list' && renderList()}
      {view === 'form' && renderForm()}
    </div>
  );
}
