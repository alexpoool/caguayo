import React from "react";
import { Button } from "../../../../components/ui"
import { Card, CardHeader, CardTitle, CardContent } from "../../../../components/ui"
import { Label } from "../../../../components/ui"
import { Input } from "../../../../components/ui"
import {
  User,
  Building2,
  Briefcase,
  Globe,
  MapPin,
  Save,
  ArrowLeft,
} from "lucide-react";

import { TipoPersona, TipoRelacion, EstadoCliente, NuevaCuenta } from "./types";
import { NaturalForm } from "./forms-especificos/NaturalForm";
import { JuridicaForm } from "./forms-especificos/JuridicaForm";
import { TCPForm } from "./forms-especificos/TCPForm";
import { CuentasBancariasForm } from "./CuentasBancariasForm";

export interface ClienteFormProps {
  editingCliente: any | null;
  isProveedorView: boolean;
  setView: (view: "list" | "form" | "detail") => void;
  resetForm: () => void;
  handleSubmit: (e: React.FormEvent) => void;
  tipoPersona: TipoPersona;
  setTipoPersona: (val: TipoPersona) => void;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  formErrors: any;
  provincias: any[];
  municipios: any[];
  handleProvinciaChange: (id?: number) => void;
  // Natural
  datosNaturalForm: any;
  setDatosNaturalForm: React.Dispatch<React.SetStateAction<any>>;
  // Juridica
  datosJuridicaForm: any;
  setDatosJuridicaForm: React.Dispatch<React.SetStateAction<any>>;
  tiposEntidad: any[];
  // TCP
  datosTCPForm: any;
  setDatosTCPForm: React.Dispatch<React.SetStateAction<any>>;
  // Cuentas
  nuevaCuenta: NuevaCuenta;
  setNuevaCuenta: React.Dispatch<React.SetStateAction<NuevaCuenta>>;
  monedas: any[];
  cuentas: any[];
  addCuenta: () => void;
  removeCuenta: (index: number) => void;
}

