import { Link, useLocation } from 'react-router-dom';
import { BarChart3, ShoppingCart, DollarSign, Package } from 'lucide-react';

export function ReportesLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const menuItems = [
    { 
      title: 'Inventario',
      icon: Package,
      path: '/reportes/inventario'
    },
    { 
      title: 'Compras',
      icon: ShoppingCart,
      path: '/reportes/compras',
      disabled: true
    },
    { 
      title: 'Ventas',
      icon: DollarSign,
      path: '/reportes/ventas',
      disabled: true
    }
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar de Reportes */}
      <aside className="w-64 bg-white border-r border-gray-200 p-4">
        <div className="mb-6 px-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Reportes
          </h2>
        </div>
        
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            
            if (item.disabled) {
              return (
                <div key={item.path} className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-400 cursor-not-allowed">
                  <Icon className="w-5 h-5" />
                  {item.title}
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Area principal */}
      <main className="flex-1 overflow-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}
