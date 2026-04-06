import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, ConfirmModal } from '../../components/ui';
import { pagosFacturaServicioService, facturasServicioService, monedaService } from '../../services/api';
import type { PagoFacturaServicio, PagoFacturaServicioCreate, FacturaServicio } from '../../types/servicio';
import type { Moneda } from '../../types/moneda';
import { Plus, Save, Trash2, ArrowLeft, Search, CreditCard, DollarSign, Calendar, FileText, X, Eye, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';

type View = 'list' | 'form';

export function PagosFacturaServicioPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const facturaId = searchParams.get('factura');
  const [view, setView] = useState<View>('list');

  const [pagos, setPagos] = useState<PagoFacturaServicio[]>([]);
  const [factura, setFactura] = useState<FacturaServicio | null>(null);
  const [monedas, setMonedas] = useState<Moneda[]>([]);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [detailModal, setDetailModal] = useState<{ isOpen: boolean; item: PagoFacturaServicio | null }>({ isOpen: false, item: null });
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

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (facturaId) {
      loadFactura(Number(facturaId));
      loadPagos(Number(facturaId));
    }
  }, [facturaId]);

  const loadInitialData = async () => {
    try {
      const monedasRes = await monedaService.getMonedas(0, 100);
      setMonedas(monedasRes);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadFactura = async (id: number) => {
    try {
      const data = await facturasServicioService.getFacturaServicio(id);
      setFactura(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar la factura');
    }
  };

  const loadPagos = async (id: number) => {
    try {
      const data = await pagosFacturaServicioService.getPagosByFactura(id);
      setPagos(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSave = async () => {
    try {
      if (!facturaId) {
        toast.error('No se especificó la factura');
        return;
      }
      const data: PagoFacturaServicioCreate = {
        id_factura_servicio: Number(facturaId),
        monto: Number(formData.monto) || 0,
        id_moneda: formData.id_moneda ? Number(formData.id_moneda) : undefined,
        fecha: formData.fecha || undefined,
        doc_traza: formData.doc_traza || undefined,
        doc_factura: formData.doc_factura || undefined
      };
      await pagosFacturaServicioService.createPago(data);
      toast.success('Pago creado');
      setView('list');
      resetForm();
      loadPagos(Number(facturaId));
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar');
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar pago?',
      message: '¿Está seguro de eliminar este pago?',
      onConfirm: async () => {
        try {
          await pagosFacturaServicioService.deletePago(id);
          toast.success('Pago eliminado');
          if (facturaId) loadPagos(Number(facturaId));
        } catch (error: any) {
          toast.error(error.message || 'Error al eliminar');
        }
      },
      type: 'danger'
    });
  };

  const resetForm = () => {
    setFormData({ fecha: new Date().toISOString().split('T')[0] });
  };

  const openForm = () => {
    resetForm();
    setView('form');
  };

  const getMonedaNombre = (id?: number) => {
    if (!id) return 'N/A';
    const moneda = monedas.find(m => m.id_moneda === id);
    return moneda ? `${moneda.nombre} (${moneda.simbolo})` : `Moneda #${id}`;
  };

  const filteredPagos = useMemo(() => {
    if (!searchTerm) return pagos;
    const term = searchTerm.toLowerCase();
    return pagos.filter(p =>
      p.doc_traza?.toLowerCase().includes(term) ||
      p.doc_factura?.toLowerCase().includes(term) ||
      p.fecha?.toLowerCase().includes(term)
    );
  }, [pagos, searchTerm]);

  const renderHeader = () => (
    <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-100 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/proyectos/facturas-servicio')} className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Volver a Facturas
          </Button>
          {factura && (
            <div className="flex items-center gap-6 ml-4">
              <div>
                <span className="text-xs text-teal-600 uppercase tracking-wider">Factura</span>
                <p className="font-bold text-gray-900">{factura.codigo_factura || `#${factura.id_factura_servicio}`}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider">Monto</span>
                <p className="font-bold text-gray-900">${Number(factura.precio * factura.cantidad).toFixed(2)}</p>
              </div>
              {factura.descripcion && (
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Descripción</span>
                  <p className="text-gray-700">{factura.descripcion}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderList = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg animate-bounce-subtle">
            <CreditCard className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pagos de Factura</h1>
            <p className="text-gray-500 mt-1">
              {filteredPagos.length === pagos.length
                ? `${pagos.length} pagos`
                : `Mostrando ${filteredPagos.length} de ${pagos.length} pagos`
              }
            </p>
          </div>
        </div>
        <Button
          onClick={openForm}
          className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nuevo Pago
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar pagos..."
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
                    <Calendar className="h-4 w-4 text-teal-600" />
                    Fecha
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-teal-600" />
                    Monto
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-teal-600" />
                    Moneda
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-teal-600" />
                    Doc Traza
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-teal-600" />
                    Doc Factura
                  </div>
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPagos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                    {searchTerm ? 'No se encontraron pagos que coincidan con la búsqueda' : 'No hay pagos registrados'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPagos.map((pago) => (
                  <TableRow
                    key={pago.id_pago_factura_servicio}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => setDetailModal({ isOpen: true, item: pago })}
                  >
                    <TableCell>
                      <span className="text-gray-900">{pago.fecha || 'N/A'}</span>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      ${Number(pago.monto).toFixed(2)}
                    </TableCell>
                    <TableCell>{getMonedaNombre(pago.id_moneda)}</TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{pago.doc_traza || 'N/A'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{pago.doc_factura || 'N/A'}</span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDetailModal({ isOpen: true, item: pago })}
                          className="text-teal-600 hover:text-teal-800 hover:bg-teal-50 h-8 w-8"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(pago.id_pago_factura_servicio)}
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg animate-bounce-subtle">
            <CreditCard className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Nuevo Pago</h2>
            <p className="text-gray-500 mt-1">Complete los datos del pago</p>
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
            <CreditCard className="h-5 w-5 text-teal-600" />
            Información del Pago
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-sm font-medium">Monto *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.monto || ''}
                onChange={(e: any) => setFormData({ ...formData, monto: e.target.value })}
                className="mt-1"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Moneda</Label>
              <select
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                value={formData.id_moneda || ''}
                onChange={(e: any) => setFormData({ ...formData, id_moneda: e.target.value })}
              >
                <option value="">Seleccionar moneda</option>
                {monedas.map(m => (
                  <option key={m.id_moneda} value={m.id_moneda}>{m.nombre} ({m.simbolo})</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-sm font-medium">Fecha</Label>
              <Input
                type="date"
                value={formData.fecha || ''}
                onChange={(e: any) => setFormData({ ...formData, fecha: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Doc Traza</Label>
              <Input
                value={formData.doc_traza || ''}
                onChange={(e: any) => setFormData({ ...formData, doc_traza: e.target.value })}
                className="mt-1"
                placeholder="Documento de traza"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-medium">Doc Factura</Label>
              <Input
                value={formData.doc_factura || ''}
                onChange={(e: any) => setFormData({ ...formData, doc_factura: e.target.value })}
                className="mt-1"
                placeholder="Documento de factura"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-8 pt-6 border-t">
            <Button onClick={handleSave} className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300">
              <Save className="h-4 w-4" />
              Guardar
            </Button>
            <Button variant="outline" onClick={() => { setView('list'); resetForm(); }}>Cancelar</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-6">
      {renderHeader()}
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
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
                    <CreditCard className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Detalle del Pago</h3>
                    <p className="text-sm text-gray-500 font-mono">#{detailModal.item.id_pago_factura_servicio}</p>
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
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 rounded-xl border border-teal-100">
                  <p className="text-xs text-teal-600 uppercase tracking-wider mb-1">Moneda</p>
                  <p className="font-bold text-gray-900">{getMonedaNombre(detailModal.item.id_moneda)}</p>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Fecha</p>
                <p className="font-bold text-gray-900">{detailModal.item.fecha || 'N/A'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Doc Traza</p>
                  <p className="text-gray-700 font-mono">{detailModal.item.doc_traza || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Doc Factura</p>
                  <p className="text-gray-700 font-mono">{detailModal.item.doc_factura || 'N/A'}</p>
                </div>
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
