import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  ArrowLeftRight,
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
  Layers,
  Users,
  Calculator,
  Package,
  Shield,
  Building,
  Wallet,
  Lock
} from 'lucide-react';

import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { HomePage } from './pages/HomePage';
import { Dashboard } from './pages/Dashboard';
import { LoggerPage } from './pages/Logger';
import { PerfilPage } from './pages/Perfil';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProductosPage } from './pages/Productos';
import { ClientesPage } from './pages/Clientes';
import { PerfilClientePage } from './pages/PerfilCliente';
import { MovimientosPage } from './pages/Movimientos';
import { MovimientosPendientesPage } from './pages/MovimientosPendientes';
import { RecepcionesPage } from './pages/RecepcionesPage';
import { MovimientoAjusteForm } from './pages/movimientos/MovimientoAjusteForm';
import { ConfiguracionPage } from './pages/Configuracion';
import { MonedasPage } from './pages/Monedas';
import { UsuariosPage } from './pages/Usuarios';
import { GruposPage } from './pages/Grupos';
import { DependenciasPage } from './pages/Dependencias';
import { CuentasPage } from './pages/Cuentas';
import { CuentasClientePage } from './pages/CuentasCliente';
import { InventarioHome } from './pages/home/InventarioHome';
import { VentaHome } from './pages/home/VentaHome';
import { CompraHome } from './pages/home/CompraHome';
import { ReportesHome } from './pages/home/ReportesHome';
import { ProyectosHome } from './pages/home/ProyectosHome';
import { AdministracionHome } from './pages/home/AdministracionHome';
import ReporteExistencias from './pages/reportes/ReporteExistencias';
import ReporteMovimientosDependencia from './pages/reportes/ReporteMovimientosDependencia';
import ReporteMovimientosProducto from './pages/reportes/ReporteMovimientosProducto';
import ReporteProveedores from './pages/reportes/ReporteProveedores';
import ReporteClientes from './pages/reportes/ReporteClientes';
import ReporteProyectos from './pages/reportes/ReporteProyectos';
import ReporteCreadores from './pages/reportes/ReporteCreadores';
import ReporteDesempeno from './pages/reportes/ReporteDesempeno';
import ReporteOnat from './pages/reportes/ReporteOnat';
import ReporteMincult from './pages/reportes/ReporteMincult';
import ReporteLiquidaciones from './pages/reportes/ReporteLiquidaciones';
import { ConveniosPage as CompraConveniosPage } from './pages/Convenios';
import { AnexosPage as CompraAnexosPage } from './pages/Anexos';
import { ProductosEnLiquidacionPage } from './pages/compra/ProductosEnLiquidacionPage';
import { LiquidacionesPage } from './pages/compra/LiquidacionesPage';
import { CrearLiquidacionPage } from './pages/compra/CrearLiquidacionPage';
import { ContratosPage } from './pages/ventas/ContratosPage';
import { SuplementosPage } from './pages/ventas/SuplementosPage';
import { FacturasPage } from './pages/ventas/facturas/FacturasPage';
import { VentasEfectivoPage } from './pages/ventas/VentasEfectivoPage';
import { ServiciosPage } from './pages/proyecto/ServiciosPage';
import { SolicitudesPage } from './pages/proyecto/SolicitudesPage';
import { ProyectosPage } from './pages/proyecto/ProyectosPage';
import { EtapasPage } from './pages/proyecto/EtapasPage';
import { TareasEtapaPage } from './pages/proyecto/TareasEtapaPage';
import { RealizadoresPage } from './pages/proyecto/RealizadoresPage';
import { FacturasServicioPage } from './pages/proyecto/FacturasServicioPage';
import { OfertasPage } from './pages/proyecto/OfertasPage';
import { PreFacturasPage } from './pages/proyecto/PreFacturasPage';
import { PagosFacturaServicioPage } from './pages/proyecto/PagosFacturaServicioPage';
import { LiquidacionesPage as ProyectoLiquidacionesPage } from './pages/proyecto/LiquidacionesPage';
import { CertificacionesPage } from './pages/proyecto/CertificacionesPage';

