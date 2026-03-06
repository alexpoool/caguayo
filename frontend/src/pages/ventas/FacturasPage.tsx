import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facturasService, contratosService, monedaService } from '../../services/api';
import { Plus, Edit, Trash2, Search, Save, ArrowLeft, Receipt, DollarSign, Eye } from 'lucide-react';
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
import type { Factura, FacturaProducto } from '../../types/ventas_contrato';

export function FacturasPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'form' | 'detail'>('list');
  const [editingFactura, setEditingFactura] = useState<Factura | null>(null);
  const [selectedFactura, setSelectedFactura] = useState<Factura | null>(null);
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
    id_contrato: 0,
    codigo: '',
    descripcion: '',
    observaciones: '',
    fecha: '',
    id_moneda: 0,
    monto: 0
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const { data: facturas = [], isLoading } = useQuery({
    queryKey: ['facturas'],
    queryFn: () => facturasService.getFacturas(),
  });

  const { data: contratos = [] } = useQuery({
    queryKey: ['contratos'],
    queryFn: () => contratosService.getContratos(),
  });

  const { data: monedas = [] } = useQuery({
    queryKey: ['monedas'],
    queryFn: () => monedaService.getMonedas(),
  });

  const { data: facturaProductos = [] } = useQuery({
    queryKey: ['factura-productos', selectedFactura?.id_factura],
    queryFn: () => selectedFactura ? facturasService.getFacturaProductos(selectedFactura.id_factura) : Promise.resolve([]),
    enabled: !!selectedFactura && view === 'detail',
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Factura>) => facturasService.createFactura(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] });
      toast.success('Factura creada');
      setView('list');
      resetForm();
    },
    onError: () => toast.error('Error al crear factura'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Factura> }) => 
      facturasService.updateFactura(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] });
      toast.success('Factura actualizada');
      setView('list');
      resetForm();
    },
    onError: () => toast.error('Error al actualizar factura'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => facturasService.deleteFactura(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facturas'] });
      toast.success('Factura eliminada');
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    },
    onError: () => toast.error('Error al eliminar factura'),
  });

  const resetForm = () => {
    setFormData({
      id_contrato: 0,
      codigo: '',
      descripcion: '',
      observaciones: '',
      fecha: '',
      id_moneda: 0,
      monto: 0
    });
    setFormErrors({});
    setEditingFactura(null);
  };

  const handleNew = () => {
    resetForm();
    setView('form');
  };

  const handleEdit = (factura: Factura) => {
    setEditingFactura(factura);
    setFormData({
      id_contrato: factura.id_contrato,
      codigo: factura.codigo,
      descripcion: factura.descripcion || '',
      observaciones: factura.observaciones || '',
      fecha: factura.fecha,
      id_moneda: factura.id_moneda,
      monto: factura.monto || 0
    });
    setView('form');
  };

  const handleViewDetails = (factura: Factura) => {
    setSelectedFactura(factura);
    setView('detail');
  };

  const handleDelete = (factura: Factura) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Factura',
      message: `¿Está seguro de eliminar la factura "${factura.codigo}"?`,
      onConfirm: () => deleteMutation.mutate(factura.id_factura),
      type: 'danger'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    
    if (!formData.id_contrato) errors.id_contrato = 'Seleccione un contrato';
    if (!formData.codigo) errors.codigo = 'Ingrese el código';
    if (!formData.fecha) errors.fecha = 'Ingrese la fecha';
    if (!formData.id_moneda) errors.id_moneda = 'Seleccione una moneda';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingFactura) {
      updateMutation.mutate({ id: editingFactura.id_factura, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredFacturas = facturas.filter(f => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      f.codigo?.toLowerCase().includes(term) ||
      f.contrato?.nombre_contrato?.toLowerCase().includes(term)
    );
  });

  const getMonedaSimbolo = (id: number) => {
    const moneda = monedas.find(m => m.id_moneda === id);
    return moneda?.simbolo || '';
  };

  const getContratoNombre = (id: number) => {
    const contrato = contratos.find(c => c.id_contrato === id);
    return contrato?.nombre_contrato || 'Sin contrato';
  };

  // Vista de Detalles
  if (view === 'detail' && selectedFactura) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Detalles de la Factura</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><h3 className="text-lg font-semibold">Información General</h3></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between"><span className="text-gray-500">Código:</span><span className="font-medium">{selectedFactura.codigo}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Contrato:</span><span className="font-medium">{getContratoNombre(selectedFactura.id_contrato)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Fecha:</span><span className="font-medium">{selectedFactura.fecha}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Descripción:</span><span className="font-medium">{selectedFactura.descripcion || '-'}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><h3 className="text-lg font-semibold">Información Financiera</h3></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between"><span className="text-gray-500">Moneda:</span><span className="font-medium">{getMonedaSimbolo(selectedFactura.id_moneda)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Monto:</span><span className="font-medium text-green-600">{selectedFactura.monto ? `${getMonedaSimbolo(selectedFactura.id_moneda)} ${selectedFactura.monto.toFixed(2)}` : '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Observaciones:</span><span className="font-medium">{selectedFactura.observaciones || '-'}</span></div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader><h3 className="text-lg font-semibold">Productos de la Factura</h3></CardHeader>
          <CardContent>
            {facturaProductos.length === 0 ? (
              <p className="text-center py-4 text-gray-500">No hay productos asociados</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Producto</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Precio Unitario</TableHead>
                    <TableHead>Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facturaProductos.map((fp) => (
                    <TableRow key={fp.id_factura_producto}>
                      <TableCell>{fp.id_producto}</TableCell>
                      <TableCell>{fp.cantidad}</TableCell>
                      <TableCell>{getMonedaSimbolo(selectedFactura.id_moneda)} {fp.precio_unitario.toFixed(2)}</TableCell>
                      <TableCell className="font-medium">{getMonedaSimbolo(selectedFactura.id_moneda)} {(fp.cantidad * fp.precio_unitario).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 mt-6">
          <Button onClick={() => handleEdit(selectedFactura)}><Edit className="h-4 w-4 mr-2" />Editar</Button>
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
          <h1 className="text-2xl font-bold text-gray-900">{editingFactura ? 'Editar' : 'Nueva'} Factura</h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Contrato *</Label>
                <select
                  value={formData.id_contrato || ''}
                  onChange={(e) => setFormData({ ...formData, id_contrato: parseInt(e.target.value) || 0 })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  <option value="">Seleccione un contrato</option>
                  {contratos.map((c) => (<option key={c.id_contrato} value={c.id_contrato}>{c.nombre_contrato}</option>))}
                </select>
                {formErrors.id_contrato && <p className="text-red-500 text-sm mt-1">{formErrors.id_contrato}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Código *</Label>
                  <Input value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} placeholder="FAC-001" />
                  {formErrors.codigo && <p className="text-red-500 text-sm mt-1">{formErrors.codigo}</p>}
                </div>
                <div>
                  <Label>Fecha *</Label>
                  <Input type="date" value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} />
                  {formErrors.fecha && <p className="text-red-500 text-sm mt-1">{formErrors.fecha}</p>}
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
                  <Label>Monto</Label>
                  <Input type="number" step="0.01" value={formData.monto} onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>

              <div>
                <Label>Descripción</Label>
                <textarea value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg" rows={2} />
              </div>

              <div>
                <Label>Observaciones</Label>
                <textarea value={formData.observaciones} onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg" rows={2} />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit"><Save className="h-4 w-4 mr-2" />{editingFactura ? 'Actualizar' : 'Crear'}</Button>
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
          <h1 className="text-2xl font-bold text-gray-900">Facturas</h1>
          <p className="text-gray-500 mt-1">Gestión de facturas ({filteredFacturas.length} registradas)</p>
        </div>
        <Button onClick={handleNew}><Plus className="h-4 w-4 mr-2" />Nueva Factura</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-gray-400" />
            <input type="text" placeholder="Buscar facturas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-gray-500">Cargando...</p>
          ) : filteredFacturas.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No hay facturas registradas</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFacturas.map((factura) => (
                  <TableRow key={factura.id_factura} className="cursor-pointer" onClick={() => handleViewDetails(factura)}>
                    <TableCell><div className="flex items-center gap-2"><Receipt className="h-4 w-4 text-gray-400" /><span className="font-medium">{factura.codigo}</span></div></TableCell>
                    <TableCell>{factura.contrato?.nombre_contrato || getContratoNombre(factura.id_contrato)}</TableCell>
                    <TableCell>{factura.fecha}</TableCell>
                    <TableCell className="max-w-xs truncate">{factura.descripcion || '-'}</TableCell>
                    <TableCell><div className="flex items-center gap-1"><DollarSign className="h-3 w-3 text-gray-400" />{factura.monto ? `${getMonedaSimbolo(factura.id_moneda)} ${factura.monto.toFixed(2)}` : '-'}</div></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleViewDetails(factura)} className="p-1 hover:bg-gray-100 rounded" title="Ver detalles"><Eye className="h-4 w-4 text-green-600" /></button>
                        <button onClick={() => handleEdit(factura)} className="p-1 hover:bg-gray-100 rounded" title="Editar"><Edit className="h-4 w-4 text-blue-600" /></button>
                        <button onClick={() => handleDelete(factura)} className="p-1 hover:bg-gray-100 rounded" title="Eliminar"><Trash2 className="h-4 w-4 text-red-600" /></button>
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
