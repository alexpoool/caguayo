import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
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
import React from 'react';
import { 
  ArrowLeftRight, 
  Boxes, 
  Clock, 
  Home,
  Briefcase,
  BarChart3,
  UserCircle,
  Shield
} from 'lucide-react';

type Modulo = 'administracion' | 'comercializacion' | 'representacion' | 'inventario' | 'reportes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutos
    },
  },
});

function App() {
  const [moduloActivo, setModuloActivo] = useState<Modulo>('inventario');

  const handleLinkClick = () => {
    // Sidebar is now always visible, no need to close it
  };

  // Componente NavLink con animaciones
  const NavLink = ({ to, children, onClick, exact = false }: { to: string; children: React.ReactNode; onClick?: () => void; exact?: boolean }) => {
    const location = useLocation();
    // Para rutas exactas, solo coincide si son idénticas
    // Para rutas no exactas, coincide si es la ruta exacta o comienza con la ruta seguida de /
    const isActive = exact 
      ? location.pathname === to
      : location.pathname === to || (location.pathname.startsWith(`${to}/`) && to !== '/movimientos');
    
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
        {/* Indicador lateral */}
        <span className={`
          absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 
          bg-blue-400 rounded-r-full transition-all duration-300
          group-hover:h-6
          ${isActive ? 'h-8 bg-white' : ''}
        `} />
        
        {/* Icono con animación */}
        <span className={`
          transition-all duration-300
          ${isActive ? 'text-white scale-110' : 'text-slate-500 group-hover:text-blue-400 group-hover:scale-110'}
        `}>
          {children && React.Children.toArray(children)[0]}
        </span>
        
        {/* Texto */}
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

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Toaster position="top-right" />
        <div className="flex h-screen bg-gray-50">
          {/* Sidebar Fijo - Siempre Visible */}
          <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl flex-shrink-0">
            {/* Logo Area */}
            <div className="p-6 border-b border-slate-800">
              <h1 className="text-2xl font-bold tracking-wider text-blue-400 text-center">CAGUAYO</h1>
              <p className="text-xs text-slate-400 mt-1 text-center">Sistema de Inventario</p>
            </div>
            
            {/* Navigation */}
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
              {moduloActivo !== 'inventario' && (
                <div className="px-6 py-4">
                  <p className="text-slate-400 text-sm">Módulo en construcción</p>
                </div>
              )}
            </nav>

            {/* User Profile */}
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

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 h-16 flex items-center justify-between">
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
                  const isEnabled = modulo.id === 'inventario';
                  
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

            {/* Content Area */}
            <main className="flex-1 overflow-auto bg-gray-50 p-8">
              <div className="animate-fade-in-up" style={{ animationFillMode: 'both' }}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/productos" element={<ProductosPage />} />
                  <Route path="/ventas" element={<VentasPage />} />
                  <Route path="/clientes" element={<ClientesPage />} />
                  <Route path="/clientes/:id" element={<PerfilClientePage />} />
                  <Route path="/monedas" element={<MonedasPage />} />
                  <Route path="/movimientos" element={<MovimientosPage />} />
                  <Route path="/movimientos/pendientes" element={<MovimientosPendientesPage />} />
                  <Route path="/configuracion" element={<div className="text-gray-500 animate-fade-in">Página de Configuración en construcción</div>} />
                </Routes>
              </div>
            </main>
          </div>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;