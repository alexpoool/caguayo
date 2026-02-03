import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout, Sidebar, Header, MainContent } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ProductosPage } from './pages/Productos';
import { Home, Package, ShoppingCart, TrendingUp, Settings } from 'lucide-react';

function Navigation() {
  const location = useLocation();
  
  const menuItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: Home
    },
    {
      path: '/productos',
      label: 'Productos',
      icon: Package
    },
    {
      path: '/ventas',
      label: 'Ventas',
      icon: ShoppingCart
    },
    {
      path: '/movimientos',
      label: 'Movimientos',
      icon: TrendingUp
    },
    {
      path: '/configuracion',
      label: 'Configuración',
      icon: Settings
    }
  ];

  return (
    <Sidebar>
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </Sidebar>
  );
}

function AppHeader() {
  const location = useLocation();
  
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Dashboard';
      case '/productos':
        return 'Productos';
      case '/ventas':
        return 'Ventas';
      case '/movimientos':
        return 'Movimientos';
      case '/configuracion':
        return 'Configuración';
      default:
        return 'Sistema de Inventario';
    }
  };

  return (
    <Header>
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{getPageTitle()}</h1>
        <p className="text-sm text-gray-600">Sistema de Gestión de Inventario</p>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">
          {new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </span>
      </div>
    </Header>
  );
}

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
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Toaster position="top-right" />
        <div className="flex h-screen bg-gray-100">
           {/* Sidebar Component */}
          <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl">
            <div className="p-6 border-b border-slate-800">
              <h1 className="text-2xl font-bold tracking-wider text-blue-400">CAGUAYO</h1>
              <p className="text-xs text-slate-400 mt-1">Sistema de Inventario</p>
            </div>
            
            <nav className="flex-1 overflow-y-auto py-4">
              <ul className="space-y-1 px-3">
                <li>
                  <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors group">
                    <Home className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/productos" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors group">
                    <Package className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                    Productos
                  </Link>
                </li>
                <li>
                  <Link to="/ventas" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors group">
                    <ShoppingCart className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                    Ventas
                  </Link>
                </li>
                <li>
                  <Link to="/movimientos" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors group">
                    <TrendingUp className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                    Movimientos
                  </Link>
                </li>
                 <li className="pt-4 mt-4 border-t border-slate-800">
                  <Link to="/configuracion" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors group">
                    <Settings className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                    Configuración
                  </Link>
                </li>
              </ul>
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

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 h-16 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">
                 {/* This could be dynamic based on route */}
                 Panel de Control
              </h2>
            </header>

            {/* Content Scrollable */}
            <main className="flex-1 overflow-auto bg-gray-50 p-6">
               <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/productos" element={<ProductosPage />} />
                  <Route path="/ventas" element={<div className="text-gray-500">Página de Ventas en construcción</div>} />
                  <Route path="/movimientos" element={<div className="text-gray-500">Página de Movimientos en construcción</div>} />
                  <Route path="/configuracion" element={<div className="text-gray-500">Página de Configuración en construcción</div>} />
                </Routes>
            </main>
          </div>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;