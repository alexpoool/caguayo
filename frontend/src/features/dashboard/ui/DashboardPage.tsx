import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  Coins,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  SkeletonDashboard,
} from '@/shared/ui/components';
import type { CasosUsoDashboard } from '../application/casos-uso';
import { useDashboard } from './useDashboard';
import { calcularTendencia } from './tendencias';
import { StatCard } from './components/StatCard';
import { MovimientosTrendChart } from './components/MovimientosTrendChart';
import { TrendChart } from './components/TrendChart';
import { VentasHoyCard } from './components/VentasHoyCard';
import { StockCriticoCard } from './components/StockCriticoCard';
import { UltimasVentasCard } from './components/UltimasVentasCard';
import { TopProductosCard } from './components/TopProductosCard';
import { ClientesRecientesCard } from './components/ClientesRecientesCard';
import { InventarioResumen } from './components/InventarioResumen';

export function DashboardPage({ casosUso }: { casosUso: CasosUsoDashboard }) {
  const navigate = useNavigate();
  const {
    stats,
    tendenciasVentas,
    tendenciasMovimientos,
    cargando,
    isError,
    error,
    refrescar,
  } = useDashboard(casosUso);

  if (cargando) {
    return <SkeletonDashboard />;
  }

  if (isError) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 px-6 py-2 text-center text-red-700">
          <p className="mb-2 text-lg font-bold">
            Error al cargar estadísticas
          </p>
          <p className="mb-4 text-sm">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
          <Button onClick={refrescar} variant="secondary" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">No hay datos disponibles</div>
      </div>
    );
  }

  const salesTrend = calcularTendencia(stats);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
            Dashboard
          </h1>
          <p className="text-sm text-gray-600 sm:text-base">
            Vista general del sistema
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={refrescar}
          leftIcon={
            <RefreshCw
              className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`}
            />
          }
          disabled={cargando}
          className="self-start sm:self-auto"
        >
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Productos"
          value={stats.total_productos.toLocaleString()}
          icon={Package}
          color="bg-brand-500"
          onClick={() => navigate('/productos')}
          delay={0}
        />
        <StatCard
          title="Total Ventas"
          value={stats.total_ventas.toLocaleString()}
          icon={ShoppingCart}
          color="bg-green-500"
          trend={salesTrend.trend}
          trendValue={salesTrend.value}
          onClick={() => navigate('/ventas')}
          delay={100}
        />
        <StatCard
          title="Total Clientes"
          value={stats.total_clientes.toLocaleString()}
          icon={Users}
          color="bg-brand-500"
          onClick={() => navigate('/clientes')}
          delay={200}
        />
        <StatCard
          title="Total Monedas"
          value={stats.total_monedas.toLocaleString()}
          icon={Coins}
          color="bg-yellow-500"
          onClick={() => navigate('/monedas')}
          delay={300}
        />
      </div>

      <Card animate style={{ animationDelay: '400ms' }}>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
            <ArrowLeftRight className="h-5 w-5 text-brand-600" />
            Tendencia de Movimientos (últimos 7 días)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MovimientosTrendChart data={tendenciasMovimientos} />
          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs sm:text-sm">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span>Recepciones</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span>Mermas</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-brand-500" />
              <span>Donaciones</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <span>Devoluciones</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card animate style={{ animationDelay: '500ms' }}>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-brand-600" />
            Tendencia de Ventas (últimos 7 días)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={tendenciasVentas} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <VentasHoyCard
          stats={stats}
          tendencia={salesTrend.trend}
          delay={600}
        />
        <StockCriticoCard
          stats={stats}
          onVerInventario={() => navigate('/productos')}
          delay={700}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UltimasVentasCard
          ventas={stats.ultimas_ventas}
          onVerVentas={() => navigate('/ventas')}
          delay={800}
        />
        <TopProductosCard productos={stats.top_productos} delay={900} />
      </div>

      <ClientesRecientesCard
        clientes={stats.clientes_recientes}
        onVerClientes={() => navigate('/clientes')}
        onCliente={(id) => navigate(`/clientes/${id}`)}
        delay={1000}
      />

      <InventarioResumen stats={stats} />
    </div>
  );
}
