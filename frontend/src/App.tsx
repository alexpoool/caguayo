import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
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
  Shield,
  Building,
  Coins,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import { Dashboard } from './pages/Dashboard';
import { WelcomePage } from './pages/Welcome';
import { ProductosPage } from './pages/Productos';
import { ClientesPage } from './pages/Clientes';
import { PerfilClientePage } from './pages/PerfilCliente';
import { MonedasPage } from './pages/Monedas';
import { MovimientosPage } from './pages/Movimientos';
import { MovimientosPendientesPage } from './pages/MovimientosPendientes';
import { RecepcionesPage } from './pages/RecepcionesPage';
import { MovimientoAjusteForm } from './pages/movimientos/MovimientoAjusteForm';
import { ConfiguracionPage } from './pages/Configuracion';
import { UsuariosPage } from './pages/Usuarios';
import { GruposPage } from './pages/Grupos';
import { DependenciasPage } from './pages/Dependencias';
import { InventarioHome } from './pages/home/InventarioHome';
import { AdministracionHome } from './pages/home/AdministracionHome';
import { VentaHome } from './pages/home/VentaHome';
import { CompraHome } from './pages/home/CompraHome';
import { ReportesHome } from './pages/home/ReportesHome';

type Modulo = 'administracion' | 'venta' | 'compra' | 'inventario' | 'reportes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const rutasPorModulo: Record<Modulo, string[]> = {
  inventario: ['/inventario', '/movimientos', '/movimientos/pendientes', '/movimientos/ajuste', '/movimientos/seleccionar-recepcion', '/productos'],
  administracion: ['/administracion', '/configuracion', '/usuarios', '/grupos', '/monedas', '/dependencias'],
  venta: ['/venta', '/ventas', '/clientes'],
  compra: ['/compra'],
  reportes: ['/reportes'],
};

function ProtectedRoute({ 
  children, 
  moduloActivo, 
  currentPath 
}: { 
  children: React.ReactNode; 
  moduloActivo: Modulo;
  currentPath: string;
}) {
  const rutasPermitidas = rutasPorModulo[moduloActivo];
  const isAllowed = rutasPermitidas.some(route => 
    currentPath === route || (route !== '/' && currentPath.startsWith(route))
  );
  
  if (!isAllowed) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}


