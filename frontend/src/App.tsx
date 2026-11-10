import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  ArrowLeftRight,
  Banknote,
  Boxes,
  Clock,
  Home,
  Briefcase,
  BarChart3,
  UserCircle,
  Settings,
  Coins,
  ChevronLeft,
  ChevronRight,
  FileText,
  FilePlus,
  Receipt,
  DollarSign,
  Wrench,
  ClipboardList,
  ClipboardCheck,
  Layers,
  Users,
  Calculator,
  Package,
  Shield,
  Building,
  Wallet,
  Lock,
  ChevronDown,
  Menu,
  X,
  ChevronUp,
  ScrollText,
  Library,
  ShoppingBag
} from 'lucide-react';

import { LoginPage } from './features/auth/ui/LoginPage';
import { RegisterPage } from './features/auth/ui/RegisterPage';
import { HomePage } from './app/layout/HomePage';
import { DashboardPageContainer } from './app/container/dashboard';
import { LoggerPage } from './pages/Logger';
import { PerfilPage } from './features/auth/ui/PerfilPage';
import { AuthProvider } from './app/providers/AuthProvider';
import { useAuth } from '@/shared/ui/auth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useEmpresa } from './config/branding';
import {
  FUNCIONALIDADES_POR_MODULO,
  moduloDeRuta,
  obtenerRuta,
  puedeAccederRuta,
  type Modulo,
} from './config/rutas';
const ProductosPage = lazy(() => import('./app/container/inventario').then(m => ({ default: m.ProductosPageContainer })));
const ClientesPage = lazy(() => import('./app/container/terceros').then(m => ({ default: m.ClientesPageContainer })));
const PerfilClientePage = lazy(() => import('./app/container/terceros').then(m => ({ default: m.PerfilClientePageContainer })));
const MovimientosPage = lazy(() => import('./app/container/inventario').then(m => ({ default: m.MovimientosPageContainer })));
const MovimientosPendientesPage = lazy(() => import('./app/container/inventario').then(m => ({ default: m.MovimientosPendientesPageContainer })));
const RecepcionesPage = lazy(() => import('./app/container/inventario').then(m => ({ default: m.RecepcionesPageContainer })));
const ConfiguracionPage = lazy(() => import('./app/container/administracion').then(m => ({ default: m.ConfiguracionPageContainer })));
const MonedasPage = lazy(() => import('./app/container/administracion').then(m => ({ default: m.MonedasPageContainer })));
const UsuariosPage = lazy(() => import('./app/container/administracion').then(m => ({ default: m.UsuariosPageContainer })));
const UsuariosCredencialesPage = lazy(() => import('./app/container/administracion').then(m => ({ default: m.UsuariosCredencialesPageContainer })));
const GruposPage = lazy(() => import('./app/container/administracion').then(m => ({ default: m.GruposPageContainer })));
const DependenciasPage = lazy(() => import('./app/container/administracion').then(m => ({ default: m.DependenciasPageContainer })));
const RespaldosPage = lazy(() => import('./app/container/administracion').then(m => ({ default: m.RespaldosPageContainer })));
const CuentasPage = lazy(() => import('./app/container/administracion').then(m => ({ default: m.CuentasPageContainer })));
const CuentasClientePage = lazy(() => import('./app/container/terceros').then(m => ({ default: m.CuentasClientePageContainer })));
const InventarioHome = lazy(() => import('./app/container/inventario').then(m => ({ default: m.InventarioHomeContainer })));
const VentaHome = lazy(() => import('./app/layout/VentaHome').then(m => ({ default: m.VentaHome })));
const CompraHome = lazy(() => import('./app/container/compra').then(m => ({ default: m.CompraHomeContainer })));
const TercerosHome = lazy(() => import('./app/container/terceros').then(m => ({ default: m.TercerosHomeContainer })));
const ReportesHome = lazy(() => import('./app/container/reportes').then(m => ({ default: m.ReportesHomeContainer })));
const ProyectosHome = lazy(() => import('./app/layout/ProyectosHome').then(m => ({ default: m.ProyectosHome })));
const AdministracionHome = lazy(() => import('./app/layout/AdministracionHome').then(m => ({ default: m.AdministracionHome })));
const ReporteExistencias = lazy(() => import('./app/container/reportes').then(m => ({ default: m.ReporteExistenciasContainer })));
const ReporteMovimientosDependencia = lazy(() => import('./app/container/reportes').then(m => ({ default: m.ReporteMovimientosDependenciaContainer })));
const ReporteMovimientosProducto = lazy(() => import('./app/container/reportes').then(m => ({ default: m.ReporteMovimientosProductoContainer })));
const ReporteProveedores = lazy(() => import('./app/container/reportes').then(m => ({ default: m.ReporteProveedoresContainer })));
const ReporteClientes = lazy(() => import('./app/container/reportes').then(m => ({ default: m.ReporteClientesContainer })));
const ReporteProyectos = lazy(() => import('./app/container/reportes').then(m => ({ default: m.ReporteProyectosContainer })));
const ReporteCreadores = lazy(() => import('./app/container/reportes').then(m => ({ default: m.ReporteCreadoresContainer })));
const ReporteDesempeno = lazy(() => import('./app/container/reportes').then(m => ({ default: m.ReporteDesempenoContainer })));
const ReporteOnat = lazy(() => import('./app/container/reportes').then(m => ({ default: m.ReporteOnatContainer })));
const ReporteMincult = lazy(() => import('./app/container/reportes').then(m => ({ default: m.ReporteMincultContainer })));
const ReporteLiquidaciones = lazy(() => import('./app/container/reportes').then(m => ({ default: m.ReporteLiquidacionesContainer })));
const CompraConveniosPage = lazy(() => import('./app/container/compra').then(m => ({ default: m.ConveniosPageContainer })));
const CompraAnexosPage = lazy(() => import('./app/container/compra').then(m => ({ default: m.AnexosPageContainer })));
const ProductosEnLiquidacionPage = lazy(() => import('./app/container/compra').then(m => ({ default: m.ProductosEnLiquidacionPageContainer })));
const LiquidacionesPage = lazy(() => import('./app/container/compra').then(m => ({ default: m.LiquidacionesPageContainer })));
const ContratosPage = lazy(() => import('./app/container/ventas').then(m => ({ default: m.ContratosPageContainer })));
const SuplementosPage = lazy(() => import('./app/container/ventas').then(m => ({ default: m.SuplementosPageContainer })));
const FacturasPage = lazy(() => import('./app/container/ventas').then(m => ({ default: m.FacturasPageContainer })));
const OfertasTiendaPage = lazy(() => import('./app/container/ventas').then(m => ({ default: m.OfertasTiendaPageContainer })));
const PreFacturasTiendaPage = lazy(() => import('./app/container/ventas').then(m => ({ default: m.PreFacturasPageContainer })));
const VentasEfectivoPage = lazy(() => import('./app/container/ventas').then(m => ({ default: m.VentasEfectivoPageContainer })));
const ServiciosPage = lazy(() => import('./app/container/proyectos').then(m => ({ default: m.ServiciosPageContainer })));
const SolicitudesPage = lazy(() => import('./app/container/proyectos').then(m => ({ default: m.SolicitudesPageContainer })));
const ProyectosPage = lazy(() => import('./app/container/proyectos').then(m => ({ default: m.ProyectosPageContainer })));
const EtapasPage = lazy(() => import('./app/container/proyectos').then(m => ({ default: m.EtapasPageContainer })));
const TareasEtapaPage = lazy(() => import('./app/container/proyectos').then(m => ({ default: m.TareasEtapaPageContainer })));
const RealizadoresPage = lazy(() => import('./app/container/proyectos').then(m => ({ default: m.RealizadoresPageContainer })));
const FacturasServicioPage = lazy(() => import('./app/container/proyectos').then(m => ({ default: m.FacturasServicioPageContainer })));
const OfertasPage = lazy(() => import('./app/container/proyectos').then(m => ({ default: m.OfertasPageContainer })));
const PreFacturasPage = lazy(() => import('./app/container/proyectos').then(m => ({ default: m.PreFacturasPageContainer })));
const PagosFacturaServicioPage = lazy(() => import('./app/container/proyectos').then(m => ({ default: m.PagosFacturaServicioPageContainer })));
const ProyectoLiquidacionesPage = lazy(() => import('./app/container/proyectos').then(m => ({ default: m.ProyectoLiquidacionesPageContainer })));
const CertificacionesPage = lazy(() => import('./app/container/proyectos').then(m => ({ default: m.CertificacionesPageContainer })));
const DJ08Page = lazy(() => import('./app/container/dj08').then(m => ({ default: m.DJ08PageContainer })));
const RrhhHome = lazy(() => import('./app/layout/RrhhHome').then(m => ({ default: m.RrhhHome })));
const CatalogosPage = lazy(() => import('./app/container/rrhh').then(m => ({ default: m.CatalogosPageContainer })));
const EmpleadosPage = lazy(() => import('./app/container/rrhh').then(m => ({ default: m.EmpleadosPageContainer })));
const AsistenciaPage = lazy(() => import('./app/container/rrhh').then(m => ({ default: m.AsistenciaPageContainer })));
const RrhhMovimientosPage = lazy(() => import('./app/container/rrhh').then(m => ({ default: m.MovimientosPageContainer })));
const NominaPage = lazy(() => import('./app/container/rrhh').then(m => ({ default: m.NominaPageContainer })));
const NominaDetallePage = lazy(() => import('./app/container/rrhh').then(m => ({ default: m.NominaDetallePageContainer })));
const NominaPagosPage = lazy(() => import('./app/container/rrhh').then(m => ({ default: m.NominaPagosPageContainer })));
const PagosResultadoPage = lazy(() => import('./app/container/rrhh').then(m => ({ default: m.PagosResultadoPageContainer })));
const PagoResultadoNuevoPage = lazy(() => import('./app/container/rrhh').then(m => ({ default: m.PagoResultadoNuevoPageContainer })));
const PagoResultadoDetallePage = lazy(() => import('./app/container/rrhh').then(m => ({ default: m.PagoResultadoDetallePageContainer })));
const RrhhSolicitudesPage = lazy(() => import('./app/container/rrhh').then(m => ({ default: m.SolicitudesPageContainer })));
const EvaluacionesPage = lazy(() => import('./app/container/rrhh').then(m => ({ default: m.EvaluacionesPageContainer })));
const EvaluacionDetallePage = lazy(() => import('./app/container/rrhh').then(m => ({ default: m.EvaluacionDetallePageContainer })));
const ObjetivosPage = lazy(() => import('./app/container/rrhh').then(m => ({ default: m.ObjetivosPageContainer })));
const ReportesPage = lazy(() => import('./app/container/rrhh').then(m => ({ default: m.ReportesPageContainer })));
const AuditoriaPage = lazy(() => import('./app/container/rrhh').then(m => ({ default: m.AuditoriaPageContainer })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 0, // Siempre considerarse stale para obtener datos frescos
    },
  },
});

