import { useState, useEffect, useMemo } from 'react';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui';
import { contratosService, clientesService, monedaService, productosService } from '../../services/api';
import type { Cliente } from '../../types/ventas';
import type { Moneda } from '../../types/moneda';
import type { Productos } from '../../types';
import type { ContratoWithDetails, ContratoCreate } from '../../types/contrato';
import { Plus, Save, Trash2, Edit, X, ArrowLeft, Search } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredContratos = useMemo(() => {
    if (!searchTerm) return contratos;
    return contratos.filter(c => 
      c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cliente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.estado?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [contratos, searchTerm]);

  const renderList = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
          <p className="text-gray-500 mt-1">
            {filteredContratos.length === contratos.length 
              ? `Gestión de contratos (${contratos.length} items)`
              : `Mostrando ${filteredContratos.length} de ${contratos.length} contratos`
            }
          </p>
        </div>
        <Button onClick={() => openForm()}><Plus className="w-4 h-4 mr-2" />Nuevo</Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar contratos..."
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
                <TableHead className="w-[20%]">Nombre</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContratos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                    {searchTerm ? 'No se encontraron contratos que coincidan con la búsqueda' : 'No hay contratos'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredContratos.map((item) => (
                  <TableRow key={item.id_contrato} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell>
                      <span className="font-medium text-gray-900">{item.nombre}</span>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {item.cliente?.nombre || 'N/A'}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      ${Number(item.monto).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {item.estado?.nombre || 'N/A'}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {item.tipo_contrato?.nombre || 'N/A'}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {item.fecha}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {item.vigencia}
                    </TableCell>
                    <TableCell className="text-right">
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
                          onClick={() => handleDelete(item.id_contrato)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
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
