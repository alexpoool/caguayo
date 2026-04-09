import React, { useState, useEffect } from "react";
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
import type { ClienteNatural, ClienteJuridica, ClienteTCP } from "../../../../types/ventas";
import { dependenciasService } from "../../../../services/administracion";

export interface ClienteFormProps {
  editingCliente: any | null;
  isProveedorView: boolean;
  onCancel: () => void;
  onSubmit: (data: any) => void;
  provincias?: any[];
  tiposEntidad?: any[];
  monedas?: any[];
}

export const ClienteForm: React.FC<ClienteFormProps> = ({
  editingCliente,
  isProveedorView,
  onCancel,
  onSubmit,
  provincias = [],
  tiposEntidad = [],
  monedas = [],
}) => {
  const [localProvincias, setLocalProvincias] = useState<any[]>(provincias || []);
  const [localTiposEntidad, setLocalTiposEntidad] = useState<any[]>(tiposEntidad || []);
  const [localMonedas, setLocalMonedas] = useState<any[]>(monedas || []);
  
  useEffect(() => {
    if (provincias && Array.isArray(provincias) && provincias.length > 0) {
      setLocalProvincias(provincias);
    }
  }, [provincias]);
  
  useEffect(() => {
    if (tiposEntidad && Array.isArray(tiposEntidad) && tiposEntidad.length > 0) {
      setLocalTiposEntidad(tiposEntidad);
    }
  }, [tiposEntidad]);
  
  useEffect(() => {
    if (monedas && Array.isArray(monedas) && monedas.length > 0) {
      setLocalMonedas(monedas);
    }
  }, [monedas]);
  
  const [tipoPersona, setTipoPersona] = useState<TipoPersona>(
    editingCliente?.tipo_persona || "NATURAL"
  );
  
  const [formData, setFormData] = useState<any>({
    tipo_persona: editingCliente?.tipo_persona || "NATURAL",
    tipo_relacion: editingCliente?.tipo_relacion || (isProveedorView ? "PROVEEDOR" : "CLIENTE"),
    nombre: editingCliente?.nombre || "",
    cedula_rif: editingCliente?.cedula_rif || "",
    email: editingCliente?.email || "",
    telefono: editingCliente?.telefono || "",
    direccion: editingCliente?.direccion || "",
    fax: editingCliente?.fax || "",
    web: editingCliente?.web || "",
    codigo_postal: editingCliente?.codigo_postal || "",
    estado: editingCliente?.estado || "ACTIVO",
    numero_cliente: editingCliente?.numero_cliente || "",
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
        console.error('Error loading municipios:', error);
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
    editingCliente?.cliente_natural || null
  );
  const [datosJuridica, setDatosJuridica] = useState<ClienteJuridica | null>(
    editingCliente?.cliente_juridica || null
  );
  const [datosTCP, setDatosTCP] = useState<ClienteTCP | null>(
    editingCliente?.cliente_tcp || null
  );

  const [nuevaCuenta, setNuevaCuenta] = useState<NuevaCuenta>({
    titular: "",
    banco: "",
    sucursal: 0,
    id_moneda: 1,
    numero_cuenta: "",
    tipo_cuenta: "CORRIENTE",
    principal: false,
  });
  const [cuentas, setCuentas] = useState<any[]>(
    editingCliente?.cuentas || []
  );

  useEffect(() => {
    if (editingCliente) {
      setFormData({
        tipo_persona: editingCliente.tipo_persona || "NATURAL",
        tipo_relacion: editingCliente.tipo_relacion || (isProveedorView ? "PROVEEDOR" : "CLIENTE"),
        nombre: editingCliente.nombre || "",
        cedula_rif: editingCliente.cedula_rif || "",
        email: editingCliente.email || "",
        telefono: editingCliente.telefono || "",
        direccion: editingCliente.direccion || "",
        fax: editingCliente.fax || "",
        web: editingCliente.web || "",
        codigo_postal: editingCliente.codigo_postal || "",
        estado: editingCliente.estado || "ACTIVO",
        numero_cliente: editingCliente.numero_cliente || "",
        id_provincia: editingCliente.id_provincia || undefined,
        id_municipio: editingCliente.id_municipio || undefined,
      });
      setTipoPersona(editingCliente.tipo_persona || "NATURAL");
      setDatosNatural(editingCliente.cliente_natural || null);
      setDatosJuridica(editingCliente.cliente_juridica || null);
      setDatosTCP(editingCliente.cliente_tcp || null);
      setCuentas(editingCliente.cuentas || []);
    }
  }, [editingCliente]);

  const handleTipoPersonaChange = (tipo: TipoPersona) => {
    setTipoPersona(tipo);
    setFormData((prev: any) => ({ ...prev, tipo_persona: tipo }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      cliente_natural: tipoPersona === "NATURAL" ? datosNatural : undefined,
      cliente_juridica: tipoPersona === "JURIDICA" ? datosJuridica : undefined,
      cliente_tcp: tipoPersona === "TCP" ? datosTCP : undefined,
      cuentas: cuentas,
    });
  };

  const addCuenta = () => {
    if (nuevaCuenta.numero_cuenta && nuevaCuenta.banco) {
      setCuentas([...cuentas, { ...nuevaCuenta, id_cuenta: Date.now() }]);
      setNuevaCuenta({
        titular: "",
        banco: "",
        sucursal: 0,
        id_moneda: 1,
        numero_cuenta: "",
        tipo_cuenta: "CORRIENTE",
        principal: false,
      });
    }
  };

  const removeCuenta = (index: number) => {
    setCuentas(cuentas.filter((_, i) => i !== index));
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
        <Button
          variant="outline"
          onClick={onCancel}
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
                    onChange={() => handleTipoPersonaChange(tipo.value)}
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
              <Label>Numero de cliente (max 20)</Label>
              <Input
                value={formData.numero_cliente || ""}
                onChange={(e) =>
                  setFormData({ ...formData, numero_cliente: e.target.value.slice(0, 20) })
                }
                maxLength={20}
              />
            </div>
            <div>
              <Label>Nombre / Razón Social *</Label>
              <Input
                value={formData.nombre || ""}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value.toUpperCase().slice(0, 200) })
                }
                required
                maxLength={200}
              />
            </div>
            <div>
              <Label>Cédula / RIF * (max 20)</Label>
              <Input
                value={formData.cedula_rif || ""}
                onChange={(e) =>
                  setFormData({ ...formData, cedula_rif: e.target.value.toUpperCase().slice(0, 20) })
                }
                required
                maxLength={20}
              />
            </div>
            <div>
              <Label>Teléfono (max 20)</Label>
              <Input
                value={formData.telefono || ""}
                onChange={(e) =>
                  setFormData({ ...formData, telefono: e.target.value.slice(0, 20) })
                }
                maxLength={20}
              />
            </div>
            <div>
              <Label>Correo (max 100)</Label>
              <Input
                type="email"
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value.toLowerCase().slice(0, 100) })
                }
                maxLength={100}
              />
            </div>
            <div>
              <Label>Fax (max 20)</Label>
              <Input
                value={formData.fax || ""}
                onChange={(e) =>
                  setFormData({ ...formData, fax: e.target.value.slice(0, 20) })
                }
                maxLength={20}
              />
            </div>
            <div>
              <Label>Web (max 100)</Label>
              <Input
                value={formData.web || ""}
                onChange={(e) =>
                  setFormData({ ...formData, web: e.target.value.slice(0, 100) })
                }
                maxLength={100}
              />
            </div>
            <div>
              <Label>Código Postal (max 10)</Label>
              <Input
                value={formData.codigo_postal || ""}
                onChange={(e) =>
                  setFormData({ ...formData, codigo_postal: e.target.value.slice(0, 10) })
                }
                maxLength={10}
              />
            </div>
            <div>
              <Label>Provincia</Label>
              <select
                value={formData.id_provincia || ""}
                onChange={(e) =>
                  handleProvinciaChange(e.target.value ? parseInt(e.target.value) : undefined)
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
                    id_municipio: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                disabled={!formData.id_provincia || loadingMunicipios}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white disabled:bg-slate-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {loadingMunicipios ? "Cargando..." : (formData.id_provincia ? "Seleccione municipio" : "Primero seleccione provincia")}
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
                    tipo_relacion: e.target.value,
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

        {/* Datos según tipo de persona */}
        {tipoPersona === "NATURAL" && (
          <NaturalForm
            datos={datosNatural}
            setDatos={setDatosNatural}
          />
        )}

        {tipoPersona === "JURIDICA" && (
          <JuridicaForm
            datos={datosJuridica}
            setDatos={setDatosJuridica}
            tiposEntidad={localTiposEntidad}
          />
        )}

        {tipoPersona === "TCP" && (
          <TCPForm
            datos={datosTCP}
            setDatos={setDatosTCP}
          />
        )}

        {/* Cuentas Bancarias */}
        <CuentasBancariasForm
          nuevaCuenta={nuevaCuenta}
          setNuevaCuenta={setNuevaCuenta}
          monedas={localMonedas}
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
            onClick={onCancel}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </>
  );
};
