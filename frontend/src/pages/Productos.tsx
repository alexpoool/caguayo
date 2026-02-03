import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productosService } from '../services/api';
import type { Productos, ProductosCreate } from '../types';
import { Plus, Edit, Trash2, Search, Package } from 'lucide-react';
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
  TableCell
} from '../components/ui';

export function ProductosPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'form'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<Productos | null>(null);
  const [formData, setFormData] = useState<ProductosCreate>({
    id_subcategoria: 1,
    nombre: '',
    descripcion: '',
    moneda_compra: 1,
    precio_compra: 0,
    moneda_venta: 1,
    precio_venta: 0,
    precio_minimo: 0
  });

  // Query para obtener productos
  const { 
    data: productos = [], 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['productos', searchTerm],
    queryFn: () => searchTerm.trim() 
      ? productosService.searchProductos(searchTerm)
      : productosService.getProductos(),
    keepPreviousData: true,
  });

  // Mutación para crear producto
  const createMutation = useMutation({
    mutationFn: productosService.createProducto,
    onSuccess: () => {
      queryClient.invalidateQueries(['productos']);
      toast.success('Producto creado correctamente');
      setView('list');
      resetForm();
    },
    onError: (error) => {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Error al crear producto');
    }
  });

  // Mutación para actualizar producto
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductosCreate }) => 
      productosService.updateProducto(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['productos']);
      toast.success('Producto actualizado correctamente');
      setView('list');
      setEditingProduct(null);
      resetForm();
    },
    onError: (error) => {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar producto');
    }
  });

  // Mutación para eliminar producto
  const deleteMutation = useMutation({
    mutationFn: productosService.deleteProducto,
    onSuccess: () => {
      queryClient.invalidateQueries(['productos']);
      toast.success('Producto eliminado correctamente');
    },
    onError: (error) => {
      // El mensaje de error ya viene formateado desde la API (productos.py)
      const message = (error as any)?.response?.data?.detail || error.message || 'Error al eliminar producto';
      toast.error(message);
    }
  });

  const handleSearch = () => {
    queryClient.invalidateQueries(['productos']);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id_producto, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (product: Productos) => {
    setEditingProduct(product);
    setFormData({
      id_subcategoria: product.id_subcategoria,
      nombre: product.nombre,
      descripcion: product.descripcion || '',
      moneda_compra: product.moneda_compra,
      precio_compra: product.precio_compra,
      moneda_venta: product.moneda_venta,
      precio_venta: product.precio_venta,
      precio_minimo: product.precio_minimo
    });
    setView('form');
  };

  const handleDelete = (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    deleteMutation.mutate(id);
  };

  const resetForm = () => {
    setFormData({
      id_subcategoria: 1,
      nombre: '',
      descripcion: '',
      moneda_compra: 1,
      precio_compra: 0,
      moneda_venta: 1,
      precio_venta: 0,
      precio_minimo: 0
    });
  };

  // VISTA: FORMULARIO (Crear / Editar)
  if (view === 'form') {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</CardTitle>
          <Button
            variant="ghost"
            onClick={() => {
               setView('list');
               setEditingProduct(null);
               resetForm();
            }}
          >
            Volver a la lista
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label>Nombre del Producto</Label>
              <Input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej. iPhone 15 Pro"
              />
            </div>
            
            <div>
              <Label>Subcategoría (ID)</Label>
              <Input
                type="number"
                required
                value={formData.id_subcategoria}
                onChange={(e) => setFormData({ ...formData, id_subcategoria: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-gray-500 mt-1">1: Smartphones, 2: Laptops, etc.</p>
            </div>

            <div>
              <Label>Precio Compra</Label>
              <Input
                type="number"
                step="0.01"
                required
                value={formData.precio_compra}
                onChange={(e) => setFormData({ ...formData, precio_compra: parseFloat(e.target.value) || 0 })}
              />
            </div>
            
            <div>
              <Label>Precio Venta</Label>
              <Input
                type="number"
                step="0.01"
                required
                value={formData.precio_venta}
                onChange={(e) => setFormData({ ...formData, precio_venta: parseFloat(e.target.value) || 0 })}
              />
            </div>
            
            <div>
              <Label>Precio Mínimo</Label>
              <Input
                type="number"
                step="0.01"
                required
                value={formData.precio_minimo}
                onChange={(e) => setFormData({ ...formData, precio_minimo: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="md:col-span-2">
              <Label>Descripción</Label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Detalles adicionales del producto..."
              />
            </div>

            <div className="flex gap-4 md:col-span-2 mt-4 pt-4 border-t">
              <Button type="submit" className="w-32">
                {editingProduct ? 'Actualizar' : 'Guardar'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                   setView('list');
                   setEditingProduct(null);
                   resetForm();
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  // VISTA: LISTA (Tabla, Buscador, Loading)
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="text-gray-500">Cargando productos...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500 text-center">
          <p className="font-bold text-lg mb-2">Error al cargar productos</p>
          <p>{error instanceof Error ? error.message : 'Error desconocido'}</p>
          <Button onClick={() => queryClient.invalidateQueries(['productos'])} className="mt-4" variant="secondary">Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-500 mt-1">Gestión de inventario ({productos.length} items)</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingProduct(null);
            setView('form');
          }}
          className="gap-2 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Card className="overflow-hidden shadow-sm border-gray-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="w-[40%]">Nombre</TableHead>
                <TableHead>Precio Venta</TableHead>
                <TableHead>Precio Mínimo</TableHead>
                <TableHead>Subcategoría</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productos.length === 0 ? (
                <TableRow>
                   <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                      No se encontraron productos probando.
                   </TableCell>
                </TableRow>
              ) : (
                productos.map((producto) => (
                  <TableRow key={producto.id_producto} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                           <Package className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-medium text-gray-900 block">{producto.nombre}</span>
                          {producto.descripcion && (
                            <span className="text-xs text-gray-500 truncate max-w-[200px] block">{producto.descripcion}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      ${producto.precio_venta.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      ${producto.precio_minimo.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {producto.subcategoria?.nombre || `ID: ${producto.id_subcategoria}`}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(producto)}
                          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(producto.id_producto)}
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
    </div>
  );
}