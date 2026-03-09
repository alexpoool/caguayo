import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ventasService, clientesService, productosService } from '../services/api';
import type { Venta, VentaCreate, VentaUpdate, DetalleVentaCreate, DetalleVenta } from '../types/ventas';
import type { Productos } from '../types/index';
import { 
  Plus, Edit, Trash2, Eye, Ban, CheckCircle, 
  User, Package, AlertCircle, PlusCircle,
  MinusCircle, ShoppingCart, Search, X,
  ArrowLeft, Save, RefreshCw
} from 'lucide-react';
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

export function VentasPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'form' | 'detail'>('list');
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [editingVenta, setEditingVenta] = useState<Venta | null>(null);
  const [filterEstado, setFilterEstado] = useState<string>('');
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
  const [formData, setFormData] = useState<{
    id_cliente: number;
    fecha: string;
    observacion: string;
    detalles: DetalleVentaCreate[];
  }>({
    id_cliente: 0,
    fecha: new Date().toISOString().split('T')[0],
    observacion: '',
    detalles: []
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Search states for dropdowns
  const [clienteSearch, setClienteSearch] = useState('');
  const [productoSearch, setProductoSearch] = useState<{[key: number]: string}>({});
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const [showProductoDropdown, setShowProductoDropdown] = useState<{[key: number]: boolean}>({});

  // Queries
  const { data: ventas = [], isLoading, isError, error } = useQuery({
    queryKey: ['ventas'],
    queryFn: () => ventasService.getVentas(),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => clientesService.getClientes(),
  });

  const { data: productos = [] } = useQuery<Productos[]>({
    queryKey: ['productos-ventas'],
    queryFn: () => productosService.getProductos(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: ventasService.createVenta,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      toast.success('Venta creada correctamente');
      setView('list');
      resetForm();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al crear venta');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: VentaUpdate }) =>
      ventasService.updateVenta(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      toast.success('Venta actualizada correctamente');
      setView('list');
      setEditingVenta(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar venta');
    }
  });

  const anularMutation = useMutation({
    mutationFn: ventasService.anularVenta,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      toast.success('Venta anulada correctamente');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al anular venta');
    }
  });

  const confirmarMutation = useMutation({
    mutationFn: ventasService.confirmarVenta,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      toast.success('Venta confirmada correctamente');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al confirmar venta');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: ventasService.deleteVenta,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      toast.success('Venta eliminada correctamente');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar venta');
    }
  });

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.id_cliente || formData.id_cliente === 0) {
      errors.id_cliente = 'Debe seleccionar un cliente';
    }
    
    if (!formData.fecha) {
      errors.fecha = 'La fecha es requerida';
    }
    
    if (formData.detalles.length === 0) {
      errors.detalles = 'Debe agregar al menos un producto';
    } else {
      formData.detalles.forEach((detalle, index) => {
        if (!detalle.id_producto) {
          errors[`detalle_${index}_producto`] = 'Seleccione un producto';
        }
        if (!detalle.cantidad || detalle.cantidad <= 0) {
          errors[`detalle_${index}_cantidad`] = 'Cantidad debe ser mayor a 0';
        }
        if (!detalle.precio_unitario || detalle.precio_unitario <= 0) {
          errors[`detalle_${index}_precio`] = 'Precio debe ser mayor a 0';
        }
      });
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

    const ventaData: VentaCreate = {
      id_cliente: formData.id_cliente,
      fecha: formData.fecha,
      observacion: formData.observacion || undefined,
      detalles: formData.detalles
    };

    if (editingVenta) {
      const updateData: VentaUpdate = {
        id_cliente: formData.id_cliente,
        fecha: formData.fecha,
        observacion: formData.observacion || undefined,
      };
      updateMutation.mutate({ id: editingVenta.id_venta, data: updateData });
    } else {
      createMutation.mutate(ventaData);
    }
  };

  const handleAddDetalle = () => {
    setFormData(prev => ({
      ...prev,
      detalles: [...prev.detalles, { id_producto: 0, cantidad: 1, precio_unitario: 0 }]
    }));
  };

  const handleRemoveDetalle = (index: number) => {
    setFormData(prev => ({
      ...prev,
      detalles: prev.detalles.filter((_, i) => i !== index)
    }));
  };

  const handleDetalleChange = (index: number, field: keyof DetalleVentaCreate, value: any) => {
    setFormData(prev => {
      const newDetalles = [...prev.detalles];
      newDetalles[index] = { ...newDetalles[index], [field]: value };
      
      // Si cambia el producto, actualizar el precio
      if (field === 'id_producto') {
        const producto = productos.find(p => p.id_producto === value);
        if (producto) {
          newDetalles[index].precio_unitario = producto.precio_venta;
        }
      }
      
      return { ...prev, detalles: newDetalles };
    });
  };

  const resetForm = () => {
    setFormData({
      id_cliente: 0,
      fecha: new Date().toISOString().split('T')[0],
      observacion: '',
      detalles: []
    });
    setFormErrors({});
  };

  const handleAnular = (venta: Venta) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Anular venta?',
      message: `¿Está seguro que desea anular la venta #${venta.id_venta}? Esta acción no se puede deshacer.`,
      onConfirm: () => anularMutation.mutate(venta.id_venta),
      type: 'warning'
    });
  };

  const handleEliminar = (venta: Venta) => {
    setConfirmModal({
      isOpen: true,
      title: '¿Eliminar venta?',
      message: `¿Está seguro que desea eliminar permanentemente la venta #${venta.id_venta}? Esta acción no se puede deshacer.`,
      onConfirm: () => deleteMutation.mutate(venta.id_venta),
      type: 'danger'
    });
  };

  const calcularTotal = () => {
    return formData.detalles.reduce((sum, d) => sum + (d.cantidad * d.precio_unitario), 0);
  };

  const filteredVentas = ventas.filter(v => 
    filterEstado ? v.estado === filterEstado : true
  );

  const getEstadoBadge = (estado: string) => {
    const styles = {
      PENDIENTE: 'bg-yellow-100 text-yellow-800',
      COMPLETADA: 'bg-green-100 text-green-800',
      ANULADA: 'bg-red-100 text-red-800'
    };
    return styles[estado as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  // VISTA: DETALLE
  if (view === 'detail' && selectedVenta) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Detalle de Venta #{selectedVenta.id_venta}</h1>
            <p className="text-gray-500 mt-1">
              {new Date(selectedVenta.fecha).toLocaleDateString('es-ES', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setView('list')} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            {selectedVenta.estado === 'PENDIENTE' && (
              <Button 
                onClick={() => confirmarMutation.mutate(selectedVenta.id_venta)}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Confirmar
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Productos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Precio Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedVenta.detalles.map((detalle: DetalleVenta) => (
                    <TableRow key={detalle.id_detalle}>
                      <TableCell>{detalle.producto?.nombre || `Producto #${detalle.id_producto}`}</TableCell>
                      <TableCell className="text-right">{detalle.cantidad}</TableCell>
                      <TableCell className="text-right">
                        ${detalle.precio_unitario.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${detalle.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gray-50 font-bold">
                    <TableCell colSpan={3} className="text-right">TOTAL:</TableCell>
                    <TableCell className="text-right text-lg">
                      ${selectedVenta.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-lg">{selectedVenta.cliente?.nombre || 'Cliente no disponible'}</p>
                {selectedVenta.cliente?.telefono && (
                  <p className="text-gray-500 text-sm mt-1">{selectedVenta.cliente.telefono}</p>
                )}
                {selectedVenta.cliente?.email && (
                  <p className="text-gray-500 text-sm">{selectedVenta.cliente.email}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Información
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Estado</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoBadge(selectedVenta.estado)}`}>
                    {selectedVenta.estado}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Fecha de registro</p>
                  <p className="font-medium">{new Date(selectedVenta.fecha_registro).toLocaleString('es-ES')}</p>
                </div>
                {selectedVenta.observacion && (
                  <div>
                    <p className="text-sm text-gray-500">Observaciones</p>
                    <p className="font-medium">{selectedVenta.observacion}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // VISTA: FORMULARIO
  if (view === 'form') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {editingVenta ? 'Editar Venta' : 'Nueva Venta'}
          </h1>
          <Button variant="secondary" onClick={() => {
            setView('list');
            setEditingVenta(null);
            resetForm();
          }} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a la lista
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Información General</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              <div className="md:col-span-2">
                <Label>Cliente *</Label>
                <div className="relative mt-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      value={clienteSearch || (formData.id_cliente ? clientes.find(c => c.id_cliente === formData.id_cliente)?.nombre : '')}
                      onChange={(e) => {
                        setClienteSearch(e.target.value);
                        setShowClienteDropdown(true);
                        if (formData.id_cliente) {
                          setFormData({ ...formData, id_cliente: 0 });
                        }
                      }}
                      onFocus={() => setShowClienteDropdown(true)}
                      placeholder="Buscar cliente..."
                      className={`w-full pl-9 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                        formErrors.id_cliente ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {clienteSearch && (
                      <button
                        onClick={() => {
                          setClienteSearch('');
                          setFormData({ ...formData, id_cliente: 0 });
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {showClienteDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {clientes
                        .filter(c =>
                          !clienteSearch ||
                          c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
                          (c.cedula_rif && c.cedula_rif.toLowerCase().includes(clienteSearch.toLowerCase()))
                        )
                        .slice(0, 10)
                        .map((cliente) => (
                          <div
                            key={cliente.id_cliente}
                            onClick={() => {
                              setFormData({ ...formData, id_cliente: cliente.id_cliente });
                              setClienteSearch('');
                              setShowClienteDropdown(false);
                            }}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-0"
                          >
                            <div className="font-medium">{cliente.nombre || 'Cliente sin nombre'}</div>
                            {cliente.cedula_rif && (
                              <div className="text-xs text-gray-500">{cliente.cedula_rif}</div>
                            )}
                          </div>
                        ))}
                      {clientes.filter(c =>
                        !clienteSearch ||
                        (c.nombre || '').toLowerCase().includes(clienteSearch.toLowerCase())
                      ).length === 0 && (
                        <div className="px-3 py-2 text-gray-500 text-sm">No se encontraron clientes</div>
                      )}
                    </div>
                  )}
                </div>
                {formErrors.id_cliente && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.id_cliente}</p>
                )}
              </div>

              <div>
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className={`mt-1 ${formErrors.fecha ? 'border-red-500' : ''}`}
                />
                {formErrors.fecha && (
                  <p className="text-red-500 text-sm mt-2">{formErrors.fecha}</p>
                )}
              </div>

              <div className="md:col-span-3">
                <Label>Observaciones</Label>
                <textarea
                  value={formData.observacion}
                  onChange={(e) => setFormData({ ...formData, observacion: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                  placeholder="Notas adicionales sobre la venta..."
                />
              </div>
            </CardContent>
          </Card>

          <Card className="p-6">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Productos
              </CardTitle>
              <Button type="button" onClick={handleAddDetalle} variant="secondary" className="gap-2">
                <PlusCircle className="h-4 w-4" />
                Agregar
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              {formData.detalles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-base mb-3">No hay productos agregados</p>
                  <Button type="button" onClick={handleAddDetalle} variant="secondary">
                    Agregar Producto
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {formData.detalles.map((detalle, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-center p-3 bg-gray-50 rounded-lg">
                      <div className="col-span-5">
                        <Label className="text-xs">Producto</Label>
                        <div className="relative mt-1">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <input
                              type="text"
                              value={productoSearch[index] || (detalle.id_producto ? productos.find(p => p.id_producto === detalle.id_producto)?.nombre : '')}
                              onChange={(e) => {
                                setProductoSearch({ ...productoSearch, [index]: e.target.value });
                                setShowProductoDropdown({ ...showProductoDropdown, [index]: true });
                                if (detalle.id_producto) {
                                  handleDetalleChange(index, 'id_producto', 0);
                                }
                              }}
                              onFocus={() => setShowProductoDropdown({ ...showProductoDropdown, [index]: true })}
                              placeholder="Buscar..."
                              className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            {productoSearch[index] && (
                              <button
                                onClick={() => {
                                  setProductoSearch({ ...productoSearch, [index]: '' });
                                  handleDetalleChange(index, 'id_producto', 0);
                                }}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          {showProductoDropdown[index] && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {productos
                                .filter(p =>
                                  !productoSearch[index] ||
                                  p.nombre.toLowerCase().includes(productoSearch[index].toLowerCase())
                                )
                                .slice(0, 8)
                                .map((p) => (
                                  <div
                                    key={p.id_producto}
                                    onClick={() => {
                                      handleDetalleChange(index, 'id_producto', p.id_producto);
                                      setProductoSearch({ ...productoSearch, [index]: '' });
                                      setShowProductoDropdown({ ...showProductoDropdown, [index]: false });
                                    }}
                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-0"
                                  >
                                    <div className="font-medium text-sm truncate">{p.nombre}</div>
                                    <div className="text-xs text-gray-500">Stock: {p.stock} | ${p.precio_venta}</div>
                                  </div>
                                ))}
                              {productos.filter(p =>
                                !productoSearch[index] ||
                                p.nombre.toLowerCase().includes(productoSearch[index].toLowerCase())
                              ).length === 0 && (
                                <div className="px-3 py-2 text-gray-500 text-sm">No se encontraron productos</div>
                              )}
                            </div>
                          )}
                        </div>
                        {formErrors[`detalle_${index}_producto`] && (
                          <p className="text-xs text-red-500 mt-1">{formErrors[`detalle_${index}_producto`]}</p>
                        )}
                      </div>

                      <div className="col-span-2">
                        <Label className="text-xs">Cant.</Label>
                        <Input
                          type="number"
                          min={1}
                          value={detalle.cantidad}
                          onChange={(e) => handleDetalleChange(index, 'cantidad', parseInt(e.target.value) || 0)}
                          className={`mt-1 ${formErrors[`detalle_${index}_cantidad`] ? 'border-red-500' : ''}`}
                        />
                        {formErrors[`detalle_${index}_cantidad`] && (
                          <p className="text-xs text-red-500 mt-1">{formErrors[`detalle_${index}_cantidad`]}</p>
                        )}
                      </div>

                      <div className="col-span-2">
                        <Label className="text-xs">Precio</Label>
                        <div className="px-3 py-2 mt-1 bg-gray-100 rounded text-sm font-medium text-gray-700">
                          ${detalle.precio_unitario.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div className="col-span-2">
                        <Label className="text-xs">Subtotal</Label>
                        <div className="px-3 py-2 mt-1 bg-blue-50 rounded text-sm font-semibold text-blue-700">
                          ${(detalle.cantidad * detalle.precio_unitario).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div className="col-span-1 flex justify-end items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveDetalle(index)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <MinusCircle className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-between items-center pt-4 border-t mt-4">
                    <div className="text-gray-500 text-sm">
                      {formData.detalles.length} producto(s)
                    </div>
                    <div className="text-xl font-bold text-blue-600">
                      Total: ${calcularTotal().toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              )}
              {formErrors.detalles && (
                <p className="text-red-500 text-sm mt-4">{formErrors.detalles}</p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4 pt-4 border-t">
            <Button type="submit" className="w-32 gap-2" disabled={createMutation.isPending || updateMutation.isPending}>
              <Save className="h-4 w-4" />
              {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : (editingVenta ? 'Actualizar' : 'Guardar')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setView('list');
                setEditingVenta(null);
                resetForm();
              }}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // VISTA: LISTA
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="text-gray-500">Cargando ventas...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 text-center">
          <p className="font-bold text-lg mb-2">Error al cargar ventas</p>
          <p>{error instanceof Error ? error.message : 'Error desconocido'}</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['ventas'] })} className="mt-4 gap-2" variant="secondary">
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
          <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
          <p className="text-gray-500 mt-1">Gestión de ventas ({filteredVentas.length} registros)</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingVenta(null);
            setView('form');
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nueva Venta
        </Button>
      </div>

      <div className="flex gap-2">
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="COMPLETADA">Completada</option>
          <option value="ANULADA">Anulada</option>
        </select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVentas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                    No se encontraron ventas
                  </TableCell>
                </TableRow>
              ) : (
                filteredVentas.map((venta) => (
                  <TableRow key={venta.id_venta} className="hover:bg-gray-50">
                    <TableCell className="font-medium">#{venta.id_venta}</TableCell>
                    <TableCell>
                      {new Date(venta.fecha).toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        {venta.cliente?.nombre || `Cliente #${venta.id_cliente}`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        {venta.detalles?.length || 0} productos
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${venta.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoBadge(venta.estado)}`}>
                        {venta.estado}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedVenta(venta);
                            setView('detail');
                          }}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {venta.estado === 'PENDIENTE' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingVenta(venta);
                              setFormData({
                                id_cliente: venta.id_cliente,
                                fecha: venta.fecha.split('T')[0],
                                observacion: venta.observacion || '',
                                detalles: venta.detalles.map((d: DetalleVenta) => ({
                                  id_producto: d.id_producto,
                                  cantidad: d.cantidad,
                                  precio_unitario: d.precio_unitario
                                }))
                              });
                              setView('form');
                            }}
                            className="text-green-600 hover:text-green-800 hover:bg-green-50"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}

                        {venta.estado !== 'ANULADA' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleAnular(venta)}
                            className="text-orange-600 hover:text-orange-800 hover:bg-orange-50"
                            title="Anular"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEliminar(venta)}
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
        confirmText="Sí, confirmar"
        cancelText="Cancelar"
      />
    </div>
  );
}
