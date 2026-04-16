import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../../../components/ui"
import { Label } from "../../../../../components/ui"
import { Input } from "../../../../../components/ui"

export interface DatosTCPFormProps {
  datos: any;
  setDatos: React.Dispatch<React.SetStateAction<any>>;
  formErrors?: any;
}

export const TCPForm: React.FC<DatosTCPFormProps> = ({
  datos,
  setDatos,
  formErrors,
}) => {
  const data = datos || {};
  const errors = formErrors || {};
  
  return (
    <Card className="mb-6 shadow-sm border-gray-200">
      <CardHeader className="border-b bg-gray-50/50">
        <CardTitle>Datos TCP (Trabajo por Cuenta Propia)</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="md:col-span-2">
          <Label>Nombre del Líder *</Label>
          <Input
            value={data.nombre || ""}
            onChange={(e) =>
              setDatos({ ...data, nombre: e.target.value })
            }
            className={errors.tcp_nombre ? "border-red-500" : ""}
          />
          {errors.tcp_nombre && (
            <p className="text-red-500 text-sm">{errors.tcp_nombre}</p>
          )}
        </div>
        <div>
          <Label>Primer Apellido</Label>
          <Input
            value={data.primer_apellido || ""}
            onChange={(e) =>
              setDatos({
                ...data,
                primer_apellido: e.target.value,
              })
            }
          />
        </div>
        <div>
          <Label>Segundo Apellido</Label>
          <Input
            value={data.segundo_apellido || ""}
            onChange={(e) =>
              setDatos({
                ...data,
                segundo_apellido: e.target.value,
              })
            }
          />
        </div>
        <div className="md:col-span-2">
          <Label>Dirección</Label>
          <Input
            value={data.direccion || ""}
            onChange={(e) =>
              setDatos({
                ...data,
                direccion: e.target.value,
              })
            }
          />
        </div>
        <div>
          <Label># de Registro del Proyecto</Label>
          <Input
            value={data.numero_registro_proyecto || ""}
            onChange={(e) =>
              setDatos({
                ...data,
                numero_registro_proyecto: e.target.value,
              })
            }
          />
        </div>
        <div>
          <Label>Fecha de Aprobación</Label>
          <div className="flex gap-2">
            <input
              type="date"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-colors"
              value={data.fecha_aprobacion || ""}
              onChange={(e) =>
                setDatos({
                  ...data,
                  fecha_aprobacion: e.target.value,
                })
              }
            />
            <button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setDatos({
                  ...data,
                  fecha_aprobacion: today,
                });
              }}
              className="px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium whitespace-nowrap"
            >
              Hoy
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
