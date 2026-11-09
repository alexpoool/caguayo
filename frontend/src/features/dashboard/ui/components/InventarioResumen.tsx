import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/components';
import type { ResumenDashboard } from '../../domain/dashboard';

export function InventarioResumen({ stats }: { stats: ResumenDashboard }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card animate style={{ animationDelay: '1100ms' }}>
        <CardHeader>
          <CardTitle className="text-lg">Valor del Inventario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-1 border-b border-gray-100 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-gray-600">Valor de compra</span>
            <span className="text-base font-semibold text-gray-900 sm:text-lg">
              $
              {stats.valor_inventario_compra.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex flex-col gap-1 border-b border-gray-100 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-gray-600">Valor de venta</span>
            <span className="text-base font-semibold text-green-600 sm:text-lg">
              $
              {stats.valor_inventario_venta.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-gray-600">Margen estimado</span>
            <span className="text-base font-semibold text-brand-600 sm:text-lg">
              $
              {(
                stats.valor_inventario_venta - stats.valor_inventario_compra
              ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card animate style={{ animationDelay: '1200ms' }}>
        <CardHeader>
          <CardTitle className="text-lg">Resumen General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-1 border-b border-gray-100 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-gray-600">Categorías activas</span>
            <span className="text-base font-semibold text-gray-900 sm:text-lg">
              {stats.total_categorias}
            </span>
          </div>
          <div className="flex flex-col gap-1 border-b border-gray-100 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-gray-600">Productos agotados</span>
            <span
              className={`text-base font-semibold sm:text-lg ${
                stats.productos_agotados > 0
                  ? 'text-red-600'
                  : 'text-green-600'
              }`}
            >
              {stats.productos_agotados}
            </span>
          </div>
          <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-gray-600">Monedas configuradas</span>
            <span className="text-base font-semibold text-gray-900 sm:text-lg">
              {stats.total_monedas}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
