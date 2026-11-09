import { AlertTriangle, ArrowRight, Package } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/components';
import type { ResumenDashboard } from '../../domain/dashboard';

export function StockCriticoCard({
  stats,
  onVerInventario,
  delay = 0,
}: {
  stats: ResumenDashboard;
  onVerInventario: () => void;
  delay?: number;
}) {
  return (
    <Card animate style={{ animationDelay: `${delay}ms` }}>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          Stock Crítico
        </CardTitle>
        {stats.productos_agotados > 0 && (
          <span className="self-start rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800 sm:self-auto">
            {stats.productos_agotados} agotados
          </span>
        )}
      </CardHeader>
      <CardContent>
        {stats.productos_stock_bajo.length > 0 ? (
          <div className="space-y-3">
            {stats.productos_stock_bajo.slice(0, 5).map((producto) => (
              <div
                key={producto.id_producto}
                className="flex flex-col gap-1 border-b border-gray-100 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      producto.cantidad === 0
                        ? 'bg-red-500'
                        : producto.cantidad <= 2
                          ? 'bg-orange-500'
                          : 'bg-yellow-500'
                    }`}
                  />
                  <span className="truncate text-sm font-medium text-gray-900">
                    {producto.nombre}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 pl-5 sm:pl-0">
                  <span
                    className={`text-sm font-semibold ${
                      producto.cantidad === 0
                        ? 'text-red-600'
                        : 'text-orange-600'
                    }`}
                  >
                    {producto.cantidad === 0
                      ? 'Agotado'
                      : `${producto.cantidad} unid.`}
                  </span>
                  <span className="text-sm text-gray-500">
                    ${producto.precio_venta.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
            <Button
              variant="ghost"
              className="mt-2 w-full text-brand-600 hover:text-brand-800"
              onClick={onVerInventario}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Ver inventario completo
            </Button>
          </div>
        ) : (
          <div className="py-6 text-center">
            <Package className="mx-auto mb-2 h-12 w-12 text-green-400" />
            <p className="text-sm text-gray-500">
              No hay productos con stock bajo
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
