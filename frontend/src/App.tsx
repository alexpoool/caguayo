import { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from './pages/Dashboard';
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
import { LoginPage } from './pages/Login';
import { PerfilPage } from './pages/Perfil';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CompraClientesPage } from './pages/compra/ClientesPage';
import { CompraConveniosPage } from './pages/compra/ConveniosPage';
import { CompraAnexosPage } from './pages/compra/AnexosPage';
import { ContratosPage } from './pages/ventas/ContratosPage';
import { SuplementosPage } from './pages/ventas/SuplementosPage';
import { FacturasPage } from './pages/ventas/FacturasPage';
import { VentasEfectivoPage } from './pages/ventas/VentasEfectivoPage';
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
  Coins,
  LogOut,
  User,
  Database
} from 'lucide-react';


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
  venta: ['/venta', '/ventas', '/clientes', '/ventas/operaciones', '/ventas/contratos', '/ventas/suplementos', '/ventas/facturas', '/ventas/efectivo'],
  compra: ['/compra', '/compra/clientes', '/compra/convenios', '/compra/anexos'],
  reportes: ['/reportes'],
};

const funcionalidadesAModulo: Record<string, Modulo> = {
  movimientos: 'inventario',
  producto: 'inventario',
  pendientes: 'inventario',
  configuracion: 'administracion',
  usuarios: 'administracion',
  grupos: 'administracion',
  monedas: 'administracion',
  dependencias: 'administracion',
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function UserMenu() {
  const { user, logout, baseDatos } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handlePerfil = () => {
    setIsOpen(false);
    navigate('/perfil');
  };

  const handleSalir = () => {
    // Intentar cerrar la pestaña
    // Nota: Esto solo funciona si la ventana fue abierta por script
    window.open('', '_self', '');
    window.close();
    // Si window.close() no funciona (por seguridad del navegador),
    // redirigir a una página en blanco
    setTimeout(() => {
      window.location.href = 'about:blank';
    }, 100);
  };

  if (!user) return null;

  const initial = user.alias.charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
          {initial}
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-white">{user.alias}</p>
          <p className="text-xs text-slate-400">{user.grupo?.nombre}</p>
        </div>
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 right-0 bg-slate-800 rounded-xl shadow-xl border border-slate-700 py-2 min-w-[200px]">
            <div className="px-4 py-2 border-b border-slate-700">
              <p className="text-sm font-medium text-white">{user.nombre} {user.primer_apellido}</p>
              <p className="text-xs text-slate-400">{user.alias}</p>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Database className="w-3 h-3" />
                {baseDatos}
              </p>
            </div>
            <button
              onClick={handlePerfil}
              className="w-full flex items-center gap-3 px-4 py-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <User className="w-4 h-4" />
              Perfil
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-slate-700 hover:text-red-300 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
            <button
              onClick={handleSalir}
              className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <span className="w-4 h-4 text-xs">✕</span>
              Salir
            </button>
        </div>
      )}
    </div>
  );
}

