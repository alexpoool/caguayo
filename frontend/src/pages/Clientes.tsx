import { useEffect, useRef } from "react";
import { useClientesLogic } from "./clientes/hooks/useClientesLogic";
import { ClienteForm } from "./clientes/components/form/ClienteForm";
import { ClienteDetailView } from "./clientes/components/modals/ClienteDetailView";
import { ClientesList } from "./clientes/components/list/ClientesList";
import { ConfirmModal } from "../components/ui";

export function ClientesPage() {
  const {
    view,
    setView,
    isProveedorView,
    defaultTipoRelacion,
    editingCliente,
    setEditingCliente,
    viewingCliente,
    setViewingCliente,
    tipoPersona,
    setTipoPersona,
    datosNatural,
    setDatosNatural,
    datosJuridica,
    setDatosJuridica,
    datosTCP,
    setDatosTCP,
    cuentasCliente,
    setCuentasCliente,
    confirmModal,
    setConfirmModal,
    detailModal,
    setDetailModal,
    searchTerm,
    setSearchTerm,
    clientes,
    tiposEntidad,
    monedas,
    provincias,
    createMutation,
    updateMutation,
    deleteMutation,
    handleViewDetails,
    handleEdit,
    handleDelete,
    filteredClientes,
    hasMore,
    loadMore,
    isFetchingMore,
    navigate,
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
            handleViewDetails={handleViewDetails}
            loadMoreRef={loadMoreRef}
            isFetchingMore={isFetchingMore}
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
          cuentasCliente={cuentasCliente}
          setCuentasCliente={setCuentasCliente}
          provincias={provincias}
          tiposEntidad={tiposEntidad}
          monedas={monedas}
        />
      )}

      {/* Detail View */}
      {view === "detail" && viewingCliente && (
        <ClienteDetailView
          viewingCliente={viewingCliente}
          setView={setView}
          setViewingCliente={setViewingCliente}
          datosNatural={datosNatural}
          datosJuridica={datosJuridica}
          datosTCP={datosTCP}
          cuentasCliente={cuentasCliente}
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
