import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../../../components/ui"
import { Label } from "../../../../../components/ui"
import { Input } from "../../../../../components/ui"

export interface DatosTCPFormProps {
  datosTCPForm: any;
  setDatosTCPForm: React.Dispatch<React.SetStateAction<any>>;
  formErrors: any;
}

export const TCPForm: React.FC<DatosTCPFormProps> = ({
  datosTCPForm,
  setDatosTCPForm,
  formErrors,
}) => {
  return (
    <Card className="mb-6 shadow-sm border-gray-200">
      <CardHeader className="border-b bg-gray-50/50">
        <CardTitle>Datos TCP (Trabajo por Cuenta Propia)</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="md:col-span-2">
          <Label>Nombre del Líder *</Label>
          <Input
            value={datosTCPForm.nombre || ""}
            onChange={(e) =>
              setDatosTCPForm({ ...datosTCPForm, nombre: e.target.value })
            }
            className={formErrors.tcp_nombre ? "border-red-500" : ""}
          />
          {formErrors.tcp_nombre && (
            <p className="text-red-500 text-sm">{formErrors.tcp_nombre}</p>
          )}
        </div>
        <div>
          <Label>Primer Apellido</Label>
          <Input
            value={datosTCPForm.primer_apellido || ""}
            onChange={(e) =>
              setDatosTCPForm({
                ...datosTCPForm,
                primer_apellido: e.target.value,
              })
            }
          />
        </div>
        <div>
          <Label>Segundo Apellido</Label>
          <Input
            value={datosTCPForm.segundo_apellido || ""}
            onChange={(e) =>
              setDatosTCPForm({
                ...datosTCPForm,
                segundo_apellido: e.target.value,
              })
            }
          />
        </div>
        <div className="md:col-span-2">
          <Label>Dirección</Label>
          <Input
            value={datosTCPForm.direccion || ""}
            onChange={(e) =>
              setDatosTCPForm({
                ...datosTCPForm,
                direccion: e.target.value,
              })
            }
          />
        </div>
        <div>
          <Label># de Registro del Proyecto</Label>
          <Input
            value={datosTCPForm.numero_registro_proyecto || ""}
            onChange={(e) =>
              setDatosTCPForm({
                ...datosTCPForm,
                numero_registro_proyecto: e.target.value,
              })
            }
          />
        </div>
        <div>
          <Label>Fecha de Aprobación</Label>
          <Input
            type="date"
            value={datosTCPForm.fecha_aprobacion || ""}
            onChange={(e) =>
              setDatosTCPForm({
                ...datosTCPForm,
                fecha_aprobacion: e.target.value,
              })
            }
          />
        </div>
      </CardContent>
    </Card>
  );
};
