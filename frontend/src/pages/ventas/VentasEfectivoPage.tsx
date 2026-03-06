import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ventasEfectivoService, dependenciasService } from '../../services/api';
import { Plus, Edit, Trash2, Search, Save, ArrowLeft, DollarSign, User, Eye } from 'lucide-react';
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
import type { VentaEfectivo } from '../../types/ventas_contrato';

export function VentasEfectivoPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'form' | 'detail'>('list');
  const [editingVenta, setEditingVenta] = useState<VentaEfectivo | null>(null);
  const [selectedVenta, setSelectedVenta] = useState<VentaEfectivo | null>(null);
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
    slip: '',
    fecha: '',
    id_dependencia: 0,
    cajero: '',
    monto: 0
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const { data: ventas = [], isLoading } = useQuery({
    queryKey: ['ventasEfectivo'],
    queryFn: () => ventasEfectivoService.getVentasEfectivo(),
  });

  const { data: dependencias = [] } = useQuery({
    queryKey: ['dependencias'],
    queryFn: () => dependenciasService.getDependencias(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<VentaEfectivo>) => ventasEfectivoService.createVentaEfectivo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventasEfectivo'] });
      toast.success('Venta en efectivo registrada');
      setView('list');
      resetForm();
    },
    onError: () => toast.error('Error al registrar venta'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<VentaEfectivo> }) => 
      ventasEfectivoService.updateVentaEfectivo(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventasEfectivo'] });
      toast.success('Venta actualizada');
      setView('list');
      resetForm();
    },
    onError: () => toast.error('Error al actualizar venta'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ventasEfectivoService.deleteVentaEfectivo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventasEfectivo'] });
      toast.success('Venta eliminada');
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    },
    onError: () => toast.error('Error al eliminar venta'),
  });

  const resetForm = () => {
    setFormData({
      slip: '',
      fecha: '',
      id_dependencia: 0,
      cajero: '',
      monto: 0
    });
    setFormErrors({});
    setEditingVenta(null);
  };

  const handleNew = () => {
    resetForm();
    setView('form');
  };

  const handleEdit = (venta: VentaEfectivo) => {
    setEditingVenta(venta);
    setFormData({
      slip: venta.slip || '',
      fecha: venta.fecha,
      id_dependencia: venta.id_dependencia,
      cajero: venta.cajero,
      monto: venta.monto || 0
    });
    setView('form');
  };

  const handleViewDetails = (venta: VentaEfectivo) => {
    setSelectedVenta(venta);
    setView('detail');
  };

  const handleDelete = (venta: VentaEfectivo) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Venta',
      message: `¿Está seguro de eliminar la venta del cajero "${venta.cajero}"?`,
      onConfirm: () => deleteMutation.mutate(venta.id_venta_efectivo),
      type: 'danger'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    
    if (!formData.id_dependencia) errors.id_dependencia = 'Seleccione una caja/dependencia';
    if (!formData.fecha) errors.fecha = 'Ingrese la fecha';
    if (!formData.cajero) errors.cajero = 'Ingrese el nombre del cajero';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingVenta) {
      updateMutation.mutate({ id: editingVenta.id_venta_efectivo, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredVentas = ventas.filter(v => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      v.cajero?.toLowerCase().includes(term) ||
      v.slip?.toLowerCase().includes(term) ||
      v.dependencia?.nombre?.toLowerCase().includes(term)
    );
  });

  const getDependenciaNombre = (id: number) => {
    const dep = dependencias.find(d => d.id_dependencia === id);
    return dep?.nombre || 'Sin caja';
  };

  // Vista de Detalles
  if (view === 'detail' && selectedVenta) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Detalles de Venta en Efectivo</h1>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between"><span className="text-gray-500">Fecha:</span><span className="font-medium">{selectedVenta.fecha}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Caja/Dependencia:</span><span className="font-medium">{getDependenciaNombre(selectedVenta.id_dependencia)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Cajero:</span><span className="font-medium">{selectedVenta.cajero}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Slip:</span><span className="font-medium">{selectedVenta.slip || '-'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Monto:</span><span className="font-medium text-green-600">${selectedVenta.monto ? selectedVenta.monto.toFixed(2) : '-'}</span></div>
          </CardContent>
        </Card>

        <div className="flex gap-3 mt-6">
          <Button onClick={() => handleEdit(selectedVenta)}><Edit className="h-4 w-4 mr-2" />Editar</Button>
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
          <h1 className="text-2xl font-bold text-gray-900">{editingVenta ? 'Editar' : 'Nueva'} Venta en Efectivo</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Caja/Dependencia *</Label>
                <select
                  value={formData.id_dependencia || ''}
                  onChange={(e) => setFormData({ ...formData, id_dependencia: parseInt(e.target.value) || 0 })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  <option value="">Seleccione una caja</option>
                  {dependencias.map((d) => (<option key={d.id_dependencia} value={d.id_dependencia}>{d.nombre}</option>))}
                </select>
                {formErrors.id_dependencia && <p className="text-red-500 text-sm mt-1">{formErrors.id_dependencia}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha *</Label>
                  <Input type="date" value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} />
                  {formErrors.fecha && <p className="text-red-500 text-sm mt-1">{formErrors.fecha}</p>}
                </div>
                <div>
                  <Label>Cajero *</Label>
                  <Input value={formData.cajero} onChange={(e) => setFormData({ ...formData, cajero: e.target.value })} placeholder="Nombre del cajero" />
                  {formErrors.cajero && <p className="text-red-500 text-sm mt-1">{formErrors.cajero}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Slip</Label>
                  <Input value={formData.slip} onChange={(e) => setFormData({ ...formData, slip: e.target.value })} placeholder="Número de slip" />
                </div>
                <div>
                  <Label>Monto</Label>
                  <Input type="number" step="0.01" value={formData.monto} onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit"><Save className="h-4 w-4 mr-2" />{editingVenta ? 'Actualizar' : 'Crear'}</Button>
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
          <h1 className="text-2xl font-bold text-gray-900">Ventas en Efectivo</h1>
          <p className="text-gray-500 mt-1">Gestión de ventas en efectivo ({filteredVentas.length} registradas)</p>
        </div>
        <Button onClick={handleNew}><Plus className="h-4 w-4 mr-2" />Nueva Venta</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-gray-400" />
            <input type="text" placeholder="Buscar ventas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-gray-500">Cargando...</p>
          ) : filteredVentas.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No hay ventas en efectivo registradas</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Caja</TableHead>
                  <TableHead>Cajero</TableHead>
                  <TableHead>Slip</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVentas.map((venta) => (
                  <TableRow key={venta.id_venta_efectivo} className="cursor-pointer" onClick={() => handleViewDetails(venta)}>
                    <TableCell>{venta.fecha}</TableCell>
                    <TableCell><div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-gray-400" /><span>{venta.dependencia?.nombre || getDependenciaNombre(venta.id_dependencia)}</span></div></TableCell>
                    <TableCell><div className="flex items-center gap-2"><User className="h-4 w-4 text-gray-400" /><span>{venta.cajero}</span></div></TableCell>
                    <TableCell>{venta.slip || '-'}</TableCell>
                    <TableCell className="font-medium">${venta.monto ? venta.monto.toFixed(2) : '-'}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleViewDetails(venta)} className="p-1 hover:bg-gray-100 rounded" title="Ver detalles"><Eye className="h-4 w-4 text-green-600" /></button>
                        <button onClick={() => handleEdit(venta)} className="p-1 hover:bg-gray-100 rounded" title="Editar"><Edit className="h-4 w-4 text-blue-600" /></button>
                        <button onClick={() => handleDelete(venta)} className="p-1 hover:bg-gray-100 rounded" title="Eliminar"><Trash2 className="h-4 w-4 text-red-600" /></button>
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
