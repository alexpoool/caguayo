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
import type { TendenciasMovimientos } from '../../domain/dashboard';

export function MovimientosTrendChart({
  data,
}: {
  data: TendenciasMovimientos | undefined;
}) {
  if (!data || data.fechas.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        No hay datos de movimientos disponibles
      </div>
    );
  }

  const chartData = data.fechas.map((fecha, index) => ({
    fecha: formatFechaDiaSemana(fecha),
    recepciones: data.recepciones[index] || 0,
    mermas: data.mermas[index] || 0,
    donaciones: data.donaciones[index] || 0,
    devoluciones: data.devoluciones[index] || 0,
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
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: `1px solid ${PALETA.neutral.grid}`,
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Line
            type="monotone"
            dataKey="recepciones"
            stroke={CHART_COLORS[1]}
            strokeWidth={2}
            dot={{ fill: CHART_COLORS[1], strokeWidth: 2, r: 4 }}
            name="Recepciones"
          />
          <Line
            type="monotone"
            dataKey="mermas"
            stroke={CHART_COLORS[3]}
            strokeWidth={2}
            dot={{ fill: CHART_COLORS[3], strokeWidth: 2, r: 4 }}
            name="Mermas"
          />
          <Line
            type="monotone"
            dataKey="donaciones"
            stroke={CHART_COLORS[4]}
            strokeWidth={2}
            dot={{ fill: CHART_COLORS[4], strokeWidth: 2, r: 4 }}
            name="Donaciones"
          />
          <Line
            type="monotone"
            dataKey="devoluciones"
            stroke={CHART_COLORS[2]}
            strokeWidth={2}
            dot={{ fill: CHART_COLORS[2], strokeWidth: 2, r: 4 }}
            name="Devoluciones"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
