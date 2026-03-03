import { Package, Map, History } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ReportesInventarioHome() {
  const cards = [
    {
      title: 'Existencias por Producto',
      description: 'Informe de stock actual agrupado por dependencias.',
      icon: Package,
      path: '/reportes/inventario/existencias',
      color: 'bg-blue-500',
    },
    {
      title: 'Movimientos por Dependencia',
      description: 'Historial completo de entradas y salidas de una sede.',
      icon: Map,
      path: '/reportes/inventario/movimientos-dependencia',
      color: 'bg-green-500',
    },
    {
      title: 'Movimientos por Producto',
      description: 'Trazabilidad detallada de un artículo específico.',
      icon: History,
      path: '/reportes/inventario/kardex',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Reportes de Inventario</h1>
        <p className="text-gray-600 mt-1">Selecciona el tipo de reporte que deseas generar.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
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
              <p className="text-gray-500 text-sm">
                {card.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
