import React from "react";
import { Label } from "../../../../../components/ui"
import { Input } from "../../../../../components/ui"
import { DateInput } from "../../../../../components/ui"
import { Select } from "../../../../../components/ui"
import { AlertTriangle } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { configuracionService } from "../../../../../services/administracion"
import type { Especialidad } from "../../../../../types/index"

export interface DatosNaturalFormProps {
  datos: any;
  setDatos: React.Dispatch<React.SetStateAction<any>>;
  /** marca el campo que hay que corregir tras la migración */
  campoACorregir?: string | null;
  razon?: string | null;
}

export const NaturalForm: React.FC<DatosNaturalFormProps> = ({
  datos,
  setDatos,
  campoACorregir,
  razon,
}) => {
  const data = datos || {};
  const ciMarcado = campoACorregir === "carnet_identidad";

  const { data: especialidades = [] } = useQuery<Especialidad[]>({
    queryKey: ["especialidades"],
    queryFn: () => configuracionService.getEspecialidades(false),
    staleTime: 5 * 60 * 1000,
  });

  // Se piden todas, no sólo las activas: si el artista ya tiene asignada una
  // especialidad desactivada, tiene que seguir viéndose (marcada) en lugar de
  // aparecer como si no tuviera ninguna.
  const asignada = data.id_especialidad ?? null;
  const opciones = especialidades.filter(
    (e) => e.activo || e.id_especialidad === asignada
  );
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <div className={ciMarcado ? "md:col-span-3" : ""}>
          <Label>Carnet de Identidad</Label>
          <Input
            value={data.carnet_identidad || ""}
            onChange={(e) =>
              setDatos({
                ...data,
                carnet_identidad: e.target.value,
              })
            }
            className={ciMarcado ? "border-amber-500 bg-amber-50/60 ring-1 ring-amber-300" : ""}
          />
          {ciMarcado && (
            <p className="mt-1 flex items-start gap-1 text-xs text-amber-700">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>
                Campo pendiente de corrección: debe tener 11 dígitos.
                {razon ? ` ${razon}` : ""}
              </span>
            </p>
          )}
        </div>
        <div>
          <Label>Especialidad</Label>
          <Select
            value={data.id_especialidad ?? ""}
            onChange={(e) =>
              setDatos({
                ...data,
                id_especialidad: e.target.value ? Number(e.target.value) : null,
              })
            }
          >
            <option value="">Sin especificar</option>
            {opciones.map((esp) => (
              <option key={esp.id_especialidad} value={esp.id_especialidad}>
                {esp.nombre}
                {esp.activo ? "" : " (desactivada)"}
              </option>
            ))}
          </Select>
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
              <DateInput
                value={data.vigencia || ""}
                onChange={(vigencia) =>
                  setDatos({
                    ...data,
                    vigencia,
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
            <DateInput
              value={data.fecha_baja || ""}
              onChange={(fecha_baja) =>
                setDatos({
                  ...data,
                  fecha_baja,
                })
              }
            />
          </div>
        )}
    </div>
  );
};
