/**
 * Utilidades para gestión de facturas
 * Funciones puras reutilizables sin estado
 */

export interface SelectedProduct {
  id_producto: number;
  cantidad: number;
  precio_venta: number;
  id_moneda?: number;
  id_anexo?: number;
}

/**
 * Calcula el total de una factura basado en productos seleccionados
 */
export function calcularTotal(products: SelectedProduct[]): number {
  return products.reduce((total, product) => {
    return total + product.cantidad * product.precio_venta;
  }, 0);
}

/**
 * Valida que el formulario tenga datos requeridos
 */
export function validarFactura(data: {
  id_contrato?: number;
  fecha?: string;
  id_moneda?: number;
  items?: SelectedProduct[];
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.id_contrato) {
    errors.push('Debe seleccionar un contrato');
  }

  if (!data.fecha) {
    errors.push('Debe seleccionar una fecha');
  }

  if (!data.items || data.items.length === 0) {
    errors.push('Debe agregar al menos un producto');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Formatea una cantidad a moneda
 */
export function formatearMoneda(amount: number, decimales = 2): string {
  return Number(amount).toFixed(decimales);
}

/**
 * Calcula el monto pendiente de una factura
 */
export function calcularPendiente(
  monto: number | string,
  pagoActual: number | string
): number {
  return Number(monto) - Number(pagoActual);
}

/**
 * Verifica si una factura está completamente pagada
 */
export function estaPagada(
  monto: number | string,
  pagoActual: number | string
): boolean {
  return calcularPendiente(monto, pagoActual) <= 0;
}

/**
 * Obtiene el porcentaje de pago de una factura
 */
export function getPorcentajePago(
  monto: number | string,
  pagoActual: number | string
): number {
  const total = Number(monto);
  if (total === 0) return 0;
  return Math.min((Number(pagoActual) / total) * 100, 100);
}

/**
 * Prepara datos de factura para enviar a API
 */
export function prepararFacturaParaAPI(
  formData: Record<string, any>,
  selectedProducts: SelectedProduct[],
  selectedContratoId: number | null,
  contratos: any[],
  userDependenciaId?: number | null
): any {
  const contrato = contratos.find(c => c.id_contrato === selectedContratoId);
  const moneda = contrato?.id_moneda;
  return {
    id_contrato: selectedContratoId,
    fecha: formData.fecha || new Date().toISOString().split('T')[0],
    descripcion: formData.descripcion,
    observaciones: formData.observaciones,
    id_dependencia: userDependenciaId,
    id_moneda: moneda,
    items: selectedProducts.map((p) => ({
      id_producto: p.id_producto,
      cantidad: p.cantidad,
      precio_venta: p.precio_venta,
      id_moneda: moneda,
      id_anexo: p.id_anexo,
    })),
  };
}
