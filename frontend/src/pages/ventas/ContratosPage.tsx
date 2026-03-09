import { useState, useEffect } from 'react';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from '../../components/ui';
import { contratosService, clientesService, monedaService, productosService } from '../../services/api';
import type { Cliente } from '../../types/ventas';
import type { Moneda } from '../../types/moneda';
import type { Productos } from '../../types';
import type { ContratoWithDetails, ContratoCreate } from '../../types/contrato';
import { Plus, Save, Trash2, Edit, X, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

type View = 'list' | 'form';

export function ContratosPage() {
  const [view, setView] = useState<View>('list');
  
  const [contratos, setContratos] = useState<ContratoWithDetails[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [productos, setProductos] = useState<Productos[]>([]);
  const [estados, setEstados] = useState<{id: number, nombre: string}[]>([]);
  const [tiposContrato, setTiposContrato] = useState<{id: number, nombre: string}[]>([]);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedProducts, setSelectedProducts] = useState<{id_producto: number; cantidad: number}[]>([]);

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    try {
      const [clientesRes, monedasRes, productosRes] = await Promise.all([
        clientesService.getClientes(0, 1000),
        monedaService.getMonedas(0, 100),
        productosService.getProductos(0, 1000)
      ]);
      setClientes(clientesRes);
      setMonedas(monedasRes);
      setProductos(productosRes);
      setEstados([{ id: 1, nombre: 'ACTIVO' }, { id: 2, nombre: 'CANCELADO' }, { id: 3, nombre: 'FINALIZADO' }, { id: 4, nombre: 'PENDIENTE' }]);
      setTiposContrato([{ id: 1, nombre: 'SERVICIO' }, { id: 2, nombre: 'OBRA' }, { id: 3, nombre: 'MANTENIMIENTO' }, { id: 4, nombre: 'ALQUILER' }, { id: 5, nombre: 'COMPRA' }]);
    } catch (error) { console.error('Error:', error); }
  };

  const loadContratos = async () => {
    try { const data = await contratosService.getContratos(); setContratos(data); } 
    catch (error) { console.error('Error:', error); }
  };

  useEffect(() => { if (view === 'list') loadContratos(); }, [view]);

  const handleSave = async () => {
    try {
      const data: ContratoCreate = { 
        nombre: formData.nombre || '',
        id_cliente: Number(formData.id_cliente) || 0, 
        id_estado: Number(formData.id_estado) || 1, 
        id_tipo_contrato: Number(formData.id_tipo_contrato) || 1, 
        id_moneda: Number(formData.id_moneda) || 1,
        fecha: formData.fecha || new Date().toISOString().split('T')[0],
        vigencia: formData.vigencia || new Date().toISOString().split('T')[0],
        proforma: formData.proforma,
        documento_final: formData.documento_final,
        productos: selectedProducts 
      };
      editingId ? await contratosService.updateContrato(editingId, data) : await contratosService.createContrato(data);
      toast.success(editingId ? 'Actualizado' : 'Creado');
      setView('list');
      resetForm();
      loadContratos();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar?')) return;
    try {
      await contratosService.deleteContrato(id);
      toast.success('Eliminado');
      loadContratos();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const resetForm = () => { setFormData({}); setSelectedProducts([]); setEditingId(null); };

  const openForm = (item?: ContratoWithDetails) => {
    if (item) {
      setEditingId(item.id_contrato);
      setFormData({ 
        nombre: item.nombre, 
        proforma: item.proforma, 
        id_cliente: item.id_cliente, 
        id_estado: item.id_estado, 
        fecha: item.fecha, 
        vigencia: item.vigencia, 
        id_tipo_contrato: item.id_tipo_contrato, 
        id_moneda: item.id_moneda, 
        documento_final: item.documento_final 
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
        <h2 className="text-2xl font-bold">Contratos</h2>
        <Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" />Nuevo</Button>
      </div>
      {contratos.length === 0 ? (
        <p className="text-gray-500">No hay contratos.</p>
      ) : (
        <div className="grid gap-4">
          {contratos.map((item) => (
            <Card key={item.id_contrato}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{item.nombre}</h3>
                    <p className="text-sm">Cliente: {item.cliente?.nombre} | Monto: ${Number(item.monto).toFixed(2)} | Estado: {item.estado?.nombre}</p>
                    <p className="text-sm text-gray-500">Fecha: {item.fecha} | Vigencia: {item.vigencia}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openForm(item)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(item.id_contrato)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
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
          <CardTitle>{editingId ? 'Editar' : 'Nuevo'} Contrato</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div><Label>Cliente</Label><select className="w-full p-2 border rounded" value={formData.id_cliente || ''} onChange={(e: any) => setFormData({...formData, id_cliente: e.target.value})}><option value="">Seleccionar</option>{clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>)}</select></div>
          <div><Label>Nombre</Label><Input value={formData.nombre || ''} onChange={(e: any) => setFormData({...formData, nombre: e.target.value})} /></div>
          <div><Label>Proforma</Label><Input value={formData.proforma || ''} onChange={(e: any) => setFormData({...formData, proforma: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4"><div><Label>Estado</Label><select className="w-full p-2 border rounded" value={formData.id_estado || ''} onChange={(e: any) => setFormData({...formData, id_estado: e.target.value})}>{estados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></div><div><Label>Tipo</Label><select className="w-full p-2 border rounded" value={formData.id_tipo_contrato || ''} onChange={(e: any) => setFormData({...formData, id_tipo_contrato: e.target.value})}>{tiposContrato.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div></div>
          <div className="grid grid-cols-2 gap-4"><div><Label>Fecha</Label><Input type="date" value={formData.fecha || ''} onChange={(e: any) => setFormData({...formData, fecha: e.target.value})} /></div><div><Label>Vigencia</Label><Input type="date" value={formData.vigencia || ''} onChange={(e: any) => setFormData({...formData, vigencia: e.target.value})} /></div></div>
          <div><Label>Moneda</Label><select className="w-full p-2 border rounded" value={formData.id_moneda || ''} onChange={(e: any) => setFormData({...formData, id_moneda: e.target.value})}><option value="">Seleccionar</option>{monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.nombre}</option>)}</select></div>
          <div><Label>Documento Final</Label><Input value={formData.documento_final || ''} onChange={(e: any) => setFormData({...formData, documento_final: e.target.value})} /></div>
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
      <h1 className="text-3xl font-bold mb-6">Contratos</h1>
      {view === 'list' && renderList()}
      {view === 'form' && renderForm()}
    </div>
  );
}
