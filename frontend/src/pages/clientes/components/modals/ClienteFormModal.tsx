import { useState } from "react";
import { User, Save } from "lucide-react";
import { Button, FormModal } from "../../../../components/ui";
import { ClienteForm } from "../form/ClienteForm";
import type { Cliente } from "../../../../types/ventas";

export const CLIENTE_FORM_ID = "cliente-form";

interface ClienteFormModalProps {
  isOpen: boolean;
  isProveedorView: boolean;
  editingCliente: Cliente | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  provincias?: any[];
  tiposEntidad?: any[];
}

export function ClienteFormModal({
  isOpen,
  isProveedorView,
  editingCliente,
  isSubmitting,
  onClose,
  onSubmit,
  provincias = [],
  tiposEntidad = [],
}: ClienteFormModalProps) {
  const [isValid, setIsValid] = useState(false);

  const entidad = isProveedorView ? "Proveedor" : "Cliente";
  const titulo = `${editingCliente ? "Editar" : "Nuevo"} ${entidad}`;

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={titulo}
      subtitle="Complete los datos del registro"
      icon={<User className="h-6 w-6" />}
      size="lg"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form={CLIENTE_FORM_ID}
            disabled={!isValid || isSubmitting}
            isLoading={isSubmitting}
            className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {!isSubmitting && <Save className="h-4 w-4" />}
            {editingCliente ? "Actualizar" : "Crear"}
          </Button>
        </>
      }
    >
      <ClienteForm
        formId={CLIENTE_FORM_ID}
        isProveedorView={isProveedorView}
        editingCliente={editingCliente}
        onSubmit={onSubmit}
        onValidityChange={setIsValid}
        selfContained={false}
        provincias={provincias}
        tiposEntidad={tiposEntidad}
      />
    </FormModal>
  );
}
