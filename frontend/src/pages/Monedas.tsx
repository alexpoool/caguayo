import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { monedaService } from '../services/api';
import type { Moneda, MonedaCreate, MonedaUpdate } from '../types/moneda';
import { Plus, Edit, Trash2, Coins, CircleDollarSign, Save, X, ArrowLeft, RefreshCw, Type, Text, Sparkles, AlertCircle, Wallet } from 'lucide-react';
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
      <div className="space-y-6 animate-fade-in-up">
        {/* Header con icono animado */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl shadow-lg animate-bounce-subtle">
              <Coins className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {editingMoneda ? 'Editar Moneda' : 'Nueva Moneda'}
              </h1>
              <p className="text-sm text-gray-500">
                {editingMoneda ? 'Actualice la información de la moneda' : 'Complete los datos para crear una nueva moneda'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-yellow-500 animate-pulse" />
            <Button 
              variant="secondary" 
              onClick={() => {
                setView('list');
                setEditingMoneda(null);
                resetForm();
              }} 
              className="gap-2 hover:scale-105 transition-transform"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a la lista
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="border-b bg-gradient-to-r from-yellow-50 to-amber-50">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg">
                  <CircleDollarSign className="h-5 w-5 text-white" />
                </div>
                Información de la Moneda
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <div className="md:col-span-2 space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <Type className="h-5 w-5 text-blue-500" />
                  Nombre *
                </Label>
                <Input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className={`mt-1 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.nombre ? 'border-red-500' : ''}`}
                  placeholder="Ej. Dólar"
                />
                {formErrors.nombre && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.nombre}</p>
                )}
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <Text className="h-5 w-5 text-green-500" />
                  Denominación *
                </Label>
                <Input
                  type="text"
                  value={formData.denominacion}
                  onChange={(e) => setFormData({ ...formData, denominacion: e.target.value })}
                  className={`mt-1 transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 ${formErrors.denominacion ? 'border-red-500' : ''}`}
                  placeholder="Ej. Dólar estadounidense"
                />
                {formErrors.denominacion && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.denominacion}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-gray-700">
                  <Wallet className="h-5 w-5 text-purple-500" />
                  Símbolo *
                </Label>
                <Input
                  type="text"
                  value={formData.simbolo}
                  onChange={(e) => setFormData({ ...formData, simbolo: e.target.value })}
                  className={`mt-1 transition-all duration-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${formErrors.simbolo ? 'border-red-500' : ''}`}
                  placeholder="Ej. $"
                  maxLength={5}
                />
                {formErrors.simbolo && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.simbolo}</p>
                )}
              </div>

              <div className="flex items-end">
                <p className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                  Ejemplos: $ (Dólar), € (Euro), Bs (Bolívar)
                </p>
              </div>

              <div className="flex gap-4 md:col-span-2 pt-4 border-t">
                <Button 
                  type="submit" 
                  className="gap-2 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
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
                  className="gap-2 hover:bg-gray-200 transition-colors"
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
        <div className="p-4 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-full animate-pulse">
          <Coins className="h-12 w-12 text-yellow-600 animate-spin" />
        </div>
        <div className="text-gray-600 font-medium">Cargando monedas...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center bg-red-50 border border-red-200 rounded-xl p-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="font-bold text-lg mb-2 text-red-700">Error al cargar monedas</p>
          <p className="text-red-600 mb-4">{error instanceof Error ? error.message : 'Error desconocido'}</p>
          <Button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['monedas'] })} 
            className="gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header con icono animado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl shadow-lg animate-bounce-subtle">
            <Coins className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Monedas</h1>
            <p className="text-gray-500 mt-1">Gestión de monedas del sistema</p>
          </div>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingMoneda(null);
            setView('form');
          }}
          className="gap-2 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          Nueva Moneda
        </Button>
      </div>

      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gradient-to-r from-yellow-50 to-amber-50">
              <TableRow>
                <TableHead className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-yellow-600" />
                  ID
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4 text-blue-500" />
                    Nombre
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <Text className="h-4 w-4 text-green-500" />
                    Denominación
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <CircleDollarSign className="h-4 w-4 text-purple-500" />
                    Símbolo
                  </div>
                </TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monedas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <div className="p-4 bg-gray-100 rounded-full mb-4">
                        <Coins className="h-12 w-12 text-gray-300" />
                      </div>
                      <p className="text-lg font-medium mb-2">No se encontraron monedas</p>
                      <p className="text-sm mb-4">Comience creando una nueva moneda</p>
                      <Button 
                        onClick={() => setView('form')} 
                        className="gap-2 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white"
                      >
                        <Plus className="h-4 w-4" />
                        Crear Moneda
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                monedas.map((moneda) => (
                  <TableRow key={moneda.id_moneda} className="hover:bg-gray-50 transition-colors">
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm font-medium">
                        <Wallet className="h-3 w-3" />
                        #{moneda.id_moneda}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold">{moneda.nombre}</TableCell>
                    <TableCell>{moneda.denominacion}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-bold">
                        <CircleDollarSign className="h-3 w-3" />
                        {moneda.simbolo}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(moneda)}
                          className="text-blue-600 hover:bg-blue-50 hover:scale-110 transition-all"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEliminar(moneda)}
                          className="text-red-600 hover:bg-red-50 hover:scale-110 transition-all"
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
      />
    </div>
  );
}
