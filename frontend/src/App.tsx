import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      <Layout>
        <div className="flex h-screen">
          <Navigation />
          <div className="flex-1 flex flex-col">
            <AppHeader />
            <MainContent>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/productos" element={<ProductosPage />} />
                <Route path="/ventas" element={<div className="text-gray-500">Página de Ventas en construcción</div>} />
                <Route path="/movimientos" element={<div className="text-gray-500">Página de Movimientos en construcción</div>} />
                <Route path="/configuracion" element={<div className="text-gray-500">Página de Configuración en construcción</div>} />
              </Routes>
            </MainContent>
          </div>
        </div>
      </Layout>
    </Router>
  );
}

export default App;