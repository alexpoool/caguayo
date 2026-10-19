import { useState, useEffect, useRef } from "react";
import type { Productos, ProductosCreate } from "../types/index";
import { useProductos } from "../hooks/useProductos";
import { ProductForm } from "../components/productos/ProductForm";
import { ProductListView } from "../components/productos/ProductListView";
import { FormModal, Button } from "../components/ui";
import { Package } from "lucide-react";

const PRODUCTO_FORM_ID = "producto-form";

export function ProductosPage() {
  const [view, setView] = useState<"list" | "form">("list");
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
    setSearch,
    isCreating,
    isUpdating,
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
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, loadMore]);

  const handleCreate = (data: ProductosCreate) => {
    createProduct(data, {
      onSuccess: () => {
        setView("list");
      },
    }); // Note: This runs alongside the hook's onSuccess
  };

  const handleUpdate = (data: ProductosCreate) => {
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

  const handleEdit = (product: Productos) => {
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
        totalProductos={productos.length}
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
              className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {editingProduct ? "Actualizar" : "Guardar"}
            </Button>
          </>
        }
      >
        <ProductForm
          formId={PRODUCTO_FORM_ID}
          initialData={editingProduct}
          onSubmit={editingProduct ? handleUpdate : handleCreate}
        />
      </FormModal>
    </div>
  );
}

export default ProductosPage;
