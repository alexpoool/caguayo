import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../../../components/ui"
import { Label } from "../../../../../components/ui"
import { Input } from "../../../../../components/ui"

export interface DatosNaturalFormProps {
  datosNaturalForm: any;
  setDatosNaturalForm: React.Dispatch<React.SetStateAction<any>>;
}

export const NaturalForm: React.FC<DatosNaturalFormProps> = ({
  datosNaturalForm,
  setDatosNaturalForm,
}) => {
  return (
    <Card className="mb-6 shadow-sm border-gray-200">
      <CardHeader className="border-b bg-gray-50/50">
        <CardTitle>Datos Persona Natural</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div>
          <Label>Nombre</Label>
          <Input
            value={datosNaturalForm.nombre || ""}
            onChange={(e) =>
              setDatosNaturalForm({
                ...datosNaturalForm,
                nombre: e.target.value,
              })
            }
          />
        </div>
        <div>
          <Label>Primer Apellido</Label>
          <Input
            value={datosNaturalForm.primer_apellido || ""}
            onChange={(e) =>
              setDatosNaturalForm({
                ...datosNaturalForm,
                primer_apellido: e.target.value,
              })
            }
          />
        </div>
        <div>
          <Label>Segundo Apellido</Label>
          <Input
            value={datosNaturalForm.segundo_apellido || ""}
            onChange={(e) =>
              setDatosNaturalForm({
                ...datosNaturalForm,
                segundo_apellido: e.target.value,
              })
            }
          />
        </div>
        <div>
          <Label>Carnet de Identidad</Label>
          <Input
            value={datosNaturalForm.carnet_identidad || ""}
            onChange={(e) =>
              setDatosNaturalForm({
                ...datosNaturalForm,
                carnet_identidad: e.target.value,
              })
            }
          />
        </div>
        <div>
          <Label>Código Expediente</Label>
          <Input
            value={datosNaturalForm.codigo_expediente || ""}
            onChange={(e) =>
              setDatosNaturalForm({
                ...datosNaturalForm,
                codigo_expediente: e.target.value,
              })
            }
          />
        </div>
        <div>
          <Label># de Registro</Label>
          <Input
            value={datosNaturalForm.numero_registro || ""}
            onChange={(e) =>
              setDatosNaturalForm({
                ...datosNaturalForm,
                numero_registro: e.target.value,
              })
            }
          />
        </div>
        <div>
          <Label>Catálogo</Label>
          <Input
            value={datosNaturalForm.catalogo || ""}
            onChange={(e) =>
              setDatosNaturalForm({
                ...datosNaturalForm,
                catalogo: e.target.value,
              })
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            aria-label="Es trabajador"
            checked={datosNaturalForm.es_trabajador || false}
            onChange={(e) =>
              setDatosNaturalForm({
                ...datosNaturalForm,
                es_trabajador: e.target.checked,
              })
            }
          />
          <Label className="mb-0">¿Es trabajador?</Label>
        </div>
        {datosNaturalForm.es_trabajador && (
          <>
            <div>
              <Label>Ocupación</Label>
              <Input
                value={datosNaturalForm.ocupacion || ""}
                onChange={(e) =>
                  setDatosNaturalForm({
                    ...datosNaturalForm,
                    ocupacion: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Centro de Trabajo</Label>
              <Input
                value={datosNaturalForm.centro_trabajo || ""}
                onChange={(e) =>
                  setDatosNaturalForm({
                    ...datosNaturalForm,
                    centro_trabajo: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Correo Trabajo</Label>
              <Input
                type="email"
                value={datosNaturalForm.correo_trabajo || ""}
                onChange={(e) =>
                  setDatosNaturalForm({
                    ...datosNaturalForm,
                    correo_trabajo: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Dirección Trabajo</Label>
              <Input
                value={datosNaturalForm.direccion_trabajo || ""}
                onChange={(e) =>
                  setDatosNaturalForm({
                    ...datosNaturalForm,
                    direccion_trabajo: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Teléfono Trabajo</Label>
              <Input
                value={datosNaturalForm.telefono_trabajo || ""}
                onChange={(e) =>
                  setDatosNaturalForm({
                    ...datosNaturalForm,
                    telefono_trabajo: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>Vigencia</Label>
              <Input
                type="date"
                value={datosNaturalForm.vigencia || ""}
                onChange={(e) =>
                  setDatosNaturalForm({
                    ...datosNaturalForm,
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
            checked={datosNaturalForm.en_baja || false}
            onChange={(e) =>
              setDatosNaturalForm({
                ...datosNaturalForm,
                en_baja: e.target.checked,
              })
            }
          />
          <Label className="mb-0">¿En baja?</Label>
        </div>
        {datosNaturalForm.en_baja && (
          <div>
            <Label>Fecha de Baja</Label>
            <Input
              type="date"
              value={datosNaturalForm.fecha_baja || ""}
              onChange={(e) =>
                setDatosNaturalForm({
                  ...datosNaturalForm,
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
