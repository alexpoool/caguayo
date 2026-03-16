import { useState, useEffect } from 'react';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { ventasEfectivoService, productosService, dependenciasService } from '../../services/api';
import type { Productos } from '../../types';
import type { Dependencia } from '../../types/dependencia';
import type { VentaEfectivoWithDetails } from '../../types/contrato';
import { Plus, Save, Trash2, Edit, X, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

type View = 'list' | 'form';

export function VentasEfectivoPage() {
  const [view, setView] = useState<View>('list');
  
  const [ventasEfectivo, setVentasEfectivo] = useState<VentaEfectivoWithDetails[]>([]);
  const [productos, setProductos] = useState<Productos[]>([]);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedProducts, setSelectedProducts] = useState<{id_producto: number; cantidad: number}[]>([]);

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    try {
      const [productosRes, depsRes] = await Promise.all([
        productosService.getProductos(0, 1000),
        dependenciasService.getDependencias(undefined, 0, 1000)
      ]);
      setProductos(productosRes);
      setDependencias(depsRes);
    } catch (error) { console.error('Error:', error); }
  };

  const loadVentasEfectivo = async () => {
    try { const data = await ventasEfectivoService.getVentasEfectivo(); setVentasEfectivo(data); } 
    catch (error) { console.error('Error:', error); }
  };

  useEffect(() => { 
    if (view === 'list') loadVentasEfectivo(); 
  }, [view]);

  const handleSave = async () => {
    try {
      const data = { 
        slip: formData.slip || '',
        fecha: formData.fecha || new Date().toISOString().split('T')[0],
        cajero: formData.cajero || '',
        id_dependencia: Number(formData.id_dependencia) || 1, 
        productos: selectedProducts 
      };
      editingId ? await ventasEfectivoService.updateVentaEfectivo(editingId, data as any) : await ventasEfectivoService.createVentaEfectivo(data as any);
      toast.success(editingId ? 'Actualizado' : 'Creado');
      setView('list');
      resetForm();
      loadVentasEfectivo();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar?')) return;
    try {
      await ventasEfectivoService.deleteVentaEfectivo(id);
      toast.success('Eliminado');
      loadVentasEfectivo();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const resetForm = () => { setFormData({}); setSelectedProducts([]); setEditingId(null); };

  const openForm = (item?: VentaEfectivoWithDetails) => {
    if (item) {
      setEditingId(item.id_venta_efectivo);
      setFormData({ 
        slip: item.slip,
        fecha: item.fecha,
        cajero: item.cajero,
        id_dependencia: item.id_dependencia
      });
      setSelectedProducts(item.productos?.map((p: any) => ({ id_producto: p.id_producto, cantidad: p.cantidad })) || []);
    } else { resetForm(); }
    setView('form');
  };

  const addProduct = (id: number) => { if (!selectedProducts.find(p => p.id_producto === id)) setSelectedProducts([...selectedProducts, { id_producto: id, cantidad: 1 }]); };
  const updateCantidad = (id: number, qty: number) => { setSelectedProducts(selectedProducts.map(p => p.id_producto === id ? { ...p, cantidad: qty } : p)); };
  const removeProduct = (id: number) => { setSelectedProducts(selectedProducts.filter(p => p.id_producto !== id)); };
  const calcMonto = () => selectedProducts.reduce((t, p) => { const pr = productos.find(pr => pr.id_producto === p.id_producto); return t + (pr ? Number(pr.precio_venta) * p.cantidad : 0); }, 0);

  const renderProductSelector = () => (
    <div className="mt-4 p-4 border rounded-lg bg-gray-50">
      <Label className="mb-2 block">Productos</Label>
      <div className="flex flex-wrap gap-2 mb-3">
        {productos.map(p => <Button key={p.id_producto} variant="outline" size="sm" onClick={() => addProduct(p.id_producto)} disabled={selectedProducts.some(sp => sp.id_producto === p.id_producto)}>{p.nombre}</Button>)}
      </div>
      {selectedProducts.length > 0 && (
        <div className="space-y-2">
          {selectedProducts.map(p => { const pr = productos.find(pr => pr.id_producto === p.id_producto); return (
            <div key={p.id_producto} className="flex items-center gap-2 p-2 bg-white rounded">
              <span className="flex-1">{pr?.nombre}</span>
              <Input type="number" min="1" value={p.cantidad} onChange={(e: any) => updateCantidad(p.id_producto, Number(e.target.value))} className="w-20" />
              <span className="w-24 text-right">${pr ? (Number(pr.precio_venta) * p.cantidad).toFixed(2) : '0.00'}</span>
              <button onClick={() => removeProduct(p.id_producto)} className="text-red-500"><X className="w-4 h-4" /></button>
            </div>
          ); })}
          <div className="text-right font-bold">Total: ${calcMonto().toFixed(2)}</div>
        </div>
      )}
    </div>
  );

  const renderList = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Ventas en Efectivo</h2>
        <Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" />Nueva</Button>
      </div>
      {ventasEfectivo.length === 0 ? (
        <p className="text-gray-500">No hay ventas en efectivo.</p>
      ) : (
        <div className="grid gap-4">
          {ventasEfectivo.map((item) => (
            <Card key={item.id_venta_efectivo}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">Slip: {item.slip}</h3>
                    <p className="text-sm">Cajero: {item.cajero} | Monto: ${Number(item.monto).toFixed(2)}</p>
                    <p className="text-sm text-gray-500">Fecha: {item.fecha} | Dependencia: {item.dependencia?.nombre}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openForm(item)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(item.id_venta_efectivo)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderForm = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => { setView('list'); resetForm(); }}><ArrowLeft className="w-4 h-4" /></Button>
          <CardTitle>{editingId ? 'Editar' : 'Nueva'} Venta en Efectivo</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div><Label>Slip</Label><Input value={formData.slip || ''} onChange={(e: any) => setFormData({...formData, slip: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4"><div><Label>Fecha</Label><Input type="date" value={formData.fecha || ''} onChange={(e: any) => setFormData({...formData, fecha: e.target.value})} /></div><div><Label>Cajero</Label><Input value={formData.cajero || ''} onChange={(e: any) => setFormData({...formData, cajero: e.target.value})} /></div></div>
          <div><Label>Dependencia</Label><select className="w-full p-2 border rounded" value={formData.id_dependencia || ''} onChange={(e: any) => setFormData({...formData, id_dependencia: e.target.value})}><option value="">Seleccionar</option>{dependencias.map(d => <option key={d.id_dependencia} value={d.id_dependencia}>{d.nombre}</option>)}</select></div>
          {renderProductSelector()}
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
      <h1 className="text-3xl font-bold mb-6">Ventas en Efectivo</h1>
      {view === 'list' && renderList()}
      {view === 'form' && renderForm()}
    </div>
  );
}