// Componente para proteger rutas según la funcionalidad requerida.
function ProtectedRoute({
  children,
  currentPath,
}: {
  children: React.ReactNode;
  currentPath: string;
  moduloActivo?: Modulo;
}) {
  const { isAuthenticated, isLoading, hasFuncionalidad } = useAuth();
  const ruta = obtenerRuta(currentPath);
  const permitido = ruta ? puedeAccederRuta(currentPath, hasFuncionalidad) : false;

  useEffect(() => {
    if (!isLoading && isAuthenticated && !permitido) {
      toast.error('No tienes permisos para acceder a esta sección');
    }
  }, [isAuthenticated, isLoading, permitido]);

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!permitido) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/**
 * Alias del plural `/rrhh/pagos-resultados` hacia la ruta canónica
 * `/rrhh/pagos-resultado`. Sin esto, el plural no coincide con ninguna ruta y
 * React Router deja el área principal vacía.
 */
function RedirectPagoResultadoDetalle() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/rrhh/pagos-resultado/${id ?? ''}`} replace />;
}

/**
 * Catálogos de RRHH abiertos desde Administración: se mantiene la URL
 * `/configuracion/rrhh/<página>` para no cambiar de módulo.
 */
function CatalogoRrhhConfiguracion() {
  const { catalogo = '' } = useParams<{ catalogo: string }>();
  const navigate = useNavigate();
  const tabId =
    catalogo === 'periodos' ? 'periodos-evaluacion' : catalogo;
  return (
    <CatalogosPage
      tabInicial={tabId}
      onCambiarTab={(id) =>
        navigate(
          `/configuracion/rrhh/${id === 'periodos-evaluacion' ? 'periodos' : id}`,
        )
      }
    />
  );
}

// Componente estable de enlace del sidebar: navega SIEMPRE al destino al hacer
// click, sin depender del comportamiento por defecto del navegador/router.
function SidebarLink({
  to,
  children,
  onClick,
  exact = false,
  slim = false,
  disabled = false,
}: {
  to: string;
  children: React.ReactNode;
  onClick?: () => void;
  exact?: boolean;
  slim?: boolean;
  disabled?: boolean;
}) {
  const linkLocation = useLocation();
  const navigate = useNavigate();
  const isActive = exact
    ? linkLocation.pathname === to
    : linkLocation.pathname === to || (linkLocation.pathname.startsWith(`${to}/`) && to !== '/movimientos');

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    onClick?.();
    // Conservar el comportamiento por defecto para clicks de modificación
    // (abrir en pestaña nueva, etc.)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    if (linkLocation.pathname === to) {
      // Ya estamos en la ruta: forzar refresco de datos con query param único
      navigate(`${to}?_=${Date.now()}`, { replace: true });
    } else {
      navigate(to);
    }
  };

  if (disabled) {
    return (
      <span className={`
        group flex items-center ${slim ? 'justify-center' : 'gap-3'} ${slim ? 'px-0' : 'px-3'} py-2.5 rounded-lg
        transition-all duration-300 ease-out relative overflow-hidden
        text-gray-600 opacity-40 cursor-not-allowed
      `}>
        <span className="transition-all duration-300 text-gray-600">
          {children && React.Children.toArray(children)[0]}
        </span>
        {!slim && (
          <span className="font-medium flex items-center gap-2">
            {children && React.Children.toArray(children).slice(1)}
            <Lock className="w-3.5 h-3.5 text-gray-500" />
          </span>
        )}
        {slim && <Lock className="w-3 h-3 text-gray-500 absolute -top-0.5 -right-0.5" />}
      </span>
    );
  }

  return (
    <Link
      to={to}
      onClick={handleClick}
      className={`
        group flex items-center ${slim ? 'justify-center' : 'gap-3'} ${slim ? 'px-0' : 'px-3'} py-2.5 rounded-lg
        transition-all duration-300 ease-out relative overflow-hidden
        ${isActive
          ? 'bg-panel-800 text-white shadow-none border-l-4 border-brand-500'
          : 'text-gray-300 hover:bg-panel-800 hover:text-white'
        }
      `}
    >
      <span className={`
        absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0
        bg-brand-400 rounded-r-full transition-all duration-300
        group-hover:h-6
        ${isActive ? 'h-8 bg-white' : ''}
      `} />
      <span className={`
        transition-all duration-300
        ${isActive ? 'text-white scale-110' : 'text-gray-500 group-hover:text-brand-400 group-hover:scale-110'}
      `}>
        {children && React.Children.toArray(children)[0]}
      </span>
      {!slim && (
        <span className="font-medium">
          {children && React.Children.toArray(children).slice(1)}
        </span>
      )}
    </Link>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 min-w-0">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide truncate">{label}</span>
      <span className="text-sm font-bold text-white truncate ml-3">{value || '-'}</span>
    </div>
  );
}

interface AdminSeccionItem {
  to: string;
  label: string;
  icon: React.ElementType;
  func: string;
}

interface SidebarSeccionDef {
  id: string;
  label: string;
  items: AdminSeccionItem[];
}

/** Título de cabecera de cada sidebar de módulo. */
const TITULOS_MODULO: Partial<Record<Modulo, string>> = {
  inventario: 'Gestión Inventario',
  terceros: 'Gestión Terceros',
  compra: 'Gestión Compra',
  venta: 'Gestión Tienda',
  proyecto: 'Gestión Proyectos',
  administracion: 'Administración y Configuración',
  reportes: 'Reportes',
  rrhh: 'Gestión RRHH',
};

/** Grupos desplegables del sidebar de Administración. */
const ADMIN_SECCIONES: { id: string; label: string; items: AdminSeccionItem[] }[] = [
  {
    id: 'sistema',
    label: 'Sistema',
    items: [
      { to: '/grupos', label: 'Grupos', icon: Shield, func: 'grupos' },
      { to: '/usuarios', label: 'Usuarios', icon: Users, func: 'usuarios' },
      { to: '/monedas', label: 'Monedas', icon: Coins, func: 'monedas' },
    ],
  },
  {
    id: 'dependencia',
    label: 'Dependencia',
    items: [
      { to: '/dependencias', label: 'Dependencias', icon: Building, func: 'dependencias' },
      { to: '/cuentas', label: 'Cuentas', icon: Wallet, func: 'cuentas' },
      { to: '/configuracion/tipos-dependencia', label: 'Tipos de Dependencia', icon: Building, func: 'configuracion' },
      { to: '/configuracion/tipos-cuenta', label: 'Tipos de Cuenta', icon: Wallet, func: 'configuracion' },
    ],
  },
  {
    id: 'terceros',
    label: 'Terceros',
    items: [
      { to: '/configuracion/estados-contrato', label: 'Estados de Contrato', icon: FileText, func: 'configuracion' },
      { to: '/configuracion/tipos-contrato', label: 'Tipos de Contrato', icon: FilePlus, func: 'configuracion' },
      { to: '/configuracion/tipos-proveedores', label: 'Tipos de Proveedores', icon: Briefcase, func: 'configuracion' },
      { to: '/configuracion/tipos-convenio', label: 'Tipos de Convenio', icon: FileText, func: 'configuracion' },
      { to: '/configuracion/tipos-entidad', label: 'Tipos de Entidad', icon: Building, func: 'configuracion' },
    ],
  },
  {
    id: 'inventario',
    label: 'Inventario',
    items: [
      { to: '/configuracion/categorias', label: 'Categorías', icon: Boxes, func: 'configuracion' },
      { to: '/configuracion/subcategorias', label: 'Subcategorías', icon: Layers, func: 'configuracion' },
    ],
  },
  {
    id: 'declaracion-jurada',
    label: 'Declaración Jurada',
    items: [
      { to: '/configuracion/actividades-economicas', label: 'Actividades Económicas', icon: Briefcase, func: 'configuracion' },
      { to: '/configuracion/tributos', label: 'Tributos', icon: Coins, func: 'configuracion' },
      { to: '/configuracion/especialidades', label: 'Especialidades', icon: FileText, func: 'configuracion' },
    ],
  },
];

/** Grupos desplegables del sidebar de Terceros. */
const TERCEROS_SECCIONES: { id: string; label: string; items: AdminSeccionItem[] }[] = [
  {
    id: 'tienda',
    label: 'Ventas',
    items: [
      { to: '/clientes', label: 'Clientes', icon: UserCircle, func: 'clientes' },
      { to: '/ventas/contratos', label: 'Contratos', icon: FilePlus, func: 'contratos' },
    ],
  },
  {
    id: 'compra',
    label: 'Compra',
    items: [
      { to: '/compra/clientes', label: 'Proveedores', icon: Briefcase, func: 'proveedores' },
      { to: '/compra/convenios', label: 'Convenios', icon: FileText, func: 'convenios' },
    ],
  },
];

/** Grupo "Facturación" del sidebar de Tienda (orden: oferta, pre-factura, factura). */
const VENTA_FACTURACION: { id: string; label: string; items: AdminSeccionItem[] }[] = [
  {
    id: 'facturacion',
    label: 'Facturación',
    items: [
      { to: '/ventas/ofertas', label: 'Oferta', icon: ShoppingBag, func: 'ofertas_tienda' },
      { to: '/ventas/pre-facturas', label: 'Pre-factura', icon: FileText, func: 'pre_facturas_tienda' },
      { to: '/ventas/facturas', label: 'Factura', icon: Receipt, func: 'facturas' },
    ],
  },
];

/** Grupo "Facturación" del sidebar de Proyectos (orden: oferta, pre-factura, factura). */
const PROYECTO_FACTURACION: { id: string; label: string; items: AdminSeccionItem[] }[] = [
  {
    id: 'facturacion',
    label: 'Facturación',
    items: [
      { to: '/proyectos/ofertas', label: 'Oferta', icon: FilePlus, func: 'ofertas' },
      { to: '/proyectos/pre-facturas', label: 'Pre-factura', icon: FileText, func: 'pre_facturas' },
      { to: '/proyectos/facturas-servicio', label: 'Factura', icon: Receipt, func: 'facturas_servicio' },
    ],
  },
];

/** Reportes del módulo Inventario (misma página Reportes, con el reporte preseleccionado). */
const REPORTES_INVENTARIO: SidebarSeccionDef[] = [
  {
    id: 'reportes-inventario',
    label: 'Reportes',
    items: [
      { to: '/inventario/existencias?report=existencias', label: 'Existencias', icon: Boxes, func: 'reporte_existencias' },
      { to: '/inventario/movimientos-dependencia?report=movimientos-dependencia', label: 'Mov. por Dependencia', icon: ArrowLeftRight, func: 'reporte_movimientos_dependencia' },
      { to: '/inventario/movimientos-producto', label: 'Mov. por Producto', icon: Package, func: 'reporte_movimientos_producto' },
    ],
  },
];

/** Reportes del módulo Terceros. */
const REPORTES_TERCEROS: SidebarSeccionDef[] = [
  {
    id: 'reportes-terceros',
    label: 'Reportes',
    items: [
      { to: '/terceros/registro-clientes?report=clientes', label: 'Registro de Clientes', icon: Users, func: 'reporte_clientes' },
      { to: '/terceros/registro-proveedores?report=proveedores', label: 'Registro de Proveedores', icon: UserCircle, func: 'reporte_proveedores' },
      { to: '/terceros/registro-realizadores?report=creadores', label: 'Registro de Realizadores', icon: Users, func: 'reporte_creadores' },
    ],
  },
];

/** Reportes del módulo Compra. */
const REPORTES_COMPRA: SidebarSeccionDef[] = [
  {
    id: 'reportes-compra',
    label: 'Reportes',
    items: [
      { to: '/compra/reporte-proveedores?report=proveedores', label: 'Registro de Proveedores', icon: UserCircle, func: 'reporte_proveedores' },
      { to: '/compra/resumen-liquidaciones?report=liquidaciones', label: 'Resumen de Liquidaciones', icon: Calculator, func: 'reporte_liquidaciones' },
    ],
  },
];

/** Reportes del módulo Tienda. */
const REPORTES_VENTA: SidebarSeccionDef[] = [
  {
    id: 'reportes-venta',
    label: 'Reportes',
    items: [
      { to: '/ventas/registro-clientes?report=clientes', label: 'Registro de Clientes', icon: Users, func: 'reporte_clientes' },
    ],
  },
];

/** Reportes del módulo Proyectos. */
const REPORTES_PROYECTO: SidebarSeccionDef[] = [
  {
    id: 'reportes-proyecto',
    label: 'Reportes',
    items: [
      { to: '/proyectos/registro-proyectos?report=proyectos', label: 'Registro de Proyectos', icon: Layers, func: 'reporte_proyectos' },
      { to: '/proyectos/registro-realizadores?report=creadores', label: 'Registro de Realizadores', icon: Users, func: 'reporte_creadores' },
      { to: '/proyectos/informe-desempeno?report=desempeno', label: 'Informe de Desempeño', icon: BarChart3, func: 'reporte_desempeno' },
    ],
  },
];

/** Grupo retráctil del sidebar. */
function SidebarSeccion({
  seccion,
  abierta,
  onToggle,
  slim,
  onLinkClick,
  hasFuncionalidad,
  iconClassName = 'w-4 h-4',
}: {
  seccion: { id: string; label: string; items: AdminSeccionItem[] };
  abierta: boolean;
  onToggle: (id: string) => void;
  slim: boolean;
  onLinkClick: () => void;
  hasFuncionalidad: (func: string) => boolean;
  iconClassName?: string;
}) {
  return (
    <div>
      {!slim && (
        <button
          type="button"
          onClick={() => onToggle(seccion.id)}
          className="flex w-full items-center justify-between gap-2 rounded px-2 pt-3 pb-1 text-xs font-bold uppercase tracking-widest text-gray-500 transition-colors hover:text-gray-300"
          aria-expanded={abierta}
        >
          <span>{seccion.label}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${abierta ? 'rotate-180' : ''}`}
          />
        </button>
      )}
      {abierta &&
        seccion.items.map((item) => {
          const Icon = item.icon;
          return (
            <SidebarLink
              key={item.to}
              slim={slim}
              to={item.to}
              onClick={onLinkClick}
              disabled={!hasFuncionalidad(item.func)}
            >
              <Icon className={iconClassName} /> {item.label}
            </SidebarLink>
          );
        })}
    </div>
  );
}

