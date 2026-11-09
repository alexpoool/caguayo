import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS, PALETA } from '../../../../config/paleta';
import type { ProductoVendido } from '../../domain/dashboard';

export function TopProductsChart({ products }: { products: ProductoVendido[] }) {
  if (!products || products.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-gray-500">
        No hay datos de productos
      </div>
    );
  }

  const colors = CHART_COLORS.slice(0, 5);

  return (
    <div className="h-48 w-full sm:h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={products.slice(0, 5)} layout="vertical">
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={PALETA.neutral.grid}
            horizontal={false}
          />
          <XAxis type="number" hide />
          <YAxis
            dataKey="nombre"
            type="category"
            width={96}
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => {
              const text = String(value);
              return text.length > 12 ? `${text.substring(0, 12)}...` : text;
            }}
          />
          <Tooltip
            formatter={(value, _name, props: any) => [
              `${props?.payload?.cantidad_vendida || 0} vendidos - $${Number(value || 0).toLocaleString()}`,
              props?.payload?.nombre || 'Producto',
            ]}
            contentStyle={{
              backgroundColor: 'white',
              border: `1px solid ${PALETA.neutral.grid}`,
              borderRadius: '8px',
            }}
          />
          <Bar dataKey="monto_total" radius={[0, 4, 4, 0]}>
            {products.slice(0, 5).map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
