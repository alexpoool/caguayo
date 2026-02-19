import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from './pages/Dashboard';
import { ProductosPage } from './pages/Productos';
import { VentasPage } from './pages/Ventas';
import { ClientesPage } from './pages/Clientes';
import { PerfilClientePage } from './pages/PerfilCliente';
import { MonedasPage } from './pages/Monedas';
import { MovimientosPage } from './pages/Movimientos';
import { MovimientosPendientesPage } from './pages/MovimientosPendientes';
import { ConfiguracionPage } from './pages/Configuracion';
import { UsuariosPage } from './pages/Usuarios';
import { DependenciasPage } from './pages/Dependencias';
import React from 'react';
import { 
  ArrowLeftRight, 
  Boxes, 
  Clock, 
  Home,
  Briefcase,
  BarChart3,
  UserCircle,
  Shield,
  Settings,
  Users,
  Building,
  Coins
} from 'lucide-react';

type Modulo = 'administracion' | 'comercializacion' | 'representacion' | 'inventario' | 'reportes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Definición de rutas por módulo (excluyendo el Dashboard que es global)
const rutasPorModulo: Record<Modulo, string[]> = {
  inventario: ['/movimientos', '/movimientos/pendientes', '/productos'],
  administracion: ['/configuracion', '/usuarios', '/monedas', '/dependencias'],
  comercializacion: ['/ventas', '/clientes'],
  representacion: [],
  reportes: [],
};

