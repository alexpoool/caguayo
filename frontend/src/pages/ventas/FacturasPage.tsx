import { useState, useEffect } from 'react';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { facturasService, contratosService, productosService } from '../../services/api';
import type { ContratoWithDetails } from '../../types/contrato';
import type { Productos } from '../../types';
import type { FacturaWithDetails } from '../../types/contrato';
import { Plus, Save, Trash2, Edit, X, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

type View = 'list' | 'form';

export function FacturasPage() {
  const [view, setView] = useState<View>('list');
  
  const [facturas, setFacturas] = useState<FacturaWithDetails[]>([]);
  const [contratos, setContratos] = useState<ContratoWithDetails[]>([]);
  const [productos, setProductos] = useState<Productos[]>([]);
  
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
    } catch (error) { console.error('Error:', error); }
  };

  const loadFacturas = async () => {
    if (!selectedContratoId) {
      setFacturas([]);
      return;
    }
    try { const data = await facturasService.getFacturasByContrato(selectedContratoId); setFacturas(data); } 
    catch (error) { console.error('Error:', error); }
  };

  useEffect(() => { 
    if (view === 'list') loadFacturas(); 
  }, [view, selectedContratoId]);

  const handleSave = async () => {
    try {
      const data = { 
        id_contrato: selectedContratoId, 
        codigo_factura: formData.codigo_factura || '',
        fecha: formData.fecha || new Date().toISOString().split('T')[0],
        descripcion: formData.descripcion,
        observaciones: formData.observaciones,
        pago_actual: Number(formData.pago_actual) || 0,
        productos: selectedProducts 
      };
      editingId ? await facturasService.updateFactura(editingId, data as any) : await facturasService.createFactura(data as any);
      toast.success(editingId ? 'Actualizado' : 'Creado');
      setView('list');
      resetForm();
      loadFacturas();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar?')) return;
    try {
      await facturasService.deleteFactura(id);
      toast.success('Eliminado');
      loadFacturas();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const resetForm = () => { setFormData({}); setSelectedProducts([]); setEditingId(null); };

  const openForm = (item?: FacturaWithDetails) => {
    if (item) {
      setEditingId(item.id_factura);
      setFormData({ 
        codigo_factura: item.codigo_factura,
        descripcion: item.descripcion,
        observaciones: item.observaciones,
        fecha: item.fecha,
        pago_actual: item.pago_actual
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
        <h2 className="text-2xl font-bold">Facturas</h2>
        <div className="flex gap-2">
          <select className="p-2 border rounded" value={selectedContratoId || ''} onChange={(e: any) => setSelectedContratoId(Number(e.target.value) || null)}>
            <option value="">Seleccionar Contrato</option>
            {contratos.map(c => <option key={c.id_contrato} value={c.id_contrato}>{c.nombre}</option>)}
          </select>
          <Button onClick={() => openForm()} disabled={!selectedContratoId}><Plus className="w-4 h-4 mr-2" />Nueva</Button>
        </div>
      </div>
      {!selectedContratoId ? (
        <p className="text-gray-500">Seleccione un contrato para ver sus facturas.</p>
      ) : facturas.length === 0 ? (
        <p className="text-gray-500">No hay facturas.</p>
      ) : (
        <div className="grid gap-4">
          {facturas.map((item) => (
            <Card key={item.id_factura}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">Factura: {item.codigo_factura}</h3>
                    <p className="text-sm">Monto: ${Number(item.monto).toFixed(2)} | Pago: ${Number(item.pago_actual).toFixed(2)}</p>
                    <p className="text-sm text-gray-500">Fecha: {item.fecha}</p>
                    {item.descripcion && <p className="text-sm">{item.descripcion}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openForm(item)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(item.id_factura)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
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
          <CardTitle>{editingId ? 'Editar' : 'Nueva'} Factura</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div><Label>Código Factura</Label><Input value={formData.codigo_factura || ''} onChange={(e: any) => setFormData({...formData, codigo_factura: e.target.value})} /></div>
          <div><Label>Descripción</Label><Input value={formData.descripcion || ''} onChange={(e: any) => setFormData({...formData, descripcion: e.target.value})} /></div>
          <div><Label>Observaciones</Label><Input value={formData.observaciones || ''} onChange={(e: any) => setFormData({...formData, observaciones: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4"><div><Label>Fecha</Label><Input type="date" value={formData.fecha || ''} onChange={(e: any) => setFormData({...formData, fecha: e.target.value})} /></div><div><Label>Pago Actual</Label><Input type="number" step="0.01" value={formData.pago_actual || ''} onChange={(e: any) => setFormData({...formData, pago_actual: e.target.value})} /></div></div>
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
      <h1 className="text-3xl font-bold mb-6">Facturas</h1>
      {view === 'list' && renderList()}
      {view === 'form' && renderForm()}
    </div>
  );
}
