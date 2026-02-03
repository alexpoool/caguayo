import React, { useState, useEffect } from 'react';
import { productosService } from '../services/api';
import type { Productos, ProductosCreate } from '../types';
import { Plus, Edit, Trash2, Search, Package } from 'lucide-react';

export function ProductosPage() {
  const [productos, setProductos] = useState<Productos[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    loadProductos();
  }, []);

  const loadProductos = async () => {
    try {
      setLoading(true);
      const data = await productosService.getProductos();
      setProductos(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadProductos();
      return;
    }

    try {
      setLoading(true);
      const data = await productosService.searchProductos(searchTerm);
      setProductos(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await productosService.updateProducto(editingProduct.id_producto, formData);
      } else {
        await productosService.createProducto(formData);
      }
      await loadProductos();
      setShowForm(false);
      setEditingProduct(null);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar producto');
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

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    
    try {
      await productosService.deleteProducto(id);
      await loadProductos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar producto');
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando productos...</div>
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
        <button
          onClick={() => {
            resetForm();
            setEditingProduct(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </button>
      </div>

      {/* Buscador */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleSearch}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
        >
          Buscar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID Subcategoría
              </label>
              <input
                type="number"
                required
                value={formData.id_subcategoria}
                onChange={(e) => setFormData({ ...formData, id_subcategoria: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio Compra
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.precio_compra}
                onChange={(e) => setFormData({ ...formData, precio_compra: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio Venta
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.precio_venta}
                onChange={(e) => setFormData({ ...formData, precio_venta: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio Mínimo
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.precio_minimo}
                onChange={(e) => setFormData({ ...formData, precio_minimo: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2 md:col-span-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                {editingProduct ? 'Actualizar' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de productos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-4 font-medium text-gray-900">Nombre</th>
                <th className="text-left p-4 font-medium text-gray-900">Precio Venta</th>
                <th className="text-left p-4 font-medium text-gray-900">Precio Mínimo</th>
                <th className="text-left p-4 font-medium text-gray-900">Subcategoría</th>
                <th className="text-left p-4 font-medium text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((producto) => (
                <tr key={producto.id_producto} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{producto.nombre}</span>
                    </div>
                    {producto.descripcion && (
                      <p className="text-sm text-gray-500 mt-1">{producto.descripcion}</p>
                    )}
                  </td>
                  <td className="p-4 text-gray-900">
                    ${producto.precio_venta.toLocaleString()}
                  </td>
                  <td className="p-4 text-gray-900">
                    ${producto.precio_minimo.toLocaleString()}
                  </td>
                  <td className="p-4 text-gray-600">
                    {producto.subcategoria?.nombre || `ID: ${producto.id_subcategoria}`}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(producto)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(producto.id_producto)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}