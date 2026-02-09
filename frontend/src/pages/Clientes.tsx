import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientesService } from '../services/api';
import type { Cliente, ClienteCreate, ClienteUpdate } from '../types/ventas';
import { Plus, Edit, Trash2, User, Phone, Mail, MapPin, CreditCard, CheckCircle, XCircle, UserCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { 
  Button, 
  Input, 
  Label, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  ConfirmModal
} from '../components/ui';

export function ClientesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
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

  // Form state
  const [formData, setFormData] = useState<ClienteCreate>({
    nombre: '',
    telefono: '',
    email: '',
    cedula_rif: '',
    direccion: '',
    activo: true
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Queries
  const { data: clientes = [], isLoading, isError, error } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => clientesService.getClientes(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: clientesService.createCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente creado correctamente');
      setView('list');
      resetForm();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al crear cliente');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ClienteUpdate }) => 
      clientesService.updateCliente(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente actualizado correctamente');
      setView('list');
      setEditingCliente(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar cliente');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: clientesService.deleteCliente,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente eliminado correctamente');
    },
    onError: (error: any) => {
      const message = error?.message || 'Error al eliminar cliente';
      toast.error(message);
    }
  });

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.nombre || formData.nombre.trim().length < 2) {
      errors.nombre = 'El nombre es requerido (mínimo 2 caracteres)';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'El formato del email no es válido';
    }
    
    if (formData.telefono && formData.telefono.length < 7) {
      errors.telefono = 'El teléfono debe tener al menos 7 caracteres';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Por favor corrija los errores del formulario');
      return;
    }

    const data = {
      ...formData,
      nombre: formData.nombre.trim(),
      telefono: formData.telefono?.trim() || undefined,
      email: formData.email?.trim() || undefined,
      cedula_rif: formData.cedula_rif?.trim() || undefined,
      direccion: formData.direccion?.trim() || undefined,
    };

    if (editingCliente) {
      updateMutation.mutate({ id: editingCliente.id_cliente, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      telefono: '',
      email: '',
      cedula_rif: '',
      direccion: '',
      activo: true
    });
    setFormErrors({});
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nombre: cliente.nombre,
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      cedula_rif: cliente.cedula_rif || '',
      direccion: cliente.direccion || '',
      activo: cliente.activo
    });
    setView('form');
  };

  const handleEliminar = (cliente: Cliente) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar cliente?',
      message: `¿Está seguro que desea eliminar al cliente "${cliente.nombre}"? Esta acción no se puede deshacer. Si el cliente tiene ventas asociadas, no podrá ser eliminado.`,
      onConfirm: () => deleteMutation.mutate(cliente.id_cliente),
      type: 'danger'
    });
  };

  const handleVerPerfil = (clienteId: number) => {
    navigate(`/clientes/${clienteId}`);
  };

  // VISTA: FORMULARIO
  if (view === 'form') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h1>
          <Button variant="secondary" onClick={() => {
            setView('list');
            setEditingCliente(null);
            resetForm();
          }}>
            Volver a la lista
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Label>Nombre Completo *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className={`pl-10 ${formErrors.nombre ? 'border-red-500' : ''}`}
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                {formErrors.nombre && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.nombre}</p>
                )}
              </div>

              <div>
                <Label>Cédula / RIF</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    value={formData.cedula_rif}
                    onChange={(e) => setFormData({ ...formData, cedula_rif: e.target.value })}
                    className="pl-10"
                    placeholder="Ej. V-12345678"
                  />
                </div>
              </div>

              <div>
                <Label>Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className={`pl-10 ${formErrors.telefono ? 'border-red-500' : ''}`}
                    placeholder="Ej. 0412-1234567"
                  />
                </div>
                {formErrors.telefono && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.telefono}</p>
                )}
              </div>

              <div>
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`pl-10 ${formErrors.email ? 'border-red-500' : ''}`}
                    placeholder="Ej. cliente@email.com"
                  />
                </div>
                {formErrors.email && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <Label htmlFor="activo" className="mb-0">Cliente activo</Label>
              </div>

              <div className="md:col-span-2">
                <Label>Dirección</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
                  <textarea
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    rows={3}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Dirección completa del cliente..."
                  />
                </div>
              </div>

              <div className="flex gap-4 md:col-span-2 pt-4 border-t">
                <Button 
                  type="submit" 
                  className="w-32"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending 
                    ? 'Guardando...' 
                    : (editingCliente ? 'Actualizar' : 'Guardar')
                  }
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setView('list');
                    setEditingCliente(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    );
  }

  // VISTA: LISTA
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="text-gray-500">Cargando clientes...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 text-center">
          <p className="font-bold text-lg mb-2">Error al cargar clientes</p>
          <p>{error instanceof Error ? error.message : 'Error desconocido'}</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['clientes'] })} className="mt-4" variant="secondary">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 mt-1">Gestión de clientes ({clientes.length} registrados)</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingCliente(null);
            setView('form');
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Cédula/RIF</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                    No se encontraron clientes
                  </TableCell>
                </TableRow>
              ) : (
                clientes.map((cliente) => (
                  <TableRow key={cliente.id_cliente} className="hover:bg-gray-50">
                    <TableCell className="font-medium">#{cliente.id_cliente}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="font-medium">{cliente.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell>{cliente.telefono || '-'}</TableCell>
                    <TableCell>{cliente.email || '-'}</TableCell>
                    <TableCell>{cliente.cedula_rif || '-'}</TableCell>
                    <TableCell>
                      {cliente.activo ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <XCircle className="h-3 w-3" />
                          Inactivo
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleVerPerfil(cliente.id_cliente)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          title="Ver perfil"
                        >
                          <UserCircle className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(cliente)}
                          className="text-green-600 hover:text-green-800 hover:bg-green-50"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEliminar(cliente)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
      />
    </div>
  );
}
