import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conveniosService, clientesService } from '../../services/api';
import type { Cliente } from '../../types/index';
import { FileText, Plus, Edit, Trash2, Search, ArrowLeft, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  Button, 
  Input, 
  Label, 
  Card, 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell,
  ConfirmModal
} from '../../components/ui';

interface Convenio {
  id_convenio: number;
  id_cliente: number;
  nombre_convenio: string;
  codigo?: string;
  fecha: string;
  vigencia: string;
  id_tipo_convenio?: number;
  cliente?: {
    id_cliente: number;
    nombre: string;
  };
}

export function CompraConveniosPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingConvenio, setEditingConvenio] = useState<Convenio | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
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
    id_tipo_convenio: 1
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: convenios = [], isLoading, isFetching } = useQuery({
    queryKey: ['convenios', searchTerm],
    queryFn: () => conveniosService.getConvenios(undefined, searchTerm),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-proveedores'],
    queryFn: async () => {
      const allClientes = await clientesService.getClientes(0, 1000);
      return allClientes.filter((c: Cliente) => c.tipo_relacion === 'PROVEEDOR' || c.tipo_relacion === 'AMBAS');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => conveniosService.createConvenio(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convenios'] });
      toast.success('Convenio creado correctamente');
      setView('list');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Error al crear convenio');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => conveniosService.updateConvenio(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convenios'] });
      toast.success('Convenio actualizado correctamente');
      setView('list');
      setEditingConvenio(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Error al actualizar convenio');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => conveniosService.deleteConvenio(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convenios'] });
      toast.success('Convenio eliminado correctamente');
      setConfirmModal({ ...confirmModal, isOpen: false });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Error al eliminar convenio');
    }
  });

  const resetForm = () => {
    setFormData({
      id_cliente: 0,
      nombre_convenio: '',
      fecha: '',
      vigencia: '',
      id_tipo_convenio: 1
    });
    setFormErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    
    if (!formData.id_cliente) errors.id_cliente = 'El cliente es requerido';
    if (!formData.nombre_convenio.trim()) errors.nombre_convenio = 'El nombre es requerido';
    if (!formData.fecha) errors.fecha = 'La fecha es requerida';
    if (!formData.vigencia) errors.vigencia = 'La vigencia es requerida';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const data = {
      ...formData,
      fecha: formData.fecha,
      vigencia: formData.vigencia
    };

    if (editingConvenio) {
      updateMutation.mutate({ id: editingConvenio.id_convenio, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (convenio: Convenio) => {
    setEditingConvenio(convenio);
    setFormData({
      id_cliente: convenio.id_cliente,
      nombre_convenio: convenio.nombre_convenio,
      fecha: convenio.fecha,
      vigencia: convenio.vigencia,
      id_tipo_convenio: convenio.id_tipo_convenio || 1
    });
    setView('form');
  };

  const handleDelete = (convenio: Convenio) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Convenio',
      message: `¿Está seguro de eliminar el convenio "${convenio.nombre_convenio}"?`,
      type: 'danger',
      onConfirm: () => deleteMutation.mutate(convenio.id_convenio)
    });
  };

  const isFormLoading = createMutation.isPending || updateMutation.isPending;

  if (view === 'form') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button 
            onClick={() => { setView('list'); setEditingConvenio(null); resetForm(); }} 
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold">
            {editingConvenio ? 'Editar Convenio' : 'Nuevo Convenio'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <div>
            <Label htmlFor="id_cliente">Cliente / Proveedor *</Label>
            <select
              id="id_cliente"
              value={formData.id_cliente}
              onChange={(e) => setFormData({ ...formData, id_cliente: parseInt(e.target.value) || 0 })}
              className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>Seleccionar cliente...</option>
              {clientes.map((cliente: Cliente) => (
                <option key={cliente.id_cliente} value={cliente.id_cliente}>
                  {cliente.nombre} ({cliente.cedula_rif || 'Sin RIF'})
                </option>
              ))}
            </select>
            {formErrors.id_cliente && <p className="text-red-500 text-sm mt-1">{formErrors.id_cliente}</p>}
          </div>

          <div>
            <Label htmlFor="nombre_convenio">Nombre del Convenio *</Label>
            <Input
              id="nombre_convenio"
              value={formData.nombre_convenio}
              onChange={(e) => setFormData({ ...formData, nombre_convenio: e.target.value })}
              placeholder="Ej: Convenios de Suministros 2024"
            />
            {formErrors.nombre_convenio && <p className="text-red-500 text-sm mt-1">{formErrors.nombre_convenio}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fecha">Fecha *</Label>
              <Input
                id="fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              />
              {formErrors.fecha && <p className="text-red-500 text-sm mt-1">{formErrors.fecha}</p>}
            </div>
            <div>
              <Label htmlFor="vigencia">Vigencia *</Label>
              <Input
                id="vigencia"
                type="date"
                value={formData.vigencia}
                onChange={(e) => setFormData({ ...formData, vigencia: e.target.value })}
              />
              {formErrors.vigencia && <p className="text-red-500 text-sm mt-1">{formErrors.vigencia}</p>}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isFormLoading} className="gap-2">
              {isFormLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingConvenio ? 'Actualizar' : 'Guardar'}
            </Button>
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => { setView('list'); setEditingConvenio(null); resetForm(); }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <FileText className="w-6 h-6" />
            </div>
            Convenios
          </h1>
          <p className="text-gray-500 mt-1">
            {convenios.length === 0 ? 'Gestión de convenios con proveedores' : `${convenios.length} convenios registrados`}
          </p>
        </div>
        <Button onClick={() => { resetForm(); setEditingConvenio(null); setView('form'); }} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Nuevo Convenio
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Buscar convenios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-500">Cargando convenios...</p>
        </div>
      ) : (
        <Card className="overflow-hidden shadow-sm border-gray-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {convenios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                      {searchTerm ? 'No se encontraron convenios' : 'No hay convenios registrados'}
                    </TableCell>
                  </TableRow>
                ) : (
                  convenios.map((convenio: Convenio) => (
                    <TableRow key={convenio.id_convenio} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="font-medium text-gray-900">
                        {convenio.codigo || `ID: ${convenio.id_convenio}`}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-50 rounded-lg text-green-600">
                            <FileText className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-gray-900">{convenio.nombre_convenio}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {convenio.cliente?.nombre || `Cliente ID: ${convenio.id_cliente}`}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {convenio.fecha ? new Date(convenio.fecha).toLocaleDateString('es-ES') : '-'}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {convenio.vigencia ? new Date(convenio.vigencia).toLocaleDateString('es-ES') : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(convenio)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(convenio)}
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
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
}
