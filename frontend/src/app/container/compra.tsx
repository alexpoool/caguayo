import { crearCasosUsoCompra } from '../../features/compra/application/casos-uso';
import { compraApiRepositorio } from '../../features/compra/infrastructure/compra-api-repositorio';
import { AnexosPage } from '../../features/compra/ui/AnexosPage';
import { CompraHome } from '../../features/compra/ui/CompraHome';
import { ConveniosPage } from '../../features/compra/ui/ConveniosPage';
import { LiquidacionesPage } from '../../features/compra/ui/LiquidacionesPage';
import { ProductosEnLiquidacionPage } from '../../features/compra/ui/ProductosEnLiquidacionPage';

/** Composition root de compra: única unión de puerto y adaptador. */
const casosUsoCompra = crearCasosUsoCompra(compraApiRepositorio);

export function ConveniosPageContainer() {
  return <ConveniosPage casosUso={casosUsoCompra} />;
}

export function AnexosPageContainer() {
  return <AnexosPage casosUso={casosUsoCompra} />;
}

export function LiquidacionesPageContainer() {
  return <LiquidacionesPage casosUso={casosUsoCompra} />;
}

export function ProductosEnLiquidacionPageContainer() {
  return <ProductosEnLiquidacionPage casosUso={casosUsoCompra} />;
}

export function CompraHomeContainer() {
  return <CompraHome />;
}
