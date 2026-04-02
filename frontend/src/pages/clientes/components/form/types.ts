export type TipoPersona = "NATURAL" | "JURIDICA" | "TCP";
export type TipoRelacion = "CLIENTE" | "PROVEEDOR" | "AMBAS";
export type EstadoCliente = "ACTIVO" | "INACTIVO";

export interface NuevaCuenta {
  titular: string;
  banco: string;
  sucursal: number;
  id_moneda?: number;
  numero_cuenta: string;
}