// Componente para proteger rutas según el módulo
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
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isHoveringHeader, setIsHoveringHeader] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sidebarTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();

  const handleLinkClick = () => {};

  // Auto-hide header after inactivity (500ms)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Show header when cursor is in top 40px
      if (e.clientY < 40) {
        setIsHeaderVisible(true);
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = null;
        }
      } else if (!isHoveringHeader) {
        // Start hide timer when cursor leaves header area (500ms)
        if (!hideTimeoutRef.current) {
          hideTimeoutRef.current = setTimeout(() => {
            setIsHeaderVisible(false);
          }, 500);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    // Initial hide after 500ms
    const initialTimeout = setTimeout(() => {
      if (!isHoveringHeader) {
        setIsHeaderVisible(false);
      }
    }, 500);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(initialTimeout);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [isHoveringHeader]);

  // Auto-hide sidebar after inactivity (500ms)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Show sidebar when cursor is in left 40px
      if (e.clientX < 40) {
        setIsSidebarVisible(true);
        if (sidebarTimeoutRef.current) {
          clearTimeout(sidebarTimeoutRef.current);
          sidebarTimeoutRef.current = null;
        }
      } else if (!isHoveringSidebar) {
        // Start hide timer when cursor leaves sidebar area (500ms)
        if (!sidebarTimeoutRef.current) {
          sidebarTimeoutRef.current = setTimeout(() => {
            setIsSidebarVisible(false);
          }, 500);
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    // Initial hide after 500ms
    const initialTimeout = setTimeout(() => {
      if (!isHoveringSidebar) {
        setIsSidebarVisible(false);
      }
    }, 500);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(initialTimeout);
      if (sidebarTimeoutRef.current) {
        clearTimeout(sidebarTimeoutRef.current);
      }
    };
  }, [isHoveringSidebar]);

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
          group flex items-center gap-3 px-3 py-2.5 rounded-lg 
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
        
        <span className="font-medium">
          {children && React.Children.toArray(children).slice(1)}
        </span>
      </Link>
    );
  };

  const modulos: { id: Modulo; label: string; icon: React.ElementType }[] = [
    { id: 'administracion', label: 'Administración', icon: Shield },
    { id: 'comercializacion', label: 'Comercialización', icon: Briefcase },
    { id: 'representacion', label: 'Representación', icon: UserCircle },
    { id: 'inventario', label: 'Inventario', icon: Boxes },
    { id: 'reportes', label: 'Reportes', icon: BarChart3 },
  ];

  // Redirigir al cambiar de módulo si la ruta actual no está permitida
  useEffect(() => {
    const rutasPermitidas = rutasPorModulo[moduloActivo];
    const isCurrentRouteAllowed = rutasPermitidas.some(route => 
      location.pathname === route || (route !== '/' && location.pathname.startsWith(route))
    );
    
    if (!isCurrentRouteAllowed && location.pathname !== '/') {
      // No hacemos nada aquí, el ProtectedRoute se encargará de redirigir
    }
  }, [moduloActivo, location.pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen bg-gray-50">
        <aside 
          className={`fixed left-0 top-0 h-full w-64 bg-slate-900 text-white flex flex-col shadow-xl z-50 transition-transform duration-300 ease-in-out ${
            isSidebarVisible ? 'translate-x-0' : '-translate-x-full'
          }`}
          onMouseEnter={() => setIsHoveringSidebar(true)}
          onMouseLeave={() => {
            setIsHoveringSidebar(false);
            sidebarTimeoutRef.current = setTimeout(() => {
              setIsSidebarVisible(false);
            }, 500);
          }}
        >
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-2xl font-bold tracking-wider text-blue-400 text-center">CAGUAYO</h1>
            <p className="text-xs text-slate-400 mt-1 text-center">Sistema de Inventario</p>
          </div>
          
          <nav className="flex-1 overflow-y-auto py-4">
            {moduloActivo === 'inventario' && (
              <ul className="space-y-1 px-3">
                <li>
                  <NavLink to="/movimientos" onClick={handleLinkClick} exact>
                    <ArrowLeftRight className="w-5 h-5" />
                    Movimiento
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/movimientos/pendientes" onClick={handleLinkClick}>
                    <Clock className="w-5 h-5" />
                    Pendientes
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/productos" onClick={handleLinkClick}>
                    <Boxes className="w-5 h-5" />
                    Productos
                  </NavLink>
                </li>
              </ul>
            )}
            {moduloActivo === 'administracion' && (
              <ul className="space-y-1 px-3">
                <li>
                  <NavLink to="/configuracion" onClick={handleLinkClick}>
                    <Settings className="w-5 h-5" />
                    Configuración
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/usuarios" onClick={handleLinkClick}>
                    <Users className="w-5 h-5" />
                    Usuarios
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/monedas" onClick={handleLinkClick}>
                    <Coins className="w-5 h-5" />
                    Monedas
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/dependencias" onClick={handleLinkClick}>
                    <Building className="w-5 h-5" />
                    Dependencias
                  </NavLink>
                </li>
              </ul>
            )}
            {/* Modulo Comercialización desactivado
            {moduloActivo === 'comercializacion' && (
              <ul className="space-y-1 px-3">
                <li>
                  <NavLink to="/ventas" onClick={handleLinkClick}>
                    <Boxes className="w-5 h-5" />
                    Ventas
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/clientes" onClick={handleLinkClick}>
                    <UserCircle className="w-5 h-5" />
                    Clientes
                  </NavLink>
                </li>
              </ul>
            )}
            */}
            {(moduloActivo !== 'inventario' && moduloActivo !== 'administracion') && (
              <div className="px-6 py-4">
                <p className="text-slate-400 text-sm">Módulo en construcción</p>
              </div>
            )}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
                S
              </div>
              <div>
                <p className="text-sm font-medium">Solji</p>
                <p className="text-xs text-slate-400">Admin</p>
              </div>
            </div>
          </div>
        </aside>

        <div 
          className={`flex-1 flex flex-col overflow-hidden min-w-0 relative transition-all duration-300 ease-in-out ${
            isSidebarVisible ? 'ml-64' : 'ml-0'
          }`}
        >
          {/* Header with auto-hide */}
          <header 
            className={`fixed top-0 ${isSidebarVisible ? 'left-64' : 'left-0'} right-0 z-40 bg-white shadow-sm border-b border-gray-200 px-6 py-4 h-16 flex items-center justify-between transition-all duration-300 ease-in-out ${
              isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
            }`}
            onMouseEnter={() => setIsHoveringHeader(true)}
            onMouseLeave={() => {
              setIsHoveringHeader(false);
              hideTimeoutRef.current = setTimeout(() => {
                setIsHeaderVisible(false);
              }, 500);
            }}
          >
            <Link
              to="/"
              className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-300 ease-out hover:scale-110 active:scale-95 group"
              title="Ir al Dashboard"
            >
              <Home className="h-6 w-6 text-gray-700 group-hover:text-blue-600 transition-colors" />
            </Link>
            <div className="flex items-center gap-2">
              {modulos.map((modulo) => {
                const Icon = modulo.icon;
                const isActive = moduloActivo === modulo.id;
                const isEnabled = modulo.id === 'inventario' || modulo.id === 'administracion';
                
                return (
                  <button
                    key={modulo.id}
                    onClick={() => isEnabled && setModuloActivo(modulo.id)}
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
                    <Icon className={`
                      w-4 h-4 transition-transform duration-300
                      ${isActive ? 'group-hover:scale-110' : isEnabled ? 'group-hover:scale-110' : ''}
                    `} />
                    <span>{modulo.label}</span>
                  </button>
                );
              })}
            </div>
          </header>

          {/* Spacer for fixed header */}
          <div className="h-16 flex-shrink-0" />

          <main className="flex-1 overflow-auto bg-gray-50 p-8">
            <div className="animate-fade-in-up" style={{ animationFillMode: 'both' }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                
                {/* Rutas de Inventario - protegidas */}
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
                <Route 
                  path="/productos" 
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/productos">
                      <ProductosPage />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Rutas de Comercialización - protegidas */}
                <Route 
                  path="/ventas" 
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/ventas">
                      <VentasPage />
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
                
                {/* Rutas de Administración - protegidas */}
                <Route 
                  path="/monedas" 
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/monedas">
                      <MonedasPage />
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
                <Route 
                  path="/configuracion" 
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/configuracion">
                      <ConfiguracionPage />
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
                  path="/dependencias" 
                  element={
                    <ProtectedRoute moduloActivo={moduloActivo} currentPath="/dependencias">
                      <DependenciasPage />
                    </ProtectedRoute>
                  } 
                />
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
