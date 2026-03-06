import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { anexosService, conveniosService, dependenciasService, productosService } from '../../services/api';
import type { Productos } from '../../types/index';
import { Boxes, Plus, Edit, Trash2, Search, ArrowLeft, Save, Loader2, Package, X } from 'lucide-react';
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

interface Anexo {
  id_anexo: number;
  id_convenio: number;
  nombre_anexo: string;
  codigo?: string;
  fecha: string;
  numero_anexo: string;
  id_dependencia?: number | null;
  id_moneda?: number | null;
  comision?: number;
  dependencia_nombre?: string;
  moneda_nombre?: string;
  conveniencia?: {
    id_convenio: number;
    nombre_convenio: string;
    codigo?: string;
    cliente?: {
      nombre: string;
    };
  };
}

interface AnexoProducto {
  id_producto: number;
  cantidad: number;
  precio_compra: number;
  nombre_producto?: string;
}

export function CompraAnexosPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingAnexo, setEditingAnexo] = useState<Anexo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [convenioFilter, setConvenioFilter] = useState<number | null>(null);
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
    id_convenio: 0,
    nombre_anexo: '',
    fecha: '',
    numero_anexo: '',
    id_dependencia: 1 as number | undefined,
    id_moneda: 1 as number | undefined,
    comision: 0,
    productos: [] as AnexoProducto[]
  });

  const [newProduct, setNewProduct] = useState({
    id_producto: 0,
    cantidad: 1,
    precio_compra: 0
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: anexos = [], isLoading } = useQuery({
    queryKey: ['anexos', searchTerm, convenioFilter],
    queryFn: () => anexosService.getAnexos(convenioFilter || undefined, searchTerm),
  });

  const { data: convenios = [] } = useQuery({
    queryKey: ['convenios'],
    queryFn: () => conveniosService.getConvenios(),
  });

  const { data: dependencias = [] } = useQuery({
    queryKey: ['dependencias'],
    queryFn: () => dependenciasService.getDependencias(),
  });

  const { data: productos = [] } = useQuery({
    queryKey: ['productos'],
    queryFn: () => productosService.getProductos(0, 500),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => anexosService.createAnexo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anexos'] });
      toast.success('Anexo creado correctamente');
      setView('list');
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Error al crear anexo');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => anexosService.updateAnexo(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anexos'] });
      toast.success('Anexo actualizado correctamente');
      setView('list');
      setEditingAnexo(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Error al actualizar anexo');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => anexosService.deleteAnexo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anexos'] });
      toast.success('Anexo eliminado correctamente');
      setConfirmModal({ ...confirmModal, isOpen: false });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Error al eliminar anexo');
    }
  });

  const resetForm = () => {
    setFormData({
      id_convenio: 0,
      nombre_anexo: '',
      fecha: '',
      numero_anexo: '',
      id_dependencia: 1,
      id_moneda: 1,
      comision: 0,
      productos: []
    });
    setNewProduct({ id_producto: 0, cantidad: 1, precio_compra: 0 });
    setFormErrors({});
  };

  const addProduct = () => {
    if (!newProduct.id_producto || !newProduct.cantidad || newProduct.precio_compra <= 0) {
      toast.error('Seleccione un producto, cantidad y precio de compra');
      return;
    }
    
    const producto = productos.find((p: Productos) => p.id_producto === newProduct.id_producto);
    
    setFormData({
      ...formData,
      productos: [
        ...formData.productos,
        {
          ...newProduct,
          nombre_producto: producto?.nombre
        }
      ]
    });
    setNewProduct({ id_producto: 0, cantidad: 1, precio_compra: 0 });
  };

  const removeProduct = (index: number) => {
    setFormData({
      ...formData,
      productos: formData.productos.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    
    if (!formData.id_convenio) errors.id_convenio = 'El convenio es requerido';
    if (!formData.nombre_anexo.trim()) errors.nombre_anexo = 'El nombre es requerido';
    if (!formData.fecha) errors.fecha = 'La fecha es requerida';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const data = {
      ...formData,
      productos: formData.productos.map(p => ({
        id_producto: p.id_producto,
        cantidad: p.cantidad,
        precio_compra: p.precio_compra
      }))
    };

    if (editingAnexo) {
      updateMutation.mutate({ id: editingAnexo.id_anexo, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (anexo: Anexo) => {
    setEditingAnexo(anexo);
    setFormData({
      id_convenio: anexo.id_convenio,
      nombre_anexo: anexo.nombre_anexo,
      fecha: anexo.fecha,
      numero_anexo: anexo.numero_anexo,
      id_dependencia: anexo.id_dependencia || 1,
      id_moneda: anexo.id_moneda || 1,
      comision: anexo.comision || 0,
      productos: []
    });
    setView('form');
  };

  const handleDelete = (anexo: Anexo) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Anexo',
      message: `¿Está seguro de eliminar el anexo "${anexo.nombre_anexo}"?`,
      type: 'danger',
      onConfirm: () => deleteMutation.mutate(anexo.id_anexo)
    });
  };

  const getConvenioNombre = (id: number) => {
    const conv = convenios.find((c: any) => c.id_convenio === id);
    return conv ? conv.nombre_convenio : `Convenio ${id}`;
  };

  const isFormLoading = createMutation.isPending || updateMutation.isPending;

  if (view === 'form') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button 
            onClick={() => { setView('list'); setEditingAnexo(null); resetForm(); }} 
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold">
            {editingAnexo ? 'Editar Anexo' : 'Nuevo Anexo'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="id_convenio">Convenio *</Label>
              <select
                id="id_convenio"
                value={formData.id_convenio}
                onChange={(e) => setFormData({ ...formData, id_convenio: parseInt(e.target.value) || 0 })}
                className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>Seleccionar convenio...</option>
                {convenios.map((conv: any) => (
                  <option key={conv.id_convenio} value={conv.id_convenio}>
                    {conv.nombre_convenio} ({conv.codigo})
                  </option>
                ))}
              </select>
              {formErrors.id_convenio && <p className="text-red-500 text-sm mt-1">{formErrors.id_convenio}</p>}
            </div>

            <div>
              <Label htmlFor="nombre_anexo">Nombre del Anexo *</Label>
              <Input
                id="nombre_anexo"
                value={formData.nombre_anexo}
                onChange={(e) => setFormData({ ...formData, nombre_anexo: e.target.value })}
                placeholder="Ej: Anexo de Suministros"
              />
              {formErrors.nombre_anexo && <p className="text-red-500 text-sm mt-1">{formErrors.nombre_anexo}</p>}
            </div>

            <div>
              <Label htmlFor="numero_anexo">Número de Anexo</Label>
              <Input
                id="numero_anexo"
                value={formData.numero_anexo}
                onChange={(e) => setFormData({ ...formData, numero_anexo: e.target.value })}
                placeholder="Ej: 001"
              />
            </div>

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
              <Label htmlFor="id_dependencia">Dependencia</Label>
              <select
                id="id_dependencia"
                value={formData.id_dependencia}
                onChange={(e) => setFormData({ ...formData, id_dependencia: parseInt(e.target.value) || undefined })}
                className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {dependencias.map((dep: any) => (
                  <option key={dep.id_dependencia} value={dep.id_dependencia}>
                    {dep.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="comision">Comisión (%)</Label>
              <Input
                id="comision"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.comision}
                onChange={(e) => setFormData({ ...formData, comision: parseFloat(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
          </div>

          {!editingAnexo && (
            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Productos del Anexo
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <Label>Producto</Label>
                    <select
                      value={newProduct.id_producto}
                      onChange={(e) => setNewProduct({ ...newProduct, id_producto: parseInt(e.target.value) || 0 })}
                      className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={0}>Seleccionar...</option>
                      {productos.map((prod: Productos) => (
                        <option key={prod.id_producto} value={prod.id_producto}>
                          {prod.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Cantidad</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newProduct.cantidad}
                      onChange={(e) => setNewProduct({ ...newProduct, cantidad: parseInt(e.target.value) || 1 })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Precio Compra</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newProduct.precio_compra}
                      onChange={(e) => setNewProduct({ ...newProduct, precio_compra: parseFloat(e.target.value) || 0 })}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" onClick={addProduct} className="w-full gap-2">
                      <Plus className="h-4 w-4" />
                      Agregar
                    </Button>
                  </div>
                </div>
              </div>

              {formData.productos.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Precio Compra</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.productos.map((prod, index) => (
                        <TableRow key={index}>
                          <TableCell>{prod.nombre_producto || `Producto ${prod.id_producto}`}</TableCell>
                          <TableCell>{prod.cantidad}</TableCell>
                          <TableCell>${prod.precio_compra.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => removeProduct(index)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isFormLoading} className="gap-2">
              {isFormLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingAnexo ? 'Actualizar' : 'Guardar'}
            </Button>
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => { setView('list'); setEditingAnexo(null); resetForm(); }}
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
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Boxes className="w-6 h-6" />
            </div>
            Anexos
          </h1>
          <p className="text-gray-500 mt-1">
            {anexos.length === 0 ? 'Gestión de anexos vinculados a convenios' : `${anexos.length} anexos registrados`}
          </p>
        </div>
        <Button onClick={() => { resetForm(); setEditingAnexo(null); setView('form'); }} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Nuevo Anexo
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Buscar anexos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={convenioFilter || ''}
          onChange={(e) => setConvenioFilter(e.target.value ? parseInt(e.target.value) : null)}
          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los convenios</option>
          {convenios.map((conv: any) => (
            <option key={conv.id_convenio} value={conv.id_convenio}>
              {conv.nombre_convenio}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-500">Cargando anexos...</p>
        </div>
      ) : (
        <Card className="overflow-hidden shadow-sm border-gray-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Convenio</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Dependencia</TableHead>
                  <TableHead>Comisión</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {anexos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                      {searchTerm || convenioFilter ? 'No se encontraron anexos' : 'No hay anexos registrados'}
                    </TableCell>
                  </TableRow>
                ) : (
                  anexos.map((anexo: Anexo) => (
                    <TableRow key={anexo.id_anexo} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="font-medium text-gray-900">
                        {anexo.codigo || `ID: ${anexo.id_anexo}`}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                            <Boxes className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-gray-900">{anexo.nombre_anexo}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getConvenioNombre(anexo.id_convenio)}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {anexo.fecha ? new Date(anexo.fecha).toLocaleDateString('es-ES') : '-'}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {anexo.dependencia_nombre || '-'}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {anexo.comision ? `${anexo.comision}%` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(anexo)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(anexo)}
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
