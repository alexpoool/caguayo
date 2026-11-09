import type { ElementType } from 'react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/components';
import type { TendenciaVentas } from '../tendencias';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ElementType;
  color: string;
  trend?: TendenciaVentas;
  trendValue?: number;
  onClick?: () => void;
  delay?: number;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
  trendValue,
  onClick,
  delay = 0,
}: StatCardProps) {
  const getTrendIcon = () => {
    if (trend === 'up') {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    }
    if (trend === 'down') {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <Card
      className={`cursor-pointer group ${onClick ? 'hover:border-brand-300' : ''}`}
      onClick={onClick}
      animate
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`shrink-0 rounded-full p-3 ${color} transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110`}
            >
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-600 transition-colors group-hover:text-gray-700">
                {title}
              </p>
              <p className="text-xl font-bold text-gray-900 transition-colors group-hover:text-brand-700 sm:text-2xl">
                {value}
              </p>
              {trend && (
                <div
                  className={`mt-1 flex items-center gap-1 transition-all duration-300 group-hover:gap-2 ${getTrendColor()}`}
                >
                  {getTrendIcon()}
                  <span className="text-xs font-medium">
                    {trendValue !== undefined
                      ? `${Math.abs(trendValue).toFixed(1)}%`
                      : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