type Modulo = 'administracion' | 'venta' | 'compra' | 'inventario' | 'reportes' | 'home' | 'proyecto';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 0, // Siempre considerarse stale para obtener datos frescos
    },
  },
});

const rutasPorModulo: Record<Modulo, string[]> = {
  inventario: ['/inventario', '/movimientos', '/movimientos/pendientes', '/movimientos/ajuste', '/movimientos/seleccionar-recepcion', '/productos', '/dashboard', '/perfil'],
  administracion: ['/administracion', '/configuracion', '/monedas', '/usuarios', '/grupos', '/dependencias', '/cuentas', '/perfil'],
  venta: ['/venta', '/ventas', '/clientes', '/ventas/operaciones', '/ventas/contratos', '/ventas/suplementos', '/ventas/facturas', '/ventas/efectivo', '/ventas/cuentas', '/perfil'],
  compra: ['/compra', '/compra/clientes', '/compra/convenios', '/compra/anexos', '/compra/liquidaciones', '/compra/productos-liquidacion', '/compra/cuentas', '/perfil'],
  proyecto: ['/proyecto', '/proyectos', '/proyectos/servicios', '/proyectos/solicitudes', '/proyectos/proyectos', '/proyectos/etapas', '/proyectos/tareas-etapa', '/proyectos/realizadores', '/proyectos/facturas-servicio', '/proyectos/ofertas', '/proyectos/pre-facturas', '/proyectos/pagos-factura-servicio', '/proyectos/liquidaciones', '/perfil'],
  reportes: ['/reportes', '/reportes/existencias', '/reportes/movimientos-dependencia', '/reportes/movimientos-producto', '/reportes/proveedores', '/reportes/registro-clientes', '/reportes/registro-proyectos', '/reportes/registro-creadores', '/reportes/informe-desempeno', '/reportes/resumen-liquidaciones', '/reportes/ingresos-retenciones', '/reportes/mincult', '/reportes/onat', '/perfil'],
  home: ['/', '/perfil'],
};