function App() {
  const [moduloActivo, setModuloActivo] = useState<Modulo>('inventario');
  const [slimSidebar, setSlimSidebar] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  useEffect(() => {
    setSlimSidebar(isHome);
  }, [isHome]);

  const handleLinkClick = () => {};

  const handleModuloClick = (moduloId: Modulo) => {
    setModuloActivo(moduloId);
    navigate(`/${moduloId}`);
  };

  const handleToggleSlim = () => setSlimSidebar((prev) => !prev);

  useEffect(() => {
    const rutasPermitidas = rutasPorModulo[moduloActivo];
    const isCurrentRouteAllowed = rutasPermitidas.some(route => 
      location.pathname === route || (route !== '/' && location.pathname.startsWith(route))
    );
    if (!isCurrentRouteAllowed && location.pathname !== '/') {
      // ProtectedRoute will redirect if needed
    }
  }, [moduloActivo, location.pathname]);

  const NavLink = ({ to, children, onClick, exact = false }: { to: string; children: React.ReactNode; onClick?: () => void; exact?: boolean }) => {
    const linkLocation = useLocation();
    const isActive = exact 
      ? linkLocation.pathname === to
      : linkLocation.pathname === to || (linkLocation.pathname.startsWith(`${to}/`) && to !== '/movimientos');
    return (
      <Link
        to={to}
        onClick={onClick}
        className={`
          group flex items-center ${slimSidebar ? 'justify-center' : 'gap-3'} ${slimSidebar ? 'px-0' : 'px-3'} py-2.5 rounded-lg 
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
        {!slimSidebar && (
          <span className="font-medium">
            {children && React.Children.toArray(children).slice(1)}
          </span>
        )}
      </Link>
    );
  };

  const modulos: { id: Modulo; label: string; icon: React.ElementType }[] = [
    { id: 'administracion', label: 'Administración', icon: Shield },
    { id: 'venta', label: 'Venta', icon: Briefcase },
    { id: 'compra', label: 'Compra', icon: UserCircle },
    { id: 'inventario', label: 'Inventario', icon: Boxes },
    { id: 'reportes', label: 'Reportes', icon: BarChart3 },
  ];

  return (
    <QueryClientProvider client={queryClient}>
      <div className={`grid ${slimSidebar ? 'grid-cols-[4.5rem_1fr]' : 'grid-cols-[16rem_1fr]'} grid-rows-[auto_1fr] h-screen bg-gray-50`}>
          <aside className={`row-span-2 col-start-1 col-end-2 h-full bg-slate-900 text-white flex flex-col shadow-xl min-h-screen transition-all duration-300 ${slimSidebar ? 'w-[4.5rem]' : 'w-64'}`}>
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
            {!isHome ? (
              <>
                {moduloActivo === 'inventario' && (
              <ul className={`space-y-1 ${slimSidebar ? 'px-0' : 'px-3'}`}>
                <li>
                  <NavLink to="/movimientos" onClick={handleLinkClick} exact>
                    <ArrowLeftRight className="w-6 h-6" />
                    Movimiento
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/movimientos/pendientes" onClick={handleLinkClick}>
                    <Clock className="w-6 h-6" />
                    Pendientes
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/productos" onClick={handleLinkClick}>
                    <Boxes className="w-6 h-6" />
                    Productos
                  </NavLink>
                </li>
              </ul>
              )}
              {moduloActivo === 'administracion' && (
              <ul className="space-y-1 px-3">
                <li>
                  <NavLink to="/grupos" onClick={handleLinkClick}>
                    <Shield className="w-6 h-6" />
                    Grupos
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/monedas" onClick={handleLinkClick}>
                    <Coins className="w-6 h-6" />
                    Monedas
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/dependencias" onClick={handleLinkClick}>
                    <Building className="w-6 h-6" />
                    Dependencias
                  </NavLink>
                </li>
              </ul>
                )}
                {(moduloActivo !== 'inventario' && moduloActivo !== 'administracion') && (
              <div className={`${slimSidebar ? 'flex flex-col items-center px-0 py-4' : 'flex items-center gap-2 px-6 py-4'}`}>
                <Clock className="w-5 h-5 text-slate-300 shrink-0" />
                {!slimSidebar && <p className="text-slate-400 text-sm">Módulo en construcción</p>}
              </div>
                )}
              </>
            ) : (
              <div className="h-full" />
            )}
          </nav>
          {/* Usuario en el sidebar al final */}
          {!isHome && (
            <div className={`flex items-center ${slimSidebar ? 'justify-center' : 'justify-between'} gap-2 px-2 py-5 border-t border-slate-800 mt-auto`}>
              <div className={`flex items-center ${slimSidebar ? '' : 'gap-2'}`}>
                <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-base font-bold">S</div>
                {!slimSidebar && <span className="text-sm font-medium">Solji Charón</span>}
              </div>
              {!slimSidebar && (
                <button className="p-2 rounded-full hover:bg-slate-800 transition-colors" title="Configuración de cuenta">
                  <Settings className="w-5 h-5 text-slate-400" />
                </button>
              )}
            </div>
          )}
        </aside>
        <header className="col-start-2 col-end-3 row-start-1 row-end-2 sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200 px-6 py-4 h-16 flex items-center justify-between">
          <Link
            to="/"
            onClick={() => setModuloActivo('inventario')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-300 ease-out hover:scale-110 active:scale-95 group"
            title="Ir al Dashboard"
          >
            <Home className="w-6 h-6 text-gray-700 group-hover:text-blue-600 transition-colors" />
          </Link>

          <div className="flex-1 flex justify-end">
            <div className="flex items-center gap-2">
              {modulos.map((modulo) => {
                const Icon = modulo.icon;
                const isActive = moduloActivo === modulo.id && location.pathname !== '/';
                const isEnabled = ['inventario', 'administracion', 'venta', 'compra', 'reportes'].includes(modulo.id);
                return (
                  <button
                    key={modulo.id}
                    onClick={() => isEnabled && handleModuloClick(modulo.id)}
                    disabled={!isEnabled}
                    className={`
                      group flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold 
                      transition-all duration-300 ease-out
                      ${isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:shadow-blue-600/40 hover:-translate-y-0.5'
                        : isEnabled
                        ? 'text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 hover:-translate-y-0.5 hover:shadow-md'
                        : 'text-gray-400 cursor-not-allowed bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="w-6 h-6 transition-transform duration-300" />
                    <span>{modulo.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <div className="col-start-2 col-end-3 row-start-2 row-end-3 min-w-0 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-auto bg-gray-50 p-8">
            <div className="animate-fade-in-up" style={{ animationFillMode: 'both' }}>
              <Routes>
                <Route path="/" element={<WelcomePage />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/movimientos" element={<ProtectedRoute moduloActivo={moduloActivo} currentPath="/movimientos"><MovimientosPage /></ProtectedRoute>} />
                <Route path="/movimientos/pendientes" element={<ProtectedRoute moduloActivo={moduloActivo} currentPath="/movimientos/pendientes"><MovimientosPendientesPage /></ProtectedRoute>} />
                <Route path="/productos" element={<ProtectedRoute moduloActivo={moduloActivo} currentPath="/productos"><ProductosPage /></ProtectedRoute>} />
                <Route path="/inventario" element={<ProtectedRoute moduloActivo={moduloActivo} currentPath="/inventario"><InventarioHome /></ProtectedRoute>} />
                <Route path="/movimientos/seleccionar-recepcion" element={<ProtectedRoute moduloActivo={moduloActivo} currentPath="/movimientos"><RecepcionesPage /></ProtectedRoute>} />
                <Route path="/movimientos/ajuste" element={<ProtectedRoute moduloActivo={moduloActivo} currentPath="/movimientos"><MovimientoAjusteForm /></ProtectedRoute>} />
                <Route path="/venta" element={<ProtectedRoute moduloActivo={moduloActivo} currentPath="/venta"><VentaHome /></ProtectedRoute>} />
                <Route path="/clientes" element={<ProtectedRoute moduloActivo={moduloActivo} currentPath="/clientes"><ClientesPage /></ProtectedRoute>} />
                <Route path="/clientes/:id" element={<ProtectedRoute moduloActivo={moduloActivo} currentPath="/clientes"><PerfilClientePage /></ProtectedRoute>} />
                <Route path="/administracion" element={<ProtectedRoute moduloActivo={moduloActivo} currentPath="/administracion"><AdministracionHome /></ProtectedRoute>} />
                <Route path="/monedas" element={<ProtectedRoute moduloActivo={moduloActivo} currentPath="/monedas"><MonedasPage /></ProtectedRoute>} />
                <Route path="/configuracion" element={<ProtectedRoute moduloActivo={moduloActivo} currentPath="/configuracion"><ConfiguracionPage /></ProtectedRoute>} />
                <Route path="/usuarios" element={<ProtectedRoute moduloActivo={moduloActivo} currentPath="/usuarios"><UsuariosPage /></ProtectedRoute>} />
                <Route path="/grupos" element={<ProtectedRoute moduloActivo={moduloActivo} currentPath="/grupos"><GruposPage /></ProtectedRoute>} />
                <Route path="/dependencias" element={<ProtectedRoute moduloActivo={moduloActivo} currentPath="/dependencias"><DependenciasPage /></ProtectedRoute>} />
                <Route path="/compra" element={<ProtectedRoute moduloActivo={moduloActivo} currentPath="/compra"><CompraHome /></ProtectedRoute>} />
                <Route path="/reportes" element={<ProtectedRoute moduloActivo={moduloActivo} currentPath="/reportes"><ReportesHome /></ProtectedRoute>} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
}

function AppWrapper() {
  return (
    <Router>
      <Toaster position="top-right" />
      <App />
    </Router>
  );
}

export default AppWrapper;
