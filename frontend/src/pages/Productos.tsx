import { useState, useMemo } from 'react';
import type { Productos, ProductosCreate } from '../types/index';
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
  } = useProductos();

  // Filtrar productos localmente
  const filteredProductos = useMemo(() => {
    console.log('Filtrando localmente:', searchTerm);
    if (!searchTerm.trim()) return productos;
    
    const term = searchTerm.toLowerCase();
    const filtered = productos.filter(producto => 
      producto.nombre.toLowerCase().includes(term) ||
      (producto.descripcion?.toLowerCase() || '').includes(term) ||
      (producto.subcategoria?.nombre?.toLowerCase() || '').includes(term)
    );
    console.log('Productos filtrados:', filtered.length);
    return filtered;
  }, [productos, searchTerm]);

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
      productos={filteredProductos}
      totalProductos={productos.length}
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