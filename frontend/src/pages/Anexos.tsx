import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { anexosService, conveniosService, dependenciasService, productosService } from '../services/api';
import { Plus, Edit, Trash2, Search, Save, ArrowLeft, Package } from 'lucide-react';
import toast from 'react-hot-toast';

interface Anexo {
  id_anexo: number;
  id_convenio: number;
  nombre_anexo: string;
  fecha: string;
  numero_anexo: string;
  id_dependencia?: number | null;
  comision?: number;
  dependencia_nombre?: string;
  id_producto?: number | null;
  convenios?: {
    id_convenio: number;
    nombre_convenio: string;
  };
}

interface AnexoProducto {
  id_producto: number;
  cantidad: number;
  precio_compra: number;
  nombre_producto?: string;
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

export function AnexosPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingAnexo, setEditingAnexo] = useState<Anexo | null>(null);
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
    id_dependencia: undefined as number | undefined,
    comision: 0,
    productos: [] as AnexoProducto[]
  });
  const [newProduct, setNewProduct] = useState({
    id_producto: 0,
    cantidad: 1,
    precio_compra: 0
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const { data: anexos = [], isLoading } = useQuery({
    queryKey: ['anexos'],
    queryFn: () => anexosService.getAnexos(),
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
    queryFn: () => productosService.getProductos(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Anexo>) => anexosService.createAnexo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anexos'] });
      toast.success('Anexo creado');
      setView('list');
      resetForm();
    },
    onError: () => toast.error('Error al crear anexo'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Anexo> }) => 
      anexosService.updateAnexo(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anexos'] });
      toast.success('Anexo actualizado');
      setView('list');
      resetForm();
    },
    onError: () => toast.error('Error al actualizar anexo'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => anexosService.deleteAnexo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anexos'] });
      toast.success('Anexo eliminado');
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    },
    onError: () => toast.error('Error al eliminar anexo'),
  });

  const resetForm = () => {
    setFormData({
      id_convenio: 0,
      nombre_anexo: '',
      fecha: '',
      numero_anexo: '',
      id_dependencia: undefined,
      comision: 0,
      productos: []
    });
    setNewProduct({ id_producto: 0, cantidad: 1, precio_compra: 0 });
    setFormErrors({});
    setEditingAnexo(null);
  };

  const addProduct = () => {
    if (!newProduct.id_producto || !newProduct.cantidad || !newProduct.precio_compra) {
      toast.error('Complete todos los campos del producto');
      return;
    }
    const producto = productos.find(p => p.id_producto === newProduct.id_producto);
    setFormData({
      ...formData,
      productos: [...formData.productos, { ...newProduct, nombre_producto: producto?.nombre }]
    });
    setNewProduct({ id_producto: 0, cantidad: 1, precio_compra: 0 });
  };

  const removeProduct = (index: number) => {
    setFormData({
      ...formData,
      productos: formData.productos.filter((_, i) => i !== index)
    });
  };

  const handleNew = () => {
    resetForm();
    setView('form');
  };

  const handleEdit = (anexo: Anexo) => {
    setEditingAnexo(anexo);
    setFormData({
      id_convenio: anexo.id_convenio,
      nombre_anexo: anexo.nombre_anexo,
      fecha: anexo.fecha,
      numero_anexo: anexo.numero_anexo,
      id_dependencia: anexo.id_dependencia ?? undefined,
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
      onConfirm: () => deleteMutation.mutate(anexo.id_anexo),
      type: 'danger'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    
    if (!formData.id_convenio) errors.id_convenio = 'Seleccione un convenio';
    if (!formData.nombre_anexo) errors.nombre_anexo = 'Ingrese el nombre';
    if (!formData.fecha) errors.fecha = 'Ingrese la fecha';
    if (!formData.numero_anexo) errors.numero_anexo = 'Ingrese el número';
    if (!formData.productos || formData.productos.length === 0) errors.productos = 'Agregue al menos un producto';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const payload = {
      ...formData,
      productos: formData.productos.map(p => ({
        id_producto: p.id_producto,
        cantidad: p.cantidad,
        precio_compra: p.precio_compra
      }))
    };

    if (editingAnexo) {
      updateMutation.mutate({ id: editingAnexo.id_anexo, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filteredAnexos = anexos.filter(a => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      a.nombre_anexo?.toLowerCase().includes(term) ||
      a.numero_anexo?.toLowerCase().includes(term) ||
      a.convenio?.nombre_convenio?.toLowerCase().includes(term)
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
            {editingAnexo ? 'Editar' : 'Nuevo'} Anexo
          </h1>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Convenio *</Label>
                <select
                  value={formData.id_convenio || ''}
                  onChange={(e) => setFormData({ ...formData, id_convenio: parseInt(e.target.value) || 0 })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  <option value="">Seleccione un convenio</option>
                  {convenios.map((c) => (
                    <option key={c.id_convenio} value={c.id_convenio}>
                      {c.nombre_convenio}
                    </option>
                  ))}
                </select>
                {formErrors.id_convenio && <p className="text-red-500 text-sm mt-1">{formErrors.id_convenio}</p>}
              </div>

              <div>
                <Label>Nombre del Anexo *</Label>
                <Input
                  value={formData.nombre_anexo}
                  onChange={(e) => setFormData({ ...formData, nombre_anexo: e.target.value })}
                  placeholder="Nombre del anexo"
                />
                {formErrors.nombre_anexo && <p className="text-red-500 text-sm mt-1">{formErrors.nombre_anexo}</p>}
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
                  <Label>Número *</Label>
                  <Input
                    value={formData.numero_anexo}
                    onChange={(e) => setFormData({ ...formData, numero_anexo: e.target.value })}
                    placeholder="Número de anexo"
                  />
                  {formErrors.numero_anexo && <p className="text-red-500 text-sm mt-1">{formErrors.numero_anexo}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Dependencia</Label>
                  <select
                    value={formData.id_dependencia ?? ''}
                    onChange={(e) => setFormData({ ...formData, id_dependencia: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full mt-1 px-3 py-2 border rounded-lg"
                  >
                    <option value="">Seleccione dependencia</option>
                    {dependencias.map((d) => (
                      <option key={d.id_dependencia} value={d.id_dependencia}>
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Comisión (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.comision}
                    onChange={(e) => setFormData({ ...formData, comision: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <Label className="flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4" />
                  Productos del Anexo *
                </Label>
                
                {formErrors.productos && (
                  <p className="text-red-500 text-sm mb-2">{formErrors.productos}</p>
                )}

                <div className="grid grid-cols-4 gap-2 mb-3">
                  <select
                    value={newProduct.id_producto || ''}
                    onChange={(e) => setNewProduct({ ...newProduct, id_producto: parseInt(e.target.value) || 0 })}
                    className="px-3 py-2 border rounded-lg"
                  >
                    <option value="">Producto</option>
                    {productos.map((p) => (
                      <option key={p.id_producto} value={p.id_producto}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min="1"
                    value={newProduct.cantidad}
                    onChange={(e) => setNewProduct({ ...newProduct, cantidad: parseInt(e.target.value) || 0 })}
                    placeholder="Cantidad"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={newProduct.precio_compra}
                    onChange={(e) => setNewProduct({ ...newProduct, precio_compra: parseFloat(e.target.value) || 0 })}
                    placeholder="Precio compra"
                  />
                  <Button type="button" onClick={addProduct} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {formData.productos.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Precio Compra</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formData.productos.map((prod, index) => (
                          <TableRow key={index}>
                            <TableCell>{prod.nombre_producto || `Producto ${prod.id_producto}`}</TableCell>
                            <TableCell>{prod.cantidad}</TableCell>
                            <TableCell>{prod.precio_compra}</TableCell>
                            <TableCell>
                              <button
                                type="button"
                                onClick={() => removeProduct(index)}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  {editingAnexo ? 'Actualizar' : 'Crear'}
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
          <h1 className="text-2xl font-bold text-gray-900">Anexos</h1>
          <p className="text-gray-500 mt-1">Gestión de anexos ({filteredAnexos.length} registrados)</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Anexo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar anexos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-gray-500">Cargando...</p>
          ) : filteredAnexos.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No hay anexos registrados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Convenio</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Comisión</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnexos.map((anexo) => (
                  <TableRow key={anexo.id_anexo}>
                    <TableCell>{anexo.convenio?.nombre_convenio || 'Sin convenio'}</TableCell>
                    <TableCell className="font-medium">{anexo.nombre_anexo}</TableCell>
                    <TableCell>{anexo.numero_anexo}</TableCell>
                    <TableCell>{anexo.fecha}</TableCell>
                    <TableCell>{anexo.comision ? `${anexo.comision}%` : '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(anexo)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(anexo)}
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