// Componente para proteger rutas según el módulo
function ProtectedRoute({
  children,
  currentPath,
}: {
  children: React.ReactNode;
  currentPath: string;
  moduloActivo?: Modulo;
}) {
  const moduloRuta = (
    Object.entries(rutasPorModulo) as [Modulo, string[]][]
  ).find(([, rutas]) =>
    rutas.some(route =>
      route === '/' ? currentPath === route : currentPath === route || currentPath.startsWith(route)
    )
  )?.[0] as Modulo | undefined;

  const rutasPermitidas = rutasPorModulo[moduloRuta ?? 'inventario'];
  const isAllowed = rutasPermitidas.some(route =>
    currentPath === route || (route !== '/' && currentPath.startsWith(route))
  );

  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
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
        text-slate-600 opacity-40 cursor-not-allowed
      `}>
        <span className="transition-all duration-300 text-slate-600">
          {children && React.Children.toArray(children)[0]}
        </span>
        {!slim && (
          <span className="font-medium flex items-center gap-2">
            {children && React.Children.toArray(children).slice(1)}
            <Lock className="w-3.5 h-3.5 text-slate-500" />
          </span>
        )}
        {slim && <Lock className="w-3 h-3 text-slate-500 absolute -top-0.5 -right-0.5" />}
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
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }
      `}
    >
      <span className={`
        absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 
        bg-blue-400 rounded-r-full transition-all duration-300
        group-hover:h-6
        ${isActive ? 'h-8 bg-white' : ''}
      `} />
      <span className={`
        transition-all duration-300
        ${isActive ? 'text-white scale-110' : 'text-slate-500 group-hover:text-blue-400 group-hover:scale-110'}
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

// Map each module to the funcionalidades it requires
const MODULO_FUNCIONALIDADES: Record<Modulo, string[]> = {
  inventario: ['movimientos', 'pendientes', 'productos'],
  compra: ['proveedores', 'convenios', 'anexos', 'liquidaciones', 'productos_liquidacion'],
  venta: ['clientes', 'contratos', 'suplementos', 'facturas', 'venta_efectivo'],
  proyecto: ['servicios', 'solicitudes', 'proyectos', 'facturas_servicio', 'ofertas', 'pre_facturas', 'liquidaciones_servicio'],
  reportes: ['reporte_existencias', 'reporte_movimientos_dependencia', 'reporte_movimientos_producto', 'reporte_proveedores', 'reporte_clientes', 'reporte_proyectos', 'reporte_creadores', 'reporte_desempeno', 'reporte_liquidaciones', 'reporte_onat', 'reporte_mincult'],
  administracion: ['configuracion', 'monedas', 'usuarios', 'grupos', 'dependencias', 'cuentas'],
  home: [],
};

function App() {
  const { isAuthenticated, isLoading, user, logout, hasFuncionalidad } = useAuth();
  
  // Check if user has access to an entire module (at least one funcionalidad)
  const hasModuloAccess = (moduloId: Modulo): boolean => {
    const funcs = MODULO_FUNCIONALIDADES[moduloId] || [];
    return funcs.some(f => hasFuncionalidad(f));
  };
  const [moduloActivo, setModuloActivo] = useState<Modulo>('inventario');
  const [slimSidebar, setSlimSidebar] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === '/' || location.pathname === '/perfil';

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
    for (const [moduloKey, rutas] of Object.entries(rutasPorModulo) as [Modulo, string[]][]) {
      if (rutas.some(route => route === '/' ? path === route : path === route || (route !== '/' && path.startsWith(route)))) {
        setModuloActivo(moduloKey);
        return;
      }
    }
    setModuloActivo('inventario');
  }, [location.pathname]);

  // Ensure sidebar is expanded on initial load
  useEffect(() => {
    setSlimSidebar(false);
  }, []);

  // Early returns must come AFTER all hooks
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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

  const handleLinkClick = () => { };

  const handleModuloClick = (moduloId: Modulo) => {
    setModuloActivo(moduloId);
    // Navegar a la página home del módulo
    navigate(`/${moduloId}`);
  };

  // Sidebar and header are always visible

  const modulos: { id: Modulo; label: string; icon: React.ElementType }[] = [
    { id: 'inventario', label: 'Inventario', icon: Boxes },
    { id: 'compra', label: 'Compra', icon: UserCircle },
    { id: 'venta', label: 'Tienda', icon: Briefcase },
    { id: 'proyecto', label: 'Proyectos', icon: Wrench },
    { id: 'reportes', label: 'Reportes', icon: BarChart3 },
    { id: 'administracion', label: 'Administración', icon: Settings },
  ];

  function handleToggleSlim(): void {
    setSlimSidebar(prev => !prev);
  }
  return (
    <QueryClientProvider client={queryClient}>
      <div className={`grid ${isHomePage ? 'grid-cols-[0_1fr]' : slimSidebar ? 'grid-cols-[4.5rem_1fr]' : 'grid-cols-[16rem_1fr]'} grid-rows-[auto_1fr] h-screen bg-gray-50`}>
        <aside className={`row-span-2 col-start-1 col-end-2 h-full bg-slate-900 text-white flex flex-col shadow-xl min-h-screen transition-all duration-300 ${isHomePage ? 'hidden' : slimSidebar ? 'w-[4.5rem]' : 'w-64'}`}>
          <div className={`flex items-center ${slimSidebar ? 'justify-center px-0' : 'px-6'} py-4 border-b border-slate-800`}>
            {!slimSidebar && (
              <h1 className="text-2xl font-bold tracking-wider text-blue-400">CAGUAYO</h1>
            )}
            <button
              onClick={handleToggleSlim}
              title={slimSidebar ? 'Expandir sidebar' : 'Contraer sidebar'}
              className={`p-1 rounded-full hover:bg-slate-800 transition-colors ${slimSidebar ? '' : 'ml-2'}`}
            >
              {slimSidebar ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
            </button>
          </div>
          <nav className={`flex-1 overflow-y-auto py-4 ${slimSidebar ? 'px-1' : ''}`}>
            <>
              {moduloActivo === 'inventario' && (
                <ul className={`space-y-1 ${slimSidebar ? 'px-0' : 'px-3'}`}>
                  <li>
                    <SidebarLink slim={slimSidebar} to="/movimientos" onClick={handleLinkClick} exact disabled={!hasFuncionalidad('movimientos')}>
                      <ArrowLeftRight className="w-5 h-5" />
                      Movimientos
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink slim={slimSidebar} to="/movimientos/pendientes" onClick={handleLinkClick} disabled={!hasFuncionalidad('pendientes')}>
                      <Clock className="w-6 h-6" />
                      Pendientes
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink slim={slimSidebar} to="/productos" onClick={handleLinkClick} disabled={!hasFuncionalidad('productos')}>
                      <Boxes className="w-6 h-6" />
                      Productos
                    </SidebarLink>
                  </li>
                </ul>
              )}
              {moduloActivo === 'administracion' && (
                <ul className="space-y-1 px-3">
                  <li>
                    <SidebarLink slim={slimSidebar} to="/configuracion" onClick={handleLinkClick} disabled={!hasFuncionalidad('configuracion')}>
                      <Settings className="w-6 h-6" />
                      Configuración
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink slim={slimSidebar} to="/monedas" onClick={handleLinkClick} disabled={!hasFuncionalidad('monedas')}>
                      <Coins className="w-6 h-6" />
                      Monedas
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink slim={slimSidebar} to="/usuarios" onClick={handleLinkClick} disabled={!hasFuncionalidad('usuarios')}>
                      <Users className="w-6 h-6" />
                      Usuarios
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink slim={slimSidebar} to="/grupos" onClick={handleLinkClick} disabled={!hasFuncionalidad('grupos')}>
                      <Shield className="w-6 h-6" />
                      Grupos
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink slim={slimSidebar} to="/dependencias" onClick={handleLinkClick} disabled={!hasFuncionalidad('dependencias')}>
                      <Building className="w-6 h-6" />
                      Dependencias
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink slim={slimSidebar} to="/cuentas" onClick={handleLinkClick} disabled={!hasFuncionalidad('cuentas')}>
                      <Wallet className="w-6 h-6" />
                      Cuentas
                    </SidebarLink>
                  </li>
                </ul>
              )}
              {moduloActivo === 'compra' && (
                <ul className="space-y-1 px-3">
                  <li>
                    <SidebarLink slim={slimSidebar} to="/compra/clientes" onClick={handleLinkClick} disabled={!hasFuncionalidad('proveedores')}>
                      <UserCircle className="w-6 h-6" />
                      Proveedores
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink slim={slimSidebar} to="/compra/convenios" onClick={handleLinkClick} disabled={!hasFuncionalidad('convenios')}>
                      <FileText className="w-6 h-6" />
                      Convenios
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink slim={slimSidebar} to="/compra/anexos" onClick={handleLinkClick} disabled={!hasFuncionalidad('anexos')}>
                      <Boxes className="w-6 h-6" />
                      Anexos
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink slim={slimSidebar} to="/compra/liquidaciones" onClick={handleLinkClick} disabled={!hasFuncionalidad('liquidaciones')}>
                      <Coins className="w-6 h-6" />
                      Liquidaciones
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink slim={slimSidebar} to="/compra/productos-liquidacion" onClick={handleLinkClick} disabled={!hasFuncionalidad('productos_liquidacion')}>
                      <Coins className="w-6 h-6" />
                      Productos en Liquidación
                    </SidebarLink>
                  </li>
                </ul>
              )}
              {moduloActivo === 'venta' && (
                <ul className="space-y-1 px-3">
                  <li>
                    <SidebarLink slim={slimSidebar} to="/clientes" onClick={handleLinkClick} disabled={!hasFuncionalidad('clientes')}>
                      <UserCircle className="w-6 h-6" />
                      Clientes
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink slim={slimSidebar} to="/ventas/contratos" onClick={handleLinkClick} disabled={!hasFuncionalidad('contratos')}>
                      <FilePlus className="w-6 h-6" />
                      Contrato
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink slim={slimSidebar} to="/ventas/suplementos" onClick={handleLinkClick} disabled={!hasFuncionalidad('suplementos')}>
                      <FileText className="w-6 h-6" />
                      Suplemento
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink slim={slimSidebar} to="/ventas/facturas" onClick={handleLinkClick} disabled={!hasFuncionalidad('facturas')}>
                      <Receipt className="w-6 h-6" />
                      Factura
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink slim={slimSidebar} to="/ventas/efectivo" onClick={handleLinkClick} disabled={!hasFuncionalidad('venta_efectivo')}>
                      <DollarSign className="w-6 h-6" />
                      Efectivo
                    </SidebarLink>
                  </li>
                </ul>
              )}
              {moduloActivo === 'proyecto' && (
                <ul className="space-y-1 px-3">
                  <li>
                    <SidebarLink slim={slimSidebar} to="/proyectos/servicios" onClick={handleLinkClick} disabled={!hasFuncionalidad('servicios')}>
                      <Wrench className="w-6 h-6" />
                      Servicios
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink slim={slimSidebar} to="/proyectos/solicitudes" onClick={handleLinkClick} disabled={!hasFuncionalidad('solicitudes')}>
                      <ClipboardList className="w-6 h-6" />
                      Solicitudes
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink slim={slimSidebar} to="/proyectos/proyectos" onClick={handleLinkClick} disabled={!hasFuncionalidad('proyectos')}>
                      <Layers className="w-6 h-6" />
                      Proyectos
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink slim={slimSidebar} to="/proyectos/facturas-servicio" onClick={handleLinkClick} disabled={!hasFuncionalidad('facturas_servicio')}>
                      <Receipt className="w-6 h-6" />
                      Facturas
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink slim={slimSidebar} to="/proyectos/ofertas" onClick={handleLinkClick} disabled={!hasFuncionalidad('ofertas')}>
                      <FilePlus className="w-6 h-6" />
                      Ofertas
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink slim={slimSidebar} to="/proyectos/pre-facturas" onClick={handleLinkClick} disabled={!hasFuncionalidad('pre_facturas')}>
                      <FileText className="w-6 h-6" />
                      Pre-facturas
                    </SidebarLink>
                  </li>
                  <li>
                    <SidebarLink slim={slimSidebar} to="/proyectos/liquidaciones" onClick={handleLinkClick} disabled={!hasFuncionalidad('liquidaciones_servicio')}>
                      <Calculator className="w-6 h-6" />
                      Liquidaciones
                    </SidebarLink>
                  </li>
                </ul>
              )}
              {moduloActivo === 'reportes' && (
                <div className={`${slimSidebar ? 'px-0' : 'px-3'} space-y-1`}>
                  {/* Inventario */}
                  {!slimSidebar && (
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 pt-2 pb-1">Inventario</p>
                  )}
                  <SidebarLink slim={slimSidebar} to="/reportes?report=existencias" onClick={handleLinkClick} disabled={!hasFuncionalidad('reporte_existencias')}>
                    <Boxes className="w-5 h-5" />
                    Existencias
                  </SidebarLink>
                  <SidebarLink slim={slimSidebar} to="/reportes?report=movimientos-dependencia" onClick={handleLinkClick} disabled={!hasFuncionalidad('reporte_movimientos_dependencia')}>
                    <ArrowLeftRight className="w-5 h-5" />
                    Mov. por Dependencia
                  </SidebarLink>
                  <SidebarLink slim={slimSidebar} to="/reportes?report=movimientos-producto" onClick={handleLinkClick} disabled={!hasFuncionalidad('reporte_movimientos_producto')}>
                    <Package className="w-5 h-5" />
                    Mov. por Producto
                  </SidebarLink>

                  {/* Tienda */}
                  {!slimSidebar && (
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 pt-3 pb-1">Tienda</p>
                  )}
                  <SidebarLink slim={slimSidebar} to="/reportes?report=clientes" onClick={handleLinkClick} disabled={!hasFuncionalidad('reporte_clientes')}>
                    <Users className="w-5 h-5" />
                    Registro Clientes
                  </SidebarLink>

                  {/* Compra */}
                  {!slimSidebar && (
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 pt-3 pb-1">Compra</p>
                  )}
                  <SidebarLink slim={slimSidebar} to="/reportes?report=proveedores" onClick={handleLinkClick} disabled={!hasFuncionalidad('reporte_proveedores')}>
                    <UserCircle className="w-5 h-5" />
                    Proveedores
                  </SidebarLink>
                  <SidebarLink slim={slimSidebar} to="/reportes?report=liquidaciones" onClick={handleLinkClick} disabled={!hasFuncionalidad('reporte_liquidaciones')}>
                    <Calculator className="w-5 h-5" />
                    Resumen Liquidaciones
                  </SidebarLink>

                  {/* Proyectos */}
                  {!slimSidebar && (
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 pt-3 pb-1">Proyectos</p>
                  )}
                  <SidebarLink slim={slimSidebar} to="/reportes?report=proyectos" onClick={handleLinkClick} disabled={!hasFuncionalidad('reporte_proyectos')}>
                    <Layers className="w-5 h-5" />
                    Registro Proyectos
                  </SidebarLink>
                  <SidebarLink slim={slimSidebar} to="/reportes?report=creadores" onClick={handleLinkClick} disabled={!hasFuncionalidad('reporte_creadores')}>
                    <Users className="w-5 h-5" />
                    Registro Creadores
                  </SidebarLink>
                  <SidebarLink slim={slimSidebar} to="/reportes?report=desempeno" onClick={handleLinkClick} disabled={!hasFuncionalidad('reporte_desempeno')}>
                    <BarChart3 className="w-5 h-5" />
                    Informe Desempeño
                  </SidebarLink>

                  {/* Ministerios */}
                  {!slimSidebar && (
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 pt-3 pb-1">Ministerios</p>
                  )}
                  <SidebarLink slim={slimSidebar} to="/reportes?report=onat" onClick={handleLinkClick} disabled={!hasFuncionalidad('reporte_onat')}>
                    <FileText className="w-5 h-5" />
                    ONAT Retenciones
                  </SidebarLink>
                  <SidebarLink slim={slimSidebar} to="/reportes?report=mincult" onClick={handleLinkClick} disabled={!hasFuncionalidad('reporte_mincult')}>
                    <ClipboardList className="w-5 h-5" />
                    MINCULT Ingresos
                  </SidebarLink>
                </div>
              )}
            </>
          </nav>
        </aside>
        <header className={`${isHomePage ? 'col-start-1 col-end-3' : 'col-start-2 col-end-3'} row-start-1 row-end-2 sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200 px-6 py-4 h-16 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              onClick={() => setModuloActivo('home')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-300 ease-out hover:scale-110 active:scale-95 group"
              title="Inicio"
            >
              <Home className="w-6 h-6 text-gray-700 group-hover:text-blue-600 transition-colors" />
            </Link>
          </div>

          <div className="flex items-center gap-6">
            {modulos.map((modulo) => {
              const isActive = moduloActivo === modulo.id;
              const isBlocked = modulo.id !== 'home' && !hasModuloAccess(modulo.id);
              const Icon = modulo.icon;
              return (
                <button
                  key={modulo.id}
                  onClick={() => !isBlocked && handleModuloClick(modulo.id)}
                  disabled={isBlocked}
                  title={isBlocked ? 'No tienes acceso a este módulo' : undefined}
                  className={`text-sm font-medium transition-all duration-300 ease-out hover:-translate-y-0.5 pb-1 flex items-center gap-1.5
                    ${isBlocked
                      ? 'text-gray-300 cursor-not-allowed hover:translate-y-0'
                      : isActive
                        ? 'text-blue-900 font-semibold border-b-2 border-blue-600'
                        : 'text-blue-600 hover:text-blue-800'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {modulo.label}
                  {isBlocked && <Lock className="w-3 h-3 text-gray-300" />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/perfil"
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-all duration-300 ease-out hover:scale-110 active:scale-95 group"
              title="Perfil"
            >
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                {user ? (
                  <span className="text-sm font-medium text-blue-700">
                    {user.nombre[0]}{user.primer_apellido[0]}
                  </span>
                ) : (
                  <UserCircle className="w-5 h-5 text-blue-500" />
                )}
              </div>
              <div className="text-left leading-tight hidden sm:block">
                <span className="block text-sm font-medium text-gray-700 group-hover:text-blue-600">
                  {user ? `${user.nombre} ${user.primer_apellido}` : 'Usuario'}
                </span>
                {user?.cargo && (
                  <span className="block text-xs text-gray-400 group-hover:text-blue-500">
                    {user.cargo}
                  </span>
                )}
              </div>
            </Link>
          </div>
        </header>
        <div className={`${isHomePage ? 'col-start-1 col-end-3' : 'col-start-2 col-end-3'} row-start-2 row-end-3 min-w-0 flex flex-col overflow-hidden`}>
          <main className="flex-1 overflow-auto bg-gray-50 p-8">
            <div className="animate-fade-in-up animation-fill-both">
              <Routes>
                <Route
                  path="/"
                  element={<HomePage />}
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute currentPath="/dashboard">
                      <Dashboard />
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
                  path="/movimientos/pendientes"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/movimientos/pendientes">
                      <MovimientosPendientesPage />
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
                <Route
                  path="/movimientos/ajuste"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/movimientos">
                      <MovimientoAjusteForm />
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
                      <ReporteClientes />
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
                      <ReporteProyectos />
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
                  path="/configuracion"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/configuracion">
                      <ConfiguracionPage />
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
                <Route
                  path="/movimientos/pendientes"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/movimientos/pendientes">
                      <MovimientosPendientesPage />
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
                  path="/compra/liquidaciones/crear"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/compra/liquidaciones">
                      <CrearLiquidacionPage />
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
                      <ReporteExistencias />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/inventario/movimientos-dependencia"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/inventario">
                      <ReporteMovimientosDependencia />
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
                  path="/compra/proveedores"
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/compra">
                      <ReporteProveedores />
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
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
                <div className="text-xs text-slate-400">{user?.alias || 'Cuenta de usuario'}</div>
              </div>
            </div>

            <div className="mt-4 border-t border-gray-100 pt-4 space-y-2">
              <button
                className="w-full text-left px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                onClick={() => {
                  setShowAccountModal(false);
                  setModuloActivo('administracion');
                  navigate('/perfil');
                }}
              >
                Ver perfil
              </button>

              {/* TODO: Implementar la acción de 'Salir del sistema' aquí (por ejemplo llamar a la API y limpiar estado). */}
              <button
                className="w-full text-left px-4 py-2 rounded-md border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                onClick={async () => {
                  setShowAccountModal(false);
                  await logout();
                  navigate('/login', { replace: true });
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
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-xs p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-lg font-semibold">Confirmar cierre de sesión</h4>
            <p className="text-sm text-slate-500 mt-2">¿Estás seguro que quieres cerrar la sesión?</p>
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
    </QueryClientProvider>
  );
}

function AppWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Toaster position="top-right" />
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/logger" element={<LoggerPage />} />
            <Route path="/*" element={<App />} />
          </Routes>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default AppWrapper;