function AppContent() {
  const { user, funcionalidades, isAuthenticated, baseDatos } = useAuth();
  const [moduloActivo, setModuloActivo] = useState<Modulo>('inventario');
  const location = useLocation();
  const navigate = useNavigate();

  const handleLinkClick = () => {};

  const handleModuloClick = (moduloId: Modulo) => {
    setModuloActivo(moduloId);
    navigate(`/${moduloId}`);
  };

  const tieneFuncionalidad = (nombre: string) => {
    return funcionalidades.some(f => f.nombre === nombre);
  };

  const getModulosActivos = (): Modulo[] => {
    const modulosSet = new Set<Modulo>();
    
    funcionalidades.forEach(f => {
      const modulo = funcionalidadesAModulo[f.nombre];
      if (modulo) {
        modulosSet.add(modulo);
      }
    });
    
    return Array.from(modulosSet);
  };

  const modulosActivos = getModulosActivos();

  const modulos: { id: Modulo; label: string; icon: React.ElementType }[] = [
    { id: 'administracion', label: 'Administración', icon: Shield },
    { id: 'venta', label: 'Venta', icon: Briefcase },
    { id: 'compra', label: 'Compra', icon: UserCircle },
    { id: 'inventario', label: 'Inventario', icon: Boxes },
    { id: 'reportes', label: 'Reportes', icon: BarChart3 },
  ];

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

  useEffect(() => {
    if (modulosActivos.length > 0 && !modulosActivos.includes(moduloActivo)) {
      setModuloActivo(modulosActivos[0]);
    }
  }, [modulosActivos]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <aside 
        className="fixed left-0 top-0 h-full w-64 bg-slate-900 text-white flex flex-col shadow-xl z-50"
      >
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold tracking-wider text-blue-400 text-center">CAGUAYO</h1>
          <p className="text-xs text-slate-400 mt-1 text-center">Sistema de Inventario</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          {moduloActivo === 'inventario' && (
            <ul className="space-y-1 px-3">
              {tieneFuncionalidad('movimientos') && (
                <li>
                  <NavLink to="/movimientos" onClick={handleLinkClick} exact>
                    <ArrowLeftRight className="w-5 h-5" />
                    Movimientos
                  </NavLink>
                </li>
              )}
              {tieneFuncionalidad('pendientes') && (
                <li>
                  <NavLink to="/movimientos/pendientes" onClick={handleLinkClick}>
                    <Clock className="w-5 h-5" />
                    Pendientes
                  </NavLink>
                </li>
              )}
              {tieneFuncionalidad('producto') && (
                <li>
                  <NavLink to="/productos" onClick={handleLinkClick}>
                    <Boxes className="w-5 h-5" />
                    Productos
                  </NavLink>
                </li>
              )}
            </ul>
          )}
          {moduloActivo === 'administracion' && (
            <ul className="space-y-1 px-3">
              {tieneFuncionalidad('configuracion') && (
                <li>
                  <NavLink to="/configuracion" onClick={handleLinkClick}>
                    <Settings className="w-5 h-5" />
                    Configuración
                  </NavLink>
                </li>
              )}
              {tieneFuncionalidad('usuarios') && (
                <li>
                  <NavLink to="/usuarios" onClick={handleLinkClick}>
                    <Users className="w-5 h-5" />
                    Usuarios
                  </NavLink>
                </li>
              )}
              {tieneFuncionalidad('grupos') && (
                <li>
                  <NavLink to="/grupos" onClick={handleLinkClick}>
                    <Shield className="w-5 h-5" />
                    Grupos
                  </NavLink>
                </li>
              )}
              {tieneFuncionalidad('monedas') && (
                <li>
                  <NavLink to="/monedas" onClick={handleLinkClick}>
                    <Coins className="w-5 h-5" />
                    Monedas
                  </NavLink>
                </li>
              )}
              {tieneFuncionalidad('dependencias') && (
                <li>
                  <NavLink to="/dependencias" onClick={handleLinkClick}>
                    <Building className="w-5 h-5" />
                    Dependencias
                  </NavLink>
                </li>
              )}
            </ul>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="space-y-3">
            <UserMenu />
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg">
              <Database className="h-4 w-4 text-green-400" />
              <span className="text-xs font-medium text-green-400">{baseDatos}</span>
            </div>
          </div>
        </div>
      </aside>

      <div 
        className="flex-1 flex flex-col overflow-hidden min-w-0 ml-64"
      >
        <header 
          className="fixed top-0 left-64 right-0 z-40 bg-white shadow-sm border-b border-gray-200 px-6 py-4 h-16 flex items-center justify-between"
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
                const isEnabled = modulosActivos.includes(modulo.id);
                
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

        <div className="h-16 flex-shrink-0" />

        <main className="flex-1 overflow-auto bg-gray-50 p-8">
          <div className="animate-fade-in-up" style={{ animationFillMode: 'both' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              
              <Route path="/movimientos" element={<MovimientosPage />} />
              <Route path="/movimientos/pendientes" element={<MovimientosPendientesPage />} />
              <Route path="/productos" element={<ProductosPage />} />
              <Route path="/inventario" element={<InventarioHome />} />
              <Route path="/movimientos/seleccionar-recepcion" element={<RecepcionesPage />} />
              <Route path="/movimientos/ajuste" element={<MovimientoAjusteForm />} />
              
              <Route path="/venta" element={<VentaHome />} />
              <Route path="/ventas/operaciones" element={
                <ProtectedRoute moduloActivo={moduloActivo} currentPath="/ventas/operaciones">
                  <VentaHome />
                </ProtectedRoute>
              } />
              <Route path="/ventas/contratos" element={
                <ProtectedRoute moduloActivo={moduloActivo} currentPath="/ventas/contratos">
                  <ContratosPage />
                </ProtectedRoute>
              } />
              <Route path="/ventas/suplementos" element={
                <ProtectedRoute moduloActivo={moduloActivo} currentPath="/ventas/suplementos">
                  <SuplementosPage />
                </ProtectedRoute>
              } />
              <Route path="/ventas/facturas" element={
                <ProtectedRoute moduloActivo={moduloActivo} currentPath="/ventas/facturas">
                  <FacturasPage />
                </ProtectedRoute>
              } />
              <Route path="/ventas/efectivo" element={
                <ProtectedRoute moduloActivo={moduloActivo} currentPath="/ventas/efectivo">
                  <VentasEfectivoPage />
                </ProtectedRoute>
              } />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/clientes/:id" element={<PerfilClientePage />} />
              
              <Route path="/administracion" element={<AdministracionHome />} />
              <Route path="/monedas" element={<MonedasPage />} />
              <Route path="/configuracion" element={<ConfiguracionPage />} />
              <Route path="/usuarios" element={<UsuariosPage />} />
              <Route path="/grupos" element={<GruposPage />} />
              <Route path="/dependencias" element={<DependenciasPage />} />
              
              <Route path="/compra" element={<CompraHome />} />
              <Route path="/compra/clientes" element={
                <ProtectedRoute moduloActivo={moduloActivo} currentPath="/compra/clientes">
                  <CompraClientesPage />
                </ProtectedRoute>
              } />
              <Route path="/compra/convenios" element={
                <ProtectedRoute moduloActivo={moduloActivo} currentPath="/compra/convenios">
                  <CompraConveniosPage />
                </ProtectedRoute>
              } />
              <Route path="/compra/anexos" element={
                <ProtectedRoute moduloActivo={moduloActivo} currentPath="/compra/anexos">
                  <CompraAnexosPage />
                </ProtectedRoute>
              } />
              <Route path="/perfil" element={<PerfilPage />} />
              <Route path="/reportes" element={<ReportesHome />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Toaster position="top-right" />
          <AppContent />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