/**
 * Una sección está abierta si el sidebar es slim o si el usuario la desplegó.
 * Por defecto las secciones de Terceros, Tienda y Proyectos aparecen desplegadas.
 */
function seccionAbierta(
  seccion: { id: string; items: AdminSeccionItem[] },
  _pathname: string,
  abiertas: Record<string, boolean>,
  slim: boolean,
): boolean {
  return slim || (abiertas[seccion.id] ?? true);
}

/** Secciones de Reportes reutilizables dentro de cada módulo. */
function GrupoReportes({
  secciones,
  abiertas,
  setAbiertas,
  slim,
  onLinkClick,
  hasFuncionalidad,
  iconClassName = 'w-4 h-4',
}: {
  secciones: SidebarSeccionDef[];
  abiertas: Record<string, boolean>;
  setAbiertas: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  slim: boolean;
  onLinkClick: () => void;
  hasFuncionalidad: (func: string) => boolean;
  iconClassName?: string;
}) {
  return (
    <>
      {secciones.map((seccion) => {
        const abierta = slim || (abiertas[seccion.id] ?? false);
        return (
          <SidebarSeccion
            key={seccion.id}
            seccion={seccion}
            abierta={abierta}
            onToggle={(id) =>
              setAbiertas((prev) => ({ ...prev, [id]: !abierta }))
            }
            slim={slim}
            onLinkClick={onLinkClick}
            hasFuncionalidad={hasFuncionalidad}
            iconClassName={iconClassName}
          />
        );
      })}
    </>
  );
}

