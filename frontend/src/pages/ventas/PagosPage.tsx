import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pagosService, facturasService, monedaService } from '../../services/api';
import { Plus, Edit, Trash2, Search, Save, ArrowLeft, CreditCard, DollarSign, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  Button, 
  Input, 
  Label, 
  Card, 
  CardContent, 
  CardHeader, 
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  ConfirmModal
} from '../../components/ui';
import type { Pago } from '../../types/ventas_contrato';

export function PagosPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'form' | 'detail'>('list');
  const [editingPago, setEditingPago] = useState<Pago | null>(null);
  const [selectedPago, setSelectedPago] = useState<Pago | null>(null);
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

  const [formData, setFormData] = useState({
    id_factura: 0,
    numero_cheque_transferencia: '',
    monto: 0,
    numero_factura_RODAS: '',
    fecha: '',
    id_moneda: 0
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const { data: pagos = [], isLoading } = useQuery({
    queryKey: ['pagos'],
    queryFn: () => pagosService.getPagos(),
  });

  const { data: facturas = [] } = useQuery({
    queryKey: ['facturas'],
    queryFn: () => facturasService.getFacturas(),
  });

  const { data: monedas = [] } = useQuery({
    queryKey: ['monedas'],
    queryFn: () => monedaService.getMonedas(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Pago>) => pagosService.createPago(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagos'] });
      toast.success('Pago registrado');
      setView('list');
      resetForm();
    },
    onError: () => toast.error('Error al registrar pago'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Pago> }) => 
      pagosService.updatePago(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagos'] });
      toast.success('Pago actualizado');
      setView('list');
      resetForm();
    },
    onError: () => toast.error('Error al actualizar pago'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => pagosService.deletePago(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pagos'] });
      toast.success('Pago eliminado');
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    },
    onError: () => toast.error('Error al eliminar pago'),
  });

  const resetForm = () => {
    setFormData({
      id_factura: 0,
      numero_cheque_transferencia: '',
      monto: 0,
      numero_factura_RODAS: '',
      fecha: '',
      id_moneda: 0
    });
    setFormErrors({});
    setEditingPago(null);
  };

  const handleNew = () => {
    resetForm();
    setView('form');
  };

  const handleEdit = (pago: Pago) => {
    setEditingPago(pago);
    setFormData({
      id_factura: pago.id_factura,
      numero_cheque_transferencia: pago.numero_cheque_transferencia || '',
      monto: pago.monto,
      numero_factura_RODAS: pago.numero_factura_RODAS,
      fecha: pago.fecha,
      id_moneda: pago.id_moneda
    });
    setView('form');
  };

  const handleViewDetails = (pago: Pago) => {
    setSelectedPago(pago);
    setView('detail');
  };

  const handleDelete = (pago: Pago) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Pago',
      message: `¿Está seguro de eliminar el pago de "${pago.numero_factura_RODAS}"?`,
      onConfirm: () => deleteMutation.mutate(pago.id_pago),
      type: 'danger'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    
    if (!formData.id_factura) errors.id_factura = 'Seleccione una factura';
    if (!formData.numero_factura_RODAS) errors.numero_factura_RODAS = 'Ingrese el número de factura RODAS';
    if (!formData.fecha) errors.fecha = 'Ingrese la fecha';
    if (!formData.id_moneda) errors.id_moneda = 'Seleccione una moneda';
    if (!formData.monto || formData.monto <= 0) errors.monto = 'Ingrese el monto';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingPago) {
      updateMutation.mutate({ id: editingPago.id_pago, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredPagos = pagos.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.numero_factura_RODAS?.toLowerCase().includes(term) ||
      p.factura?.codigo?.toLowerCase().includes(term)
    );
  });

  const getMonedaSimbolo = (id: number) => {
    const moneda = monedas.find(m => m.id_moneda === id);
    return moneda?.simbolo || '';
  };

  const getFacturaCodigo = (id: number) => {
    const factura = facturas.find(f => f.id_factura === id);
    return factura?.codigo || 'Sin factura';
  };

  // Vista de Detalles
  if (view === 'detail' && selectedPago) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Detalles del Pago</h1>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between"><span className="text-gray-500">Factura RODAS:</span><span className="font-medium">{selectedPago.numero_factura_RODAS}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Factura:</span><span className="font-medium">{getFacturaCodigo(selectedPago.id_factura)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Fecha:</span><span className="font-medium">{selectedPago.fecha}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Moneda:</span><span className="font-medium">{getMonedaSimbolo(selectedPago.id_moneda)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Monto:</span><span className="font-medium text-green-600">{getMonedaSimbolo(selectedPago.id_moneda)} {selectedPago.monto.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Método:</span><span className="font-medium">{selectedPago.numero_cheque_transferencia || 'Efectivo'}</span></div>
          </CardContent>
        </Card>

        <div className="flex gap-3 mt-6">
          <Button onClick={() => handleEdit(selectedPago)}><Edit className="h-4 w-4 mr-2" />Editar</Button>
          <Button variant="outline" onClick={() => setView('list')}>Volver</Button>
        </div>
      </div>
    );
  }

  // Vista de Formulario
  if (view === 'form') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{editingPago ? 'Editar' : 'Nuevo'} Pago</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Factura *</Label>
                <select
                  value={formData.id_factura || ''}
                  onChange={(e) => setFormData({ ...formData, id_factura: parseInt(e.target.value) || 0 })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  <option value="">Seleccione una factura</option>
                  {facturas.map((f) => (<option key={f.id_factura} value={f.id_factura}>{f.codigo}</option>))}
                </select>
                {formErrors.id_factura && <p className="text-red-500 text-sm mt-1">{formErrors.id_factura}</p>}
              </div>

              <div>
                <Label>Número Factura RODAS *</Label>
                <Input value={formData.numero_factura_RODAS} onChange={(e) => setFormData({ ...formData, numero_factura_RODAS: e.target.value })} placeholder="Número de factura RODAS" />
                {formErrors.numero_factura_RODAS && <p className="text-red-500 text-sm mt-1">{formErrors.numero_factura_RODAS}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha *</Label>
                  <Input type="date" value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} />
                  {formErrors.fecha && <p className="text-red-500 text-sm mt-1">{formErrors.fecha}</p>}
                </div>
                <div>
                  <Label>Monto *</Label>
                  <Input type="number" step="0.01" value={formData.monto} onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) || 0 })} />
                  {formErrors.monto && <p className="text-red-500 text-sm mt-1">{formErrors.monto}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Moneda *</Label>
                  <select
                    value={formData.id_moneda || ''}
                    onChange={(e) => setFormData({ ...formData, id_moneda: parseInt(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg"
                  >
                    <option value="">Seleccione</option>
                    {monedas.map((m) => (<option key={m.id_moneda} value={m.id_moneda}>{m.nombre} ({m.simbolo})</option>))}
                  </select>
                  {formErrors.id_moneda && <p className="text-red-500 text-sm mt-1">{formErrors.id_moneda}</p>}
                </div>
                <div>
                  <Label>Cheque/Transferencia</Label>
                  <Input value={formData.numero_cheque_transferencia} onChange={(e) => setFormData({ ...formData, numero_cheque_transferencia: e.target.value })} placeholder="Número de cheque o transferencia" />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit"><Save className="h-4 w-4 mr-2" />{editingPago ? 'Actualizar' : 'Crear'}</Button>
                <Button type="button" variant="outline" onClick={() => setView('list')}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vista de Lista
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
          <p className="text-gray-500 mt-1">Gestión de pagos ({filteredPagos.length} registrados)</p>
        </div>
        <Button onClick={handleNew}><Plus className="h-4 w-4 mr-2" />Nuevo Pago</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-gray-400" />
            <input type="text" placeholder="Buscar pagos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-gray-500">Cargando...</p>
          ) : filteredPagos.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No hay pagos registrados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factura RODAS</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPagos.map((pago) => (
                  <TableRow key={pago.id_pago} className="cursor-pointer" onClick={() => handleViewDetails(pago)}>
                    <TableCell><div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-gray-400" /><span className="font-medium">{pago.numero_factura_RODAS}</span></div></TableCell>
                    <TableCell>{pago.factura?.codigo || getFacturaCodigo(pago.id_factura)}</TableCell>
                    <TableCell>{pago.fecha}</TableCell>
                    <TableCell>{pago.numero_cheque_transferencia || 'Efectivo'}</TableCell>
                    <TableCell><div className="flex items-center gap-1"><DollarSign className="h-3 w-3 text-gray-400" />{getMonedaSimbolo(pago.id_moneda)} {pago.monto.toFixed(2)}</div></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleViewDetails(pago)} className="p-1 hover:bg-gray-100 rounded" title="Ver detalles"><Eye className="h-4 w-4 text-green-600" /></button>
                        <button onClick={() => handleEdit(pago)} className="p-1 hover:bg-gray-100 rounded" title="Editar"><Edit className="h-4 w-4 text-blue-600" /></button>
                        <button onClick={() => handleDelete(pago)} className="p-1 hover:bg-gray-100 rounded" title="Eliminar"><Trash2 className="h-4 w-4 text-red-600" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} type={confirmModal.type} onConfirm={confirmModal.onConfirm} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} />
    </div>
  );
}
