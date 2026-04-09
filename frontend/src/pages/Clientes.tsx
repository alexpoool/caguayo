import React from "react";
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
    navigate,
  } = useClientesLogic();

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
