import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useClientesLogic } from "./clientes/hooks/useClientesLogic";
import { ClienteFormModal } from "./clientes/components/modals/ClienteFormModal";
import { ClientesList } from "./clientes/components/list/ClientesList";
import { ConfirmModal } from "../components/ui";

// La misma página se usa en /clientes, /venta/clientes, /compra/clientes y
// /compra/proveedores. Al cambiar de ruta React reutiliza el componente y su
// estado, lo que mostraba la lista de clientes en la vista de proveedores (y
// viceversa) hasta que llegaba la nueva consulta. La key fuerza un montaje
// limpio en cada ruta.
export function ClientesPage() {
  const { pathname, search } = useLocation();
  return <ClientesPageContent key={`${pathname}${search}`} />;
}

function ClientesPageContent() {
  const {
    isFormOpen,
    openForm,
    closeForm,
    isProveedorView,
    editingCliente,
    setEditingCliente,
    setTipoPersona,
    setDatosNatural,
    setDatosJuridica,
    setDatosTCP,
    setCuentasCliente,
    confirmModal,
    setConfirmModal,
    searchTerm,
    setSearchTerm,
    clientes,
    tiposEntidad,
    provincias,
    createMutation,
    updateMutation,
    handleEdit,
    handleDelete,
    hasMore,
    loadMore,
    isLoading,
    isFetchingMore,
    totalClientesDB,
  } = useClientesLogic();

  const loadMoreRef = useRef<HTMLDivElement>(null);

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

  const resetForm = () => {
    setEditingCliente(null);
    setTipoPersona("NATURAL");
    setDatosNatural(null);
    setDatosJuridica(null);
    setDatosTCP(null);
    setCuentasCliente([]);
  };

  const handleCloseForm = () => {
    resetForm();
    closeForm();
  };

  const isSubmitting =
    createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex-1 w-full bg-gray-50/50">
      <ClientesList
        clientes={clientes}
        totalClientes={totalClientesDB ?? clientes.length}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        isProveedorView={isProveedorView}
        onNew={() => {
          resetForm();
          openForm();
        }}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
        loadMoreRef={loadMoreRef}
        isFetchingMore={isFetchingMore}
        isLoading={isLoading}
        tiposEntidad={tiposEntidad}
      />

      {/* Form Modal (creación / edición) */}
      <ClienteFormModal
        isOpen={isFormOpen}
        isProveedorView={isProveedorView}
        editingCliente={editingCliente}
        isSubmitting={isSubmitting}
        onClose={handleCloseForm}
        onSubmit={async (data) => {
          if (editingCliente) {
            await updateMutation.mutateAsync({ id: editingCliente.id_cliente, data });
          } else {
            await createMutation.mutateAsync(data);
          }
        }}
        provincias={provincias}
        tiposEntidad={tiposEntidad}
      />

      {/* Main Confirm Modal for Deletes */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={async () => {
          await confirmModal.onConfirm();
          setConfirmModal({ ...confirmModal, isOpen: false });
        }}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
    </div>
  );
}

export default ClientesPage;
