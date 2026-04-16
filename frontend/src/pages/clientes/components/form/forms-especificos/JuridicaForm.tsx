import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../../../components/ui"
import { Label } from "../../../../../components/ui"
import { Input } from "../../../../../components/ui"

export interface DatosJuridicaFormProps {
  datos: any;
  setDatos: React.Dispatch<React.SetStateAction<any>>;
  tiposEntidad: any[];
}

export const JuridicaForm: React.FC<DatosJuridicaFormProps> = ({
  datos,
  setDatos,
  tiposEntidad,
}) => {
  const data = datos || {};
  
  return (
    <Card className="mb-6 shadow-sm border-gray-200">
      <CardHeader className="border-b bg-gray-50/50">
        <CardTitle>Datos Persona Jurídica</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div>
          <Label>Código REUP</Label>
          <Input
            value={data.codigo_reup || ""}
            onChange={(e) =>
              setDatos({
                ...data,
                codigo_reup: e.target.value,
              })
            }
            placeholder="123.45.67890"
          />
        </div>
        <div>
          <Label>Tipo de Entidad</Label>
          <select
            aria-label="Tipo de Entidad"
            value={data.id_tipo_entidad || ""}
            onChange={(e) =>
              setDatos({
                ...data,
                id_tipo_entidad: e.target.value
                  ? parseInt(e.target.value)
                  : undefined,
              })
            }
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white"
          >
            <option value="">Seleccione tipo</option>
            {tiposEntidad.map((t) => (
              <option key={t.id_tipo_entidad} value={t.id_tipo_entidad}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>
      </CardContent>
    </Card>
  );
};
