import { Modulo } from '../types/navigation';

export const rutasPorModulo: Record<Modulo, string[]> = {
  inventario: ['/inventario', '/movimientos', '/movimientos/pendientes', '/movimientos/ajuste', '/movimientos/seleccionar-recepcion', '/productos'],
  administracion: ['/administracion', '/configuracion', '/usuarios', '/grupos', '/monedas', '/dependencias'],
  venta: ['/venta', '/ventas', '/clientes'],
  compra: ['/compra', '/compra/clientes', '/convenios', '/anexos'],
  reportes: ['/reportes'],
  home: ['/'],
};
