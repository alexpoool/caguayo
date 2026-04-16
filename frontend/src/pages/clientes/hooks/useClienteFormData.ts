import { useState, useEffect } from "react";
import type { ClienteUpdate, ClienteCreate } from "../../../types/ventas";
import toast from "react-hot-toast";

export function useClienteFormData(
  editingCliente: any,
  tipoPersona: string,
  isProveedorView: boolean
) {
  const [formData, setFormData] = useState<Partial<ClienteUpdate>>({
    tipo_persona: (tipoPersona as 'NATURAL' | 'JURIDICA' | 'TCP'),
    tipo_relacion: isProveedorView ? "PROVEEDOR" : "CLIENTE",
    nombre: "",
    cedula_rif: "",
    email: "",
    telefono: "",
    direccion: "",
    fax: "",
    web: "",
    codigo_postal: "",
    estado: "ACTIVO",
  });

  useEffect(() => {
    if (editingCliente) {
      setFormData({
        ...editingCliente,
        id_tipo_entidad: editingCliente.id_tipo_entidad || null,
        tipo_persona: (editingCliente.tipo_persona || "NATURAL") as 'NATURAL' | 'JURIDICA' | 'TCP',
      });
    } else {
      setFormData({
        tipo_persona: (tipoPersona as 'NATURAL' | 'JURIDICA' | 'TCP'),
        tipo_relacion: isProveedorView ? "PROVEEDOR" : "CLIENTE",
        nombre: "",
        cedula_rif: "",
        email: "",
        telefono: "",
        direccion: "",
        fax: "",
        web: "",
        codigo_postal: "",
        estado: "ACTIVO",
      });
    }
  }, [editingCliente, tipoPersona, isProveedorView]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    if (name === "nombre") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.toUpperCase(),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const setTipoPersona = (tipo: string) => {
    // Intentionally empty for now, or you can manage it if needed
  };

  return { formData, setFormData, handleChange };
}