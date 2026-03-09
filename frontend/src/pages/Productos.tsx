import { useState, useEffect, useRef } from 'react';
import type { Productos, ProductosCreate } from '../types/index';
import { useProductos } from '../hooks/useProductos';
import { ProductForm } from '../components/productos/ProductForm';
import { ProductListView } from '../components/productos/ProductListView';

export function ProductosPage() {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingProduct, setEditingProduct] = useState<Productos | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    productos,
    isLoading,
    isFetchingMore,
    isError,
    createProduct,
    updateProduct,
    deleteProduct,
    refresh,
    hasMore,
    loadMore,
    searchTerm,
    setSearch
  } = useProductos();

  // Scroll infinito con IntersectionObserver
  useEffect(() => {
    if (!hasMore || isFetchingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, loadMore]);

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
      totalProductos={productos.length}
      searchTerm={searchTerm}
      onSearchChange={setSearch}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onCreateNew={() => {
        setEditingProduct(null);
        setView('form');
      }}
      isLoading={isLoading}
      isFetchingMore={isFetchingMore}
      isError={isError}
      onRetry={refresh}
      loadMoreRef={loadMoreRef}
    />
  );
}