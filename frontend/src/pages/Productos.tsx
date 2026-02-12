import React, { useState } from 'react';
import type { Productos, ProductosCreate } from '../types';
import { useProductos } from '../hooks/useProductos';
import { ProductForm } from '../components/productos/ProductForm';
import { ProductListView } from '../components/productos/ProductListView';

export function ProductosPage() {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<Productos | null>(null);

  const {
    productos,
    isLoading,
    isError,
    createProduct,
    updateProduct,
    deleteProduct,
    refresh
  } = useProductos(searchTerm);

  const handleCreate = (data: ProductosCreate) => {
    createProduct(data, {
      onSuccess: () => {
        setView('list');
      }
    }); // Note: This runs alongside the hook's onSuccess
  };

  const handleUpdate = (data: ProductosCreate) => {
    if (editingProduct) {
      updateProduct({ id: editingProduct.id_producto, data }, {
        onSuccess: () => {
          setView('list');
          setEditingProduct(null);
        }
      });
    }
  };

  const handleEdit = (product: Productos) => {
    setEditingProduct(product);
    setView('form');
  };

  const handleDelete = (id: number) => {
      deleteProduct(id);
  };

  const handleCancel = () => {
    setView('list');
    setEditingProduct(null);
  };

  if (view === 'form') {
    return (
      <ProductForm
        initialData={editingProduct}
        onSubmit={editingProduct ? handleUpdate : handleCreate}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <ProductListView
      productos={productos}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onCreateNew={() => {
        setEditingProduct(null);
        setView('form');
      }}
      isLoading={isLoading}
      isError={isError}
      onRetry={refresh}
    />
  );
}