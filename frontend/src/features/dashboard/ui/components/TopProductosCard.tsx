import { Package, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/components';
import type { ProductoVendido } from '../../domain/dashboard';
import { TopProductsChart } from './TopProductsChart';

export function TopProductosCard({
  productos,
  delay = 0,
}: {
  productos: ProductoVendido[];
  delay?: number;
}) {
  return (
    <Card animate style={{ animationDelay: `${delay}ms` }}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-brand-600" />
          Top Productos Vendidos
        </CardTitle>
      </CardHeader>
      <CardContent>
        {productos.length > 0 ? (
          <div className="space-y-4">
            <TopProductsChart products={productos} />
            <div className="space-y-2 pt-2">
              {productos.slice(0, 5).map((producto, index) => (
                <div
                  key={producto.id_producto}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 py-2 last:border-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        index === 0
                          ? 'bg-yellow-100 text-yellow-700'
                          : index === 1
                            ? 'bg-gray-200 text-gray-700'
                            : index === 2
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-50 text-gray-600'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {producto.nombre}
                      </p>
                      <p className="text-xs text-gray-500">
                        {producto.cantidad_vendida} vendidos
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      $
                      {producto.monto_total.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {producto.porcentaje}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-6 text-center">
            <Package className="mx-auto mb-2 h-12 w-12 text-gray-300" />
            <p className="text-sm text-gray-500">No hay datos de ventas</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
