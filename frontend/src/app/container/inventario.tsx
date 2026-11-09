import { crearCasosUsoInventario } from '../../features/inventario/application/casos-uso';
import { inventarioApiRepositorio } from '../../features/inventario/infrastructure/inventario-api-repositorio';
import { InventarioHome } from '../../features/inventario/ui/InventarioHome';
import { MovimientosPage } from '../../features/inventario/ui/MovimientosPage';
import { MovimientosPendientesPage } from '../../features/inventario/ui/MovimientosPendientesPage';
import { ProductosPage } from '../../features/inventario/ui/ProductosPage';
import { RecepcionesPage } from '../../features/inventario/ui/RecepcionesPage';

/** Composition root de inventario: única unión de puerto y adaptador. */
const casosUsoInventario = crearCasosUsoInventario(inventarioApiRepositorio);

export function ProductosPageContainer() {
  return <ProductosPage casosUso={casosUsoInventario} />;
}

export function MovimientosPageContainer() {
  return <MovimientosPage casosUso={casosUsoInventario} />;
}

export function MovimientosPendientesPageContainer() {
  return <MovimientosPendientesPage casosUso={casosUsoInventario} />;
}

export function RecepcionesPageContainer() {
  return <RecepcionesPage casosUso={casosUsoInventario} />;
}

export function InventarioHomeContainer() {
  return <InventarioHome />;
}
