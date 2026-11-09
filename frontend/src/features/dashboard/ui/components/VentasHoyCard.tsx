import {
  CheckCircle,
  Clock3,
  DollarSign,
  Minus,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/components';
import type { ResumenDashboard } from '../../domain/dashboard';
import type { TendenciaVentas } from '../tendencias';

export function VentasHoyCard({
  stats,
  tendencia,
  delay = 0,
}: {
  stats: ResumenDashboard;
  tendencia: TendenciaVentas;
  delay?: number;
}) {
  return (
    <Card animate style={{ animationDelay: `${delay}ms` }}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5 text-green-600" />
          Ventas de Hoy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900 sm:text-4xl">
            $
            {stats.ventas_hoy.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </span>
          <span
            className={`text-sm font-medium ${
              tendencia === 'up'
                ? 'text-green-600'
                : tendencia === 'down'
                  ? 'text-red-600'
                  : 'text-gray-500'
            }`}
          >
            {tendencia === 'up' && (
              <TrendingUp className="mr-1 inline h-4 w-4" />
            )}
            {tendencia === 'down' && (
              <TrendingDown className="mr-1 inline h-4 w-4" />
            )}
            {tendencia === 'neutral' && (
              <Minus className="mr-1 inline h-4 w-4" />
            )}
            {Math.abs(stats.ventas_crecimiento_porcentaje).toFixed(1)}% vs ayer
          </span>
        </div>
        <p className="text-sm text-gray-600">
          {stats.ventas_hoy_cantidad} ventas realizadas hoy
        </p>

        <div className="grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-3">
          <div className="text-center">
            <div className="mb-1 flex items-center justify-center gap-1 text-yellow-600">
              <Clock3 className="h-4 w-4" />
              <span className="text-xl font-bold">
                {stats.ventas_pendientes}
              </span>
            </div>
            <p className="text-xs text-gray-500">Pendientes</p>
          </div>
          <div className="text-center">
            <div className="mb-1 flex items-center justify-center gap-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xl font-bold">
                {stats.ventas_completadas}
              </span>
            </div>
            <p className="text-xs text-gray-500">Completadas</p>
          </div>
          <div className="text-center">
            <div className="mb-1 flex items-center justify-center gap-1 text-red-600">
              <XCircle className="h-4 w-4" />
              <span className="text-xl font-bold">
                {stats.ventas_anuladas}
              </span>
            </div>
            <p className="text-xs text-gray-500">Anuladas</p>
          </div>
        </div>

        <div className="pt-2">
          <p className="text-sm text-gray-600">
            Ticket promedio:{' '}
            <span className="font-semibold">
              $
              {stats.ticket_promedio.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
