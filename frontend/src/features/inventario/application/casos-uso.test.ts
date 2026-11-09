import { describe, expect, it, vi } from 'vitest';
import { crearCasosUsoInventario } from './casos-uso';
import type {
  InventarioRepositorio,
  Movimiento,
  Producto,
} from '../domain/inventario';

const producto: Producto = {
  id_producto: 1,
  id_subcategoria: 1,
  nombre: 'Producto',
  moneda_compra: 1,
  precio_compra: 10,
  moneda_venta: 1,
  precio_venta: 15,
  precio_minimo: 12,
};

const movimiento: Movimiento = {
  id_movimiento: 1,
  id_tipo_movimiento: 1,
  id_dependencia: 1,
  id_producto: 1,
  cantidad: 2,
  fecha: '2026-01-01',
  estado: 'pendiente',
};

function repoFalso(
  overrides: Partial<InventarioRepositorio> = {},
): InventarioRepositorio {
  return {
    listarProductos: vi.fn().mockResolvedValue([producto]),
    crearProducto: vi.fn().mockResolvedValue(producto),
    actualizarProducto: vi.fn().mockResolvedValue(producto),
    eliminarProducto: vi.fn().mockResolvedValue(undefined),
    listarProductosPorDependencia: vi.fn().mockResolvedValue([]),
    listarProductosConStockItemAnexo: vi.fn().mockResolvedValue([]),
    obtenerSiguienteCodigo: vi.fn().mockResolvedValue('P-001'),
    listarCategorias: vi.fn().mockResolvedValue([]),
    listarSubcategorias: vi.fn().mockResolvedValue([]),
    listarMonedas: vi.fn().mockResolvedValue([]),
    listarDependencias: vi.fn().mockResolvedValue([]),
    listarTiposMovimiento: vi.fn().mockResolvedValue([]),
    listarMovimientos: vi.fn().mockResolvedValue([movimiento]),
    listarMovimientosPendientes: vi.fn().mockResolvedValue([]),
    crearMovimiento: vi.fn().mockResolvedValue(movimiento),
    confirmarMovimiento: vi.fn().mockResolvedValue(movimiento),
    eliminarMovimiento: vi.fn().mockResolvedValue(undefined),
    listarRecepcionesStock: vi.fn().mockResolvedValue([]),
    crearAjuste: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('crearCasosUsoInventario', () => {
  it('delega la consulta y creación de productos con sus parámetros', async () => {
    const repo = repoFalso();
    const casos = crearCasosUsoInventario(repo);
    const onTotal = vi.fn();
    const data = {
      id_subcategoria: 1,
      nombre: 'Nuevo',
      moneda_compra: 1,
      precio_compra: 1,
      moneda_venta: 1,
      precio_venta: 2,
      precio_minimo: 1,
    };

    await expect(casos.listarProductos(0, 50, 'nuevo', onTotal)).resolves.toEqual([
      producto,
    ]);
    await expect(casos.crearProducto(data)).resolves.toBe(producto);
    await casos.actualizarProducto(1, { nombre: 'Editado' });
    await casos.eliminarProducto(1);

    expect(repo.listarProductos).toHaveBeenCalledWith(0, 50, 'nuevo', onTotal);
    expect(repo.crearProducto).toHaveBeenCalledWith(data);
    expect(repo.actualizarProducto).toHaveBeenCalledWith(1, {
      nombre: 'Editado',
    });
    expect(repo.eliminarProducto).toHaveBeenCalledWith(1);
  });

  it('delega catálogos y lecturas auxiliares', async () => {
    const repo = repoFalso();
    const casos = crearCasosUsoInventario(repo);

    await casos.listarProductosPorDependencia(4);
    await casos.listarProductosConStockItemAnexo();
    await expect(casos.obtenerSiguienteCodigo(2)).resolves.toBe('P-001');
    await casos.listarCategorias();
    await casos.listarSubcategorias();
    await casos.listarMonedas();
    await casos.listarDependencias();
    await casos.listarTiposMovimiento();
    await casos.listarRecepcionesStock();

    expect(repo.listarProductosPorDependencia).toHaveBeenCalledWith(4);
    expect(repo.listarProductosConStockItemAnexo).toHaveBeenCalledOnce();
    expect(repo.obtenerSiguienteCodigo).toHaveBeenCalledWith(2);
    expect(repo.listarCategorias).toHaveBeenCalledOnce();
    expect(repo.listarSubcategorias).toHaveBeenCalledOnce();
    expect(repo.listarMonedas).toHaveBeenCalledOnce();
    expect(repo.listarDependencias).toHaveBeenCalledOnce();
    expect(repo.listarTiposMovimiento).toHaveBeenCalledOnce();
    expect(repo.listarRecepcionesStock).toHaveBeenCalledOnce();
  });

  it('delega movimientos y ajustes', async () => {
    const repo = repoFalso();
    const casos = crearCasosUsoInventario(repo);
    const onTotal = vi.fn();
    const nuevoMovimiento = {
      id_tipo_movimiento: 1,
      id_dependencia: 1,
      id_producto: 1,
      cantidad: 2,
      fecha: '2026-01-01',
    };
    const ajuste = {
      id_producto: 1,
      id_dependencia_origen: 1,
      destinos: [{ id_dependencia: 2, cantidad: 1 }],
    };

    await expect(casos.listarMovimientos(0, 50, 'RECEPCION', 'x', onTotal))
      .resolves.toEqual([movimiento]);
    await casos.listarMovimientosPendientes(0, 50, onTotal, 'y');
    await casos.crearMovimiento(nuevoMovimiento);
    await casos.confirmarMovimiento(1);
    await casos.eliminarMovimiento(1);
    await casos.crearAjuste(ajuste);

    expect(repo.listarMovimientos).toHaveBeenCalledWith(
      0,
      50,
      'RECEPCION',
      'x',
      onTotal,
    );
    expect(repo.listarMovimientosPendientes).toHaveBeenCalledWith(
      0,
      50,
      onTotal,
      'y',
    );
    expect(repo.crearMovimiento).toHaveBeenCalledWith(nuevoMovimiento);
    expect(repo.confirmarMovimiento).toHaveBeenCalledWith(1);
    expect(repo.eliminarMovimiento).toHaveBeenCalledWith(1);
    expect(repo.crearAjuste).toHaveBeenCalledWith(ajuste);
  });
});
