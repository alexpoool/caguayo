import { crearCasosUsoVentas } from '../../features/ventas/application/casos-uso';
import { ventasApiRepositorio } from '../../features/ventas/infrastructure/ventas-api-repositorio';
import { ContratosPage } from '../../features/ventas/ui/ContratosPage';
import { OfertasTiendaPage } from '../../features/ventas/ui/ofertas/OfertasPage';
import { FacturasPage } from '../../features/ventas/ui/facturas/FacturasPage';
import { PreFacturasPage } from '../../features/ventas/ui/facturas/PreFacturasPage';
import { SuplementosPage } from '../../features/ventas/ui/SuplementosPage';
import { VentasEfectivoPage } from '../../features/ventas/ui/VentasEfectivoPage';

/** Composition root de ventas: única unión de puerto y adaptador. */
const casosUsoVentas = crearCasosUsoVentas(ventasApiRepositorio);

export function ContratosPageContainer() {
  return <ContratosPage casosUso={casosUsoVentas} />;
}

export function SuplementosPageContainer() {
  return <SuplementosPage casosUso={casosUsoVentas} />;
}

export function FacturasPageContainer() {
  return <FacturasPage casosUso={casosUsoVentas} />;
}

export function PreFacturasPageContainer() {
  return <PreFacturasPage casosUso={casosUsoVentas} />;
}

export function OfertasTiendaPageContainer() {
  return <OfertasTiendaPage casosUso={casosUsoVentas} />;
}

export function VentasEfectivoPageContainer() {
  return <VentasEfectivoPage casosUso={casosUsoVentas} />;
}
