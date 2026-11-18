import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS, PALETA } from '@/config/paleta';

export type TipoGrafico = 'bar' | 'line' | 'pie';

export interface SerieGrafico {
  key: string;
  name: string;
  color: string;
}

const PIE_COLORS = [
  CHART_COLORS[0],
  CHART_COLORS[1],
  CHART_COLORS[2],
  CHART_COLORS[3],
  CHART_COLORS[4],
  CHART_COLORS[0],
  CHART_COLORS[5],
];

/**
 * Gráfico de los reportes. Vive en un chunk aparte para que `recharts` no
 * bloquee el primer render de la pantalla.
 */
export function ReporteGrafico({
  tipo,
  datos,
  colorHex,
  series,
}: {
  tipo: TipoGrafico;
  datos: Array<Record<string, any>>;
  colorHex?: string;
  series?: SerieGrafico[];
}) {
  const hasMonto = datos.some(
    (dato) => dato.monto !== undefined && dato.monto !== null,
  );

  const ejes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke={PALETA.neutral.grid} />
      <XAxis
        dataKey="name"
        stroke={PALETA.neutral.axis}
        fontSize={11}
        tickLine={false}
        interval={0}
        angle={-30}
        textAnchor="end"
        height={60}
      />
      <YAxis stroke={PALETA.neutral.axis} fontSize={12} tickLine={false} />
      <Tooltip
        contentStyle={{
          borderRadius: '8px',
          border: `1px solid ${PALETA.neutral.grid}`,
          boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
        }}
      />
      <Legend />
    </>
  );

  if (tipo === 'line') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={datos}>
          {ejes}
          {hasMonto && (
            <Line
              type="monotone"
              dataKey="monto"
              stroke={colorHex}
              strokeWidth={3}
              dot={{ fill: colorHex, r: 4 }}
              activeDot={{ r: 6 }}
              name="Monto"
              animationDuration={500}
            />
          )}
          <Line
            type="monotone"
            dataKey="cantidad"
            stroke={CHART_COLORS[1]}
            strokeWidth={2}
            dot={{ fill: CHART_COLORS[1], r: 3 }}
            name="Cantidad"
            animationDuration={500}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (tipo === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={datos}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={120}
            paddingAngle={3}
            dataKey={hasMonto ? 'monto' : 'cantidad'}
            label={({ name, percent }) =>
              `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
            animationDuration={500}
          >
            {datos.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={PIE_COLORS[index % PIE_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: `1px solid ${PALETA.neutral.grid}`,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={datos}>
        {ejes}
        {series && series.length > 0 ? (
          series.map((serie) => (
            <Bar
              key={serie.key}
              dataKey={serie.key}
              stackId="stack"
              fill={serie.color}
              name={serie.name}
              animationDuration={500}
            />
          ))
        ) : (
          <>
            {hasMonto && (
              <Bar
                dataKey="monto"
                fill={colorHex}
                radius={[4, 4, 0, 0]}
                name="Monto"
                animationDuration={500}
              />
            )}
            <Bar
              dataKey="cantidad"
              fill={CHART_COLORS[1]}
              radius={[4, 4, 0, 0]}
              name="Cantidad"
              animationDuration={500}
            />
          </>
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
