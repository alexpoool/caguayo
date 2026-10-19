import { useEffect, useRef } from "react";
import { useClientesLogic } from "./clientes/hooks/useClientesLogic";
import { ClienteFormModal } from "./clientes/components/modals/ClienteFormModal";
import { ClientesList } from "./clientes/components/list/ClientesList";
import { ConfirmModal } from "../components/ui";

export function ClientesPage() {
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
    filteredClientes,
    hasMore,
    loadMore,
    isFetchingMore,
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
        filteredClientes={filteredClientes}
        totalClientes={clientes.length}
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
