import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conveniosService, clientesService, configuracionService } from '../services/api';
import { Plus, Edit, Trash2, Search, Save, ArrowLeft, Building } from 'lucide-react';
import toast from 'react-hot-toast';

interface ClienteSimple {
  id_cliente: number;
  nombre: string;
}

interface TipoConvenio {
  id_tipo_convenio: number;
  nombre: string;
  descripcion?: string;
}

interface Convenio {
  id_convenio: number;
  id_cliente: number;
  nombre_convenio: string;
  fecha: string;
  vigencia: string;
  id_tipo_convenio: number;
  cliente?: ClienteSimple;
  tipo_convenio?: TipoConvenio;
}

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
} from '../components/ui';

export function ConveniosPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingConvenio, setEditingConvenio] = useState<Convenio | null>(null);
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
    nombre_convenio: '',
    fecha: '',
    vigencia: '',
    id_tipo_convenio: 0
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const { data: convenios = [], isLoading } = useQuery({
    queryKey: ['convenios'],
    queryFn: () => conveniosService.getConvenios(),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => clientesService.getClientes(),
  });

  const { data: tiposConvenio = [] } = useQuery({
    queryKey: ['tiposConvenio'],
    queryFn: () => configuracionService.getTiposConvenio(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Convenio>) => conveniosService.createConvenio(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convenios'] });
      toast.success('Convenio creado');
      setView('list');
      resetForm();
    },
    onError: () => toast.error('Error al crear convenio'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Convenio> }) => 
      conveniosService.updateConvenio(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convenios'] });
      toast.success('Convenio actualizado');
      setView('list');
      resetForm();
    },
    onError: () => toast.error('Error al actualizar convenio'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => conveniosService.deleteConvenio(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convenios'] });
      toast.success('Convenio eliminado');
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    },
    onError: () => toast.error('Error al eliminar convenio'),
  });

  const resetForm = () => {
    setFormData({
      id_cliente: 0,
      nombre_convenio: '',
      fecha: '',
      vigencia: '',
      id_tipo_convenio: 0
    });
    setFormErrors({});
    setEditingConvenio(null);
  };

  const handleNew = () => {
    resetForm();
    setView('form');
  };

  const handleEdit = (convenio: Convenio) => {
    setEditingConvenio(convenio);
    setFormData({
      id_cliente:convenio.id_cliente,
      nombre_convenio:convenio.nombre_convenio,
      fecha:convenio.fecha,
      vigencia:convenio.vigencia,
      id_tipo_convenio:convenio.id_tipo_convenio
    });
    setView('form');
  };

  const handleDelete = (convenio: Convenio) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Convenio',
      message: `¿Está seguro de eliminar el convenio "${convenio.nombre_convenio}"?`,
      onConfirm: () => deleteMutation.mutate(convenio.id_convenio),
      type: 'danger'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    
    if (!formData.id_cliente) errors.id_cliente = 'Seleccione un cliente';
    if (!formData.id_tipo_convenio) errors.id_tipo_convenio = 'Seleccione un tipo de convenio';
    if (!formData.nombre_convenio) errors.nombre_convenio = 'Ingrese el nombre';
    if (!formData.fecha) errors.fecha = 'Ingrese la fecha';
    if (!formData.vigencia) errors.vigencia = 'Ingrese la vigencia';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingConvenio) {
      updateMutation.mutate({ id: editingConvenio.id_convenio, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredConvenios = convenios.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.nombre_convenio?.toLowerCase().includes(term) ||
      c.cliente?.nombre?.toLowerCase().includes(term)
    );
  });

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
            {editingConvenio ? 'Editar' : 'Nuevo'} Convenio
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
                <Label>Tipo de Convenio *</Label>
                <select
                  value={formData.id_tipo_convenio || ''}
                  onChange={(e) => setFormData({ ...formData, id_tipo_convenio: parseInt(e.target.value) || 0 })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  <option value="">Seleccione un tipo</option>
                  {tiposConvenio.map((tc) => (
                    <option key={tc.id_tipo_convenio} value={tc.id_tipo_convenio}>
                      {tc.nombre}
                    </option>
                  ))}
                </select>
                {formErrors.id_tipo_convenio && <p className="text-red-500 text-sm mt-1">{formErrors.id_tipo_convenio}</p>}
              </div>

              <div>
                <Label>Nombre del Convenio *</Label>
                <Input
                  value={formData.nombre_convenio}
                  onChange={(e) => setFormData({ ...formData, nombre_convenio: e.target.value })}
                  placeholder="Nombre del contrato/convenio"
                />
                {formErrors.nombre_convenio && <p className="text-red-500 text-sm mt-1">{formErrors.nombre_convenio}</p>}
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

              <div className="flex gap-3 pt-4">
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  {editingConvenio ? 'Actualizar' : 'Crear'}
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Convenios</h1>
          <p className="text-gray-500 mt-1">Gestión de convenios ({filteredConvenios.length} registrados)</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Convenio
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar convenios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-gray-500">Cargando...</p>
          ) : filteredConvenios.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No hay convenios registrados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConvenios.map((convenio) => (
                  <TableRow key={convenio.id_convenio}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-gray-400" />
                        <span>{convenio.cliente?.nombre || 'Sin cliente'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{convenio.nombre_convenio}</TableCell>
                    <TableCell>{convenio.fecha}</TableCell>
                    <TableCell>{convenio.vigencia}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(convenio)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(convenio)}
                          className="p-1 hover:bg-gray-100 rounded"
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
