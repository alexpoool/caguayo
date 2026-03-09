import { useState, useEffect } from 'react';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { suplementosService, contratosService, productosService } from '../../services/api';
import type { ContratoWithDetails } from '../../types/contrato';
import type { Productos } from '../../types';
import type { SuplementoWithDetails } from '../../types/contrato';
import { Plus, Save, Trash2, Edit, X, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

type View = 'list' | 'form';

export function SuplementosPage() {
  const [view, setView] = useState<View>('list');
  
  const [suplementos, setSuplementos] = useState<SuplementoWithDetails[]>([]);
  const [contratos, setContratos] = useState<ContratoWithDetails[]>([]);
  const [productos, setProductos] = useState<Productos[]>([]);
  const [estados, setEstados] = useState<{id: number, nombre: string}[]>([]);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedProducts, setSelectedProducts] = useState<{id_producto: number; cantidad: number}[]>([]);

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    try {
      const [contratosRes, productosRes] = await Promise.all([
        contratosService.getContratos(0, 1000),
        productosService.getProductos(0, 1000)
      ]);
      setContratos(contratosRes);
      setProductos(productosRes);
      setEstados([{ id: 1, nombre: 'ACTIVO' }, { id: 2, nombre: 'CANCELADO' }, { id: 3, nombre: 'FINALIZADO' }, { id: 4, nombre: 'PENDIENTE' }]);
    } catch (error) { console.error('Error:', error); }
  };

  const loadSuplementos = async () => {
    if (!selectedContratoId) {
      setSuplementos([]);
      return;
    }
    try { const data = await suplementosService.getSuplementosByContrato(selectedContratoId); setSuplementos(data); } 
    catch (error) { console.error('Error:', error); }
  };

  useEffect(() => { 
    if (view === 'list') loadSuplementos(); 
  }, [view, selectedContratoId]);

  const handleSave = async () => {
    try {
      const data = { 
        id_contrato: selectedContratoId, 
        nombre: formData.nombre || '',
        id_estado: Number(formData.id_estado) || 1, 
        fecha: formData.fecha || new Date().toISOString().split('T')[0],
        documento: formData.documento,
        productos: selectedProducts 
      };
      editingId ? await suplementosService.updateSuplemento(editingId, data as any) : await suplementosService.createSuplemento(data as any);
      toast.success(editingId ? 'Actualizado' : 'Creado');
      setView('list');
      resetForm();
      loadSuplementos();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar?')) return;
    try {
      await suplementosService.deleteSuplemento(id);
      toast.success('Eliminado');
      loadSuplementos();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const resetForm = () => { setFormData({}); setSelectedProducts([]); setEditingId(null); };

  const openForm = (item?: SuplementoWithDetails) => {
    if (item) {
      setEditingId(item.id_suplemento);
      setFormData({ 
        nombre: item.nombre, 
        id_estado: item.id_estado, 
        fecha: item.fecha, 
        documento: item.documento
      });
      setSelectedProducts(item.productos?.map((p: any) => ({ id_producto: p.id_producto, cantidad: p.cantidad })) || []);
    } else { resetForm(); }
    setView('form');
  };

  const addProduct = (id: number) => { if (!selectedProducts.find(p => p.id_producto === id)) setSelectedProducts([...selectedProducts, { id_producto: id, cantidad: 1 }]); };
  const updateCantidad = (id: number, qty: number) => { setSelectedProducts(selectedProducts.map(p => p.id_producto === id ? { ...p, cantidad: qty } : p)); };
  const removeProduct = (id: number) => { setSelectedProducts(selectedProducts.filter(p => p.id_producto !== id)); };

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
              <button onClick={() => removeProduct(p.id_producto)} className="text-red-500"><X className="w-4 h-4" /></button>
            </div>
          ); })}
        </div>
      )}
    </div>
  );

  const renderList = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Suplementos</h2>
        <div className="flex gap-2">
          <select className="p-2 border rounded" value={selectedContratoId || ''} onChange={(e: any) => setSelectedContratoId(Number(e.target.value) || null)}>
            <option value="">Seleccionar Contrato</option>
            {contratos.map(c => <option key={c.id_contrato} value={c.id_contrato}>{c.nombre}</option>)}
          </select>
          <Button onClick={() => openForm()} disabled={!selectedContratoId}><Plus className="w-4 h-4 mr-2" />Nuevo</Button>
        </div>
      </div>
      {!selectedContratoId ? (
        <p className="text-gray-500">Seleccione un contrato para ver sus suplementos.</p>
      ) : suplementos.length === 0 ? (
        <p className="text-gray-500">No hay suplementos.</p>
      ) : (
        <div className="grid gap-4">
          {suplementos.map((item) => (
            <Card key={item.id_suplemento}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{item.nombre}</h3>
                    <p className="text-sm">Monto: ${Number(item.monto).toFixed(2)} | Estado: {item.estado?.nombre}</p>
                    <p className="text-sm text-gray-500">Fecha: {item.fecha}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openForm(item)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(item.id_suplemento)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
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
          <CardTitle>{editingId ? 'Editar' : 'Nuevo'} Suplemento</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div><Label>Nombre</Label><Input value={formData.nombre || ''} onChange={(e: any) => setFormData({...formData, nombre: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4"><div><Label>Estado</Label><select className="w-full p-2 border rounded" value={formData.id_estado || ''} onChange={(e: any) => setFormData({...formData, id_estado: e.target.value})}>{estados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></div><div><Label>Fecha</Label><Input type="date" value={formData.fecha || ''} onChange={(e: any) => setFormData({...formData, fecha: e.target.value})} /></div></div>
          <div><Label>Documento</Label><Input value={formData.documento || ''} onChange={(e: any) => setFormData({...formData, documento: e.target.value})} /></div>
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
      <h1 className="text-3xl font-bold mb-6">Suplementos</h1>
      {view === 'list' && renderList()}
      {view === 'form' && renderForm()}
    </div>
  );
}
