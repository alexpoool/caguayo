import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contratosService, clientesService, monedaService } from '../../services/api';
import { Plus, Edit, Trash2, Search, Save, ArrowLeft, FileText, DollarSign, Eye, Package, X } from 'lucide-react';
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
import type { Contrato, ContratoProducto, Cliente, Moneda } from '../../types/ventas_contrato';

const ESTADOS = ['activo', 'cancelado', 'finalizado'] as const;

export function ContratosPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'form' | 'detail'>('list');
  const [editingContrato, setEditingContrato] = useState<Contrato | null>(null);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
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
    id_cliente: 0,
    nombre_contrato: '',
    proforma: '',
    estado: 'activo' as const,
    fecha: '',
    vigencia: '',
    tipo: '',
    id_moneda: 0,
    monto: 0,
    documento_final: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const { data: contratos = [], isLoading } = useQuery({
    queryKey: ['contratos'],
    queryFn: () => contratosService.getContratos(),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => clientesService.getClientes(),
  });

  const { data: monedas = [] } = useQuery({
    queryKey: ['monedas'],
    queryFn: () => monedaService.getMonedas(),
  });

  const { data: contratoProductos = [] } = useQuery({
    queryKey: ['contrato-productos', selectedContrato?.id_contrato],
    queryFn: () => selectedContrato ? contratosService.getContratoProductos(selectedContrato.id_contrato) : Promise.resolve([]),
    enabled: !!selectedContrato && showDetailModal,
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Contrato>) => contratosService.createContrato(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast.success('Contrato creado');
      setView('list');
      resetForm();
    },
    onError: () => toast.error('Error al crear contrato'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Contrato> }) => 
      contratosService.updateContrato(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast.success('Contrato actualizado');
      setView('list');
      resetForm();
    },
    onError: () => toast.error('Error al actualizar contrato'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => contratosService.deleteContrato(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast.success('Contrato eliminado');
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    },
    onError: () => toast.error('Error al eliminar contrato'),
  });

  const resetForm = () => {
    setFormData({
      id_cliente: 0,
      nombre_contrato: '',
      proforma: '',
      estado: 'activo',
      fecha: '',
      vigencia: '',
      tipo: '',
      id_moneda: 0,
      monto: 0,
      documento_final: ''
    });
    setFormErrors({});
    setEditingContrato(null);
  };

  const handleNew = () => {
    resetForm();
    setView('form');
  };

  const handleEdit = (contrato: Contrato) => {
    setEditingContrato(contrato);
    setFormData({
      id_cliente: contrato.id_cliente,
      nombre_contrato: contrato.nombre_contrato,
      proforma: contrato.proforma || '',
      estado: contrato.estado,
      fecha: contrato.fecha,
      vigencia: contrato.vigencia,
      tipo: contrato.tipo || '',
      id_moneda: contrato.id_moneda,
      monto: contrato.monto || 0,
      documento_final: contrato.documento_final || ''
    });
    setView('form');
  };

  const handleViewDetails = (contrato: Contrato) => {
    setSelectedContrato(contrato);
    setShowDetailModal(true);
  };

  const handleDelete = (contrato: Contrato) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Contrato',
      message: `¿Está seguro de eliminar el contrato "${contrato.nombre_contrato}"?`,
      onConfirm: () => deleteMutation.mutate(contrato.id_contrato),
      type: 'danger'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    
    if (!formData.id_cliente) errors.id_cliente = 'Seleccione un cliente';
    if (!formData.nombre_contrato) errors.nombre_contrato = 'Ingrese el nombre';
    if (!formData.fecha) errors.fecha = 'Ingrese la fecha';
    if (!formData.vigencia) errors.vigencia = 'Ingrese la vigencia';
    if (!formData.id_moneda) errors.id_moneda = 'Seleccione una moneda';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingContrato) {
      updateMutation.mutate({ id: editingContrato.id_contrato, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredContratos = contratos.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.nombre_contrato?.toLowerCase().includes(term) ||
      c.cliente?.nombre?.toLowerCase().includes(term) ||
      c.estado?.toLowerCase().includes(term)
    );
  });

  const getEstadoBadge = (estado: string) => {
    const colors: Record<string, string> = {
      activo: 'bg-green-100 text-green-800',
      cancelado: 'bg-red-100 text-red-800',
      finalizado: 'bg-gray-100 text-gray-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[estado] || 'bg-gray-100'}`}>
        {estado}
      </span>
    );
  };

  const getMonedaSimbolo = (id: number) => {
    const moneda = monedas.find(m => m.id_moneda === id);
    return moneda?.simbolo || '';
  };

  const getClienteNombre = (id: number) => {
    const cliente = clientes.find(c => c.id_cliente === id);
    return cliente?.nombre || 'Sin cliente';
  };

  // Vista de Detalles
  if (view === 'detail' && selectedContrato) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setView('list')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Detalles del Contrato</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Información General</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Cliente:</span>
                <span className="font-medium">{getClienteNombre(selectedContrato.id_cliente)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Nombre:</span>
                <span className="font-medium">{selectedContrato.nombre_contrato}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tipo:</span>
                <span className="font-medium">{selectedContrato.tipo || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Estado:</span>
                {getEstadoBadge(selectedContrato.estado)}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fecha:</span>
                <span className="font-medium">{selectedContrato.fecha}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Vigencia:</span>
                <span className="font-medium">{selectedContrato.vigencia}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Información Financiera</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Moneda:</span>
                <span className="font-medium">{getMonedaSimbolo(selectedContrato.id_moneda)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Monto:</span>
                <span className="font-medium text-green-600">
                  {selectedContrato.monto ? `${getMonedaSimbolo(selectedContrato.id_moneda)} ${selectedContrato.monto.toFixed(2)}` : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Proforma:</span>
                <span className="font-medium text-blue-600">{selectedContrato.proforma || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Documento Final:</span>
                <span className="font-medium text-blue-600">{selectedContrato.documento_final || '-'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Productos del Contrato</h3>
            </div>
          </CardHeader>
          <CardContent>
            {contratoProductos.length === 0 ? (
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
                  {contratoProductos.map((cp) => (
                    <TableRow key={cp.id_contrato_producto}>
                      <TableCell>{cp.id_producto}</TableCell>
                      <TableCell>{cp.cantidad}</TableCell>
                      <TableCell>{getMonedaSimbolo(selectedContrato.id_moneda)} {cp.precio_unitario.toFixed(2)}</TableCell>
                      <TableCell className="font-medium">
                        {getMonedaSimbolo(selectedContrato.id_moneda)} {(cp.cantidad * cp.precio_unitario).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 mt-6">
          <Button onClick={() => handleEdit(selectedContrato)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button variant="outline" onClick={() => setView('list')}>
            Volver
          </Button>
        </div>
      </div>
    );
  }

  // Vista de Formulario
  if (view === 'form') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setView('list')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {editingContrato ? 'Editar' : 'Nuevo'} Contrato
          </h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Cliente *</Label>
                <select
                  value={formData.id_cliente || ''}
                  onChange={(e) => setFormData({ ...formData, id_cliente: parseInt(e.target.value) || 0 })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  <option value="">Seleccione un cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id_cliente} value={c.id_cliente}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
                {formErrors.id_cliente && <p className="text-red-500 text-sm mt-1">{formErrors.id_cliente}</p>}
              </div>

              <div>
                <Label>Nombre del Contrato *</Label>
                <Input
                  value={formData.nombre_contrato}
                  onChange={(e) => setFormData({ ...formData, nombre_contrato: e.target.value })}
                  placeholder="Nombre del contrato"
                />
                {formErrors.nombre_contrato && <p className="text-red-500 text-sm mt-1">{formErrors.nombre_contrato}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha *</Label>
                  <Input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  />
                  {formErrors.fecha && <p className="text-red-500 text-sm mt-1">{formErrors.fecha}</p>}
                </div>
                <div>
                  <Label>Vigencia *</Label>
                  <Input
                    type="date"
                    value={formData.vigencia}
                    onChange={(e) => setFormData({ ...formData, vigencia: e.target.value })}
                  />
                  {formErrors.vigencia && <p className="text-red-500 text-sm mt-1">{formErrors.vigencia}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Estado *</Label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg"
                  >
                    {ESTADOS.map((estado) => (
                      <option key={estado} value={estado}>
                        {estado.charAt(0).toUpperCase() + estado.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Input
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    placeholder="Tipo de contrato"
                  />
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
                    {monedas.map((m) => (
                      <option key={m.id_moneda} value={m.id_moneda}>
                        {m.nombre} ({m.simbolo})
                      </option>
                    ))}
                  </select>
                  {formErrors.id_moneda && <p className="text-red-500 text-sm mt-1">{formErrors.id_moneda}</p>}
                </div>
                <div>
                  <Label>Monto</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Label>Proforma (ruta archivo)</Label>
                <Input
                  value={formData.proforma}
                  onChange={(e) => setFormData({ ...formData, proforma: e.target.value })}
                  placeholder="/uploads/proformas/archivo.pdf"
                />
              </div>

              <div>
                <Label>Documento Final (ruta archivo)</Label>
                <Input
                  value={formData.documento_final}
                  onChange={(e) => setFormData({ ...formData, documento_final: e.target.value })}
                  placeholder="/uploads/contratos/archivo.pdf"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  {editingContrato ? 'Actualizar' : 'Crear'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setView('list')}>
                  Cancelar
                </Button>
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
          <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
          <p className="text-gray-500 mt-1">Gestión de contratos ({filteredContratos.length} registrados)</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Contrato
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar contratos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-gray-500">Cargando...</p>
          ) : filteredContratos.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No hay contratos registrados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContratos.map((contrato) => (
                  <TableRow key={contrato.id_contrato} className="cursor-pointer" onClick={() => handleViewDetails(contrato)}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span>{contrato.cliente?.nombre || getClienteNombre(contrato.id_cliente)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{contrato.nombre_contrato}</TableCell>
                    <TableCell>{contrato.fecha}</TableCell>
                    <TableCell>{contrato.vigencia}</TableCell>
                    <TableCell>{getEstadoBadge(contrato.estado)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-gray-400" />
                        {contrato.monto ? `${getMonedaSimbolo(contrato.id_moneda)} ${contrato.monto.toFixed(2)}` : '-'}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(contrato)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4 text-green-600" />
                        </button>
                        <button
                          onClick={() => handleEdit(contrato)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(contrato)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
