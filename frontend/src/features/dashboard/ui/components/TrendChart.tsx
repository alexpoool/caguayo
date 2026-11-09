import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS, PALETA } from '../../../../config/paleta';
import { formatFechaDiaSemana } from '../../../../utils/fecha';
import type { TendenciasVentas } from '../../domain/dashboard';

export function TrendChart({ data }: { data: TendenciasVentas | undefined }) {
  if (!data || data.fechas.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        No hay datos de tendencias disponibles
      </div>
    );
  }

  const chartData = data.fechas.map((fecha, index) => ({
    fecha: formatFechaDiaSemana(fecha),
    monto: Number(data.montos[index]) || 0,
    cantidad: data.cantidades[index] || 0,
  }));

  return (
    <div className="h-64 w-full sm:h-72 lg:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={PALETA.neutral.grid}
          />
          <XAxis
            dataKey="fecha"
            stroke={PALETA.neutral.axis}
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke={PALETA.neutral.axis}
            fontSize={12}
            tickLine={false}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <Tooltip
            formatter={(value) => [
              `$${Number(value || 0).toLocaleString()}`,
              'Ventas',
            ]}
            contentStyle={{
              backgroundColor: 'white',
              border: `1px solid ${PALETA.neutral.grid}`,
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Line
            type="monotone"
            dataKey="monto"
            stroke={CHART_COLORS[0]}
            strokeWidth={3}
            dot={{ fill: CHART_COLORS[0], strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: PALETA.brand[600] }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
