import { FacturasPage } from "./FacturasPage";

/**
 * Página de pre-facturas de tienda.
 *
 * Reutiliza toda la UI de facturas (items, totales, pagos, documento y
 * detalle); la única diferencia es el tipo y que no toca stock hasta
 * aprobarse como factura.
 */
export function PreFacturasPage() {
  return <FacturasPage tipo="PREFACTURA" />;
}
