import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suplementosService, contratosService, monedaService } from '../../services/api';
import { Plus, Edit, Trash2, Search, Save, ArrowLeft, FilePlus, DollarSign, Eye, Package } from 'lucide-react';
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
import type { Suplemento, SuplementoProducto } from '../../types/ventas_contrato';

const ESTADOS = ['activo', 'cancelado', 'finalizado'] as const;

export function SuplementosPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'form' | 'detail'>('list');
  const [editingSuplemento, setEditingSuplemento] = useState<Suplemento | null>(null);
  const [selectedSuplemento, setSelectedSuplemento] = useState<Suplemento | null>(null);
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
    nombre_suplemento: '',
    estado: 'activo' as const,
    fecha: '',
    id_moneda: 0,
    monto: 0,
    documento: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const { data: suplementos = [], isLoading } = useQuery({
    queryKey: ['suplementos'],
    queryFn: () => suplementosService.getSuplementos(),
  });

  const { data: contratos = [] } = useQuery({
    queryKey: ['contratos'],
    queryFn: () => contratosService.getContratos(),
  });

  const { data: monedas = [] } = useQuery({
    queryKey: ['monedas'],
    queryFn: () => monedaService.getMonedas(),
  });

  const { data: suplementoProductos = [] } = useQuery({
    queryKey: ['suplemento-productos', selectedSuplemento?.id_suplemento],
    queryFn: () => selectedSuplemento ? suplementosService.getSuplementoProductos(selectedSuplemento.id_suplemento) : Promise.resolve([]),
    enabled: !!selectedSuplemento && view === 'detail',
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Suplemento>) => suplementosService.createSuplemento(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suplementos'] });
      toast.success('Suplemento creado');
      setView('list');
      resetForm();
    },
    onError: () => toast.error('Error al crear suplemento'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Suplemento> }) => 
      suplementosService.updateSuplemento(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suplementos'] });
      toast.success('Suplemento actualizado');
      setView('list');
      resetForm();
    },
    onError: () => toast.error('Error al actualizar suplemento'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => suplementosService.deleteSuplemento(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suplementos'] });
      toast.success('Suplemento eliminado');
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    },
    onError: () => toast.error('Error al eliminar suplemento'),
  });

  const resetForm = () => {
    setFormData({
      id_contrato: 0,
      nombre_suplemento: '',
      estado: 'activo',
      fecha: '',
      id_moneda: 0,
      monto: 0,
      documento: ''
    });
    setFormErrors({});
    setEditingSuplemento(null);
  };

  const handleNew = () => {
    resetForm();
    setView('form');
  };

  const handleEdit = (suplemento: Suplemento) => {
    setEditingSuplemento(suplemento);
    setFormData({
      id_contrato: suplemento.id_contrato,
      nombre_suplemento: suplemento.nombre_suplemento,
      estado: suplemento.estado,
      fecha: suplemento.fecha,
      id_moneda: suplemento.id_moneda,
      monto: suplemento.monto || 0,
      documento: suplemento.documento || ''
    });
    setView('form');
  };

  const handleViewDetails = (suplemento: Suplemento) => {
    setSelectedSuplemento(suplemento);
    setView('detail');
  };

  const handleDelete = (suplemento: Suplemento) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Suplemento',
      message: `¿Está seguro de eliminar el suplemento "${suplemento.nombre_suplemento}"?`,
      onConfirm: () => deleteMutation.mutate(suplemento.id_suplemento),
      type: 'danger'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    
    if (!formData.id_contrato) errors.id_contrato = 'Seleccione un contrato';
    if (!formData.nombre_suplemento) errors.nombre_suplemento = 'Ingrese el nombre';
    if (!formData.fecha) errors.fecha = 'Ingrese la fecha';
    if (!formData.id_moneda) errors.id_moneda = 'Seleccione una moneda';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingSuplemento) {
      updateMutation.mutate({ id: editingSuplemento.id_suplemento, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredSuplementos = suplementos.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.nombre_suplemento?.toLowerCase().includes(term) ||
      s.contrato?.nombre_contrato?.toLowerCase().includes(term)
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

  const getContratoNombre = (id: number) => {
    const contrato = contratos.find(c => c.id_contrato === id);
    return contrato?.nombre_contrato || 'Sin contrato';
  };

  // Vista de Detalles
  if (view === 'detail' && selectedSuplemento) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setView('list')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Detalles del Suplemento</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Información General</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Contrato:</span>
                <span className="font-medium">{getContratoNombre(selectedSuplemento.id_contrato)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Nombre:</span>
                <span className="font-medium">{selectedSuplemento.nombre_suplemento}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Estado:</span>
                {getEstadoBadge(selectedSuplemento.estado)}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fecha:</span>
                <span className="font-medium">{selectedSuplemento.fecha}</span>
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
                <span className="font-medium">{getMonedaSimbolo(selectedSuplemento.id_moneda)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Monto:</span>
                <span className="font-medium text-green-600">
                  {selectedSuplemento.monto ? `${getMonedaSimbolo(selectedSuplemento.id_moneda)} ${selectedSuplemento.monto.toFixed(2)}` : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Documento:</span>
                <span className="font-medium text-blue-600">{selectedSuplemento.documento || '-'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <h3 className="text-lg font-semibold">Productos del Suplemento</h3>
          </CardHeader>
          <CardContent>
            {suplementoProductos.length === 0 ? (
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
                  {suplementoProductos.map((sp) => (
                    <TableRow key={sp.id_suplemento_producto}>
                      <TableCell>{sp.id_producto}</TableCell>
                      <TableCell>{sp.cantidad}</TableCell>
                      <TableCell>{getMonedaSimbolo(selectedSuplemento.id_moneda)} {sp.precio_unitario.toFixed(2)}</TableCell>
                      <TableCell className="font-medium">
                        {getMonedaSimbolo(selectedSuplemento.id_moneda)} {(sp.cantidad * sp.precio_unitario).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 mt-6">
          <Button onClick={() => handleEdit(selectedSuplemento)}>
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
            {editingSuplemento ? 'Editar' : 'Nuevo'} Suplemento
          </h1>
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
                  {contratos.map((c) => (
                    <option key={c.id_contrato} value={c.id_contrato}>
                      {c.nombre_contrato}
                    </option>
                  ))}
                </select>
                {formErrors.id_contrato && <p className="text-red-500 text-sm mt-1">{formErrors.id_contrato}</p>}
              </div>

              <div>
                <Label>Nombre del Suplemento *</Label>
                <Input
                  value={formData.nombre_suplemento}
                  onChange={(e) => setFormData({ ...formData, nombre_suplemento: e.target.value })}
                  placeholder="Nombre del suplemento"
                />
                {formErrors.nombre_suplemento && <p className="text-red-500 text-sm mt-1">{formErrors.nombre_suplemento}</p>}
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
                <Label>Documento (ruta archivo)</Label>
                <Input
                  value={formData.documento}
                  onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                  placeholder="/uploads/suplementos/archivo.pdf"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  {editingSuplemento ? 'Actualizar' : 'Crear'}
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
          <h1 className="text-2xl font-bold text-gray-900">Suplementos</h1>
          <p className="text-gray-500 mt-1">Gestión de suplementos ({filteredSuplementos.length} registrados)</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Suplemento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar suplementos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-gray-500">Cargando...</p>
          ) : filteredSuplementos.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No hay suplementos registrados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuplementos.map((suplemento) => (
                  <TableRow key={suplemento.id_suplemento} className="cursor-pointer" onClick={() => handleViewDetails(suplemento)}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FilePlus className="h-4 w-4 text-gray-400" />
                        <span>{suplemento.contrato?.nombre_contrato || getContratoNombre(suplemento.id_contrato)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{suplemento.nombre_suplemento}</TableCell>
                    <TableCell>{suplemento.fecha}</TableCell>
                    <TableCell>{getEstadoBadge(suplemento.estado)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-gray-400" />
                        {suplemento.monto ? `${getMonedaSimbolo(suplemento.id_moneda)} ${suplemento.monto.toFixed(2)}` : '-'}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(suplemento)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4 text-green-600" />
                        </button>
                        <button
                          onClick={() => handleEdit(suplemento)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(suplemento)}
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
