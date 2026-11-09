import { useState, useEffect, useRef } from "react";
import type { Producto, ProductoCreate } from '../domain/inventario';
import type { CasosUsoInventario } from '../application/casos-uso';
import { useProductos } from './useProductos';
import { ProductForm } from './components/ProductForm';
import { ProductListView } from './components/ProductListView';
import { FormModal, Button } from "@/shared/ui/components";
import { Package } from "lucide-react";

const PRODUCTO_FORM_ID = "producto-form";

export function ProductosPage({ casosUso }: { casosUso: CasosUsoInventario }) {
  const [view, setView] = useState<"list" | "form">("list");
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
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
    setSearch,
    isCreating,
    isUpdating,
    totalProductosDB,
  } = useProductos(casosUso);

  // Scroll infinito con IntersectionObserver
  useEffect(() => {
    if (!hasMore || isFetchingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, loadMore]);

  const handleCreate = (data: ProductoCreate) => {
    createProduct(data, {
      onSuccess: () => {
        setView("list");
      },
    }); // Note: This runs alongside the hook's onSuccess
  };

  const handleUpdate = (data: ProductoCreate) => {
    if (editingProduct) {
      updateProduct(
        { id: editingProduct.id_producto, data },
        {
          onSuccess: () => {
            setView("list");
            setEditingProduct(null);
          },
        },
      );
    }
  };

  const handleEdit = (product: Producto) => {
    setEditingProduct(product);
    setView("form");
  };

  const handleDelete = (id: number) => {
    deleteProduct(id);
  };

  const closeForm = () => {
    setView("list");
    setEditingProduct(null);
  };

  const isSaving = isCreating || isUpdating;

  return (
    <div className="flex-1 w-full">
      <ProductListView
        productos={productos}
        totalProductos={totalProductosDB ?? productos.length}
        searchTerm={searchTerm}
        onSearchChange={setSearch}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreateNew={() => {
          setEditingProduct(null);
          setView("form");
        }}
        isLoading={isLoading}
        isFetchingMore={isFetchingMore}
        isError={isError}
        onRetry={refresh}
        loadMoreRef={loadMoreRef}
      />

      <FormModal
        isOpen={view === "form"}
        onClose={closeForm}
        title={editingProduct ? "Editar Producto" : "Nuevo Producto"}
        subtitle="Complete los datos del producto"
        icon={<Package className="h-6 w-6" />}
        size="lg"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={closeForm}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={PRODUCTO_FORM_ID}
              disabled={isSaving}
              isLoading={isSaving}
              className="gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {editingProduct ? "Actualizar" : "Guardar"}
            </Button>
          </>
        }
      >
        <ProductForm
          formId={PRODUCTO_FORM_ID}
          initialData={editingProduct}
          casosUso={casosUso}
          onSubmit={editingProduct ? handleUpdate : handleCreate}
        />
      </FormModal>
    </div>
  );
}

export default ProductosPage;
