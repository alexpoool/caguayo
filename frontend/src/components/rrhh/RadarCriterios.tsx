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
   * Versión para la columna «Desempeño» del listado: sin etiquetas de eje ni
   * leyenda, y con la escala fija 0–5 para que todos los radares sean
   * comparables entre filas.
   */
  compact?: boolean;
}

/** Radar de los 4 criterios de desempeño (escala 0–5). */
export function RadarCriterios({ data, compact = false }: RadarCriteriosProps) {
  if (compact) {
    return (
      <div className="h-24 w-28">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="70%">
            <PolarGrid stroke="#e2e8f0" />
            {/* Eje invisible que fija el dominio 0–5 (si no, recharts
                escala cada fila a su propio máximo). */}
            <PolarRadiusAxis domain={[0, 5]} tick={false} axisLine={false} />
            <Radar
              dataKey="valor"
              stroke="#0d9488"
              fill="#0d9488"
              fillOpacity={0.35}
              isAnimationActive={false}
            />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="criterio" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 5]}
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
