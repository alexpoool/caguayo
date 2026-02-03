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
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
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
    // Mantener los datos anteriores mientras se carga la nueva búsqueda
    keepPreviousData: true,
  });

  // Mutación para crear producto
  const createMutation = useMutation({
    mutationFn: productosService.createProducto,
    onSuccess: () => {
      queryClient.invalidateQueries(['productos']);
      toast.success('Producto creado correctamente');
      setShowForm(false);
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
      setShowForm(false);
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
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar producto');
    }
  });

  const handleSearch = () => {
    // La búsqueda se maneja automáticamente por el queryKey
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
    setShowForm(true);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando productos...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">
          Error al cargar productos: {error instanceof Error ? error.message : 'Error desconocido'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-600">Gestión de productos del inventario</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingProduct(null);
            setShowForm(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      {/* Buscador */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nombre</Label>
                <Input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                />
              </div>
              <div>
                <Label>ID Subcategoría</Label>
                <Input
                  type="number"
                  required
                  value={formData.id_subcategoria}
                  onChange={(e) => setFormData({ ...formData, id_subcategoria: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Precio Compra</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={formData.precio_compra}
                  onChange={(e) => setFormData({ ...formData, precio_compra: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Precio Venta</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={formData.precio_venta}
                  onChange={(e) => setFormData({ ...formData, precio_venta: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Precio Mínimo</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={formData.precio_minimo}
                  onChange={(e) => setFormData({ ...formData, precio_minimo: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2 md:col-span-2 mt-4">
                <Button type="submit">
                  {editingProduct ? 'Actualizar' : 'Guardar'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de productos */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Precio Venta</TableHead>
              <TableHead>Precio Mínimo</TableHead>
              <TableHead>Subcategoría</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.map((producto) => (
              <TableRow key={producto.id_producto}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{producto.nombre}</span>
                  </div>
                  {producto.descripcion && (
                    <p className="text-sm text-gray-500 mt-1">{producto.descripcion}</p>
                  )}
                </TableCell>
                <TableCell className="text-gray-900">
                  ${producto.precio_venta.toLocaleString()}
                </TableCell>
                <TableCell className="text-gray-900">
                  ${producto.precio_minimo.toLocaleString()}
                </TableCell>
                <TableCell className="text-gray-600">
                  {producto.subcategoria?.nombre || `ID: ${producto.id_subcategoria}`}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(producto)}
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(producto.id_producto)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}