import React from "react";
import { Label, Input } from "@/shared/ui/components";
import { Banknote, User, Landmark, Hash, Type, Globe } from "lucide-react";
import type { Cuenta, Moneda } from "../../../domain/terceros";

export interface CuentaFormProps {
  datos: Partial<Cuenta>;
  setDatos: React.Dispatch<React.SetStateAction<Partial<Cuenta>>>;
  monedas: Moneda[];
  formErrors?: Record<string, string>;
}

export const CuentaForm: React.FC<CuentaFormProps> = ({
  datos,
  setDatos,
  monedas,
  formErrors = {},
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-gray-700">
          <Banknote className="h-5 w-5 text-brand-500" />
          Moneda
        </Label>
        <select
          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none bg-white"
          value={datos.id_moneda || ""}
          onChange={(e) =>
            setDatos({
              ...datos,
              id_moneda: parseInt(e.target.value) || undefined,
            })
          }
        >
          <option value="">Seleccione una moneda</option>
          {monedas.map((m) => (
            <option key={m.id_moneda} value={m.id_moneda}>
              {m.denominacion}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-gray-700">
          <User className="h-5 w-5 text-green-500" />
          Titular *
        </Label>
        <Input
          type="text"
          value={datos.titular || ""}
          onChange={(e) => setDatos({ ...datos, titular: e.target.value })}
          className={`mt-1 ${formErrors.titular ? "border-red-500" : ""}`}
          placeholder="Nombre del titular"
        />
        {formErrors.titular && (
          <p className="text-red-500 text-sm">{formErrors.titular}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-gray-700">
          <Landmark className="h-5 w-5 text-orange-500" />
          Banco *
        </Label>
        <Input
          type="text"
          value={datos.banco || ""}
          onChange={(e) => setDatos({ ...datos, banco: e.target.value })}
          className={`mt-1 ${formErrors.banco ? "border-red-500" : ""}`}
          placeholder="Nombre del banco"
        />
        {formErrors.banco && (
          <p className="text-red-500 text-sm">{formErrors.banco}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-gray-700">
          <Hash className="h-5 w-5 text-brand-500" />
          Número de Cuenta *
        </Label>
        <Input
          type="text"
          value={datos.numero_cuenta || ""}
          onChange={(e) =>
            setDatos({ ...datos, numero_cuenta: e.target.value })
          }
          className={`mt-1 ${formErrors.numero_cuenta ? "border-red-500" : ""}`}
          placeholder="Número de cuenta"
        />
        {formErrors.numero_cuenta && (
          <p className="text-red-500 text-sm">{formErrors.numero_cuenta}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-gray-700">
          <Type className="h-5 w-5 text-gray-500" />
          Sucursal
        </Label>
        <Input
          type="number"
          value={datos.sucursal ?? ""}
          onChange={(e) =>
            setDatos({
              ...datos,
              sucursal: e.target.value
                ? parseInt(e.target.value)
                : undefined,
            })
          }
          className="mt-1"
          placeholder="Número de sucursal (opcional)"
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-gray-700">
          <Globe className="h-5 w-5 text-brand-500" />
          Dirección *
        </Label>
        <Input
          type="text"
          value={datos.direccion || ""}
          onChange={(e) => setDatos({ ...datos, direccion: e.target.value })}
          className={`mt-1 ${formErrors.direccion ? "border-red-500" : ""}`}
          placeholder="Dirección de la cuenta"
        />
        {formErrors.direccion && (
          <p className="text-red-500 text-sm">{formErrors.direccion}</p>
        )}
      </div>
    </div>
  );
};

export default CuentaForm;
