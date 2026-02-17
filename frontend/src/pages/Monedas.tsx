import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { monedaService } from '../services/api';
import type { Moneda, MonedaCreate, MonedaUpdate } from '../types/moneda';
import { Plus, Edit, Trash2, Coins, Save, X, ArrowLeft, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
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

export function MonedasPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingMoneda, setEditingMoneda] = useState<Moneda | null>(null);
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
  const [formData, setFormData] = useState<MonedaCreate>({
    nombre: '',
    denominacion: '',
    simbolo: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Queries
  const { data: monedas = [], isLoading, isError, error } = useQuery({
    queryKey: ['monedas'],
    queryFn: () => monedaService.getMonedas(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: monedaService.createMoneda,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monedas'] });
      toast.success('Moneda creada correctamente');
      setView('list');
      resetForm();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al crear moneda');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: MonedaUpdate }) => 
      monedaService.updateMoneda(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monedas'] });
      toast.success('Moneda actualizada correctamente');
      setView('list');
      setEditingMoneda(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar moneda');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: monedaService.deleteMoneda,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monedas'] });
      toast.success('Moneda eliminada correctamente');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar moneda');
    }
  });

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.nombre || formData.nombre.trim().length < 1) {
      errors.nombre = 'El nombre es requerido';
    } else if (formData.nombre.length > 50) {
      errors.nombre = 'El nombre no puede exceder 50 caracteres';
    }
    
    if (!formData.denominacion || formData.denominacion.trim().length < 1) {
      errors.denominacion = 'La denominación es requerida';
    } else if (formData.denominacion.length > 100) {
      errors.denominacion = 'La denominación no puede exceder 100 caracteres';
    }
    
    if (!formData.simbolo || formData.simbolo.trim().length < 1) {
      errors.simbolo = 'El símbolo es requerido';
    } else if (formData.simbolo.length > 5) {
      errors.simbolo = 'El símbolo no puede exceder 5 caracteres';
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
      denominacion: formData.denominacion.trim(),
      simbolo: formData.simbolo.trim(),
    };

    if (editingMoneda) {
      updateMutation.mutate({ id: editingMoneda.id_moneda, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      denominacion: '',
      simbolo: ''
    });
    setFormErrors({});
  };

  const handleEdit = (moneda: Moneda) => {
    setEditingMoneda(moneda);
    setFormData({
      nombre: moneda.nombre,
      denominacion: moneda.denominacion,
      simbolo: moneda.simbolo
    });
    setView('form');
  };

  const handleEliminar = (moneda: Moneda) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar moneda?',
      message: `¿Está seguro que desea eliminar la moneda "${moneda.nombre}" (${moneda.simbolo})? Esta acción no se puede deshacer.`,
      onConfirm: () => deleteMutation.mutate(moneda.id_moneda),
      type: 'danger'
    });
  };

  // VISTA: FORMULARIO
  if (view === 'form') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {editingMoneda ? 'Editar Moneda' : 'Nueva Moneda'}
          </h1>
          <Button variant="secondary" onClick={() => {
            setView('list');
            setEditingMoneda(null);
            resetForm();
          }} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a la lista
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Información de la Moneda
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Label>Nombre *</Label>
                <Input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className={`mt-1 ${formErrors.nombre ? 'border-red-500' : ''}`}
                  placeholder="Ej. Dólar"
                />
                {formErrors.nombre && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.nombre}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label>Denominación *</Label>
                <Input
                  type="text"
                  value={formData.denominacion}
                  onChange={(e) => setFormData({ ...formData, denominacion: e.target.value })}
                  className={`mt-1 ${formErrors.denominacion ? 'border-red-500' : ''}`}
                  placeholder="Ej. Dólar estadounidense"
                />
                {formErrors.denominacion && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.denominacion}</p>
                )}
              </div>

              <div>
                <Label>Símbolo *</Label>
                <Input
                  type="text"
                  value={formData.simbolo}
                  onChange={(e) => setFormData({ ...formData, simbolo: e.target.value })}
                  className={`mt-1 ${formErrors.simbolo ? 'border-red-500' : ''}`}
                  placeholder="Ej. $"
                  maxLength={5}
                />
                {formErrors.simbolo && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.simbolo}</p>
                )}
              </div>

              <div className="flex items-end">
                <p className="text-sm text-gray-500">
                  Ejemplos: $ (Dólar), € (Euro), Bs (Bolívar)
                </p>
              </div>

              <div className="flex gap-4 md:col-span-2 pt-4 border-t">
                <Button 
                  type="submit" 
                  className="w-32 gap-2"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <Save className="h-4 w-4" />
                  {createMutation.isPending || updateMutation.isPending 
                    ? 'Guardando...' 
                    : (editingMoneda ? 'Actualizar' : 'Guardar')
                  }
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setView('list');
                    setEditingMoneda(null);
                    resetForm();
                  }}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
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
        <div className="text-gray-500">Cargando monedas...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 text-center">
          <p className="font-bold text-lg mb-2">Error al cargar monedas</p>
          <p>{error instanceof Error ? error.message : 'Error desconocido'}</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['monedas'] })} className="mt-4 gap-2" variant="secondary">
            <RefreshCw className="h-4 w-4" />
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
          <h1 className="text-2xl font-bold text-gray-900">Monedas</h1>
          <p className="text-gray-500 mt-1">Gestión de monedas ({monedas.length} registradas)</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingMoneda(null);
            setView('form');
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nueva Moneda
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Denominación</TableHead>
                <TableHead>Símbolo</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monedas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                    <Coins className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="mb-2">No se encontraron monedas</p>
                    <Button 
                      onClick={() => setView('form')} 
                      variant="secondary"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar primera moneda
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                monedas.map((moneda) => (
                  <TableRow key={moneda.id_moneda} className="hover:bg-gray-50">
                    <TableCell className="font-medium">#{moneda.id_moneda}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                          <Coins className="h-4 w-4 text-yellow-600" />
                        </div>
                        <span className="font-medium">{moneda.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell>{moneda.denominacion}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                        {moneda.simbolo}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(moneda)}
                          className="text-green-600 hover:text-green-800 hover:bg-green-50"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEliminar(moneda)}
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
