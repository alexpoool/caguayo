import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { User, X, Loader2 } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../../../../components/ui";
import {
  clienteNaturalService,
  clienteJuridicaService,
  clienteTCPService,
  cuentasService,
} from "../../../../services/api";
import type {
  Cliente,
  ClienteNatural,
  ClienteJuridica,
  ClienteTCP,
  Cuenta,
  TipoEntidad,
} from "../../../../types/ventas";

interface ClienteDetailModalProps {
  isOpen: boolean;
  cliente: Cliente | null;
  onClose: () => void;
  tiposEntidad?: TipoEntidad[];
}

const formatFecha = (fecha?: string) => {
  if (!fecha) return "N/A";
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const ClienteDetailModal: React.FC<ClienteDetailModalProps> = ({
  isOpen,
  cliente,
  onClose,
  tiposEntidad = [],
}) => {
  const [datosNatural, setDatosNatural] = useState<ClienteNatural | null>(null);
  const [datosJuridica, setDatosJuridica] = useState<ClienteJuridica | null>(
    null
  );
  const [datosTCP, setDatosTCP] = useState<ClienteTCP | null>(null);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !cliente) return;

    let active = true;
    setLoading(true);
    setDatosNatural(null);
    setDatosJuridica(null);
    setDatosTCP(null);
    setCuentas([]);

    const id = cliente.id_cliente;
    const tipo = cliente.tipo_persona;

    const fetchTipo = async () => {
      try {
        if (tipo === "NATURAL") {
          const d = await clienteNaturalService.getClienteNatural(id);
          if (active) setDatosNatural(d);
        } else if (tipo === "JURIDICA") {
          const d = await clienteJuridicaService.getClienteJuridica(id);
          if (active) setDatosJuridica(d);
        } else if (tipo === "TCP") {
          const d = await clienteTCPService.getClienteTCP(id);
          if (active) setDatosTCP(d);
        }
      } catch (error) {
        console.error("Error al cargar datos del tipo de persona:", error);
      }
    };

    const fetchCuentas = async () => {
      try {
        const c = await cuentasService.getCuentasByCliente(id);
        if (active) setCuentas(c || []);
      } catch (error) {
        console.error("Error al cargar cuentas:", error);
        if (active) setCuentas([]);
      }
    };

    Promise.all([fetchTipo(), fetchCuentas()]).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [isOpen, cliente]);

  if (!isOpen || !cliente) return null;

  const Campo = ({
    label,
    value,
  }: {
    label: string;
    value?: React.ReactNode;
  }) => (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="font-medium text-gray-900 break-words">{value ?? "N/A"}</p>
    </div>
  );

  const TituloSeccion = ({ titulo }: { titulo: string }) => (
    <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
      <span className="h-3.5 w-1 rounded-full bg-gradient-to-b from-teal-500 to-cyan-500 shrink-0" />
      {titulo}
    </h4>
  );

  const iniciales = (cliente.nombre || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0])
    .join("")
    .toUpperCase();

  const etiquetaRelacion =
    cliente.tipo_relacion === "PROVEEDOR"
      ? "Proveedor"
      : cliente.tipo_relacion === "AMBAS"
        ? "Cliente y Proveedor"
        : "Cliente";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto animate-scale-in">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-lg font-bold tracking-wide text-white shadow-lg shadow-teal-500/20">
                {iniciales || <User className="h-7 w-7" />}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-teal-700/70">
                  {etiquetaRelacion}
                </p>
                <h3 className="truncate text-2xl font-bold tracking-tight text-gray-900">
                  {cliente.nombre || "(Sin nombre)"}
                </h3>
                <p className="text-sm text-gray-500">
                  Código: {cliente.codigo || "N/A"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                  cliente.estado === "ACTIVO"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {cliente.estado || "ACTIVO"}
              </span>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="p-2 rounded-full text-gray-400 transition-colors hover:bg-white/70 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-7">
          {/* Información del Cliente */}
          <section>
            <TituloSeccion titulo="Información del Cliente" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Campo label="Código" value={cliente.codigo || "N/A"} />
              <Campo label="Cédula/RIF" value={cliente.nit || "N/A"} />
              <Campo label="Tipo Persona" value={cliente.tipo_persona || "N/A"} />
              <Campo label="Tipo Relación" value={cliente.tipo_relacion || "N/A"} />
              <Campo label="Teléfono" value={cliente.telefono || "N/A"} />
              <Campo label="Email" value={cliente.email || "N/A"} />
              <Campo label="Fax" value={cliente.fax || "N/A"} />
              <Campo label="Web" value={cliente.web || "N/A"} />
              <Campo label="Código Postal" value={cliente.codigo_postal || "N/A"} />
              <Campo
                label="Provincia"
                value={cliente.provincia?.nombre || "N/A"}
              />
              <Campo
                label="Municipio"
                value={cliente.municipio?.nombre || "N/A"}
              />
              <Campo
                label="Fecha Registro"
                value={formatFecha(cliente.fecha_registro)}
              />
              <div className="col-span-2 md:col-span-3">
                <Campo label="Dirección" value={cliente.direccion || "N/A"} />
              </div>
            </div>
          </section>

          {/* Datos según tipo de persona */}
          <section>
            <TituloSeccion
              titulo={
                cliente.tipo_persona === "NATURAL"
                  ? "Datos Persona Natural"
                  : cliente.tipo_persona === "JURIDICA"
                    ? "Datos Persona Jurídica"
                    : "Datos TCP"
              }
            />
            {loading ? (
              <div className="flex items-center gap-2 text-slate-500 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                <span className="text-sm">Cargando datos...</span>
              </div>
            ) : cliente.tipo_persona === "NATURAL" && datosNatural ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Campo label="Nombre" value={datosNatural.nombre} />
                <Campo label="Primer Apellido" value={datosNatural.primer_apellido} />
                <Campo
                  label="Segundo Apellido"
                  value={datosNatural.segundo_apellido || "N/A"}
                />
                <Campo
                  label="Carnet de Identidad"
                  value={datosNatural.carnet_identidad || "N/A"}
                />
                <Campo
                  label="Código Expediente"
                  value={datosNatural.codigo_expediente || "N/A"}
                />
                <Campo
                  label="Número de Registro"
                  value={datosNatural.numero_registro || "N/A"}
                />
                <Campo label="Catálogo" value={datosNatural.catalogo || "N/A"} />
                <Campo
                  label="¿Es Trabajador?"
                  value={datosNatural.es_trabajador ? "Sí" : "No"}
                />
                {datosNatural.es_trabajador && (
                  <>
                    <Campo label="Ocupación" value={datosNatural.ocupacion || "N/A"} />
                    <Campo
                      label="Centro de Trabajo"
                      value={datosNatural.centro_trabajo || "N/A"}
                    />
                    <Campo
                      label="Correo Trabajo"
                      value={datosNatural.correo_trabajo || "N/A"}
                    />
                    <Campo
                      label="Dirección Trabajo"
                      value={datosNatural.direccion_trabajo || "N/A"}
                    />
                    <Campo
                      label="Teléfono Trabajo"
                      value={datosNatural.telefono_trabajo || "N/A"}
                    />
                    <Campo label="Vigencia" value={datosNatural.vigencia || "N/A"} />
                  </>
                )}
                <Campo label="¿En Baja?" value={datosNatural.en_baja ? "Sí" : "No"} />
                {datosNatural.en_baja && (
                  <Campo
                    label="Fecha de Baja"
                    value={datosNatural.fecha_baja || "N/A"}
                  />
                )}
              </div>
            ) : cliente.tipo_persona === "JURIDICA" && datosJuridica ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Campo label="Código REUP" value={datosJuridica.codigo_reup || "N/A"} />
                <Campo
                  label="Tipo de Entidad"
                  value={
                    tiposEntidad.find(
                      (t) => t.id_tipo_entidad === datosJuridica.id_tipo_entidad
                    )?.nombre || "N/A"
                  }
                />
              </div>
            ) : cliente.tipo_persona === "TCP" && datosTCP ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Campo label="Nombre" value={datosTCP.nombre || "N/A"} />
                <Campo
                  label="Primer Apellido"
                  value={datosTCP.primer_apellido || "N/A"}
                />
                <Campo
                  label="Segundo Apellido"
                  value={datosTCP.segundo_apellido || "N/A"}
                />
                <div className="col-span-2 md:col-span-2">
                  <Campo label="Dirección" value={datosTCP.direccion || "N/A"} />
                </div>
                <Campo
                  label="# Registro Proyecto"
                  value={datosTCP.numero_registro_proyecto || "N/A"}
                />
                <Campo
                  label="Fecha Aprobación"
                  value={formatFecha(datosTCP.fecha_aprobacion)}
                />
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-2">
                No hay datos registrados de tipo de persona.
              </p>
            )}
          </section>

          {/* Cuentas Bancarias */}
          {!loading && cuentas.length > 0 && (
            <section>
              <TituloSeccion
                titulo={`Cuentas Bancarias · ${cuentas.length}`}
              />
              <div className="overflow-auto border border-gray-200 rounded-xl">
                <Table>
                  <TableHeader className="bg-teal-50/60">
                    <TableRow>
                      <TableHead>Titular</TableHead>
                      <TableHead>Banco</TableHead>
                      <TableHead>Sucursal</TableHead>
                      <TableHead>Número Cuenta</TableHead>
                      <TableHead>Dirección</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cuentas.map((cuenta) => (
                      <TableRow key={cuenta.id_cuenta ?? `${cuenta.banco}-${cuenta.numero_cuenta}`}>
                        <TableCell>{cuenta.titular || "N/A"}</TableCell>
                        <TableCell>{cuenta.banco || "N/A"}</TableCell>
                        <TableCell>{cuenta.sucursal ?? "N/A"}</TableCell>
                        <TableCell>{cuenta.numero_cuenta || "N/A"}</TableCell>
                        <TableCell>{cuenta.direccion || "N/A"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 bg-white border border-gray-300 transition-colors hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ClienteDetailModal;