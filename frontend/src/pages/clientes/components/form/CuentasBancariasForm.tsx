import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../../components/ui"
import { Button } from "../../../../components/ui"
import { Input } from "../../../../components/ui"
import { Select } from "../../../../components/ui"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../../../../components/ui"
import { CreditCard, Plus, Trash2 } from "lucide-react";
import { NuevaCuenta } from "./types";

export interface CuentasBancariasFormProps {
  nuevaCuenta: NuevaCuenta;
  setNuevaCuenta: React.Dispatch<React.SetStateAction<NuevaCuenta>>;
  monedas: any[];
  cuentas: any[];
  addCuenta: () => void;
  removeCuenta: (index: number) => void;
}

export const CuentasBancariasForm: React.FC<CuentasBancariasFormProps> = ({
  nuevaCuenta,
  setNuevaCuenta,
  monedas,
  cuentas,
  addCuenta,
  removeCuenta,
}) => {
  return (
    <Card className="mb-6 shadow-sm border-gray-200">
      <CardHeader className="border-b bg-gray-50/50">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="h-5 w-5 text-teal-600" />
          Cuentas Bancarias
        </CardTitle>
      </CardHeader>
      <CardContent className="mt-4">
        <div className="grid grid-cols-6 gap-2 mb-4">
          <Input
            placeholder="Titular"
            aria-label="Titular cuenta"
            value={nuevaCuenta.titular || ""}
            onChange={(e) =>
              setNuevaCuenta({ ...nuevaCuenta, titular: e.target.value })
            }
          />
          <Input
            placeholder="Banco"
            aria-label="Banco cuenta"
            value={nuevaCuenta.banco || ""}
            onChange={(e) =>
              setNuevaCuenta({ ...nuevaCuenta, banco: e.target.value })
            }
          />
          <Input
            placeholder="Sucursal"
            aria-label="Sucursal cuenta"
            type="number"
            value={nuevaCuenta.sucursal || ""}
            onChange={(e) =>
              setNuevaCuenta({
                ...nuevaCuenta,
                sucursal: parseInt(e.target.value) || 0,
              })
            }
          />
          <select
            aria-label="Moneda cuenta"
            value={nuevaCuenta.id_moneda || ""}
            onChange={(e) =>
              setNuevaCuenta({
                ...nuevaCuenta,
                id_moneda: e.target.value
                  ? parseInt(e.target.value)
                  : undefined,
              })
            }
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Moneda</option>
            {monedas.map((m) => (
              <option key={m.id_moneda} value={m.id_moneda}>
                {m.simbolo} - {m.nombre}
              </option>
            ))}
          </select>
          <Input
            placeholder="# Cuenta"
            aria-label="Numero cuenta"
            value={nuevaCuenta.numero_cuenta || ""}
            onChange={(e) =>
              setNuevaCuenta({
                ...nuevaCuenta,
                numero_cuenta: e.target.value,
              })
            }
          />
          <Button
            type="button"
            aria-label="Agregar cuenta"
            onClick={addCuenta}
            variant="outline"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {cuentas.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titular</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead>Sucursal</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead># Cuenta</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cuentas.map((cuenta, index) => (
                <TableRow key={index}>
                  <TableCell>{cuenta.titular}</TableCell>
                  <TableCell>{cuenta.banco}</TableCell>
                  <TableCell>{cuenta.sucursal}</TableCell>
                  <TableCell>
                    {monedas.find((m) => m.id_moneda === cuenta.id_moneda)
                      ?.simbolo || "-"}
                  </TableCell>
                  <TableCell>{cuenta.numero_cuenta}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      aria-label="Eliminar cuenta"
                      title="Eliminar cuenta"
                      onClick={() => removeCuenta(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
