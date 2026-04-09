import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ConfirmModal } from '../../components/ui';
import { facturasService, contratosService, productosService, monedaService, dependenciasService, pagosService } from '../../services/api';
import type { ContratoWithDetails } from '../../types/contrato';
import type { Productos } from '../../types';
import type { FacturaWithDetails } from '../../types/contrato';
import type { Dependencia } from '../../types/dependencia';
import type { Pago, PagoCreate } from '../../types/pago';
import { Plus, Save, Trash2, Edit, X, ArrowLeft, Search, Receipt, DollarSign, Calendar, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';

type View = 'list' | 'form';

export function FacturasPage() {
  const [searchParams] = useSearchParams();
  const contratoParam = searchParams.get('contrato');
  const [view, setView] = useState<View>('list');
  
  const [facturas, setFacturas] = useState<FacturaWithDetails[]>([]);
  const [contratos, setContratos] = useState<ContratoWithDetails[]>([]);
  const [productos, setProductos] = useState<Productos[]>([]);
  const [monedas, setMonedas] = useState<any[]>([]);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(contratoParam ? Number(contratoParam) : null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedProducts, setSelectedProducts] = useState<{id_producto: number; cantidad: number; precio_venta: number}[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: FacturaWithDetails | null }>({ isOpen: false, item: null });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

  const [pagoModal, setPagoModal] = useState<{ isOpen: boolean; factura: FacturaWithDetails | null; pagos: Pago[] }>({
    isOpen: false, factura: null, pagos: []
  });
  const [pagoForm, setPagoForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    monto: '',
    id_moneda: '',
    tipo_pago: 'TRANSFERENCIA',
    referencia: ''
  });

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    try {
      const [contratosRes, productosRes, monedasRes, depsRes] = await Promise.all([
        contratosService.getContratos(0, 1000),
        productosService.getProductos(0, 1000),
        monedaService.getMonedas(0, 100),
        dependenciasService.getDependencias(undefined, 0, 1000)
      ]);
      setContratos(contratosRes);
      setProductos(productosRes);
      setMonedas(monedasRes);
      setDependencias(depsRes);
    } catch (error) { console.error('Error:', error); }
  };

  const loadFacturas = async () => {
    try {
      if (contratoParam) {
        const data = await facturasService.getFacturasByContrato(Number(contratoParam));
        setFacturas(data);
      } else {
        const data = await facturasService.getFacturas();
        setFacturas(data);
      }
    } catch (error) { console.error('Error:', error); }
  };

  useEffect(() => { 
    if (view === 'list') loadFacturas(); 
  }, [view, contratoParam]);

  const filteredFacturas = useMemo(() => {
    if (!searchTerm) return facturas;
    const term = searchTerm.toLowerCase();
    return facturas.filter(f =>
      f.codigo_factura?.toLowerCase().includes(term)
    );
  }, [facturas, searchTerm]);

  const handleSave = async () => {
    try {
      const data = { 
        id_contrato: selectedContratoId, 
        ...(formData.codigo_factura ? { codigo_factura: formData.codigo_factura } : {}),
        fecha: formData.fecha || new Date().toISOString().split('T')[0],
        descripcion: formData.descripcion,
        observaciones: formData.observaciones,
        id_dependencia: formData.id_dependencia ? Number(formData.id_dependencia) : 4,
        id_moneda: formData.id_moneda ? Number(formData.id_moneda) : undefined,
        items: selectedProducts.map(p => ({
          id_producto: p.id_producto,
          cantidad: p.cantidad,
          precio_venta: p.precio_venta,
          id_moneda: formData.id_moneda ? Number(formData.id_moneda) : 1
        }))
      };
      editingId ? await facturasService.updateFactura(editingId, data as any) : await facturasService.createFactura(data as any);
      toast.success(editingId ? 'Actualizado' : 'Creado');
      setView('list');
      resetForm();
      loadFacturas();
    } catch (error: any) { toast.error(error.message || 'Error'); }
  };

  const handleDelete = async (id: number, codigo: string) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar factura?',
      message: `¿Está seguro de eliminar la factura "${codigo}"?`,
      onConfirm: async () => {
        try {
          await facturasService.deleteFactura(id);
          toast.success('Eliminado');
          loadFacturas();
        } catch (error: any) { toast.error(error.message || 'Error'); }
      },
      type: 'danger'
    });
  };

  const resetForm = () => { setFormData({}); setSelectedProducts([]); setEditingId(null); setProductSearch(''); };

  const openPagoModal = async (factura: FacturaWithDetails) => {
    setPagoForm({
      fecha: new Date().toISOString().split('T')[0],
      monto: '',
      id_moneda: String(factura.id_moneda || ''),
      tipo_pago: 'TRANSFERENCIA',
      referencia: ''
    });
    try {
      const pagos = await pagosService.getPagosByFactura(factura.id_factura);
      setPagoModal({ isOpen: true, factura, pagos });
    } catch (error) {
      setPagoModal({ isOpen: true, factura, pagos: [] });
    }
  };

  const handleCreatePago = async () => {
    if (!pagoModal.factura) return;
    try {
      const data: PagoCreate = {
        id_factura: pagoModal.factura.id_factura,
        fecha: pagoForm.fecha,
        monto: Number(pagoForm.monto),
        id_moneda: pagoForm.id_moneda ? Number(pagoForm.id_moneda) : undefined,
        tipo_pago: pagoForm.tipo_pago,
        referencia: pagoForm.referencia || undefined
      };
      await pagosService.createPago(data);
      toast.success('Pago registrado');
      const pagos = await pagosService.getPagosByFactura(pagoModal.factura.id_factura);
      setPagoModal({ ...pagoModal, pagos });
      setPagoForm({
        fecha: new Date().toISOString().split('T')[0],
        monto: '',
        id_moneda: '',
        tipo_pago: 'TRANSFERENCIA',
        referencia: ''
      });
      loadFacturas();
    } catch (error: any) { toast.error(error.message || 'Error al registrar pago'); }
  };

  const handleDeletePago = async (pago: Pago) => {
    if (!pagoModal.factura) return;
    try {
      await pagosService.deletePago(pago.id_pago);
      toast.success('Pago eliminado');
      const pagos = await pagosService.getPagosByFactura(pagoModal.factura.id_factura);
      setPagoModal({ ...pagoModal, pagos });
      loadFacturas();
    } catch (error: any) { toast.error(error.message || 'Error al eliminar pago'); }
  };

  const openForm = (item?: FacturaWithDetails) => {
    if (item) {
      setEditingId(item.id_factura);
      setFormData({ 
        codigo_factura: item.codigo_factura,
        descripcion: item.descripcion,
        observaciones: item.observaciones,
        fecha: item.fecha,
        id_dependencia: item.id_dependencia || '',
        id_moneda: item.id_moneda || '',
        id_contrato: item.id_contrato || ''
      });
      setSelectedContratoId(item.id_contrato || selectedContratoId);
      setSelectedProducts(item.items?.map((p: any) => ({ id_producto: p.id_producto, cantidad: p.cantidad, precio_venta: p.precio_venta || 0 })) || []);
    } else { resetForm(); }
    setView('form');
  };

  const addProduct = (id: number) => { 
    const producto = productos.find(p => p.id_producto === id);
    if (!selectedProducts.find(p => p.id_producto === id)) {
      setSelectedProducts([...selectedProducts, { 
        id_producto: id, 
        cantidad: 1, 
        precio_venta: producto ? Number(producto.precio_venta) : 0 
      }]); 
    }
  };
  const updateCantidad = (id: number, qty: number) => { setSelectedProducts(selectedProducts.map(p => p.id_producto === id ? { ...p, cantidad: qty } : p)); };
  const updatePrecioVenta = (id: number, precio: number) => { setSelectedProducts(selectedProducts.map(p => p.id_producto === id ? { ...p, precio_venta: precio } : p)); };
  const removeProduct = (id: number) => { setSelectedProducts(selectedProducts.filter(p => p.id_producto !== id)); };

  const productosFiltrados = useMemo(() => {
    if (!productSearch.trim()) return [];
    const search = productSearch.toLowerCase();
    return productos.filter(p => 
      p.nombre.toLowerCase().includes(search) &&
      !selectedProducts.some(sp => sp.id_producto === p.id_producto)
    ).slice(0, 10);
  }, [productos, productSearch, selectedProducts]);

  const renderProductSelector = () => {
    const calcTotal = () => selectedProducts.reduce((t, p) => t + (p.cantidad * p.precio_venta), 0);
    
    return (
      <div className="mt-4 p-4 border rounded-lg bg-gray-50">
        <Label className="mb-2 block">Productos</Label>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar producto para agregar..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="pl-9"
          />
          {productSearch.trim() && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {productosFiltrados.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No se encontraron productos</div>
              ) : (
                productosFiltrados.map(p => (
                  <button
                    key={p.id_producto}
                    onClick={() => { addProduct(p.id_producto); setProductSearch(''); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-violet-50 flex justify-between items-center"
                  >
                    <span>{p.nombre}</span>
                    <span className="text-gray-400 text-xs">${Number(p.precio_venta).toFixed(2)}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {selectedProducts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-gray-100 rounded font-semibold text-sm">
              <span className="flex-1">Producto</span>
              <span className="w-20 text-center">Cantidad</span>
              <span className="w-24 text-center">Precio</span>
              <span className="w-20 text-right">Subtotal</span>
              <span className="w-6"></span>
            </div>
            {selectedProducts.map(p => { const pr = productos.find(pr => pr.id_producto === p.id_producto); return (
              <div key={p.id_producto} className="flex items-center gap-2 p-2 bg-white rounded">
                <span className="flex-1">{pr?.nombre}</span>
                <Input type="number" min="1" value={p.cantidad} onChange={(e: any) => updateCantidad(p.id_producto, Number(e.target.value))} className="w-20" placeholder="Cantidad" />
                <Input type="number" step="0.01" value={p.precio_venta} onChange={(e: any) => updatePrecioVenta(p.id_producto, Number(e.target.value))} className="w-24" placeholder="Precio" />
                <span className="w-20 text-right text-gray-600">${(p.cantidad * p.precio_venta).toFixed(2)}</span>
                <button onClick={() => removeProduct(p.id_producto)} className="text-red-500"><X className="w-4 h-4" /></button>
              </div>
            ); })}
            <div className="text-right font-bold text-lg mt-2 pt-2 border-t">
              Monto Total: ${calcTotal().toFixed(2)}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderList = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg animate-bounce-subtle">
            <Receipt className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Facturas</h1>
            <p className="text-gray-500 mt-1">Gestión de facturas de contratos</p>
          </div>
        </div>
        <Button
          onClick={() => openForm()}
          className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nueva Factura
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Buscar por código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card className="overflow-hidden shadow-sm border-gray-200">
        <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gradient-to-r from-violet-50 to-purple-50">
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-violet-600" />
                      Código
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-violet-600" />
                      Monto
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-violet-600" />
                      Pago Actual
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-violet-600" />
                      Fecha
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-violet-600" />
                      Pago
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facturas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                      No hay facturas
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFacturas.map((item) => (
                    <TableRow key={item.id_factura} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setDetailModal({ isOpen: true, item })}>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-violet-50 text-violet-700 rounded text-sm font-mono font-medium">
                          <Receipt className="h-3 w-3" />
                          {item.codigo_factura || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        ${Number(item.monto).toFixed(2)}
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        ${Number(item.pago_actual).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-gray-500">{item.fecha}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPagoModal(item)}
                          className="gap-1 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Ver pagos
                        </Button>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          {item.monto > item.pago_actual && (
                            <Button variant="ghost" size="icon" onClick={() => openPagoModal(item)} className="text-green-600 hover:text-green-800 hover:bg-green-50 h-8 w-8" title="Pagar">
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => openForm(item)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8" title="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id_factura, item.codigo_factura)} className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8" title="Eliminar">
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg animate-bounce-subtle">
            <Receipt className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{editingId ? 'Editar Factura' : 'Nueva Factura'}</h2>
            <p className="text-gray-500 mt-1">Complete los datos de la factura</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => { setView('list'); resetForm(); }} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>

      <Card className="shadow-sm border-gray-200">
        <CardHeader className="border-b bg-gray-50/50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="h-5 w-5 text-violet-600" />
            Información de la Factura
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-sm font-medium">Fecha</Label>
              <Input type="date" value={formData.fecha || ''} onChange={(e: any) => setFormData({...formData, fecha: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-medium">Contrato</Label>
              {selectedContratoId ? (
                <div className="mt-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                  {contratos.find(c => c.id_contrato === selectedContratoId)?.nombre || `Contrato #${selectedContratoId}`}
                </div>
              ) : (
                <select 
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none bg-white" 
                  value={formData.id_contrato || ''} 
                  onChange={(e: any) => {
                    setFormData({...formData, id_contrato: e.target.value});
                    setSelectedContratoId(e.target.value ? Number(e.target.value) : null);
                  }}
                >
                  <option value="">Seleccionar contrato</option>
                  {contratos.map(c => <option key={c.id_contrato} value={c.id_contrato}>{c.codigo ? `${c.codigo} - ` : ''}{c.nombre}</option>)}
                </select>
              )}
            </div>
            <div>
              <Label className="text-sm font-medium">Descripción</Label>
              <Input value={formData.descripcion || ''} onChange={(e: any) => setFormData({...formData, descripcion: e.target.value})} className="mt-1" placeholder="Descripción de la factura" />
            </div>
            <div>
              <Label className="text-sm font-medium">Dependencia</Label>
              <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none bg-white" value={formData.id_dependencia || ''} onChange={(e: any) => setFormData({...formData, id_dependencia: e.target.value})}>
                <option value="">Seleccionar dependencia</option>
                {dependencias.map(d => <option key={d.id_dependencia} value={d.id_dependencia}>{d.nombre}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium">Moneda</Label>
              <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none bg-white" value={formData.id_moneda || ''} onChange={(e: any) => setFormData({...formData, id_moneda: e.target.value})}>
                <option value="">Seleccionar moneda</option>
                {monedas.map(m => <option key={m.id_moneda} value={m.id_moneda}>{m.nombre} ({m.simbolo})</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">Observaciones</Label>
              <Input value={formData.observaciones || ''} onChange={(e: any) => setFormData({...formData, observaciones: e.target.value})} className="mt-1" placeholder="Observaciones adicionales" />
            </div>
          </div>
          <div className="mt-6">{renderProductSelector()}</div>
          <div className="flex gap-3 mt-8 pt-6 border-t">
            <Button onClick={handleSave} className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300">
              <Save className="h-4 w-4" />
              {editingId ? 'Actualizar' : 'Guardar'}
            </Button>
            <Button variant="outline" onClick={() => { setView('list'); resetForm(); }}>Cancelar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-6">
      {view === 'list' && renderList()}
      {view === 'form' && renderForm()}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={() => confirmModal.onConfirm()}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />

      {detailModal.isOpen && detailModal.item && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-auto animate-scale-in">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-violet-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg">
                    <Receipt className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Factura</h3>
                    <p className="text-sm text-gray-500 font-mono">{detailModal.item.codigo_factura || 'Sin código'}</p>
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
                  <p className="text-xs text-green-600 uppercase tracking-wider mb-1">Monto</p>
                  <p className="font-bold text-green-900 text-xl">${Number(detailModal.item.monto).toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">Pago Actual</p>
                  <p className="font-bold text-blue-900 text-xl">${Number(detailModal.item.pago_actual).toFixed(2)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                  <p className="text-xs text-purple-600 uppercase tracking-wider mb-1">Fecha</p>
                  <p className="font-bold text-gray-900">{detailModal.item.fecha || 'N/A'}</p>
                </div>
              </div>
              {detailModal.item.descripcion && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Descripción</p>
                  <p className="text-gray-700">{detailModal.item.descripcion}</p>
                </div>
              )}
              {detailModal.item.observaciones && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Observaciones</p>
                  <p className="text-gray-700">{detailModal.item.observaciones}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button onClick={() => setDetailModal({ isOpen: false, item: null })} className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium">Cerrar</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {pagoModal.isOpen && pagoModal.factura && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto animate-scale-in">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg">
                    <CreditCard className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Pagos</h3>
                    <p className="text-sm text-gray-500 font-mono">
                      {pagoModal.factura.codigo_factura} — ${Number(pagoModal.factura.monto).toFixed(2)} — Pendiente: ${(Number(pagoModal.factura.monto) - Number(pagoModal.factura.pago_actual)).toFixed(2)}
                    </p>
                  </div>
                </div>
                <button onClick={() => setPagoModal({ isOpen: false, factura: null, pagos: [] })} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">Fecha</Label>
                  <Input type="date" value={pagoForm.fecha} onChange={(e: any) => setPagoForm({...pagoForm, fecha: e.target.value})} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Monto</Label>
                  <Input type="number" step="0.01" value={pagoForm.monto} onChange={(e: any) => setPagoForm({...pagoForm, monto: e.target.value})} className="mt-1" placeholder="0.00" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Tipo</Label>
                  <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white" value={pagoForm.tipo_pago} onChange={(e: any) => setPagoForm({...pagoForm, tipo_pago: e.target.value})}>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
                {pagoForm.tipo_pago === 'TRANSFERENCIA' && (
                  <div>
                    <Label className="text-sm font-medium">Número de cuenta</Label>
                    <Input value={pagoForm.referencia} onChange={(e: any) => setPagoForm({...pagoForm, referencia: e.target.value})} className="mt-1" placeholder="Nro. cuenta" />
                  </div>
                )}
              </div>
              <Button onClick={handleCreatePago} disabled={!pagoForm.monto} className="w-full gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">
                <Plus className="h-4 w-4" />
                Registrar Pago
              </Button>

              {pagoModal.pagos.length > 0 && (
                <div className="mt-4">
                  <Label className="text-sm font-medium mb-2 block">Historial de Pagos</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Número de cuenta</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagoModal.pagos.map(pago => (
                        <TableRow key={pago.id_pago}>
                          <TableCell className="text-gray-500">{pago.fecha}</TableCell>
                          <TableCell className="font-medium">${Number(pago.monto).toFixed(2)}</TableCell>
                          <TableCell>
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {pago.tipo_pago}
                            </span>
                          </TableCell>
                          <TableCell className="text-gray-500">{pago.referencia || '-'}</TableCell>
                          <TableCell className="text-right">
                            <button onClick={() => handleDeletePago(pago)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button onClick={() => setPagoModal({ isOpen: false, factura: null, pagos: [] })} className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium">Cerrar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
