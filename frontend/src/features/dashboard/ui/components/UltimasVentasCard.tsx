import {
  ArrowRight,
  CheckCircle,
  Clock,
  ShoppingCart,
  XCircle,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/components';
import { formatFecha } from '../../../../utils/fecha';
import type { VentaReciente } from '../../domain/dashboard';

export function UltimasVentasCard({
  ventas,
  onVerVentas,
  delay = 0,
}: {
  ventas: VentaReciente[];
  onVerVentas: () => void;
  delay?: number;
}) {
  return (
    <Card animate style={{ animationDelay: `${delay}ms` }}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          <ShoppingCart className="h-5 w-5 text-brand-600" />
          Últimas Ventas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {ventas.length > 0 ? (
          <div className="space-y-3">
            {ventas.slice(0, 5).map((venta) => (
              <div
                key={venta.id_venta}
                className="-mx-2 flex cursor-pointer flex-col gap-2 rounded-lg border-b border-gray-100 px-2 py-3 transition-colors last:border-0 hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                onClick={onVerVentas}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      venta.estado === 'COMPLETADA'
                        ? 'bg-green-100 text-green-600'
                        : venta.estado === 'PENDIENTE'
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {venta.estado === 'COMPLETADA' && (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    {venta.estado === 'PENDIENTE' && (
                      <Clock className="h-4 w-4" />
                    )}
                    {venta.estado === 'ANULADA' && (
                      <XCircle className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      #{venta.id_venta} - $
                      {venta.total.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {venta.cliente?.nombre || 'Cliente no registrado'} •{' '}
                      {formatFecha(venta.fecha)}
                    </p>
                  </div>
                </div>
                <span
                  className={`self-start rounded-full px-2 py-1 text-xs font-medium sm:self-auto ${
                    venta.estado === 'COMPLETADA'
                      ? 'bg-green-100 text-green-800'
                      : venta.estado === 'PENDIENTE'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                  }`}
                >
                  {venta.estado}
                </span>
              </div>
            ))}
            <Button
              variant="ghost"
              className="mt-2 w-full text-brand-600 hover:text-brand-800"
              onClick={onVerVentas}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Ver historial completo
            </Button>
          </div>
        ) : (
          <div className="py-6 text-center">
            <ShoppingCart className="mx-auto mb-2 h-12 w-12 text-gray-300" />
            <p className="text-sm text-gray-500">No hay ventas registradas</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
