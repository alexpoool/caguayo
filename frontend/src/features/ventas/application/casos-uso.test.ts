import { describe, expect, it, vi } from 'vitest';
import { crearCasosUsoVentas } from './casos-uso';
import type { VentasRepositorio } from '../domain/ventas';

function repoFalso(
  overrides: Partial<VentasRepositorio> = {},
): VentasRepositorio {
  const repo = {
    listarContratos: vi.fn().mockResolvedValue([]),
    obtenerContrato: vi.fn().mockResolvedValue({}),
    crearContrato: vi.fn().mockResolvedValue({}),
    actualizarContrato: vi.fn().mockResolvedValue({}),
    eliminarContrato: vi.fn().mockResolvedValue(undefined),
    actualizarSolicitud: vi.fn().mockResolvedValue({}),
    listarClientes: vi.fn().mockResolvedValue([]),
    obtenerCliente: vi.fn().mockResolvedValue({}),
    crearCliente: vi.fn().mockResolvedValue({}),
    listarMonedas: vi.fn().mockResolvedValue([]),
    listarDependencias: vi.fn().mockResolvedValue([]),
    listarCuentasDependencia: vi.fn().mockResolvedValue([]),
    listarCuentasCliente: vi.fn().mockResolvedValue([]),
    obtenerEstadosContrato: vi.fn().mockResolvedValue([]),
    obtenerTiposContrato: vi.fn().mockResolvedValue([]),
    listarSuplementos: vi.fn().mockResolvedValue([]),
    listarSuplementosPorContrato: vi.fn().mockResolvedValue([]),
    crearSuplemento: vi.fn().mockResolvedValue({}),
    actualizarSuplemento: vi.fn().mockResolvedValue({}),
    eliminarSuplemento: vi.fn().mockResolvedValue(undefined),
    listarFacturas: vi.fn().mockResolvedValue([]),
    listarFacturasPorContrato: vi.fn().mockResolvedValue([]),
    crearFactura: vi.fn().mockResolvedValue({}),
    actualizarFactura: vi.fn().mockResolvedValue({}),
    eliminarFactura: vi.fn().mockResolvedValue(undefined),
    aprobarFactura: vi.fn().mockResolvedValue({}),
    listarPagosFactura: vi.fn().mockResolvedValue([]),
    crearPago: vi.fn().mockResolvedValue({}),
    eliminarPago: vi.fn().mockResolvedValue(undefined),
    listarOfertas: vi.fn().mockResolvedValue([]),
    listarOfertasPorContrato: vi.fn().mockResolvedValue([]),
    crearOferta: vi.fn().mockResolvedValue({}),
    actualizarOferta: vi.fn().mockResolvedValue({}),
    eliminarOferta: vi.fn().mockResolvedValue(undefined),
    convertirOferta: vi.fn().mockResolvedValue({}),
    listarVentasEfectivo: vi.fn().mockResolvedValue([]),
    crearVentaEfectivo: vi.fn().mockResolvedValue({}),
    actualizarVentaEfectivo: vi.fn().mockResolvedValue({}),
    eliminarVentaEfectivo: vi.fn().mockResolvedValue(undefined),
    listarProductosConStockItemAnexo: vi.fn().mockResolvedValue([]),
    validarExistencias: vi.fn().mockResolvedValue({ valido: true, errores: [] }),
    listarExistenciasHibridas: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
  return repo as unknown as VentasRepositorio;
}

describe('crearCasosUsoVentas', () => {
  it('delega contratos, clientes y catálogos con sus parámetros', async () => {
    const repo = repoFalso();
    const casos = crearCasosUsoVentas(repo);
    const onTotal = vi.fn();

    await casos.listarContratos(0, 50, 7, 'abc', onTotal);
    await casos.obtenerContrato(3);
    await casos.crearContrato({ nombre: 'Contrato' } as never);
    await casos.actualizarContrato(3, { nombre: 'Editado' } as never);
    await casos.eliminarContrato(3);
    await casos.actualizarSolicitud(9, { id_contrato: 3 });
    await casos.listarClientes(0, 20, 'CLIENTE,AMBAS', 'cliente', onTotal);
    await casos.obtenerCliente(7);
    await casos.crearCliente({ nombre: 'Cliente' } as never);
    await casos.listarMonedas();
    await casos.listarDependencias('dep', 0, 100);
    await casos.listarCuentasDependencia(2);
    await casos.listarCuentasCliente(7);
    await casos.obtenerEstadosContrato();
    await casos.obtenerTiposContrato();

    expect(repo.listarContratos).toHaveBeenCalledWith(0, 50, 7, 'abc', onTotal);
    expect(repo.obtenerContrato).toHaveBeenCalledWith(3);
    expect(repo.actualizarContrato).toHaveBeenCalledWith(3, { nombre: 'Editado' });
    expect(repo.eliminarContrato).toHaveBeenCalledWith(3);
    expect(repo.actualizarSolicitud).toHaveBeenCalledWith(9, { id_contrato: 3 });
    expect(repo.listarClientes).toHaveBeenCalledWith(
      0,
      20,
      'CLIENTE,AMBAS',
      'cliente',
      onTotal,
    );
    expect(repo.listarDependencias).toHaveBeenCalledWith('dep', 0, 100);
    expect(repo.listarCuentasDependencia).toHaveBeenCalledWith(2);
    expect(repo.listarCuentasCliente).toHaveBeenCalledWith(7);
    expect(repo.listarMonedas).toHaveBeenCalledOnce();
    expect(repo.obtenerEstadosContrato).toHaveBeenCalledOnce();
    expect(repo.obtenerTiposContrato).toHaveBeenCalledOnce();
  });

  it('delega suplementos, facturas y pagos', async () => {
    const repo = repoFalso();
    const casos = crearCasosUsoVentas(repo);
    const onTotal = vi.fn();

    await casos.listarSuplementos(0, 50, onTotal, 'x');
    await casos.listarSuplementosPorContrato(4, 0, 50, 'y');
    await casos.crearSuplemento({} as never);
    await casos.actualizarSuplemento(1, {} as never);
    await casos.eliminarSuplemento(1);
    await casos.listarFacturas(0, 50, 'PREFACTURA');
    await casos.listarFacturasPorContrato(4, 'FACTURA');
    await casos.crearFactura({} as never);
    await casos.actualizarFactura(2, {} as never);
    await casos.eliminarFactura(2);
    await casos.aprobarFactura(2);
    await casos.listarPagosFactura(2);
    await casos.crearPago({} as never);
    await casos.eliminarPago(5);

    expect(repo.listarSuplementos).toHaveBeenCalledWith(0, 50, onTotal, 'x');
    expect(repo.listarSuplementosPorContrato).toHaveBeenCalledWith(4, 0, 50, 'y');
    expect(repo.eliminarSuplemento).toHaveBeenCalledWith(1);
    expect(repo.listarFacturas).toHaveBeenCalledWith(0, 50, 'PREFACTURA');
    expect(repo.listarFacturasPorContrato).toHaveBeenCalledWith(4, 'FACTURA');
    expect(repo.aprobarFactura).toHaveBeenCalledWith(2);
    expect(repo.listarPagosFactura).toHaveBeenCalledWith(2);
    expect(repo.eliminarPago).toHaveBeenCalledWith(5);
  });

  it('delega ofertas, ventas efectivo y validaciones de stock', async () => {
    const repo = repoFalso();
    const casos = crearCasosUsoVentas(repo);
    const onTotal = vi.fn();
    const productos = [{ id_producto: 1, cantidad: 2 }];

    await casos.listarOfertas(0, 50, 'ACTIVA', onTotal);
    await casos.listarOfertasPorContrato(4, 'ACTIVA');
    await casos.crearOferta({} as never);
    await casos.actualizarOferta(1, {} as never);
    await casos.eliminarOferta(1);
    await casos.convertirOferta(1, 'PREFACTURA');
    await casos.listarVentasEfectivo(0, 50, onTotal, 'slip');
    await casos.crearVentaEfectivo({} as never);
    await casos.actualizarVentaEfectivo(1, {} as never);
    await casos.eliminarVentaEfectivo(1);
    await casos.listarProductosConStockItemAnexo();
    await casos.validarExistencias(productos, 2, 3);
    await casos.listarExistenciasHibridas(2, 3);

    expect(repo.listarOfertas).toHaveBeenCalledWith(0, 50, 'ACTIVA', onTotal);
    expect(repo.listarOfertasPorContrato).toHaveBeenCalledWith(4, 'ACTIVA');
    expect(repo.convertirOferta).toHaveBeenCalledWith(1, 'PREFACTURA');
    expect(repo.listarVentasEfectivo).toHaveBeenCalledWith(0, 50, onTotal, 'slip');
    expect(repo.eliminarVentaEfectivo).toHaveBeenCalledWith(1);
    expect(repo.listarProductosConStockItemAnexo).toHaveBeenCalledOnce();
    expect(repo.validarExistencias).toHaveBeenCalledWith(productos, 2, 3);
    expect(repo.listarExistenciasHibridas).toHaveBeenCalledWith(2, 3);
  });
});
