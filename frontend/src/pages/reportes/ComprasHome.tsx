import { FileText, Users, TrendingDown, Construction } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ReportesComprasHome() {
  const cards = [
    {
      title: 'Compras por Proveedor',
      description: 'Resumen de compras agrupadas por proveedor y período.',
      icon: Users,
      path: '/reportes/compras/por-proveedor',
      color: 'bg-orange-500',
      enabled: false,
    },
    {
      title: 'Detalle de Compras',
      description: 'Listado detallado de todas las compras realizadas.',
      icon: FileText,
      path: '/reportes/compras/detalle',
      color: 'bg-teal-500',
      enabled: false,
    },
    {
      title: 'Análisis de Gastos',
      description: 'Tendencia de gastos por categoría y período.',
      icon: TrendingDown,
      path: '/reportes/compras/gastos',
      color: 'bg-red-500',
      enabled: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Reportes de Compras</h1>
        <p className="text-gray-600 mt-1">Selecciona el tipo de reporte que deseas generar.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;

          if (!card.enabled) {
            return (
              <div
                key={card.path}
                className="relative bg-white rounded-xl shadow-sm border border-gray-200 p-6 opacity-60 cursor-not-allowed"
              >
                <div className={`inline-flex p-3 rounded-lg ${card.color} text-white mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {card.title}
                </h3>
                <p className="text-gray-500 text-sm">{card.description}</p>
                <div className="absolute top-3 right-3 flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                  <Construction className="w-3 h-3" />
                  Próximamente
                </div>
              </div>
            );
          }

          return (
            <Link
              key={card.path}
              to={card.path}
              className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200"
            >
              <div className={`inline-flex p-3 rounded-lg ${card.color} text-white mb-4 group-hover:scale-110 transition-transform duration-200`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                {card.title}
              </h3>
              <p className="text-gray-500 text-sm">{card.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
