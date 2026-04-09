import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../../../components/ui"
import { Label } from "../../../../../components/ui"
import { Input } from "../../../../../components/ui"

export interface DatosNaturalFormProps {
  datos: any;
  setDatos: React.Dispatch<React.SetStateAction<any>>;
}

export const NaturalForm: React.FC<DatosNaturalFormProps> = ({
  datos,
  setDatos,
}) => {
  const data = datos || {};
  
  return (
    <Card className="mb-6 shadow-sm border-gray-200">
      <CardHeader className="border-b bg-gray-50/50">
        <CardTitle>Datos Persona Natural</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div>
          <Label>Nombre</Label>
          <Input
            value={data.nombre || ""}
            onChange={(e) =>
              setDatos({
                ...data,
                nombre: e.target.value,
              })
            }
          />
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
        <div>
          <Label>Carnet de Identidad</Label>
          <Input
            value={data.carnet_identidad || ""}
            onChange={(e) =>
              setDatos({
                ...data,
                carnet_identidad: e.target.value,
              })
            }
          />
        </div>
        <div>
          <Label>Código Expediente</Label>
          <Input
            value={data.codigo_expediente || ""}
            onChange={(e) =>
              setDatos({
                ...data,
                codigo_expediente: e.target.value,
              })
            }
          />
        </div>
        <div>
          <Label># de Registro</Label>
          <Input
            value={data.numero_registro || ""}
            onChange={(e) =>
              setDatos({
                ...data,
                numero_registro: e.target.value,
              })
            }
          />
        </div>
        <div>
          <Label>Catálogo</Label>
          <Input
            value={data.catalogo || ""}
            onChange={(e) =>
              setDatos({
                ...data,
                catalogo: e.target.value,
              })
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            aria-label="Es trabajador"
            checked={data.es_trabajador || false}
            onChange={(e) =>
              setDatos({
                ...data,
                es_trabajador: e.target.checked,
              })
            }
          />
          <Label className="mb-0">¿Es trabajador?</Label>
        </div>
        {data.es_trabajador && (
          <>
            <div>
              <Label>Ocupación</Label>
              <Input
                value={data.ocupacion || ""}
                onChange={(e) =>
                  setDatos({
                    ...data,
                    ocupacion: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Centro de Trabajo</Label>
              <Input
                value={data.centro_trabajo || ""}
                onChange={(e) =>
                  setDatos({
                    ...data,
                    centro_trabajo: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Correo Trabajo</Label>
              <Input
                type="email"
                value={data.correo_trabajo || ""}
                onChange={(e) =>
                  setDatos({
                    ...data,
                    correo_trabajo: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Dirección Trabajo</Label>
              <Input
                value={data.direccion_trabajo || ""}
                onChange={(e) =>
                  setDatos({
                    ...data,
                    direccion_trabajo: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Teléfono Trabajo</Label>
              <Input
                value={data.telefono_trabajo || ""}
                onChange={(e) =>
                  setDatos({
                    ...data,
                    telefono_trabajo: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Vigencia</Label>
              <Input
                type="date"
                value={data.vigencia || ""}
                onChange={(e) =>
                  setDatos({
                    ...data,
                    vigencia: e.target.value,
                  })
                }
              />
            </div>
          </>
        )}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            aria-label="En baja"
            checked={data.en_baja || false}
            onChange={(e) =>
              setDatos({
                ...data,
                en_baja: e.target.checked,
              })
            }
          />
          <Label className="mb-0">¿En baja?</Label>
        </div>
        {data.en_baja && (
          <div>
            <Label>Fecha de Baja</Label>
            <Input
              type="date"
              value={data.fecha_baja || ""}
              onChange={(e) =>
                setDatos({
                  ...data,
                  fecha_baja: e.target.value,
                })
              }
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
