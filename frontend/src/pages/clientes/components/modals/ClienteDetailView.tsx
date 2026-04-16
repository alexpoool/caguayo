import { ArrowLeft } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../../components/ui";
import type {
  Cliente,
  ClienteNatural,
  ClienteJuridica,
  ClienteTCP,
  Cuenta,
  TipoEntidad,
} from "../../../../types/ventas";

export interface ClienteDetailViewProps {
  viewingCliente: Cliente | null;
  setView: (view: "list" | "form" | "detail") => void;
  setViewingCliente: (cliente: Cliente | null) => void;
  datosNatural?: ClienteNatural | null;
  datosJuridica?: ClienteJuridica | null;
  datosTCP?: ClienteTCP | null;
  tiposEntidad?: TipoEntidad[];
  cuentasCliente?: Cuenta[];
}

export function ClienteDetailView({
  viewingCliente,
  setView,
  setViewingCliente,
  datosNatural,
  datosJuridica,
  datosTCP,
  tiposEntidad = [],
  cuentasCliente = [],
}: ClienteDetailViewProps) {
  if (!viewingCliente) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">
          Detalles del Cliente
        </h1>
        <Button
          variant="secondary"
          onClick={() => {
            setView("list");
            setViewingCliente(null);
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>

      {/* Información General */}
      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label># Cliente</Label>
            <p className="font-medium">
              {viewingCliente.numero_cliente || "N/A"}
            </p>
          </div>
          <div>
            <Label>Nombre</Label>
            <p className="font-medium">{viewingCliente.nombre}</p>
          </div>
          <div>
            <Label>Cédula/RIF</Label>
            <p className="font-medium">{viewingCliente.cedula_rif || "N/A"}</p>
          </div>
          <div>
            <Label>Tipo Persona</Label>
            <p className="font-medium">{viewingCliente.tipo_persona}</p>
          </div>
          <div>
            <Label>Tipo Relación</Label>
            <p className="font-medium">{viewingCliente.tipo_relacion}</p>
          </div>
          <div>
            <Label>Estado</Label>
            <p className="font-medium">{viewingCliente.estado}</p>
          </div>
          <div>
            <Label>Teléfono</Label>
            <p className="font-medium">{viewingCliente.telefono || "N/A"}</p>
          </div>
          <div>
            <Label>Email</Label>
            <p className="font-medium">{viewingCliente.email || "N/A"}</p>
          </div>
          <div>
            <Label>Fax</Label>
            <p className="font-medium">{viewingCliente.fax || "N/A"}</p>
          </div>
          <div>
            <Label>Web</Label>
            <p className="font-medium">{viewingCliente.web || "N/A"}</p>
          </div>
          <div>
            <Label>Código Postal</Label>
            <p className="font-medium">
              {viewingCliente.codigo_postal || "N/A"}
            </p>
          </div>
          <div>
            <Label>Provincia</Label>
            <p className="font-medium">
              {viewingCliente.provincia?.nombre || "N/A"}
            </p>
          </div>
          <div>
            <Label>Municipio</Label>
            <p className="font-medium">
              {viewingCliente.municipio?.nombre || "N/A"}
            </p>
          </div>
          <div>
            <Label>Fecha Registro</Label>
            <p className="font-medium">{viewingCliente.fecha_registro}</p>
          </div>
          <div className="md:col-span-3">
            <Label>Dirección</Label>
            <p className="font-medium">{viewingCliente.direccion}</p>
          </div>
        </CardContent>
      </Card>

      {/* Datos según tipo de persona */}
      {viewingCliente.tipo_persona === "NATURAL" && datosNatural && (
        <Card>
          <CardHeader>
            <CardTitle>Datos Persona Natural</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Nombre</Label>
              <p className="font-medium">{datosNatural.nombre || "N/A"}</p>
            </div>
            <div>
              <Label>Primer Apellido</Label>
              <p className="font-medium">
                {datosNatural.primer_apellido || "N/A"}
              </p>
            </div>
            <div>
              <Label>Segundo Apellido</Label>
              <p className="font-medium">
                {datosNatural.segundo_apellido || "N/A"}
              </p>
            </div>
            <div>
              <Label>Carnet de Identidad</Label>
              <p className="font-medium">
                {datosNatural.carnet_identidad || "N/A"}
              </p>
            </div>
            <div>
              <Label>Código Expediente</Label>
              <p className="font-medium">
                {datosNatural.codigo_expediente || "N/A"}
              </p>
            </div>
            <div>
              <Label>Número de Registro</Label>
              <p className="font-medium">
                {datosNatural.numero_registro || "N/A"}
              </p>
            </div>
            <div>
              <Label>Catálogo</Label>
              <p className="font-medium">{datosNatural.catalogo || "N/A"}</p>
            </div>
            <div>
              <Label>¿Es Trabajador?</Label>
              <p className="font-medium">
                {datosNatural.es_trabajador ? "Sí" : "No"}
              </p>
            </div>
            {datosNatural.es_trabajador && (
              <>
                <div>
                  <Label>Ocupación</Label>
                  <p className="font-medium">
                    {datosNatural.ocupacion || "N/A"}
                  </p>
                </div>
                <div>
                  <Label>Centro de Trabajo</Label>
                  <p className="font-medium">
                    {datosNatural.centro_trabajo || "N/A"}
                  </p>
                </div>
                <div>
                  <Label>Correo Trabajo</Label>
                  <p className="font-medium">
                    {datosNatural.correo_trabajo || "N/A"}
                  </p>
                </div>
                <div>
                  <Label>Dirección Trabajo</Label>
                  <p className="font-medium">
                    {datosNatural.direccion_trabajo || "N/A"}
                  </p>
                </div>
                <div>
                  <Label>Teléfono Trabajo</Label>
                  <p className="font-medium">
                    {datosNatural.telefono_trabajo || "N/A"}
                  </p>
                </div>
                <div>
                  <Label>Vigencia</Label>
                  <p className="font-medium">
                    {datosNatural.vigencia || "N/A"}
                  </p>
                </div>
              </>
            )}
            <div>
              <Label>¿En Baja?</Label>
              <p className="font-medium">
                {datosNatural.en_baja ? "Sí" : "No"}
              </p>
            </div>
            {datosNatural.en_baja && (
              <div>
                <Label>Fecha de Baja</Label>
                <p className="font-medium">
                  {datosNatural.fecha_baja || "N/A"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {viewingCliente.tipo_persona === "JURIDICA" && datosJuridica && (
        <Card>
          <CardHeader>
            <CardTitle>Datos Persona Jurídica</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Código REUP</Label>
              <p className="font-medium">
                {datosJuridica.codigo_reup || "N/A"}
              </p>
            </div>
            <div>
              <Label>Tipo de Entidad</Label>
              <p className="font-medium">
                {tiposEntidad.find(
                  (t) => t.id_tipo_entidad === datosJuridica.id_tipo_entidad,
                )?.nombre || "N/A"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {viewingCliente.tipo_persona === "TCP" && datosTCP && (
        <Card>
          <CardHeader>
            <CardTitle>Datos TCP</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Nombre</Label>
              <p className="font-medium">{datosTCP.nombre || "N/A"}</p>
            </div>
            <div>
              <Label>Primer Apellido</Label>
              <p className="font-medium">{datosTCP.primer_apellido || "N/A"}</p>
            </div>
            <div>
              <Label>Segundo Apellido</Label>
              <p className="font-medium">
                {datosTCP.segundo_apellido || "N/A"}
              </p>
            </div>
            <div className="md:col-span-2">
              <Label>Dirección</Label>
              <p className="font-medium">{datosTCP.direccion || "N/A"}</p>
            </div>
            <div>
              <Label># Registro Proyecto</Label>
              <p className="font-medium">
                {datosTCP.numero_registro_proyecto || "N/A"}
              </p>
            </div>
            <div>
              <Label>Fecha Aprobación</Label>
              <p className="font-medium">
                {datosTCP.fecha_aprobacion || "N/A"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cuentas Bancarias */}
      {cuentasCliente.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cuentas Bancarias</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titular</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Número Cuenta</TableHead>
                  <TableHead>Dirección</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cuentasCliente.map((cuenta) => (
                  <TableRow key={cuenta.id_cuenta}>
                    <TableCell>{cuenta.titular}</TableCell>
                    <TableCell>{cuenta.banco}</TableCell>
                    <TableCell>{cuenta.sucursal}</TableCell>
                    <TableCell>{cuenta.numero_cuenta || "N/A"}</TableCell>
                    <TableCell>{cuenta.direccion}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
