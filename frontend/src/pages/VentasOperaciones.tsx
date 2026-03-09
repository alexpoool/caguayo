import { useState, useEffect } from 'react';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { contratosService, suplementosService, facturasService, ventasEfectivoService, clientesService, monedaService, productosService, dependenciasService } from '../services/api';
import type { Cliente } from '../types/ventas';
import type { Moneda } from '../types/moneda';
import type { Productos } from '../types';
import type { Dependencia } from '../types/dependencia';
import type { 
  ContratoWithDetails, 
  ContratoCreate, 
  SuplementoWithDetails, 
  FacturaWithDetails, 
  VentaEfectivoWithDetails
} from '../types/contrato';
import { Plus, Save, Trash2, Edit, X, FileText, Receipt, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

type View = 'list' | 'form';
type TabType = 'contratos' | 'suplementos' | 'facturas' | 'efectivo';

export function VentasOperacionesPage() {
  const [view, setView] = useState<View>('list');
  const [tab, setTab] = useState<TabType>('contratos');
  
  const [contratos, setContratos] = useState<ContratoWithDetails[]>([]);
  const [suplementos, setSuplementos] = useState<SuplementoWithDetails[]>([]);
  const [facturas, setFacturas] = useState<FacturaWithDetails[]>([]);
  const [ventasEfectivo, setVentasEfectivo] = useState<VentaEfectivoWithDetails[]>([]);
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [productos, setProductos] = useState<Productos[]>([]);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [estados, setEstados] = useState<{id: number, nombre: string}[]>([]);
  const [tiposContrato, setTiposContrato] = useState<{id: number, nombre: string}[]>([]);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedProducts, setSelectedProducts] = useState<{id_producto: number; cantidad: number}[]>([]);

  useEffect(() => { loadInitialData(); }, []);
  useEffect(() => {
    if (tab === 'contratos') loadContratos();
    else if (tab === 'suplementos' && selectedContratoId) loadSuplementos();
    else if (tab === 'facturas' && selectedContratoId) loadFacturas();
    else if (tab === 'efectivo') loadVentasEfectivo();
  }, [tab, selectedContratoId]);

  const loadInitialData = async () => {
    try {
      const [clientesRes, monedasRes, productosRes, depsRes] = await Promise.all([
        clientesService.getClientes(0, 1000),
        monedaService.getMonedas(0, 100),
        productosService.getProductos(0, 1000),
        dependenciasService.getDependencias(undefined, 0, 1000)
      ]);
      setClientes(clientesRes);
      setMonedas(monedasRes);
      setProductos(productosRes);
      setDependencias(depsRes);
      setEstados([{ id: 1, nombre: 'ACTIVO' }, { id: 2, nombre: 'CANCELADO' }, { id: 3, nombre: 'FINALIZADO' }, { id: 4, nombre: 'PENDIENTE' }]);
      setTiposContrato([{ id: 1, nombre: 'SERVICIO' }, { id: 2, nombre: 'OBRA' }, { id: 3, nombre: 'MANTENIMIENTO' }, { id: 4, nombre: 'ALQUILER' }, { id: 5, nombre: 'COMPRA' }]);
    } catch (error) { console.error('Error:', error); }
  };

  const loadContratos = async () => {
    try { const data = await contratosService.getContratos(); setContratos(data); } 
    catch (error) { console.error('Error:', error); }
  };

  const loadSuplementos = async () => {
    if (!selectedContratoId) return;
    try { const data = await suplementosService.getSuplementosByContrato(selectedContratoId); setSuplementos(data); } 
    catch (error) { console.error('Error:', error); }
  };

  const loadFacturas = async () => {
    if (!selectedContratoId) return;
    try { const data = await facturasService.getFacturasByContrato(selectedContratoId); setFacturas(data); } 
    catch (error) { console.error('Error:', error); }
  };

  const loadVentasEfectivo = async () => {
    try { const data = await ventasEfectivoService.getVentasEfectivo(); setVentasEfectivo(data); } 
    catch (error) { console.error('Error:', error); }
  };

  const handleSave = async () => {
    try {
      if (tab === 'contratos') {
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
      } else if (tab === 'suplementos') {
        const data = { 
          id_contrato: selectedContratoId!, 
          nombre: formData.nombre || '',
          id_estado: Number(formData.id_estado) || 1, 
          fecha: formData.fecha || new Date().toISOString().split('T')[0],
          documento: formData.documento,
          productos: selectedProducts 
        };
        editingId ? await suplementosService.updateSuplemento(editingId, data as any) : await suplementosService.createSuplemento(data as any);
        toast.success(editingId ? 'Actualizado' : 'Creado');
      } else if (tab === 'facturas') {
        const data = { 
          id_contrato: selectedContratoId!, 
          codigo_factura: formData.codigo_factura || '',
          fecha: formData.fecha || new Date().toISOString().split('T')[0],
          descripcion: formData.descripcion,
          observaciones: formData.observaciones,
          pago_actual: Number(formData.pago_actual) || 0,
          productos: selectedProducts 
        };
        editingId ? await facturasService.updateFactura(editingId, data as any) : await facturasService.createFactura(data as any);
        toast.success(editingId ? 'Actualizado' : 'Creado');
      } else if (tab === 'efectivo') {
        const data = { 
          slip: formData.slip || '',
          fecha: formData.fecha || new Date().toISOString().split('T')[0],
          cajero: formData.cajero || '',
          id_dependencia: Number(formData.id_dependencia) || 1, 
          productos: selectedProducts 
        };
        editingId ? await ventasEfectivoService.updateVentaEfectivo(editingId, data as any) : await ventasEfectivoService.createVentaEfectivo(data as any);
        toast.success(editingId ? 'Actualizado' : 'Creado');
      }
      setView('list');
      resetForm();
      if (tab === 'contratos') loadContratos();
      else if (tab === 'suplementos') loadSuplementos();
      else if (tab === 'facturas') loadFacturas();
      else loadVentasEfectivo();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar?')) return;
    try {
      if (tab === 'contratos') { await contratosService.deleteContrato(id); loadContratos(); }
      else if (tab === 'suplementos') { await suplementosService.deleteSuplemento(id); loadSuplementos(); }
      else if (tab === 'facturas') { await facturasService.deleteFactura(id); loadFacturas(); }
      else { await ventasEfectivoService.deleteVentaEfectivo(id); loadVentasEfectivo(); }
      toast.success('Eliminado');
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const resetForm = () => { setFormData({}); setSelectedProducts([]); setEditingId(null); };

  const openForm = (item?: any) => {
    if (item) {
      setEditingId(item.id_contrato || item.id_suplemento || item.id_factura || item.id_venta_efectivo);
      if (tab === 'contratos') setFormData({ nombre: item.nombre, proforma: item.proforma, id_cliente: item.id_cliente, id_estado: item.id_estado, fecha: item.fecha, vigencia: item.vigencia, id_tipo_contrato: item.id_tipo_contrato, id_moneda: item.id_moneda, documento_final: item.documento_final });
      else if (tab === 'suplementos') setFormData({ nombre: item.nombre, id_estado: item.id_estado, fecha: item.fecha, documento: item.documento });
      else if (tab === 'facturas') setFormData({ codigo_factura: item.codigo_factura, descripcion: item.descripcion, observaciones: item.observaciones, fecha: item.fecha, pago_actual: item.pago_actual });
      else setFormData({ slip: item.slip, fecha: item.fecha, id_dependencia: item.id_dependencia, cajero: item.cajero });
      setSelectedProducts(item.productos?.map((p: any) => ({ id_producto: p.id_producto, cantidad: p.cantidad })) || []);
    } else { resetForm(); }
    setView('form');
  };

  const addProduct = (id: number) => { if (!selectedProducts.find(p => p.id_producto === id)) setSelectedProducts([...selectedProducts, { id_producto: id, cantidad: 1 }]); };
  const updateCantidad = (id: number, qty: number) => { setSelectedProducts(selectedProducts.map(p => p.id_producto === id ? { ...p, cantidad: qty } : p)); };
  const removeProduct = (id: number) => { setSelectedProducts(selectedProducts.filter(p => p.id_producto !== id)); };
  const calcMonto = () => selectedProducts.reduce((t, p) => { const pr = productos.find(pr => pr.id_producto === p.id_producto); return t + (pr ? Number(pr.precio_venta) * p.cantidad : 0); }, 0);

  const renderTabs = () => (
    <div className="flex gap-2 mb-6">
      <Button variant={tab === 'contratos' ? 'primary' : 'outline'} onClick={() => { setTab('contratos'); setSelectedContratoId(null); }}><FileText className="w-4 h-4 mr-2" />Contratos</Button>
      <Button variant={tab === 'suplementos' ? 'primary' : 'outline'} onClick={() => setTab('suplementos')} disabled={!selectedContratoId && tab !== 'suplementos'}><FileText className="w-4 h-4 mr-2" />Suplementos</Button>
      <Button variant={tab === 'facturas' ? 'primary' : 'outline'} onClick={() => setTab('facturas')} disabled={!selectedContratoId && tab !== 'facturas'}><Receipt className="w-4 h-4 mr-2" />Facturas</Button>
      <Button variant={tab === 'efectivo' ? 'primary' : 'outline'} onClick={() => { setTab('efectivo'); setSelectedContratoId(null); }}><CreditCard className="w-4 h-4 mr-2" />Efectivo</Button>
    </div>
  );

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
        <h2 className="text-2xl font-bold">{tab === 'contratos' ? 'Contratos' : tab === 'suplementos' ? 'Suplementos' : tab === 'facturas' ? 'Facturas' : 'Ventas en Efectivo'}</h2>
        <Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" />Nuevo</Button>
      </div>
      {(tab === 'contratos' ? contratos : tab === 'suplementos' ? suplementos : tab === 'facturas' ? facturas : ventasEfectivo).length === 0 ? (
        <p className="text-gray-500">No hay datos.</p>
      ) : (
        <div className="grid gap-4">
          {(tab === 'contratos' ? contratos : tab === 'suplementos' ? suplementos : tab === 'facturas' ? facturas : ventasEfectivo).map((item: any) => (
            <Card key={item.id_contrato || item.id_suplemento || item.id_factura || item.id_venta_efectivo}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    {tab === 'contratos' && <><h3 className="font-semibold text-lg">{item.nombre}</h3><p className="text-sm">Cliente: {item.cliente?.nombre} | Monto: ${Number(item.monto).toFixed(2)} | Estado: {item.estado?.nombre}</p></>}
                    {tab === 'suplementos' && <><h3 className="font-semibold text-lg">{item.nombre}</h3><p className="text-sm">Monto: ${Number(item.monto).toFixed(2)} | Estado: {item.estado?.nombre}</p></>}
                    {tab === 'facturas' && <><h3 className="font-semibold text-lg">{item.codigo_factura}</h3><p className="text-sm">Monto: ${Number(item.monto).toFixed(2)} | Pago: ${Number(item.pago_actual).toFixed(2)}</p></>}
                    {tab === 'efectivo' && <><h3 className="font-semibold text-lg">Slip: {item.slip}</h3><p className="text-sm">Cajero: {item.cajero} | Monto: ${Number(item.monto).toFixed(2)}</p></>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openForm(item)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(item.id_contrato || item.id_suplemento || item.id_factura || item.id_venta_efectivo)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                  </div>
                </div>
                {tab === 'contratos' && <Button variant="ghost" className="mt-2 p-0 text-blue-600" onClick={() => { setSelectedContratoId(item.id_contrato); setTab('suplementos'); }}>Ver Suplementos/Facturas</Button>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderForm = () => (
    <Card>
      <CardHeader><CardTitle>{editingId ? 'Editar' : 'Nuevo'} {tab === 'contratos' ? 'Contrato' : tab === 'suplementos' ? 'Suplemento' : tab === 'facturas' ? 'Factura' : 'Venta en Efectivo'}</CardTitle></CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {tab === 'contratos' && <>
            <div><Label>Cliente</Label><select className="w-full p-2 border rounded" value={formData.id_cliente || ''} onChange={(e: any) => setFormData({...formData, id_cliente: e.target.value})}><option value="">Seleccionar</option>{clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>)}</select></div>
            <div><Label>Nombre</Label><Input value={formData.nombre || ''} onChange={(e: any) => setFormData({...formData, nombre: e.target.value})} /></div>
            <div><Label>Proforma</Label><Input value={formData.proforma || ''} onChange={(e: any) => setFormData({...formData, proforma: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Estado</Label><select className="w-full p-2 border rounded" value={formData.id_estado || ''} onChange={(e: any) => setFormData({...formData, id_estado: e.target.value})}>{estados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></div><div><Label>Tipo</Label><select className="w-full p-2 border rounded" value={formData.id_tipo_contrato || ''} onChange={(e: any) => setFormData({...formData, id_tipo_contrato: e.target.value})}>{tiposContrato.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Fecha</Label><Input type="date" value={formData.fecha || ''} onChange={(e: any) => setFormData({...formData, fecha: e.target.value})} /></div><div><Label>Vigencia</Label><Input type="date" value={formData.vigencia || ''} onChange={(e: any) => setFormData({...formData, vigencia: e.target.value})} /></div></div>
            <div><Label>Moneda</Label><select className="w-full p-2 border rounded" value={formData.id_moneda || ''} onChange={(e: any) => setFormData({...formData, id_moneda: e.target.value})}><option value="">Seleccionar</option>{monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.nombre}</option>)}</select></div>
            <div><Label>Documento Final</Label><Input value={formData.documento_final || ''} onChange={(e: any) => setFormData({...formData, documento_final: e.target.value})} /></div>
          </>}
          {tab === 'suplementos' && <>
            <div><Label>Nombre</Label><Input value={formData.nombre || ''} onChange={(e: any) => setFormData({...formData, nombre: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Estado</Label><select className="w-full p-2 border rounded" value={formData.id_estado || ''} onChange={(e: any) => setFormData({...formData, id_estado: e.target.value})}>{estados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></div><div><Label>Fecha</Label><Input type="date" value={formData.fecha || ''} onChange={(e: any) => setFormData({...formData, fecha: e.target.value})} /></div></div>
            <div><Label>Documento</Label><Input value={formData.documento || ''} onChange={(e: any) => setFormData({...formData, documento: e.target.value})} /></div>
          </>}
          {tab === 'facturas' && <>
            <div><Label>Código Factura</Label><Input value={formData.codigo_factura || ''} onChange={(e: any) => setFormData({...formData, codigo_factura: e.target.value})} /></div>
            <div><Label>Descripción</Label><Input value={formData.descripcion || ''} onChange={(e: any) => setFormData({...formData, descripcion: e.target.value})} /></div>
            <div><Label>Observaciones</Label><Input value={formData.observaciones || ''} onChange={(e: any) => setFormData({...formData, observaciones: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Fecha</Label><Input type="date" value={formData.fecha || ''} onChange={(e: any) => setFormData({...formData, fecha: e.target.value})} /></div><div><Label>Pago Actual</Label><Input type="number" step="0.01" value={formData.pago_actual || ''} onChange={(e: any) => setFormData({...formData, pago_actual: e.target.value})} /></div></div>
          </>}
          {tab === 'efectivo' && <>
            <div><Label>Slip</Label><Input value={formData.slip || ''} onChange={(e: any) => setFormData({...formData, slip: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4"><div><Label>Fecha</Label><Input type="date" value={formData.fecha || ''} onChange={(e: any) => setFormData({...formData, fecha: e.target.value})} /></div><div><Label>Cajero</Label><Input value={formData.cajero || ''} onChange={(e: any) => setFormData({...formData, cajero: e.target.value})} /></div></div>
            <div><Label>Dependencia</Label><select className="w-full p-2 border rounded" value={formData.id_dependencia || ''} onChange={(e: any) => setFormData({...formData, id_dependencia: e.target.value})}><option value="">Seleccionar</option>{dependencias.map(d => <option key={d.id_dependencia} value={d.id_dependencia}>{d.nombre}</option>)}</select></div>
          </>}
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
      <h1 className="text-3xl font-bold mb-6">Ventas - Operaciones</h1>
      {renderTabs()}
      {view === 'list' && renderList()}
      {view === 'form' && renderForm()}
    </div>
  );
}
