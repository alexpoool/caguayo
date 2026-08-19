import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Button } from "../../../../components/ui";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Modal,
} from "../../../../components/ui";
import { Label } from "../../../../components/ui";
import { Input } from "../../../../components/ui";
import {
  User,
  Building2,
  Briefcase,
  Globe,
  MapPin,
  Save,
  ArrowLeft,
  Pencil,
  Trash2,
  Check,
} from "lucide-react";

import { TipoPersona, TipoRelacion, EstadoCliente } from "./types";
import { NaturalForm } from "./forms-especificos/NaturalForm";
import { JuridicaForm } from "./forms-especificos/JuridicaForm";
import { TCPForm } from "./forms-especificos/TCPForm";
import type {
  ClienteNatural,
  ClienteJuridica,
  ClienteTCP,
} from "../../../../types/ventas";
import { dependenciasService } from "../../../../services/administracion";

export interface ClienteFormProps {
  editingCliente: any | null;
  isProveedorView: boolean;
  onCancel: () => void;
  onSubmit: (data: any) => Promise<void>;
  provincias?: any[];
  tiposEntidad?: any[];
}

export const ClienteForm: React.FC<ClienteFormProps> = ({
  editingCliente,
  isProveedorView,
  onCancel,
  onSubmit,
  provincias = [],
  tiposEntidad = [],
}) => {
  const [localProvincias, setLocalProvincias] = useState<any[]>(
    provincias || [],
  );
  const [localTiposEntidad, setLocalTiposEntidad] = useState<any[]>(
    tiposEntidad || [],
  );

  useEffect(() => {
    if (provincias && Array.isArray(provincias) && provincias.length > 0) {
      setLocalProvincias(provincias);
    }
  }, [provincias]);

  useEffect(() => {
    if (
      tiposEntidad &&
      Array.isArray(tiposEntidad) &&
      tiposEntidad.length > 0
    ) {
      setLocalTiposEntidad(tiposEntidad);
    }
  }, [tiposEntidad]);

  const [tipoPersona, setTipoPersona] = useState<TipoPersona | null>(
    editingCliente?.tipo_persona || null,
  );

  const [formData, setFormData] = useState<any>({
    tipo_persona: editingCliente?.tipo_persona || null,
    tipo_relacion:
      editingCliente?.tipo_relacion ||
      (isProveedorView ? "PROVEEDOR" : "CLIENTE"),
    codigo: editingCliente?.codigo || "",
    nombre: editingCliente?.nombre || "",
    nit: editingCliente?.nit || "",
    email: editingCliente?.email || "",
    telefono: editingCliente?.telefono || "",
    direccion: editingCliente?.direccion || "",
    fax: editingCliente?.fax || "",
    web: editingCliente?.web || "",
    codigo_postal: editingCliente?.codigo_postal || "",
    estado: editingCliente?.estado || "ACTIVO",
    id_provincia: editingCliente?.id_provincia || undefined,
    id_municipio: editingCliente?.id_municipio || undefined,
  });

  const [municipios, setMunicipios] = useState<any[]>([]);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);

  const handleProvinciaChange = async (provinciaId: number | undefined) => {
    setFormData((prev: any) => ({
      ...prev,
      id_provincia: provinciaId,
      id_municipio: undefined,
    }));

    if (provinciaId) {
      setLoadingMunicipios(true);
      try {
        const data = await dependenciasService.getMunicipios(provinciaId);
        setMunicipios(data);
      } catch (error) {
        console.error("Error loading municipios:", error);
        setMunicipios([]);
      } finally {
        setLoadingMunicipios(false);
      }
    } else {
      setMunicipios([]);
    }
  };

  useEffect(() => {
    if (formData.id_provincia) {
      handleProvinciaChange(formData.id_provincia);
    }
  }, []);

  const [datosNatural, setDatosNatural] = useState<ClienteNatural | null>(
    editingCliente?.cliente_natural || null,
  );
  const [datosJuridica, setDatosJuridica] = useState<ClienteJuridica | null>(
    editingCliente?.cliente_juridica || null,
  );
  const [datosTCP, setDatosTCP] = useState<ClienteTCP | null>(
    editingCliente?.cliente_tcp || null,
  );

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalTipo, setModalTipo] = useState<TipoPersona | null>(null);
  const [datosDraft, setDatosDraft] = useState<any>(null);

  useEffect(() => {
    if (editingCliente) {
      setFormData({
        tipo_persona: editingCliente.tipo_persona || null,
        tipo_relacion:
          editingCliente.tipo_relacion ||
          (isProveedorView ? "PROVEEDOR" : "CLIENTE"),
        codigo: editingCliente.codigo || "",
        nombre: editingCliente.nombre || "",
        nit: editingCliente.nit || "",
        email: editingCliente.email || "",
        telefono: editingCliente.telefono || "",
        direccion: editingCliente.direccion || "",
        fax: editingCliente.fax || "",
        web: editingCliente.web || "",
        codigo_postal: editingCliente.codigo_postal || "",
        estado: editingCliente.estado || "ACTIVO",
        id_provincia: editingCliente.id_provincia || undefined,
        id_municipio: editingCliente.id_municipio || undefined,
      });
      setTipoPersona(editingCliente.tipo_persona || null);
      setDatosNatural(editingCliente.cliente_natural || null);
      setDatosJuridica(editingCliente.cliente_juridica || null);
      setDatosTCP(editingCliente.cliente_tcp || null);
    }
  }, [editingCliente]);

  const abrirModalTipo = (tipo: TipoPersona) => {
    setModalTipo(tipo);
    setDatosDraft(
      tipo === "NATURAL"
        ? { ...(datosNatural || {}) }
        : tipo === "JURIDICA"
          ? { ...(datosJuridica || {}) }
          : { ...(datosTCP || {}) },
    );
    setModalAbierto(true);
  };

  const confirmarModalTipo = () => {
    if (!modalTipo) return;
    if (modalTipo === "NATURAL") setDatosNatural(datosDraft);
    if (modalTipo === "JURIDICA") setDatosJuridica(datosDraft);
    if (modalTipo === "TCP") setDatosTCP(datosDraft);
    setTipoPersona(modalTipo);
    setFormData((prev: any) => ({ ...prev, tipo_persona: modalTipo }));
    setModalAbierto(false);
    setModalTipo(null);
    setDatosDraft(null);
  };

  const cerrarModalTipo = () => {
    setModalAbierto(false);
    setModalTipo(null);
    setDatosDraft(null);
  };

  const quitarTipoPersona = () => {
    setDatosNatural(null);
    setDatosJuridica(null);
    setDatosTCP(null);
    setTipoPersona(null);
    setFormData((prev: any) => ({ ...prev, tipo_persona: null }));
  };

  const baseRelacion = ["CLIENTE", "PROVEEDOR"].includes(formData.tipo_relacion)
    ? formData.tipo_relacion
    : (isProveedorView ? "PROVEEDOR" : "CLIENTE");

  const esRelacionAmbas = formData.tipo_relacion === "AMBAS";

  const personaCompleta =
    tipoPersona === "NATURAL"
      ? Boolean(
          datosNatural?.nombre?.trim() && datosNatural.primer_apellido?.trim(),
        )
      : tipoPersona === "JURIDICA"
        ? Boolean(datosJuridica?.codigo_reup?.trim())
        : tipoPersona === "TCP"
          ? Boolean(
              datosTCP?.nombre?.trim() && datosTCP.primer_apellido?.trim(),
            )
          : false;

  const resumenTipoPersona =
    tipoPersona === "NATURAL" && datosNatural
      ? `${datosNatural.nombre || ""} ${datosNatural.primer_apellido || ""} ${datosNatural.segundo_apellido || ""}${datosNatural.carnet_identidad ? ` · CI ${datosNatural.carnet_identidad}` : ""}`.trim()
      : tipoPersona === "JURIDICA" && datosJuridica
        ? `${datosJuridica.codigo_reup || ""}${
            datosJuridica.id_tipo_entidad
              ? ` · ${
                  localTiposEntidad.find(
                    (t: any) => t.id_tipo_entidad === datosJuridica.id_tipo_entidad,
                  )?.nombre || ""
                }`
              : ""
          }`.trim()
        : tipoPersona === "TCP" && datosTCP
          ? `${datosTCP.nombre || ""} ${datosTCP.primer_apellido || ""} ${datosTCP.segundo_apellido || ""}${datosTCP.direccion ? ` · ${datosTCP.direccion}` : ""}`.trim()
          : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.codigo?.trim()) {
      toast.error("El código es obligatorio");
      return;
    }
    if (!tipoPersona) {
      toast.error("Seleccione el tipo de persona");
      return;
    }
    if (!personaCompleta) {
      toast.error("Complete los datos de la persona seleccionada");
      return;
    }
    const { fecha_registro, ...formDataSinFecha } = formData;
    const payload = {
      ...formDataSinFecha,
      cliente_natural: tipoPersona === "NATURAL" ? datosNatural : undefined,
      cliente_juridica: tipoPersona === "JURIDICA" ? datosJuridica : undefined,
      cliente_tcp: tipoPersona === "TCP" ? datosTCP : undefined,
    };
    try {
      await onSubmit(payload);
    } catch (error) {
      console.error("Error al guardar cliente:", error);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-800">
              {editingCliente
                ? isProveedorView
                  ? "Editar Proveedor"
                  : "Editar Cliente"
                : isProveedorView
                  ? "Nuevo Proveedor"
                  : "Nuevo Cliente"}
            </h2>
            <p className="text-sm text-gray-500 ml-3 hidden sm:block">
              Complete los datos del registro
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={onCancel} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Tipo de Relación */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <span className="text-sm font-medium text-gray-700">Tipo de Relación:</span>
          <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${baseRelacion === "PROVEEDOR" ? "bg-amber-100 text-amber-800" : "bg-teal-100 text-teal-800"}`}>
            {baseRelacion === "PROVEEDOR" ? "Proveedor" : "Cliente"}
          </span>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={esRelacionAmbas}
              onChange={(e) =>
                setFormData((prev: any) => ({
                  ...prev,
                  tipo_relacion: e.target.checked ? "AMBAS" : baseRelacion,
                }))
              }
              className="w-4 h-4"
            />
            y {isProveedorView ? "cliente" : "proveedor"}
          </label>
        </div>

        {/* Datos Base del Cliente */}
        <Card className="mb-6 shadow-sm border-gray-200">
          <CardHeader className="border-b bg-gray-50/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-teal-600" />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <Label>Nombre Comercial</Label>
              <Input
                value={formData.nombre || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    nombre: e.target.value.slice(0, 200),
                  })
                }
                required
                maxLength={200}
              />
            </div>
            <div>
              <Label>NIT</Label>
              <Input
                value={formData.nit || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    nit: e.target.value.slice(0, 20),
                  })
                }
                required
                maxLength={20}
              />
            </div>
            <div>
              <Label>Código</Label>
              <Input
                value={formData.codigo || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    codigo: e.target.value.slice(0, 50),
                  })
                }
                required
                maxLength={50}
                placeholder="Código del cliente"
              />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input
                value={formData.telefono || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    telefono: e.target.value.slice(0, 20),
                  })
                }
                maxLength={20}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Dirección</Label>
              <Input
                value={formData.direccion || ""}
                onChange={(e) =>
                  setFormData({ ...formData, direccion: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Provincia</Label>
              <select
                value={formData.id_provincia || ""}
                onChange={(e) =>
                  handleProvinciaChange(
                    e.target.value ? parseInt(e.target.value) : undefined,
                  )
                }
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
              >
                <option value="">Seleccione provincia</option>
                {localProvincias.map((p: any) => (
                  <option key={p.id_provincia} value={p.id_provincia}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Municipio</Label>
              <select
                value={formData.id_municipio || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    id_municipio: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  })
                }
                disabled={!formData.id_provincia || loadingMunicipios}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white disabled:bg-slate-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {loadingMunicipios
                    ? "Cargando..."
                    : formData.id_provincia
                      ? "Seleccione municipio"
                      : "Primero seleccione provincia"}
                </option>
                {municipios.map((m: any) => (
                  <option key={m.id_municipio} value={m.id_municipio}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Código Postal</Label>
              <Input
                value={formData.codigo_postal || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    codigo_postal: e.target.value.slice(0, 10),
                  })
                }
                maxLength={10}
              />
            </div>
            <div>
              <Label>Web</Label>
              <Input
                value={formData.web || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    web: e.target.value.slice(0, 100),
                  })
                }
                maxLength={100}
              />
            </div>
            <div>
              <Label>Correo</Label>
              <Input
                type="email"
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    email: e.target.value.slice(0, 100),
                  })
                }
                maxLength={100}
              />
            </div>
            <div>
              <Label>Fax</Label>
              <Input
                value={formData.fax || ""}
                onChange={(e) =>
                  setFormData({ ...formData, fax: e.target.value.slice(0, 20) })
                }
                maxLength={20}
              />
            </div>
            {editingCliente && (
              <div>
                <Label>Estado</Label>
                <select
                  aria-label="Estado"
                  value={formData.estado || "ACTIVO"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      estado: e.target.value,
                    })
                  }
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tipo de Persona */}
        <Card className="mb-6 shadow-sm border-gray-200">
          <CardHeader className="border-b bg-gray-50/50">
            <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-lg">
              <span className="flex items-center gap-2">
                <User className="h-5 w-5 text-teal-600" />
                Tipo de Persona
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    value: "NATURAL" as TipoPersona,
                    label: "Creador",
                    color:
                      "bg-teal-100 text-teal-700 hover:bg-teal-200 ring-teal-500",
                  },
                  {
                    value: "JURIDICA" as TipoPersona,
                    label: "Persona Jurídica",
                    color:
                      "bg-amber-100 text-amber-700 hover:bg-amber-200 ring-amber-500",
                  },
                  {
                    value: "TCP" as TipoPersona,
                    label: "TCP",
                    color:
                      "bg-violet-100 text-violet-700 hover:bg-violet-200 ring-violet-500",
                  },
                ].map((tipo) => (
                  <button
                    key={tipo.value}
                    type="button"
                    onClick={() => abrirModalTipo(tipo.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 ${tipo.color} ${
                      tipoPersona === tipo.value
                        ? "ring-2 ring-offset-1 shadow-md"
                        : "opacity-90"
                    }`}
                  >
                    {tipo.label}
                  </button>
                ))}
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Resumen tipo de persona */}
        {tipoPersona && (
          <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50/50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                {tipoPersona === "NATURAL" ? (
                  <User className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                ) : tipoPersona === "JURIDICA" ? (
                  <Building2 className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                ) : (
                  <Briefcase className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">
                    {tipoPersona === "NATURAL"
                      ? "Creador"
                      : tipoPersona === "JURIDICA"
                        ? "Persona Jurídica"
                        : "TCP"}
                  </p>
                  <p className="text-sm text-gray-600 truncate">
                    {resumenTipoPersona || "Sin datos"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => abrirModalTipo(tipoPersona)}
                  className="gap-1"
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={quitarTipoPersona}
                  className="gap-1 text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                  Quitar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal formulario tipo de persona */}
        <Modal className="max-w-2xl" isOpen={modalAbierto} onClose={cerrarModalTipo}>
          <div className="p-6 pb-5 border-b">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                {modalTipo === "NATURAL" ? (
                  <User className="h-5 w-5 text-teal-600" />
                ) : modalTipo === "JURIDICA" ? (
                  <Building2 className="h-5 w-5 text-teal-600" />
                ) : (
                  <Briefcase className="h-5 w-5 text-teal-600" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {modalTipo === "NATURAL"
                    ? "Datos Persona Natural"
                    : modalTipo === "JURIDICA"
                      ? "Datos Persona Jurídica"
                      : "Datos TCP"}
                </h3>
                <p className="text-sm text-gray-500">
                  {modalTipo === "NATURAL"
                    ? "Complete los datos personales"
                    : modalTipo === "JURIDICA"
                      ? "Código REEUP y tipo de entidad"
                      : "Trabajo por Cuenta Propia"}
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            {modalTipo === "NATURAL" && (
              <NaturalForm datos={datosDraft} setDatos={setDatosDraft} />
            )}
            {modalTipo === "JURIDICA" && (
              <JuridicaForm
                datos={datosDraft}
                setDatos={setDatosDraft}
                tiposEntidad={localTiposEntidad}
              />
            )}
            {modalTipo === "TCP" && (
              <TCPForm datos={datosDraft} setDatos={setDatosDraft} />
            )}
          </div>
          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50/50 rounded-b-2xl">
            <Button type="button" variant="outline" onClick={cerrarModalTipo}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={confirmarModalTipo}
              className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
            >
              <Check className="h-4 w-4" />
              Guardar
            </Button>
          </div>
        </Modal>

        <div className="flex gap-3 mt-8 pt-6 border-t">
          <Button
            type="submit"
            disabled={!tipoPersona || !personaCompleta}
            className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
          >
            <Save className="h-4 w-4" />
            {editingCliente ? "Actualizar" : "Crear"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </>
  );
};