function App() {
  const { isAuthenticated, isLoading, user, logout, hasFuncionalidad, baseDatos } = useAuth();
  const empresa = useEmpresa();

  // Check if user has access to an entire module (at least one funcionalidad)
  const hasModuloAccess = (moduloId: Modulo): boolean => {
    const funcs = FUNCIONALIDADES_POR_MODULO[moduloId] || [];
    return funcs.some(f => hasFuncionalidad(f));
  };
  const [moduloActivo, setModuloActivo] = useState<Modulo>('inventario');
  const [adminSeccionesAbiertas, setAdminSeccionesAbiertas] = useState<Record<string, boolean>>({});
  const [tercerosSeccionesAbiertas, setTercerosSeccionesAbiertas] = useState<Record<string, boolean>>({});
  const [ventaSeccionesAbiertas, setVentaSeccionesAbiertas] = useState<Record<string, boolean>>({});
  const [proyectoSeccionesAbiertas, setProyectoSeccionesAbiertas] = useState<Record<string, boolean>>({});
  const [reportesSeccionesAbiertas, setReportesSeccionesAbiertas] = useState<Record<string, boolean>>({});
  const [slimSidebarManual, setSlimSidebar] = useState(false);
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [esMovil, setEsMovil] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
  );
  // Entre 1024 y 1279 px el sidebar queda como riel para no robar ancho al contenido.
  const [esRail, setEsRail] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(min-width: 1024px) and (max-width: 1279px)').matches
  );
  const slimSidebar = slimSidebarManual || esRail;
  const sidebarRef = useRef<HTMLElement>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [empresaOpen, setEmpresaOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const hideSidebar = location.pathname === '/perfil';
  // All hooks must be called before any early returns
  useEffect(() => {
    // Only redirect to login if we're not loading and not authenticated, and not already on login or register page
    if (!isLoading && !isAuthenticated && location.pathname !== '/login' && location.pathname !== '/register') {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, location.pathname, navigate]);

  useEffect(() => {
    const path = location.pathname || '/';
    if (path === '/') {
      setModuloActivo('home');
      return;
    }
    setModuloActivo(moduloDeRuta(path) ?? 'inventario');
  }, [location.pathname]);

  // Ensure sidebar is expanded on initial load
  useEffect(() => {
    setSlimSidebar(false);
  }, []);

  // Cierra el drawer móvil al navegar.
  useEffect(() => {
    setSidebarAbierto(false);
  }, [location.pathname]);

  // Detecta el cambio móvil/escritorio y cierra el drawer al pasar a escritorio.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const onChange = () => {
      setEsMovil(mq.matches);
      if (!mq.matches) setSidebarAbierto(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Detecta el rango de escritorio estrecho (riel) frente al escritorio ancho.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px) and (max-width: 1279px)');
    const onChange = () => setEsRail(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // El aside cerrado no debe ser accesible ni enfocable en móvil.
  useEffect(() => {
    const aside = sidebarRef.current;
    if (!aside) return;
    const oculto = esMovil && !sidebarAbierto;
    if (oculto) {
      aside.setAttribute('inert', '');
      aside.setAttribute('aria-hidden', 'true');
    } else {
      aside.removeAttribute('inert');
      aside.removeAttribute('aria-hidden');
    }
  }, [sidebarAbierto, esMovil]);

  // Drawer abierto: bloquea el scroll del contenido y cierra con Escape.
  useEffect(() => {
    if (!sidebarAbierto || !esMovil) return;
    const main = document.querySelector('main');
    const previousOverflow = main?.style.overflowY ?? '';
    if (main) main.style.overflowY = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarAbierto(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      if (main) main.style.overflowY = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [sidebarAbierto, esMovil]);

  // Early returns must come AFTER all hooks
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  // When not authenticated, redirect to login happens via useEffect
  // The content below is only for authenticated users

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    setShowAccountModal(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const handleLinkClick = () => {
    setSidebarAbierto(false);
  };

  const handleModuloClick = (moduloId: Modulo) => {
    setModuloActivo(moduloId);
    setSidebarAbierto(false);
    // Navegar a la página home del módulo
    navigate(`/${moduloId}`);
  };

  // Sidebar and header are always visible

  const modulos: { id: Modulo; label: string; icon: React.ElementType }[] = [
    { id: 'terceros', label: 'Terceros', icon: UserCircle },
    { id: 'compra', label: 'Compra', icon: UserCircle },
    { id: 'venta', label: 'Tienda', icon: Briefcase },
    { id: 'proyecto', label: 'Proyectos', icon: Wrench },
    { id: 'inventario', label: 'Inventario', icon: Boxes },
    { id: 'reportes', label: 'Reportes', icon: BarChart3 },
  ];

  function handleToggleSlim(): void {
    setSlimSidebar(prev => !prev);
  }

  // RRHH está oculto del menú: sólo se entra escribiendo la URL. El guard de
  // rutas valida la funcionalidad concreta de cada pantalla.
  return (
    <>
      <div className={`grid ${hideSidebar ? 'grid-cols-1' : slimSidebar ? 'grid-cols-1 lg:grid-cols-[4.5rem_minmax(0,1fr)]' : 'grid-cols-1 lg:grid-cols-[4.5rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)]'} grid-rows-[auto_minmax(0,1fr)] app-height overflow-hidden bg-surface w-full`}>
        {!hideSidebar && sidebarAbierto && (
          <button
            type="button"
            aria-label="Cerrar menú de navegación"
            onClick={() => setSidebarAbierto(false)}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden overflow-y-auto"
          />
        )}
        {!hideSidebar && (
        <aside id="sidebar-mobile" ref={sidebarRef} className={`fixed inset-y-0 left-0 z-50 row-span-2 col-start-1 col-end-2 h-full overflow-hidden bg-gradient-to-b from-panel-900 to-panel-800 text-white flex flex-col shadow-xl transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarAbierto ? 'translate-x-0' : '-translate-x-full'} ${slimSidebar ? 'w-[4.5rem]' : 'w-64'}`}>
          <div className={`flex items-center ${slimSidebar ? 'justify-center px-0' : 'px-6'} py-4 border-b border-panel-800`}>
            {!slimSidebar && (
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-lg capitalize">{empresa.nombre.charAt(0).toUpperCase()}</div>
                <h1 className="text-2xl font-bold tracking-wider text-white">{empresa.nombre.toUpperCase()}</h1>
              </div>
            )}
            <button
              onClick={() => setSidebarAbierto(false)}
              title="Cerrar menú"
              aria-label="Cerrar menú de navegación"
              className="ml-auto p-2 rounded-full hover:bg-white/10 transition-colors lg:hidden"
            >
              <X className="w-6 h-6" />
            </button>
            <button
              onClick={handleToggleSlim}
              title={slimSidebar ? 'Expandir sidebar' : 'Contraer sidebar'}
              aria-label={slimSidebar ? 'Expandir sidebar' : 'Contraer sidebar'}
              className={`hidden p-1 rounded-full hover:bg-white/10 transition-colors xl:inline-flex ${slimSidebar ? '' : 'ml-2'}`}
            >
              {slimSidebar ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
            </button>
          </div>
          {location.pathname !== '/' && (
            <nav className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-4 ${slimSidebar ? 'px-1' : ''}`}>
              {!slimSidebar && TITULOS_MODULO[moduloActivo] && (
                <div className="mb-4 flex items-center gap-2.5 px-4">
                  <span className="h-5 w-1 shrink-0 rounded-full bg-brand-500" />
                  <h2 className="truncate text-base font-bold text-white">
                    {TITULOS_MODULO[moduloActivo]}
                  </h2>
                </div>
              )}
              <>
              {moduloActivo === 'inventario' && (
                <div className={`space-y-1 ${slimSidebar ? 'px-0' : 'px-3'}`}>
                  <SidebarLink slim={slimSidebar} to="/movimientos" onClick={handleLinkClick} exact disabled={!hasFuncionalidad('movimientos')}>
                    <ArrowLeftRight className="w-5 h-5" />
                    Movimientos
                  </SidebarLink>
                  <SidebarLink slim={slimSidebar} to="/movimientos/pendientes" onClick={handleLinkClick} disabled={!hasFuncionalidad('pendientes')}>
                    <Clock className="w-6 h-6" />
                    Pendientes
                  </SidebarLink>
                  <SidebarLink slim={slimSidebar} to="/productos" onClick={handleLinkClick} disabled={!hasFuncionalidad('productos')}>
                    <Boxes className="w-6 h-6" />
                    Productos
                  </SidebarLink>
                  <GrupoReportes
                    secciones={REPORTES_INVENTARIO}
                    abiertas={reportesSeccionesAbiertas}
                    setAbiertas={setReportesSeccionesAbiertas}
                    slim={slimSidebar}
                    onLinkClick={handleLinkClick}
                    hasFuncionalidad={hasFuncionalidad}
                    iconClassName="w-6 h-6"
                  />
                </div>
              )}
              {moduloActivo === 'dj08' && (
                <ul className="space-y-1 px-3">
                  <li>
                    <SidebarLink slim={slimSidebar} to="/dj08" onClick={handleLinkClick} exact>
                      <ScrollText className="w-6 h-6" />
                      Declaración Jurada
                    </SidebarLink>
                  </li>
                </ul>
              )}
              {moduloActivo === 'rrhh' && (
                <ul className="space-y-1 px-3">
                  <li>
                    <SidebarLink
                      slim={slimSidebar}
                      to="/rrhh/asistencia"
                      onClick={handleLinkClick}
                      disabled={!hasFuncionalidad('rrhh_asistencia')}
                    >
                      <Clock className="w-6 h-6" />
                      Asistencia
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink
                      slim={slimSidebar}
                      to="/rrhh/nomina"
                      onClick={handleLinkClick}
                      disabled={!hasFuncionalidad('rrhh_nomina')}
                    >
                      <Banknote className="w-6 h-6" />
                      Nómina
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink
                      slim={slimSidebar}
                      to="/rrhh/evaluaciones"
                      onClick={handleLinkClick}
                      disabled={!hasFuncionalidad('rrhh_evaluaciones')}
                    >
                      <ClipboardCheck className="w-6 h-6" />
                      Evaluaciones
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink
                      slim={slimSidebar}
                      to="/rrhh/solicitudes"
                      onClick={handleLinkClick}
                      disabled={!hasFuncionalidad('rrhh_solicitudes')}
                    >
                      <ClipboardList className="w-6 h-6" />
                      Solicitudes
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink
                      slim={slimSidebar}
                      to="/rrhh/empleados"
                      onClick={handleLinkClick}
                      disabled={!hasFuncionalidad('rrhh_empleados')}
                    >
                      <Users className="w-6 h-6" />
                      Empleados
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink
                      slim={slimSidebar}
                      to="/rrhh/catalogos"
                      onClick={handleLinkClick}
                      disabled={!hasFuncionalidad('rrhh_catalogos')}
                    >
                      <Library className="w-6 h-6" />
                      Catálogos
                    </SidebarLink>
                  </li>
                </ul>
              )}
              {moduloActivo === 'terceros' && (
                <div className={`${slimSidebar ? 'px-0' : 'px-3'} space-y-1`}>
                  {TERCEROS_SECCIONES.map((seccion) => {
                    const abierta = seccionAbierta(
                      seccion,
                      location.pathname,
                      tercerosSeccionesAbiertas,
                      slimSidebar,
                    );
                    return (
                      <SidebarSeccion
                        key={seccion.id}
                        seccion={seccion}
                        abierta={abierta}
                        onToggle={(id) =>
                          setTercerosSeccionesAbiertas((prev) => ({
                            ...prev,
                            [id]: !abierta,
                          }))
                        }
                        slim={slimSidebar}
                        onLinkClick={handleLinkClick}
                        hasFuncionalidad={hasFuncionalidad}
                        iconClassName="w-6 h-6"
                      />
                    );
                  })}
                  <GrupoReportes
                    secciones={REPORTES_TERCEROS}
                    abiertas={reportesSeccionesAbiertas}
                    setAbiertas={setReportesSeccionesAbiertas}
                    slim={slimSidebar}
                    onLinkClick={handleLinkClick}
                    hasFuncionalidad={hasFuncionalidad}
                    iconClassName="w-6 h-6"
                  />
                </div>
              )}
              {moduloActivo === 'administracion' && (
                <div className={`${slimSidebar ? 'px-0' : 'px-3'} space-y-1`}>
                  {ADMIN_SECCIONES.map((seccion) => {
                    const contieneRutaActual = seccion.items.some(
                      (item) =>
                        location.pathname === item.to ||
                        location.pathname.startsWith(`${item.to}/`),
                    );
                    const abierta =
                      slimSidebar ||
                      (adminSeccionesAbiertas[seccion.id] ?? contieneRutaActual);
                    return (
                      <div key={seccion.id}>
                        {!slimSidebar && (
                          <button
                            type="button"
                            onClick={() =>
                              setAdminSeccionesAbiertas((prev) => ({
                                ...prev,
                                [seccion.id]: !abierta,
                              }))
                            }
                            className="flex w-full items-center justify-between gap-2 rounded px-2 pt-3 pb-1 text-xs font-bold uppercase tracking-widest text-gray-500 transition-colors hover:text-gray-300"
                            aria-expanded={abierta}
                          >
                            <span>{seccion.label}</span>
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform ${abierta ? 'rotate-180' : ''}`}
                            />
                          </button>
                        )}
                        {abierta &&
                          seccion.items.map((item) => {
                            const Icon = item.icon;
                            return (
                              <SidebarLink
                                key={item.to}
                                slim={slimSidebar}
                                to={item.to}
                                onClick={handleLinkClick}
                                disabled={!hasFuncionalidad(item.func)}
                              >
                                <Icon className="w-4 h-4" /> {item.label}
                              </SidebarLink>
                            );
                          })}
                      </div>
                    );
                  })}
                </div>
              )}
              {moduloActivo === 'compra' && (
                <div className={`space-y-1 ${slimSidebar ? 'px-0' : 'px-3'}`}>
                  <SidebarLink slim={slimSidebar} to="/compra/proveedores" onClick={handleLinkClick} disabled={!hasFuncionalidad('proveedores')}>
                    <Briefcase className="w-6 h-6" />
                    Proveedores
                  </SidebarLink>
                  <SidebarLink slim={slimSidebar} to="/compra/anexos" onClick={handleLinkClick} disabled={!hasFuncionalidad('anexos')}>
                    <Boxes className="w-6 h-6" />
                    Anexos
                  </SidebarLink>
                  <SidebarLink slim={slimSidebar} to="/compra/liquidaciones" onClick={handleLinkClick} disabled={!hasFuncionalidad('liquidaciones')}>
                    <Coins className="w-6 h-6" />
                    Liquidaciones
                  </SidebarLink>
                  <SidebarLink slim={slimSidebar} to="/compra/productos-liquidacion" onClick={handleLinkClick} disabled={!hasFuncionalidad('productos_liquidacion')}>
                    <Coins className="w-6 h-6" />
                    Productos en Liquidación
                  </SidebarLink>
                  <GrupoReportes
                    secciones={REPORTES_COMPRA}
                    abiertas={reportesSeccionesAbiertas}
                    setAbiertas={setReportesSeccionesAbiertas}
                    slim={slimSidebar}
                    onLinkClick={handleLinkClick}
                    hasFuncionalidad={hasFuncionalidad}
                    iconClassName="w-6 h-6"
                  />
                </div>
              )}
              {moduloActivo === 'venta' && (
                <div className={`${slimSidebar ? 'px-0' : 'px-3'} space-y-1`}>
                  <SidebarLink slim={slimSidebar} to="/venta/clientes" onClick={handleLinkClick} disabled={!hasFuncionalidad('clientes')}>
                    <UserCircle className="w-6 h-6" />
                    Clientes
                  </SidebarLink>
                  <SidebarLink slim={slimSidebar} to="/ventas/efectivo" onClick={handleLinkClick} disabled={!hasFuncionalidad('venta_efectivo')}>
                    <DollarSign className="w-6 h-6" />
                    Efectivo
                  </SidebarLink>
                  {VENTA_FACTURACION.map((seccion) => {
                    const abierta = seccionAbierta(
                      seccion,
                      location.pathname,
                      ventaSeccionesAbiertas,
                      slimSidebar,
                    );
                    return (
                      <SidebarSeccion
                        key={seccion.id}
                        seccion={seccion}
                        abierta={abierta}
                        onToggle={(id) =>
                          setVentaSeccionesAbiertas((prev) => ({
                            ...prev,
                            [id]: !abierta,
                          }))
                        }
                        slim={slimSidebar}
                        onLinkClick={handleLinkClick}
                        hasFuncionalidad={hasFuncionalidad}
                        iconClassName="w-6 h-6"
                      />
                    );
                  })}
                  <GrupoReportes
                    secciones={REPORTES_VENTA}
                    abiertas={reportesSeccionesAbiertas}
                    setAbiertas={setReportesSeccionesAbiertas}
                    slim={slimSidebar}
                    onLinkClick={handleLinkClick}
                    hasFuncionalidad={hasFuncionalidad}
                    iconClassName="w-6 h-6"
                  />
                </div>
              )}
              {moduloActivo === 'proyecto' && (
                <div className={`${slimSidebar ? 'px-0' : 'px-3'} space-y-1`}>
                  <SidebarLink slim={slimSidebar} to="/proyectos/solicitudes" onClick={handleLinkClick} disabled={!hasFuncionalidad('solicitudes')}>
                    <ClipboardList className="w-6 h-6" />
                    Solicitudes
                  </SidebarLink>
                  <SidebarLink slim={slimSidebar} to="/proyectos/proyectos" onClick={handleLinkClick} disabled={!hasFuncionalidad('proyectos')}>
                    <Layers className="w-6 h-6" />
                    Proyectos
                  </SidebarLink>
                  <SidebarLink slim={slimSidebar} to="/proyectos/liquidaciones" onClick={handleLinkClick} disabled={!hasFuncionalidad('liquidaciones_servicio')}>
                    <Calculator className="w-6 h-6" />
                    Liquidaciones
                  </SidebarLink>
                  <SidebarLink slim={slimSidebar} to="/proyectos/servicios" onClick={handleLinkClick} disabled={!hasFuncionalidad('servicios')}>
                    <Wrench className="w-6 h-6" />
                    Servicios
                  </SidebarLink>
                  {PROYECTO_FACTURACION.map((seccion) => {
                    const abierta = seccionAbierta(
                      seccion,
                      location.pathname,
                      proyectoSeccionesAbiertas,
                      slimSidebar,
                    );
                    return (
                      <SidebarSeccion
                        key={seccion.id}
                        seccion={seccion}
                        abierta={abierta}
                        onToggle={(id) =>
                          setProyectoSeccionesAbiertas((prev) => ({
                            ...prev,
                            [id]: !abierta,
                          }))
                        }
                        slim={slimSidebar}
                        onLinkClick={handleLinkClick}
                        hasFuncionalidad={hasFuncionalidad}
                        iconClassName="w-6 h-6"
                      />
                    );
                  })}
                  <GrupoReportes
                    secciones={REPORTES_PROYECTO}
                    abiertas={reportesSeccionesAbiertas}
                    setAbiertas={setReportesSeccionesAbiertas}
                    slim={slimSidebar}
                    onLinkClick={handleLinkClick}
                    hasFuncionalidad={hasFuncionalidad}
                    iconClassName="w-6 h-6"
                  />
                </div>
              )}
              {moduloActivo === 'reportes' && (
                <div className={`${slimSidebar ? 'px-0' : 'px-3'} space-y-1`}>
                  {/* Inventario */}
                  {!slimSidebar && (
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest px-2 pt-2 pb-1">Inventario</p>
                  )}
                  <SidebarLink slim={slimSidebar} to="/reportes?report=existencias" onClick={handleLinkClick} disabled={!hasFuncionalidad('reporte_existencias')}>
                    <Boxes className="w-4 h-4" /> Existencias
                  </SidebarLink>
                  <SidebarLink slim={slimSidebar} to="/reportes?report=movimientos-dependencia" onClick={handleLinkClick} disabled={!hasFuncionalidad('reporte_movimientos_dependencia')}>
                    <ArrowLeftRight className="w-4 h-4" /> Mov. por Dependencia
                  </SidebarLink>
                  <SidebarLink slim={slimSidebar} to="/reportes/movimientos-producto" onClick={handleLinkClick} disabled={!hasFuncionalidad('reporte_movimientos_producto')}>
                    <Package className="w-4 h-4" /> Mov. por Producto
                  </SidebarLink>

                  {/* Tienda */}
                  {!slimSidebar && (
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest px-2 pt-3 pb-1">Tienda</p>
                  )}
                  <SidebarLink slim={slimSidebar} to="/reportes?report=clientes" onClick={handleLinkClick} disabled={!hasFuncionalidad('reporte_clientes')}>
                    <Users className="w-4 h-4" /> Registro Clientes
                  </SidebarLink>

                  {/* Compra */}
                  {!slimSidebar && (
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest px-2 pt-3 pb-1">Compra</p>
                  )}
                  <SidebarLink slim={slimSidebar} to="/reportes?report=proveedores" onClick={handleLinkClick} disabled={!hasFuncionalidad('reporte_proveedores')}>
                    <UserCircle className="w-4 h-4" /> Registro de Proveedores
                  </SidebarLink>
                  <SidebarLink slim={slimSidebar} to="/reportes?report=liquidaciones" onClick={handleLinkClick} disabled={!hasFuncionalidad('reporte_liquidaciones')}>
                    <Calculator className="w-4 h-4" /> Resumen Liquidaciones
                  </SidebarLink>

                  {/* Proyectos */}
                  {!slimSidebar && (
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest px-2 pt-3 pb-1">Proyectos</p>
                  )}
                  <SidebarLink slim={slimSidebar} to="/reportes?report=proyectos" onClick={handleLinkClick} disabled={!hasFuncionalidad('reporte_proyectos')}>
                    <Layers className="w-4 h-4" /> Registro Proyectos
                  </SidebarLink>
                  <SidebarLink slim={slimSidebar} to="/reportes?report=creadores" onClick={handleLinkClick} disabled={!hasFuncionalidad('reporte_creadores')}>
                    <Users className="w-4 h-4" /> Registro de Realizadores
                  </SidebarLink>
                  <SidebarLink slim={slimSidebar} to="/reportes?report=desempeno" onClick={handleLinkClick} disabled={!hasFuncionalidad('reporte_desempeno')}>
                    <BarChart3 className="w-4 h-4" /> Informe Desempeño
                  </SidebarLink>

                  {/* Ministerios */}
                  {!slimSidebar && (
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest px-2 pt-3 pb-1">Ministerios</p>
                  )}
                  <SidebarLink slim={slimSidebar} to="/reportes?report=onat" onClick={handleLinkClick} disabled={!hasFuncionalidad('reporte_onat')}>
                    <FileText className="w-4 h-4" /> ONAT Retenciones
                  </SidebarLink>
                  <SidebarLink slim={slimSidebar} to="/reportes?report=mincult" onClick={handleLinkClick} disabled={!hasFuncionalidad('reporte_mincult')}>
                    <ClipboardList className="w-4 h-4" /> MINCULT Ingresos
                  </SidebarLink>
                </div>
              )}
            </>
          </nav>
        )}

        {location.pathname === '/' && (
          <div className={`min-h-0 flex-1 overflow-y-auto ${slimSidebar ? 'px-2 py-3 flex justify-center' : 'px-5 py-5 space-y-5'}`}>
            {!slimSidebar && (
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-3 min-w-0">
                  <span className="text-sm font-bold text-white truncate">{user ? `${user.nombre} ${user.primer_apellido}` : '-'}</span>
                </div>
                <InfoRow label="Usuario" value={user?.alias} />
                <InfoRow label="Cédula" value={user?.ci} />
                <InfoRow label="Grupo" value={user?.grupo?.nombre} />
                <InfoRow label="Dependencia" value={user?.dependencia?.nombre} />
                <InfoRow label="Base de Datos" value={baseDatos} />
              </div>
            )}

            {!slimSidebar && (
              <div className="border-t border-gray-800 pt-4">
                  <button
                    onClick={() => setEmpresaOpen(!empresaOpen)}
                    className="w-full flex flex-wrap items-center justify-between gap-3 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider hover:text-gray-300 transition-colors"
                  >
                    <span>Empresa</span>
                    {empresaOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {empresaOpen && (
                    <div className="mt-2 space-y-2.5">
                      <InfoRow label="Nombre" value={user?.dependencia?.nombre} />
                      <InfoRow label="Denominación" value={user?.dependencia?.denominacion} />
                      <InfoRow label="REUP" value={user?.dependencia?.reeup} />
                      <InfoRow label="NIT" value={user?.dependencia?.nit} />
                      <InfoRow label="Teléfono" value={user?.dependencia?.telefono} />
                      <InfoRow label="Email" value={user?.dependencia?.email} />
                      <InfoRow label="Web" value={user?.dependencia?.web} />
                      <InfoRow label="Dirección" value={user?.dependencia?.direccion} />
                      <InfoRow label="Provincia" value={user?.dependencia?.provincia} />
                      <InfoRow label="Municipio" value={user?.dependencia?.municipio} />
                    </div>
                  )}
              </div>
            )}
          </div>
        )}

        {/* Footer del sidebar: perfil de usuario (visible en todos los módulos) */}
        <div className={`border-t border-panel-800 ${slimSidebar ? 'flex justify-center py-3' : 'px-3 py-3'}`}>
          <button
            onClick={() => setShowAccountModal(true)}
            className={`flex items-center rounded-lg p-1.5 hover:bg-white/10 transition-colors group ${slimSidebar ? 'justify-center' : 'gap-3 w-full'}`}
            title="Perfil"
          >
            <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold shrink-0">
              {user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
            </div>
            {!slimSidebar && (
              <div className="min-w-0 text-left leading-tight">
                <span className="block text-sm font-medium text-gray-200 group-hover:text-white truncate">
                  {user ? `${user.nombre} ${user.primer_apellido}` : 'Usuario'}
                </span>
                {user?.cargo && (
                  <span className="block text-xs text-gray-400 group-hover:text-gray-300 truncate">
                    {user.cargo}
                  </span>
                )}
              </div>
            )}
          </button>
        </div>
        </aside>
        )}
        <header className={`col-span-1 ${hideSidebar ? '' : 'lg:col-start-2 lg:col-end-3'} row-start-1 row-end-2 sticky top-0 z-30 min-w-0 bg-gradient-to-r from-panel-900 via-panel-700 to-panel-900 text-white shadow-md px-3 py-3 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] h-16 flex flex-wrap items-center justify-between gap-3 gap-2 md:px-6`}>
          <div className="flex items-center gap-2">
            {!hideSidebar && (
              <button
                type="button"
                onClick={() => setSidebarAbierto(true)}
                aria-label="Abrir menú de navegación"
                aria-controls="sidebar-mobile"
                aria-expanded={sidebarAbierto}
                title="Abrir menú"
                className="p-2.5 rounded-lg hover:bg-white/10 transition-colors lg:hidden"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
            <Link
              to="/"
              onClick={() => setModuloActivo('home')}
              className="p-2.5 rounded-lg hover:bg-gray-100 transition-all duration-300 ease-out hover:scale-110 active:scale-95 group"
              title="Inicio"
              aria-label="Inicio"
            >
              <Home className="w-6 h-6 text-gray-200 group-hover:text-white transition-colors" />
            </Link>
          </div>

          <nav className="hide-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto md:gap-4" aria-label="Módulos">
            {modulos.map((modulo) => {
              const isActive = moduloActivo === modulo.id;
              const isBlocked = modulo.id !== 'home' && modulo.id !== 'dj08' && !hasModuloAccess(modulo.id);
              const Icon = modulo.icon;
              return (
                <button
                  key={modulo.id}
                  onClick={() => !isBlocked && handleModuloClick(modulo.id)}
                  disabled={isBlocked}
                  aria-label={modulo.label}
                  aria-current={isActive ? 'page' : undefined}
                  title={isBlocked ? 'No tienes acceso a este módulo' : modulo.label}
                  className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-medium transition-all duration-300 ease-out hover:-translate-y-0.5 sm:px-3
                    ${isBlocked
                      ? 'text-gray-500 cursor-not-allowed hover:translate-y-0'
                      : isActive
                        ? 'bg-white/10 text-white font-semibold'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{modulo.label}</span>
                  {isBlocked && <Lock className="w-3 h-3 text-gray-300" />}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                hasModuloAccess('administracion') &&
                handleModuloClick('administracion')
              }
              disabled={!hasModuloAccess('administracion')}
              aria-label="Administración"
              title={
                hasModuloAccess('administracion')
                  ? 'Administración'
                  : 'No tienes acceso a este módulo'
              }
              className={`p-2.5 rounded-lg transition-all duration-300 ease-out hover:scale-110 active:scale-95 group
                ${!hasModuloAccess('administracion')
                  ? 'text-gray-500 cursor-not-allowed hover:scale-100'
                  : moduloActivo === 'administracion'
                    ? 'bg-white/10 text-brand-400'
                    : 'text-gray-200 hover:text-white hover:bg-gray-100'
                }`}
            >
              <Settings className="w-6 h-6 transition-colors" />
            </button>
          </div>
        </header>
        <div className={`col-span-1 ${hideSidebar ? '' : 'lg:col-start-2 lg:col-end-3'} row-start-2 row-end-3 min-w-0 flex flex-col w-full`}>
          <main className={`min-h-0 min-w-0 flex-1 overflow-y-auto ${hideSidebar ? 'bg-surface' : 'bg-gray-50'} p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:p-8 w-full`}>
            <div className="mx-auto w-full max-w-[1600px] animate-fade-in-up [animation-fill-mode:both]">
              <Routes>
                <Route
                  path="/"
                  element={<HomePage />}
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute currentPath="/dashboard">
                      <DashboardPageContainer />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/terceros"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/terceros">
                      <TercerosHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compra/clientes"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/compra/clientes">
                      <ClientesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compra/proveedores"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/compra/proveedores">
                      <ClientesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/productos"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/productos">
                      <ProductosPage />
                    </ProtectedRoute>
                  }
                />

                {/* Rutas de Inventario - protegidas */}
                <Route
                  path="/inventario"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/inventario">
                      <InventarioHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/movimientos/pendientes"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/movimientos/pendientes">
                      <MovimientosPendientesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/movimientos/seleccionar-recepcion"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/movimientos">
                      <RecepcionesPage />
                    </ProtectedRoute>
                  }
                />
                {/* Rutas de Ventas - protegidas */}
                <Route
                  path="/venta"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/venta">
                      <VentaHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/clientes"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/clientes">
                      <ClientesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/venta/clientes"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/venta/clientes">
                      <ClientesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/clientes/:id"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/clientes">
                      <PerfilClientePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ventas/operaciones"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/ventas/operaciones">
                      <VentaHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ventas/contratos"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/ventas/contratos">
                      <ContratosPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ventas/suplementos"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/ventas/suplementos">
                      <SuplementosPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ventas/facturas"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/ventas/facturas">
                      <FacturasPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ventas/ofertas"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/ventas/ofertas">
                      <OfertasTiendaPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ventas/pre-facturas"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/ventas/pre-facturas">
                      <PreFacturasTiendaPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ventas/efectivo"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/ventas/efectivo">
                      <VentasEfectivoPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ventas/cuentas"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/ventas/cuentas">
                      <CuentasClientePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ventas/registro-clientes"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/ventas">
                      <ReportesHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reportes/registro-clientes"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/reportes">
                      <ReporteClientes />
                    </ProtectedRoute>
                  }
                />

                {/* Rutas de Proyectos - protegidas */}
                <Route
                  path="/proyecto"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/proyecto">
                      <ProyectosHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/proyectos/servicios"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/proyectos/servicios">
                      <ServiciosPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/proyectos/solicitudes"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/proyectos/solicitudes">
                      <SolicitudesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/proyectos/proyectos"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/proyectos/proyectos">
                      <ProyectosPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/proyectos/etapas"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/proyectos/etapas">
                      <EtapasPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/proyectos/tareas-etapa"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/proyectos/tareas-etapa">
                      <TareasEtapaPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/proyectos/realizadores"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/proyectos/realizadores">
                      <RealizadoresPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/proyectos/facturas-servicio"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/proyectos/facturas-servicio">
                      <FacturasServicioPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/proyectos/ofertas"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/proyectos/ofertas">
                      <OfertasPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/proyectos/pre-facturas"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/proyectos/pre-facturas">
                      <PreFacturasPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/proyectos/pagos-factura-servicio"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/proyectos/pagos-factura-servicio">
                      <PagosFacturaServicioPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/proyectos/liquidaciones"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/proyectos/liquidaciones">
                      <ProyectoLiquidacionesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/proyectos/registro-proyectos"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/proyectos">
                      <ReportesHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/proyectos/registro-realizadores"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/proyectos">
                      <ReportesHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/proyectos/informe-desempeno"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/proyectos">
                      <ReportesHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reportes/registro-proyectos"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/reportes">
                      <ReporteProyectos />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/proyectos/certificaciones"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/proyectos/certificaciones">
                      <CertificacionesPage />
                    </ProtectedRoute>
                  }
                />

                {/* Rutas de Administración - protegidas */}
                <Route
                  path="/administracion"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/administracion">
                      <AdministracionHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/configuracion/:pagina?"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/configuracion">
                      <ConfiguracionPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/configuracion/rrhh/:catalogo"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/configuracion/rrhh">
                      <CatalogoRrhhConfiguracion />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dj08"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/dj08">
                      <DJ08Page />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rrhh"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/rrhh">
                      <RrhhHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rrhh/departamentos"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/rrhh/departamentos">
                      {/* Unificación: la sección vive como pestaña de Catálogos. */}
                      <Navigate to="/rrhh/catalogos?tab=departamentos" replace />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rrhh/puestos"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/rrhh/puestos">
                      <Navigate to="/rrhh/catalogos?tab=puestos" replace />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rrhh/catalogos"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/rrhh/catalogos">
                      <CatalogosPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rrhh/empleados"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/rrhh/empleados">
                      <EmpleadosPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rrhh/asistencia"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/rrhh/asistencia">
                      <AsistenciaPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rrhh/movimientos"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/rrhh/movimientos">
                      <RrhhMovimientosPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rrhh/nomina"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/rrhh/nomina">
                      <NominaPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rrhh/nomina/:id"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/rrhh/nomina">
                      <NominaDetallePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rrhh/nomina/:id/pagos"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/rrhh/nomina">
                      <NominaPagosPage />
                    </ProtectedRoute>
                  }
                />
                {/* Alias del plural para no dejar la página en blanco. */}
                <Route
                  path="/rrhh/pagos-resultados"
                  element={<Navigate to="/rrhh/pagos-resultado" replace />}
                />
                <Route
                  path="/rrhh/pagos-resultados/nuevo"
                  element={<Navigate to="/rrhh/pagos-resultado/nuevo" replace />}
                />
                <Route
                  path="/rrhh/pagos-resultados/:id"
                  element={<RedirectPagoResultadoDetalle />}
                />
                <Route
                  path="/rrhh/pagos-resultado"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/rrhh/nomina">
                      <PagosResultadoPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rrhh/pagos-resultado/nuevo"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/rrhh/nomina">
                      <PagoResultadoNuevoPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rrhh/pagos-resultado/:id"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/rrhh/nomina">
                      <PagoResultadoDetallePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rrhh/solicitudes"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/rrhh/solicitudes">
                      <RrhhSolicitudesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rrhh/evaluaciones"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/rrhh/evaluaciones">
                      <EvaluacionesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rrhh/evaluaciones/:id"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/rrhh/evaluaciones">
                      <EvaluacionDetallePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rrhh/objetivos"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/rrhh/objetivos">
                      <ObjetivosPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rrhh/reportes"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/rrhh/reportes">
                      <ReportesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/rrhh/auditoria"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/rrhh/auditoria">
                      <AuditoriaPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/monedas"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/monedas">
                      <MonedasPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/usuarios"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/usuarios">
                      <UsuariosPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/usuarios-credenciales"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/usuarios-credenciales">
                      <UsuariosCredencialesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/grupos"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/grupos">
                      <GruposPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dependencias"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/dependencias">
                      <DependenciasPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/respaldos"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/respaldos">
                      <RespaldosPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cuentas"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/cuentas">
                      <CuentasPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/movimientos"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/movimientos">
                      <MovimientosPage />
                    </ProtectedRoute>
                  }
                />
                {/* Rutas de Compras - protegidas */}
                <Route
                  path="/compra"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/compra">
                      <CompraHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compra/convenios"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/compra/convenios">
                      <CompraConveniosPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compra/anexos"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/compra/anexos">
                      <CompraAnexosPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compra/liquidaciones"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/compra/liquidaciones">
                      <LiquidacionesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compra/productos-liquidacion"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/compra/productos-liquidacion">
                      <ProductosEnLiquidacionPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/compra/cuentas"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/compra/cuentas">
                      <CuentasClientePage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/inventario/existencias"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/inventario">
                      <ReportesHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/inventario/movimientos-dependencia"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/inventario">
                      <ReportesHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/inventario/movimientos-producto"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/inventario">
                      <ReporteMovimientosProducto />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compra/reporte-proveedores"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/compra">
                      <ReportesHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compra/resumen-liquidaciones"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/compra">
                      <ReportesHome />
                    </ProtectedRoute>
                  }
                />

                {/* Reportes reutilizados desde el módulo Terceros */}
                <Route
                  path="/terceros/registro-clientes"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/terceros">
                      <ReportesHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/terceros/registro-proveedores"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/terceros">
                      <ReportesHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/terceros/registro-realizadores"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/terceros">
                      <ReportesHome />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/reportes"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/reportes">
                      <ReportesHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reportes/existencias"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/reportes/existencias">
                      <ReporteExistencias />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reportes/movimientos-dependencia"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/reportes/movimientos-dependencia">
                      <ReporteMovimientosDependencia />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reportes/movimientos-producto"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/reportes/movimientos-producto">
                      <ReporteMovimientosProducto />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reportes/proveedores"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/reportes/proveedores">
                      <ReporteProveedores />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reportes/mincult"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/reportes">
                      <ReporteMincult />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reportes/onat"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/reportes">
                      <ReporteOnat />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reportes/registro-creadores"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/reportes">
                      <ReporteCreadores />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reportes/informe-desempeno"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/reportes">
                      <ReporteDesempeno />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reportes/resumen-liquidaciones"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/reportes">
                      <ReporteLiquidaciones />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reportes/ingresos-retenciones"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/reportes">
                      <div className="p-8 text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ingresos y Retenciones</h2>
                        <p className="text-gray-500">En desarrollo</p>
                      </div>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/perfil"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/perfil">
                      <PerfilPage />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </div>
          </main>
        </div>
      </div>
      {showAccountModal && (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/50 px-4 overflow-y-auto"
          onClick={() => { setShowLogoutConfirm(false); setShowAccountModal(false); }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 transform transition-all animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <img src="/default.jpg" alt="avatar" className="w-12 h-12 rounded-full object-cover" />
              <div>
                <div className="text-sm font-semibold">{user ? `${user.nombre} ${user.primer_apellido}` : 'Usuario'}</div>
                <div className="text-xs text-gray-400">{user?.alias || 'Cuenta de usuario'}</div>
              </div>
            </div>

            <div className="mt-4 border-t border-gray-100 pt-4 space-y-2">
              <button
                className="w-full text-left px-4 py-2 rounded-md bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                onClick={() => {
                  setShowAccountModal(false);
                  navigate('/perfil');
                }}
              >
                Ver perfil
              </button>

              <button
                className="w-full text-left px-4 py-2 rounded-md border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                onClick={() => {
                  setShowAccountModal(false);
                  setShowLogoutConfirm(true);
                }}
              >
                Salir del sistema
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-60 flex items-start sm:items-center justify-center bg-black/60 px-4 overflow-y-auto"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-xs p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-semibold">Confirmar cierre de sesión</h4>
            <p className="text-sm text-gray-500 mt-2">¿Estás seguro que quieres cerrar la sesión?</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700"
                onClick={handleLogout}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AppWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Toaster position="top-right" />
        <AuthProvider>
          <ErrorBoundary>
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
                </div>
              }
            >
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/logger"
                element={
                  <ProtectedRoute currentPath="/logger">
                    <LoggerPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/*" element={<App />} />
            </Routes>
            </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default AppWrapper;
