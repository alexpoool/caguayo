import { crearCasosUsoProyectos } from '../../features/proyectos/application/casos-uso';
import { proyectosApiRepositorio } from '../../features/proyectos/infrastructure/proyectos-api-repositorio';
import { CertificacionesPage } from '../../features/proyectos/ui/CertificacionesPage';
import { EtapasPage } from '../../features/proyectos/ui/EtapasPage';
import { FacturasServicioPage } from '../../features/proyectos/ui/FacturasServicioPage';
import { LiquidacionesPage } from '../../features/proyectos/ui/LiquidacionesPage';
import { OfertasPage } from '../../features/proyectos/ui/OfertasPage';
import { PagosFacturaServicioPage } from '../../features/proyectos/ui/PagosFacturaServicioPage';
import { PreFacturasPage } from '../../features/proyectos/ui/PreFacturasPage';
import { ProyectosPage } from '../../features/proyectos/ui/ProyectosPage';
import { RealizadoresPage } from '../../features/proyectos/ui/RealizadoresPage';
import { ServiciosPage } from '../../features/proyectos/ui/ServiciosPage';
import { SolicitudesPage } from '../../features/proyectos/ui/SolicitudesPage';
import { TareasEtapaPage } from '../../features/proyectos/ui/TareasEtapaPage';

/** Composition root de proyectos: única unión de puerto y adaptador. */
const casosUsoProyectos = crearCasosUsoProyectos(proyectosApiRepositorio);

export function ServiciosPageContainer() {
  return <ServiciosPage casosUso={casosUsoProyectos} />;
}

export function SolicitudesPageContainer() {
  return <SolicitudesPage casosUso={casosUsoProyectos} />;
}

export function ProyectosPageContainer() {
  return <ProyectosPage casosUso={casosUsoProyectos} />;
}

export function EtapasPageContainer() {
  return <EtapasPage casosUso={casosUsoProyectos} />;
}

export function TareasEtapaPageContainer() {
  return <TareasEtapaPage casosUso={casosUsoProyectos} />;
}

export function RealizadoresPageContainer() {
  return <RealizadoresPage casosUso={casosUsoProyectos} />;
}

export function FacturasServicioPageContainer() {
  return <FacturasServicioPage casosUso={casosUsoProyectos} />;
}

export function OfertasPageContainer() {
  return <OfertasPage casosUso={casosUsoProyectos} />;
}

export function PreFacturasPageContainer() {
  return <PreFacturasPage casosUso={casosUsoProyectos} />;
}

export function PagosFacturaServicioPageContainer() {
  return <PagosFacturaServicioPage casosUso={casosUsoProyectos} />;
}

export function ProyectoLiquidacionesPageContainer() {
  return <LiquidacionesPage casosUso={casosUsoProyectos} />;
}

export function CertificacionesPageContainer() {
  return <CertificacionesPage casosUso={casosUsoProyectos} />;
}
