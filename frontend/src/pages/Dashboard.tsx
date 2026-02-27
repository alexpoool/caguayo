import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { dashboardService } from "../services/api";
import { 
  Package, 
  ShoppingCart, 
  Users, 
  Coins,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  Clock3,
  DollarSign,
  ArrowLeftRight
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, SkeletonDashboard } from "../components/ui";
import type { DashboardStats, VentasTrends, MovimientosTrends } from "../types/dashboard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";

// Componente para tarjetas de estadísticas
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  trend,
  trendValue,
  onClick,
  delay = 0
}: { 
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  onClick?: () => void;
  delay?: number;
}) {
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <Card 
      className={`cursor-pointer group ${onClick ? 'hover:border-blue-300' : ''}`}
      onClick={onClick}
      animate
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${color} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 group-hover:text-gray-700 transition-colors">{title}</p>
              <p className="text-2xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{value}</p>
              {trend && (
                <div className={`flex items-center gap-1 mt-1 ${getTrendColor()} transition-all duration-300 group-hover:gap-2`}>
                  {getTrendIcon()}
                  <span className="text-xs font-medium">
                    {trendValue !== undefined ? `${Math.abs(trendValue).toFixed(1)}%` : ''}
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

// Componente para gráfico de tendencias
function TrendChart({ data }: { data: VentasTrends | undefined }) {
  if (!data || data.fechas.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No hay datos de tendencias disponibles
      </div>
    );
  }

  const chartData = data.fechas.map((fecha, index) => ({
    fecha: new Date(fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
    monto: Number(data.montos[index]) || 0,
    cantidad: data.cantidades[index] || 0
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="fecha" 
          stroke="#6b7280"
          fontSize={12}
          tickLine={false}
        />
        <YAxis 
          stroke="#6b7280"
          fontSize={12}
          tickLine={false}
          tickFormatter={(value) => `$${value.toLocaleString()}`}
        />
        <Tooltip 
          formatter={(value) => [`$${Number(value || 0).toLocaleString()}`, 'Ventas']}
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        <Line
          type="monotone"
          dataKey="monto"
          stroke="#3b82f6"
          strokeWidth={3}
          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, fill: '#2563eb' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Componente para gráfico de tendencias de movimientos
function MovimientosTrendChart({ data }: { data: MovimientosTrends | undefined }) {
  if (!data || data.fechas.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No hay datos de movimientos disponibles
      </div>
    );
  }

  const chartData = data.fechas.map((fecha, index) => ({
    fecha: new Date(fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
    recepciones: data.recepciones[index] || 0,
    mermas: data.mermas[index] || 0,
    donaciones: data.donaciones[index] || 0,
    devoluciones: data.devoluciones[index] || 0
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="fecha"
          stroke="#6b7280"
          fontSize={12}
          tickLine={false}
        />
        <YAxis
          stroke="#6b7280"
          fontSize={12}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        <Line
          type="monotone"
          dataKey="recepciones"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
          name="Recepciones"
        />
        <Line
          type="monotone"
          dataKey="mermas"
          stroke="#ef4444"
          strokeWidth={2}
          dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
          name="Mermas"
        />
        <Line
          type="monotone"
          dataKey="donaciones"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
          name="Donaciones"
        />
        <Line
          type="monotone"
          dataKey="devoluciones"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
          name="Devoluciones"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Componente para gráfico de barras (top productos)
function TopProductsChart({ products }: { products: any[] }) {
  if (!products || products.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-500">
        No hay datos de productos
      </div>
    );
  }

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={products.slice(0, 5)} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
        <XAxis type="number" hide />
        <YAxis 
          dataKey="nombre" 
          type="category" 
          width={100}
          tick={{ fontSize: 11 }}
          tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 12)}...` : value}
        />
        <Tooltip 
          formatter={(value, _name, props: any) => [
            `${props?.payload?.cantidad_vendida || 0} vendidos - $${Number(value || 0).toLocaleString()}`,
            props?.payload?.nombre || 'Producto'
          ]}
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
        />
        <Bar dataKey="monto_total" radius={[0, 4, 4, 0]}>
          {products.slice(0, 5).map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats
  });

  const { data: trends } = useQuery({
    queryKey: ['dashboard-trends'],
    queryFn: () => dashboardService.getTrends(7)
  });

  const { data: movimientosTrends } = useQuery({
    queryKey: ['dashboard-movimientos-trends'],
    queryFn: () => dashboardService.getMovimientosTrends(7)
  });

  const handleRefresh = () => {
    refetch();
    // También refrescar las queries de tendencias
    queryClient.invalidateQueries({ queryKey: ['dashboard-trends'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-movimientos-trends'] });
  };

  const getSalesTrend = (stats: DashboardStats | undefined): { trend: 'up' | 'down' | 'neutral'; value: number } => {
    if (!stats) return { trend: 'neutral', value: 0 };
    if (stats.ventas_crecimiento_porcentaje > 0) return { trend: 'up', value: stats.ventas_crecimiento_porcentaje };
    if (stats.ventas_crecimiento_porcentaje < 0) return { trend: 'down', value: stats.ventas_crecimiento_porcentaje };
    return { trend: 'neutral', value: 0 };
  };

  if (isLoading) {
    return <SkeletonDashboard />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg text-center max-w-md">
          <p className="font-bold text-lg mb-2">Error al cargar estadísticas</p>
          <p className="text-sm mb-4">{error instanceof Error ? error.message : "Error desconocido"}</p>
          <Button onClick={handleRefresh} variant="secondary" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No hay datos disponibles</div>
      </div>
    );
  }

  const salesTrend = getSalesTrend(stats);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Vista general del sistema</p>
        </div>
        <Button 
          variant="secondary" 
          onClick={handleRefresh}
          leftIcon={<RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />}
          disabled={isLoading}
        >
          Actualizar
        </Button>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Productos"
          value={stats.total_productos.toLocaleString()}
          icon={Package}
          color="bg-blue-500"
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
          color="bg-purple-500"
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

      {/* Gráfico de tendencias de movimientos */}
      <Card animate style={{ animationDelay: '400ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowLeftRight className="h-5 w-5 text-purple-600" />
            Tendencia de Movimientos (últimos 7 días)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MovimientosTrendChart data={movimientosTrends} />
          {/* Leyenda de colores */}
          <div className="flex justify-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Recepciones</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Mermas</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span>Donaciones</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span>Devoluciones</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de tendencias */}
      <Card animate style={{ animationDelay: '500ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Tendencia de Ventas (últimos 7 días)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TrendChart data={trends} />
        </CardContent>
      </Card>

      {/* Sección Ventas del Mes y Stock Bajo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas de hoy */}
        <Card animate style={{ animationDelay: '600ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
              Ventas de Hoy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                ${stats.ventas_hoy.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className={`text-sm font-medium ${salesTrend.trend === 'up' ? 'text-green-600' : salesTrend.trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                {salesTrend.trend === 'up' && <TrendingUp className="h-4 w-4 inline mr-1" />}
                {salesTrend.trend === 'down' && <TrendingDown className="h-4 w-4 inline mr-1" />}
                {salesTrend.trend === 'neutral' && <Minus className="h-4 w-4 inline mr-1" />}
                {Math.abs(stats.ventas_crecimiento_porcentaje).toFixed(1)}% vs ayer
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {stats.ventas_hoy_cantidad} ventas realizadas hoy
            </p>
            
            {/* Distribución por estado */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-yellow-600 mb-1">
                  <Clock3 className="h-4 w-4" />
                  <span className="text-xl font-bold">{stats.ventas_pendientes}</span>
                </div>
                <p className="text-xs text-gray-500">Pendientes</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xl font-bold">{stats.ventas_completadas}</span>
                </div>
                <p className="text-xs text-gray-500">Completadas</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                  <XCircle className="h-4 w-4" />
                  <span className="text-xl font-bold">{stats.ventas_anuladas}</span>
                </div>
                <p className="text-xs text-gray-500">Anuladas</p>
              </div>
            </div>
            
            <div className="pt-2">
              <p className="text-sm text-gray-600">
                Ticket promedio: <span className="font-semibold">${stats.ticket_promedio.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stock Bajo */}
        <Card animate style={{ animationDelay: '700ms' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Stock Crítico
            </CardTitle>
            {stats.productos_agotados > 0 && (
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                {stats.productos_agotados} agotados
              </span>
            )}
          </CardHeader>
          <CardContent>
            {stats.productos_stock_bajo.length > 0 ? (
              <div className="space-y-3">
                {stats.productos_stock_bajo.slice(0, 5).map((producto) => (
                  <div
                    key={producto.id_producto}
                    className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${producto.cantidad === 0 ? 'bg-red-500' : producto.cantidad <= 2 ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                      <span className="text-sm font-medium text-gray-900">
                        {producto.nombre}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold ${producto.cantidad === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                        {producto.cantidad === 0 ? 'Agotado' : `${producto.cantidad} unid.`}
                      </span>
                      <span className="text-sm text-gray-500">
                        ${producto.precio_venta.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  className="w-full mt-2 text-blue-600 hover:text-blue-800"
                  onClick={() => navigate('/productos')}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Ver inventario completo
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <Package className="h-12 w-12 mx-auto mb-2 text-green-400" />
                <p className="text-sm text-gray-500">No hay productos con stock bajo</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Últimas Ventas y Top Productos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimas Ventas */}
        <Card animate style={{ animationDelay: '800ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              Últimas Ventas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.ultimas_ventas && stats.ultimas_ventas.length > 0 ? (
              <div className="space-y-3">
                {stats.ultimas_ventas.slice(0, 5).map((venta) => (
                  <div
                    key={venta.id_venta}
                    className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded-lg px-2 -mx-2 cursor-pointer transition-colors"
                    onClick={() => navigate('/ventas')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        venta.estado === 'COMPLETADA' ? 'bg-green-100 text-green-600' :
                        venta.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {venta.estado === 'COMPLETADA' && <CheckCircle className="h-4 w-4" />}
                        {venta.estado === 'PENDIENTE' && <Clock className="h-4 w-4" />}
                        {venta.estado === 'ANULADA' && <XCircle className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          #{venta.id_venta} - ${venta.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {venta.cliente?.nombre || 'Cliente no registrado'} • {new Date(venta.fecha).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      venta.estado === 'COMPLETADA' ? 'bg-green-100 text-green-800' :
                      venta.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {venta.estado}
                    </span>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  className="w-full mt-2 text-blue-600 hover:text-blue-800"
                  onClick={() => navigate('/ventas')}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  Ver historial completo
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <ShoppingCart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">No hay ventas registradas</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Productos */}
        <Card animate style={{ animationDelay: '900ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Top Productos Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.top_productos && stats.top_productos.length > 0 ? (
              <div className="space-y-4">
                <TopProductsChart products={stats.top_productos} />
                <div className="space-y-2 pt-2">
                  {stats.top_productos.slice(0, 5).map((producto, index) => (
                    <div key={producto.id_producto} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-200 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{producto.nombre}</p>
                          <p className="text-xs text-gray-500">{producto.cantidad_vendida} vendidos</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          ${producto.monto_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-500">{producto.porcentaje}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">No hay datos de ventas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Clientes Recientes */}
      <Card animate style={{ animationDelay: '1000ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-indigo-600" />
            Clientes Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.clientes_recientes && stats.clientes_recientes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.clientes_recientes.slice(0, 8).map((cliente) => (
                <div
                  key={cliente.id_cliente}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/clientes/${cliente.id_cliente}`)}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                    {(cliente.nombre || 'C').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{cliente.nombre || 'Cliente sin nombre'}</p>
                    <p className="text-xs text-gray-500">
                      {cliente.fecha_registro ? new Date(cliente.fecha_registro).toLocaleDateString('es-ES') : 'Fecha no disponible'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500">No hay clientes registrados recientemente</p>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full mt-4 text-blue-600 hover:text-blue-800"
            onClick={() => navigate('/clientes')}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Ver todos los clientes
          </Button>
        </CardContent>
      </Card>

      {/* Métricas de Inventario */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card animate style={{ animationDelay: '1100ms' }}>
          <CardHeader>
            <CardTitle className="text-lg">Valor del Inventario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600">Valor de compra</span>
              <span className="text-lg font-semibold text-gray-900">
                ${stats.valor_inventario_compra.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600">Valor de venta</span>
              <span className="text-lg font-semibold text-green-600">
                ${stats.valor_inventario_venta.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-600">Margen estimado</span>
              <span className="text-lg font-semibold text-blue-600">
                ${(stats.valor_inventario_venta - stats.valor_inventario_compra).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card animate style={{ animationDelay: '1200ms' }}>
          <CardHeader>
            <CardTitle className="text-lg">Resumen General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600">Categorías activas</span>
              <span className="text-lg font-semibold text-gray-900">{stats.total_categorias}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600">Productos agotados</span>
              <span className={`text-lg font-semibold ${stats.productos_agotados > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {stats.productos_agotados}
              </span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-600">Monedas configuradas</span>
              <span className="text-lg font-semibold text-gray-900">{stats.total_monedas}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
