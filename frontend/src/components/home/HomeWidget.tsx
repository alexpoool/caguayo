import { ReactNode } from 'react';
import { Card, CardContent } from '../ui';

interface HomeWidgetProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function HomeWidget({ title, icon, children, className = '' }: HomeWidgetProps) {
  return (
    <Card className={`shadow-md hover:shadow-lg transition-shadow duration-300 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          {icon && (
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              {icon}
            </div>
          )}
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        </div>
        <div>{children}</div>
      </CardContent>
    </Card>
  );
}

interface HomeWidgetStatProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
}

export function HomeWidgetStat({ label, value, trend }: HomeWidgetStatProps) {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-600">{label}</span>
      <span className={`font-bold text-lg ${getTrendColor()}`}>{value}</span>
    </div>
  );
}

interface HomeWidgetListProps {
  items: {
    id: number | string;
    title: string;
    subtitle?: string;
    value?: string | number;
    date?: string;
  }[];
  emptyMessage?: string;
}

export function HomeWidgetList({ items, emptyMessage = 'No hay elementos' }: HomeWidgetListProps) {
  if (items.length === 0) {
    return <p className="text-gray-500 text-sm">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
            {item.subtitle && (
              <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-3 ml-4">
            {item.value && (
              <span className="text-sm font-semibold text-blue-600 whitespace-nowrap">{item.value}</span>
            )}
            {item.date && (
              <span className="text-xs text-gray-400 whitespace-nowrap">{item.date}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
