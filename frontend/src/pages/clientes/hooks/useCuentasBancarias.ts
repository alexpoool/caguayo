import { useState, useCallback } from "react";
import type { Cuenta } from "../../../types/ventas";
import toast from "react-hot-toast";

export function useCuentasBancarias(initialCuentas: Cuenta[] = []) {
  const [cuentas, setCuentas] = useState<Cuenta[]>(initialCuentas);

  const agregarCuenta = useCallback(() => {
    setCuentas([
      ...cuentas,
      {
        id_cuenta: 0,
        banco: "",
        numero_cuenta: "",
        titular: "",
        direccion: "",
      },
    ]);
  }, [cuentas]);

  const eliminarCuenta = useCallback(
    (index: number) => {
      setCuentas(cuentas.filter((_, i) => i !== index));
    },
    [cuentas]
  );

  const updateCuenta = useCallback(
    (index: number, field: keyof Cuenta, value: any) => {
      const nuevasCuentas = [...cuentas];
      nuevasCuentas[index] = { ...nuevasCuentas[index], [field]: value };
      setCuentas(nuevasCuentas);
    },
    [cuentas]
  );

  return {
    cuentas,
    setCuentas,
    agregarCuenta,
    eliminarCuenta,
    updateCuenta,
  };
}