export const ClienteForm: React.FC<ClienteFormProps> = ({
  editingCliente,
  isProveedorView,
  setView,
  resetForm,
  handleSubmit,
  tipoPersona,
  setTipoPersona,
  formData,
  setFormData,
  formErrors,
  provincias,
  municipios,
  handleProvinciaChange,
  datosNaturalForm,
  setDatosNaturalForm,
  datosJuridicaForm,
  setDatosJuridicaForm,
  tiposEntidad,
  datosTCPForm,
  setDatosTCPForm,
  nuevaCuenta,
  setNuevaCuenta,
  monedas,
  cuentas,
  addCuenta,
  removeCuenta,
}) => {
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
        <Button
          variant="outline"
          onClick={() => {
            setView("list");
            setFormData?.((prevForm: any) => ({ ...prevForm })); // keep this as side effect just in case, but real reset below
            resetForm();
          }}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Tipo de Persona */}
        <Card className="mb-6 shadow-sm border-gray-200">
          <CardHeader className="border-b bg-gray-50/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-teal-600" />
              Tipo de Persona
            </CardTitle>
          </CardHeader>
          <CardContent className="mt-4">
            <div className="flex gap-4">
              {[
                {
                  value: "NATURAL" as TipoPersona,
                  label: "Persona Natural",
                  icon: User,
                },
                {
                  value: "JURIDICA" as TipoPersona,
                  label: "Persona Jurídica",
                  icon: Building2,
                },
                {
                  value: "TCP" as TipoPersona,
                  label: "TCP (Trabajo por Cuenta Propia)",
                  icon: Briefcase,
                },
              ].map((tipo) => (
                <label
                  key={tipo.value}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="tipoPersona"
                    value={tipo.value}
                    checked={tipoPersona === tipo.value}
                    onChange={(e) => {
                      const newValue = e.target.value as TipoPersona;
                      setTipoPersona(newValue);
                      setFormData({ ...formData, tipo_persona: newValue });
                    }}
                    className="w-4 h-4"
                  />
                  <tipo.icon className="h-4 w-4" />
                  {tipo.label}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

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
              <Label>Numero de cliente</Label>
              <Input
                value={formData.numero_cliente || ""}
                onChange={(e) =>
                  setFormData({ ...formData, numero_cliente: e.target.value })
                }
                placeholder="Ingresado por usuario"
              />
            </div>
            <div className="md:col-span-2">
              <Label>
                {tipoPersona === "NATURAL"
                  ? "Nombre Artistico"
                  : "Nombre de la Empresa"}{" "}
                *
              </Label>
              <Input
                value={formData.nombre || ""}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                className={formErrors.nombre ? "border-red-500" : ""}
              />
              {formErrors.nombre && (
                <p className="text-red-500 text-sm">{formErrors.nombre}</p>
              )}
            </div>
            <div>
              <Label>Cédula / RIF</Label>
              <Input
                value={formData.cedula_rif || ""}
                onChange={(e) =>
                  setFormData({ ...formData, cedula_rif: e.target.value })
                }
                placeholder="V-12345678"
              />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input
                value={formData.telefono || ""}
                onChange={(e) =>
                  setFormData({ ...formData, telefono: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Fax</Label>
              <Input
                value={formData.fax || ""}
                onChange={(e) =>
                  setFormData({ ...formData, fax: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Web</Label>
              <Input
                value={formData.web || ""}
                onChange={(e) =>
                  setFormData({ ...formData, web: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Código Postal</Label>
              <Input
                value={formData.codigo_postal || ""}
                onChange={(e) =>
                  setFormData({ ...formData, codigo_postal: e.target.value })
                }
              />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Provincia
              </Label>
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
                {provincias.map((p: any) => (
                  <option key={p.id_provincia} value={p.id_provincia}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Municipio
              </Label>
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
                disabled={!formData.id_provincia}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white disabled:bg-slate-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {formData.id_provincia
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
            <div className="md:col-span-3">
              <Label>Dirección</Label>
              <Input
                value={formData.direccion || ""}
                onChange={(e) =>
                  setFormData({ ...formData, direccion: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Tipo de Relación</Label>
              <select
                aria-label="Tipo de Relación"
                value={formData.tipo_relacion || "CLIENTE"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tipo_relacion: e.target.value as TipoRelacion,
                  })
                }
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
              >
                <option value="CLIENTE">Cliente (solo compra)</option>
                <option value="PROVEEDOR">Proveedor (solo vende)</option>
                <option value="AMBAS">Cliente y Proveedor</option>
              </select>
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
                      estado: e.target.value as EstadoCliente,
                    })
                  }
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                >
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo</option>
                </select>
              </div>
            )}
            {editingCliente && (
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  aria-label="Cliente activo"
                  checked={formData.activo || false}
                  onChange={(e) =>
                    setFormData({ ...formData, activo: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <Label className="mb-0">Cliente activo</Label>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Datos según tipo de persona */}
        {tipoPersona === "NATURAL" && (
          <NaturalForm
            datosNaturalForm={datosNaturalForm}
            setDatosNaturalForm={setDatosNaturalForm}
          />
        )}

        {tipoPersona === "JURIDICA" && (
          <JuridicaForm
            datosJuridicaForm={datosJuridicaForm}
            setDatosJuridicaForm={setDatosJuridicaForm}
            tiposEntidad={tiposEntidad}
          />
        )}

        {tipoPersona === "TCP" && (
          <TCPForm
            datosTCPForm={datosTCPForm}
            setDatosTCPForm={setDatosTCPForm}
            formErrors={formErrors}
          />
        )}

        {/* Cuentas Bancarias */}
        <CuentasBancariasForm
          nuevaCuenta={nuevaCuenta}
          setNuevaCuenta={setNuevaCuenta}
          monedas={monedas}
          cuentas={cuentas}
          addCuenta={addCuenta}
          removeCuenta={removeCuenta}
        />

        <div className="flex gap-3 mt-8 pt-6 border-t">
          <Button
            type="submit"
            className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300"
          >
            <Save className="h-4 w-4" />
            {editingCliente ? "Actualizar" : "Crear"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setView("list");
              resetForm();
            }}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </>
  );
};
