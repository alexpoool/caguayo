import { useEffect, useRef } from "react";
import { useClientesLogic } from "./clientes/hooks/useClientesLogic";
import { ClienteForm } from "./clientes/components/form/ClienteForm";
import { ClientesList } from "./clientes/components/list/ClientesList";
import { ConfirmModal } from "../components/ui";

export function ClientesPage() {
  const {
    view,
    setView,
    isProveedorView,
    editingCliente,
    setEditingCliente,
    tipoPersona,
    setTipoPersona,
    datosNatural,
    setDatosNatural,
    datosJuridica,
    setDatosJuridica,
    datosTCP,
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
    deleteMutation,
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

  return (
    <div className="flex-1 w-full bg-gray-50/50">
      {/* List View */}
      {view === "list" && (
        <ClientesList
          filteredClientes={filteredClientes}
          totalClientes={clientes.length}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          isProveedorView={isProveedorView}
          onNew={() => {
            resetForm();
            setView("form");
          }}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          loadMoreRef={loadMoreRef}
          isFetchingMore={isFetchingMore}
          tiposEntidad={tiposEntidad}
        />
      )}

      {/* Form View */}
      {view === "form" && (
        <ClienteForm
          isProveedorView={isProveedorView}
          editingCliente={editingCliente}
          onCancel={() => {
            resetForm();
            setView("list");
          }}
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
      )}

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
