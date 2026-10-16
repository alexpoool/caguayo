import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface RadarCriteriosProps {
  data: { criterio: string; valor: number }[];
  /**
   * Tope de la escala de criterios: es el `escala_valor` de la evaluación
   * (5, 10 o 100; llega del catálogo de calificaciones). Por defecto 5.
   */
  max?: number;
}

/** Radar de los 4 criterios de desempeño (escala 0–`max`). */
export function RadarCriterios({ data, max = 5 }: RadarCriteriosProps) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="criterio" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis
            angle={30}
            domain={[0, max]}
            tick={{ fontSize: 10 }}
            tickCount={6}
          />
          <Radar
            name="Puntuación"
            dataKey="valor"
            stroke="#0d9488"
            fill="#0d9488"
            fillOpacity={0.35}
          />
          <Tooltip />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
